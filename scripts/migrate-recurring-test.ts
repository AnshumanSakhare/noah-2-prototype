import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function migrate() {
  const { default: pool } = await import("../lib/db");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log(
      "Adding parent_assessment_id column to diagnostic_assessments...",
    );
    await client.query(`
      ALTER TABLE diagnostic_assessments
      ADD COLUMN IF NOT EXISTS parent_assessment_id UUID REFERENCES diagnostic_assessments(id);
    `);

    console.log("Updating test_mode check constraint to allow 'recurring'...");
    // Drop the old check if it exists, then add new one
    await client.query(`
      ALTER TABLE diagnostic_assessments
      DROP CONSTRAINT IF EXISTS diagnostic_assessments_test_mode_check;
    `);
    await client.query(`
      ALTER TABLE diagnostic_assessments
      ADD CONSTRAINT diagnostic_assessments_test_mode_check
      CHECK (test_mode IN ('topic', 'grade', 'recurring'));
    `);

    await client.query("COMMIT");
    console.log("✅ Migration completed successfully.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed, rolled back:", e);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
