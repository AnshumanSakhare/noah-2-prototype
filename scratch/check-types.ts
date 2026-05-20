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

async function run() {
  const { default: pool } = await import("../lib/db");
  try {
    const res = await pool.query(`
      SELECT question_type, count(*)::int as count 
      FROM final_content_questions_1 
      GROUP BY question_type 
      ORDER BY count DESC
    `);
    console.log("Question type counts:");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
