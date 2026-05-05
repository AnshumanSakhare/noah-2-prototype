import { readFileSync } from "node:fs";
import path from "node:path";

// Load .env.local
for (const line of readFileSync(
  path.resolve(process.cwd(), ".env.local"),
  "utf8",
).split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const index = trimmed.indexOf("=");
  if (index <= 0) continue;
  const key = trimmed.slice(0, index).trim();
  const value = trimmed
    .slice(index + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
  process.env[key] = value;
}

async function testConnection() {
  const { default: pool } = await import("../lib/db");
  console.log("Testing database connection...");
  console.log("CWD:", process.cwd());
  console.log("Host:", process.env.DB_HOST);
  console.log("User:", process.env.DB_USER);
  console.log("Password set:", !!process.env.DB_PASSWORD);
  console.log("Database:", process.env.DB_NAME);
  console.log("Port:", process.env.DB_PORT);

  try {
    const start = Date.now();
    const res = await pool.query("SELECT NOW() as now, version() as version");
    const end = Date.now();

    console.log("✅ Connection successful!");
    console.log("Current Time (DB):", res.rows[0].now);
    console.log("Postgres Version:", res.rows[0].version);
    console.log("Latency:", end - start, "ms");

    // Query all tables
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n--- Tables in "public" schema ---');
    if (tablesRes.rows.length === 0) {
      console.log("No tables found.");
    } else {
      for (const row of tablesRes.rows) {
        console.log(`- ${row.table_name}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Connection failed:");
    console.error(err);
    process.exit(1);
  }
}

testConnection();
