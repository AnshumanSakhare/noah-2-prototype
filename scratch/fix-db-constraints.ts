import { Client } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function fixConstraints() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("Connected successfully.");

    // List all constraints to be sure what we are dealing with
    console.log("Fetching current constraints...");
    const constraintsRes = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'public.diagnostic_assessments'::regclass
        AND contype = 'c';
    `);
    
    console.log("Current constraints found:", constraintsRes.rows.map(r => r.conname));

    // Drop any constraints that might be blocking us
    const constraintsToDrop = [
      "diagnostic_assessments_topic_mode_check",
      "diagnostic_assessments_test_mode_check",
      "diagnostic_assessments_topic_check",
      "diagnostic_assessments_mode_check"
    ];

    for (const constraint of constraintsToDrop) {
      console.log(`Dropping constraint if exists: ${constraint}...`);
      await client.query(`ALTER TABLE public.diagnostic_assessments DROP CONSTRAINT IF EXISTS ${constraint}`);
    }

    // Add updated constraints
    console.log("Adding updated topic_mode_check...");
    await client.query(`
      ALTER TABLE public.diagnostic_assessments
      ADD CONSTRAINT diagnostic_assessments_topic_mode_check
      CHECK (
        (test_mode = 'topic' AND topic IS NOT NULL)
        OR (test_mode = 'grade' AND topic IS NULL)
        OR (test_mode = 'recurring')
      )
    `);

    console.log("Adding updated test_mode_check...");
    await client.query(`
      ALTER TABLE public.diagnostic_assessments
      ADD CONSTRAINT diagnostic_assessments_test_mode_check
      CHECK (test_mode IN ('topic', 'grade', 'recurring'))
    `);

    console.log("✅ Database constraints updated successfully!");

  } catch (error) {
    console.error("❌ Error fixing constraints:", error);
  } finally {
    await client.end();
  }
}

fixConstraints();
