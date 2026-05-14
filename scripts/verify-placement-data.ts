import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

// Manually parse .env.local
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

async function verify() {
  const client = await pool.connect();
  try {
    const countRes = await client.query(
      "SELECT count(*) FROM placement_test_questions_v2",
    );
    console.log(
      `Total questions in 'placement_test_questions_v2': ${countRes.rows[0].count}`,
    );

    const sampleRes = await client.query(`
      SELECT question_number, question_type, subject, grade, topic 
      FROM placement_test_questions_v2 
      LIMIT 3
    `);
    console.log("\nSample Data:");
    console.table(sampleRes.rows);

    const jsonCheck = await client.query(`
      SELECT question_number, options->0->'text' as first_option_text 
      FROM placement_test_questions_v2 
      WHERE question_type = 'mcq' 
      LIMIT 1
    `);
    if (jsonCheck.rows.length > 0) {
      console.log("\nJSONB Verification (MCQ Option):");
      console.log(
        `Question ${jsonCheck.rows[0].question_number}: ${jsonCheck.rows[0].first_option_text}`,
      );
    }
  } catch (error) {
    console.error("Verification failed:", error);
  } finally {
    client.release();
    await pool.end();
    process.exit();
  }
}

verify();
