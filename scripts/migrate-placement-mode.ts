import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

// Manually parse .env.local since we might not have dotenv configured for scripts in this way
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env: any = {};
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      env[key] = val;
    }
  });
  return env;
}

const env = loadEnv();
const pool = new Pool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: parseInt(env.DB_PORT || '5432'),
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log("Updating test_mode check constraint to allow 'placement'...");
    await client.query(`ALTER TABLE diagnostic_assessments DROP CONSTRAINT IF EXISTS diagnostic_assessments_test_mode_check;`);
    await client.query(`
      ALTER TABLE diagnostic_assessments 
      ADD CONSTRAINT diagnostic_assessments_test_mode_check 
      CHECK (test_mode IN ('topic', 'grade', 'recurring', 'placement'));
    `);

    console.log("Updating topic_mode check constraint...");
    await client.query(`ALTER TABLE diagnostic_assessments DROP CONSTRAINT IF EXISTS diagnostic_assessments_topic_mode_check;`);
    await client.query(`
      ALTER TABLE diagnostic_assessments 
      ADD CONSTRAINT diagnostic_assessments_topic_mode_check 
      CHECK (
        (test_mode IN ('topic', 'placement', 'recurring') AND topic IS NOT NULL)
        OR (test_mode = 'grade' AND topic IS NULL)
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Database constraints updated successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', e);
  } finally {
    client.release();
    await pool.end();
    process.exit();
  }
}

migrate();
