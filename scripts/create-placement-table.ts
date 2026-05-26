import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";

// Manually parse .env.local because dotenv is not installed
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const parts = line.split("=");
      if (parts.length === 2) {
        process.env[parts[0].trim()] = parts[1].trim();
      }
    });
  }
}

loadEnvLocal();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "5432"),
  ssl: {
    rejectUnauthorized: false,
  },
});

async function createTable() {
  const client = await pool.connect();
  try {
    console.log("Creating table 'placement_test_questions_v2'...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS placement_test_questions_v2 (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        question_number TEXT,
        question_type TEXT,
        question_text TEXT,
        subject TEXT,
        grade TEXT,
        grade_level TEXT,
        topic TEXT,
        subtopic TEXT,
        learning_objective TEXT,
        blooms_level TEXT,
        difficulty_level TEXT,
        difficulty_rating INTEGER,
        options JSONB,
        explanation TEXT,
        generation_metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_placement_test_questions_v2_modtime ON placement_test_questions_v2;
    `);

    await client.query(`
      CREATE TRIGGER update_placement_test_questions_v2_modtime
          BEFORE UPDATE ON placement_test_questions_v2
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log("Table 'placement_test_questions_v2' created successfully.");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    client.release();
    await pool.end();
    process.exit();
  }
}

createTable();
