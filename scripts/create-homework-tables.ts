import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

// Manually parse .env.local because dotenv may not be globally available in all environments
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index <= 0) return;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed
        .slice(index + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      process.env[key] = value;
    });
  }
}

loadEnvLocal();

const poolConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "postgres",
  port: parseInt(process.env.DB_PORT || "5432"),
  ssl: {
    rejectUnauthorized: false, // Required for RDS
  },
};

const pool = new Pool(poolConfig);

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("Database connection established. Starting transaction...");
    await client.query("BEGIN");

    // 1. Create question_templates
    console.log("Creating table 'question_templates'...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.question_templates (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug                TEXT NOT NULL UNIQUE,             -- e.g. "position-drag-drop-v1"
        grade               SMALLINT NOT NULL,                -- 0=KG, 1–8
        topic               TEXT NOT NULL,                    -- e.g. "Position & Direction"
        subtopic            TEXT NOT NULL,
        learning_objective  TEXT NOT NULL,
        interaction_type    TEXT NOT NULL,                    -- from catalog: tap-select, drag-drop, etc.
        difficulty          TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
        template_html       TEXT NOT NULL,                    -- full HTML with {{VAR}} placeholders
        props_schema        JSONB NOT NULL,                   -- JSON Schema describing variation_data shape
        answer_key_fn       TEXT,                             -- server-side JS/pseudocode to compute correct answer from variation_data
        structural_fingerprint TEXT,                          -- hash of interaction skeleton (for dedup)
        version             INTEGER NOT NULL DEFAULT 1,
        status              TEXT NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','review','active','deprecated')),
        created_at          TIMESTAMPTZ DEFAULT now(),
        updated_at          TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 2. Create question_variations
    console.log("Creating table 'question_variations'...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.question_variations (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id         UUID NOT NULL REFERENCES public.question_templates(id),
        variation_index     SMALLINT NOT NULL,               -- 1–9 within the topic's slate
        variation_data      JSONB NOT NULL,                  -- filled values: numbers, words, positions
        answer_key          JSONB NOT NULL,                  -- correct answer(s) — SERVER ONLY, never sent to client
        difficulty          TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
        locale              TEXT NOT NULL DEFAULT 'en-IN',
        content_hash        TEXT,                            -- hash of variation_data (idempotent regen)
        verifier_status     TEXT DEFAULT 'pending'
                              CHECK (verifier_status IN ('pending','verified','failed')),
        verifier_notes      TEXT,
        last_edited_by      TEXT,                            -- editor email / user id
        last_edited_at      TIMESTAMPTZ,
        status              TEXT NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','review','active','deprecated')),
        created_at          TIMESTAMPTZ DEFAULT now(),
        updated_at          TIMESTAMPTZ DEFAULT now(),
        UNIQUE (template_id, variation_index)
      );
    `);

    // 3. Create homework_assignments
    console.log("Creating table 'homework_assignments'...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.homework_assignments (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id          UUID NOT NULL,
        assigned_by         TEXT NOT NULL,                   -- "teacher" | "system"
        teacher_id          UUID,
        topic               TEXT NOT NULL,
        subtopic            TEXT,
        activity_count      SMALLINT NOT NULL,
        difficulty_mode     TEXT NOT NULL
                              CHECK (difficulty_mode IN ('easy','medium','hard','adaptive')),
        question_ids        UUID[] NOT NULL,                 -- ordered list of question_variations.id
        status              TEXT NOT NULL DEFAULT 'assigned'
                              CHECK (status IN ('assigned','in_progress','completed')),
        assigned_at         TIMESTAMPTZ DEFAULT now(),
        due_at              TIMESTAMPTZ,
        started_at          TIMESTAMPTZ,
        completed_at        TIMESTAMPTZ
      );
    `);

    // 4. Create homework_attempts
    console.log("Creating table 'homework_attempts'...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.homework_attempts (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assignment_id       UUID NOT NULL REFERENCES public.homework_assignments(id),
        question_id         UUID NOT NULL REFERENCES public.question_variations(id),
        student_id          UUID NOT NULL,
        student_answer      JSONB,                           -- raw answer payload
        is_correct          BOOLEAN,                         -- null until evaluated at end
        time_taken_ms       INTEGER,                         -- per-question timer
        attempt_index       SMALLINT NOT NULL DEFAULT 1,
        created_at          TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 5. Create generation_runs
    console.log("Creating table 'generation_runs'...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.generation_runs (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_type            TEXT NOT NULL CHECK (run_type IN ('ai_generate','human_edit','re_verify')),
        template_id         UUID REFERENCES public.question_templates(id),
        variation_id        UUID REFERENCES public.question_variations(id),
        triggered_by        TEXT,                            -- user email or "system"
        input_params        JSONB,                           -- prompt params used
        output_snapshot     JSONB,                           -- what was written (before/after for edits)
        verifier_result     TEXT CHECK (verifier_result IN ('pass','fail',null)),
        notes               TEXT,
        created_at          TIMESTAMPTZ DEFAULT now()
      );
    `);

    // Triggers for updated_at fields
    console.log("Creating triggers for updating updated_at columns...");
    
    // Ensure the helper function exists
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Add trigger to question_templates
    await client.query(`
      DROP TRIGGER IF EXISTS update_question_templates_modtime ON public.question_templates;
      CREATE TRIGGER update_question_templates_modtime
          BEFORE UPDATE ON public.question_templates
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    // Add trigger to question_variations
    await client.query(`
      DROP TRIGGER IF EXISTS update_question_variations_modtime ON public.question_variations;
      CREATE TRIGGER update_question_variations_modtime
          BEFORE UPDATE ON public.question_variations
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query("COMMIT");
    console.log("✅ All homework-related tables and triggers created successfully!");

    // Verify by listing tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
        AND table_name IN ('question_templates', 'question_variations', 'homework_assignments', 'homework_attempts', 'generation_runs')
      ORDER BY table_name
    `);
    
    console.log("\n--- Verification: Created Tables ---");
    tablesRes.rows.forEach(row => console.log(`- ${row.table_name}`));
    
    if (tablesRes.rows.length === 5) {
      console.log("✅ Verification successful: All 5 tables exist in the database!");
    } else {
      console.warn(`⚠️ Warning: Expected 5 tables, but found ${tablesRes.rows.length}.`);
    }

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error running migration:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
