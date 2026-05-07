const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const ROOT = process.cwd();
const ISSUES_PATH = path.join(ROOT, "scratch", "grade6-audit", "issues.json");
const OUT_PATH = path.join(ROOT, "scratch", "grade6-audit", "flagged-rows.json");

for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const i = trimmed.indexOf("=");
  if (i <= 0) continue;
  process.env[trimmed.slice(0, i).trim()] = trimmed
    .slice(i + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

async function main() {
  const issues = JSON.parse(fs.readFileSync(ISSUES_PATH, "utf8")).issues;
  const ids = [...new Set(issues.map((issue) => issue.id))];
  const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "postgres",
    port: Number(process.env.DB_PORT || 5432),
    ssl: { rejectUnauthorized: false },
  });

  const result = await pool.query(
    `
      SELECT id, question_type, question_text, question_svg, visual_mode, subject,
             grade, topic, subtopic, learning_objective, blooms_level,
             difficulty_level, difficulty_rating, options, explanation,
             generation_metadata
      FROM public.final_content_questions
      WHERE id = ANY($1::uuid[])
      ORDER BY topic, subtopic, id
    `,
    [ids],
  );
  await pool.end();

  const issueMap = new Map();
  for (const issue of issues) {
    const list = issueMap.get(issue.id) ?? [];
    list.push(issue);
    issueMap.set(issue.id, list);
  }

  const rows = result.rows.map((row) => ({
    ...row,
    issues: issueMap.get(row.id) ?? [],
  }));

  fs.writeFileSync(OUT_PATH, JSON.stringify(rows, null, 2));
  console.log(OUT_PATH);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
