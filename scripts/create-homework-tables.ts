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

    // 0. Drop existing homework tables so the schema is recreated cleanly.
    //    Starting fresh — no data to preserve. CASCADE clears FK dependencies.
    console.log("Dropping any existing homework tables (fresh rebuild)...");
    await client.query(`
      DROP TABLE IF EXISTS public.generation_runs CASCADE;
      DROP TABLE IF EXISTS public.homework_attempts CASCADE;
      DROP TABLE IF EXISTS public.homework_assignments CASCADE;
      DROP TABLE IF EXISTS public.question_variations CASCADE;
      DROP TABLE IF EXISTS public.question_templates_1 CASCADE;
    `);

    // 1. Create question_templates_1
    console.log("Creating table 'question_templates_1'...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.question_templates_1 (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug                TEXT NOT NULL UNIQUE,             -- e.g. "position-drag-drop-v1"
        grade               SMALLINT NOT NULL,                -- 0=KG, 1–8
        topic               TEXT NOT NULL,                    -- e.g. "Position & Direction"
        subtopic            TEXT NOT NULL,
        learning_objective  TEXT NOT NULL,
        interaction_type    TEXT NOT NULL                     -- one of the 7 canonical archetypes
                              CHECK (interaction_type IN (
                                'tap-select','drag-drop','fill-slot',
                                'sequence-order','build-count','number-line','partition')),
        difficulty          TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
        template_html       TEXT NOT NULL,                    -- full HTML with {{VAR}} placeholders
        props_schema        JSONB NOT NULL,                   -- Input contract: JSON Schema describing variation_data shape
        output_schema       JSONB NOT NULL,                   -- Output contract: canonical shape getState() must emit
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
        template_id         UUID NOT NULL REFERENCES public.question_templates_1(id),
        variation_index     SMALLINT NOT NULL,               -- 1–9 within the topic's slate
        variation_data      JSONB NOT NULL,                  -- Input JSONB: filled values (numbers, words, positions)
        evaluation_spec     JSONB NOT NULL,                  -- Eval JSONB: canonical answer + binary/partial flag — SERVER ONLY
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
        overall_performance SMALLINT CHECK (overall_performance BETWEEN 0 AND 100), -- mean per-question performance, set on completion
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
        student_answer      JSONB,                           -- Output JSONB: canonical student selection
        performance         SMALLINT CHECK (performance BETWEEN 0 AND 100), -- 0–100 score from the scoring engine
        is_correct          BOOLEAN,                         -- derived: performance >= PASS_THRESHOLD (70)
        score_breakdown     JSONB,                           -- per-item audit of how the score was computed
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
        template_id         UUID REFERENCES public.question_templates_1(id),
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

    // Add trigger to question_templates_1
    await client.query(`
      DROP TRIGGER IF EXISTS update_question_templates_1_modtime ON public.question_templates_1;
      CREATE TRIGGER update_question_templates_1_modtime
          BEFORE UPDATE ON public.question_templates_1
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
        AND table_name IN ('question_templates_1', 'question_variations', 'homework_assignments', 'homework_attempts', 'generation_runs')
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
