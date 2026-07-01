import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

// Load local environment variables
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

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "postgres",
  port: parseInt(process.env.DB_PORT || "5432"),
  ssl: { rejectUnauthorized: false },
});

async function clearDb() {
  const client = await pool.connect();
  try {
    console.log("Starting DB clean transaction...");
    await client.query("BEGIN");

    console.log("Truncating public.generation_runs...");
    await client.query("TRUNCATE TABLE public.generation_runs CASCADE");

    console.log("Truncating public.homework_attempts...");
    await client.query("TRUNCATE TABLE public.homework_attempts CASCADE");

    console.log("Truncating public.homework_assignments...");
    await client.query("TRUNCATE TABLE public.homework_assignments CASCADE");

    console.log("Truncating public.question_variations...");
    await client.query("TRUNCATE TABLE public.question_variations CASCADE");

    console.log("Truncating public.question_templates_1...");
    await client.query("TRUNCATE TABLE public.question_templates_1 CASCADE");

    await client.query("COMMIT");
    console.log("✅ Database successfully cleared of all question, variation, and homework records!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error clearing database:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

clearDb();
