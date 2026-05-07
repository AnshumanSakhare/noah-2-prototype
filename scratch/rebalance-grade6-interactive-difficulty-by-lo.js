const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "scratch", "grade6-interactive-difficulty");

function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
  }
}

function countMatches(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

function complexityScore(row) {
  const question = String(row.question_text ?? "");
  const explanation = String(row.explanation ?? "");
  const source = `${question} ${explanation}`;
  const currentRating = Number(row.difficulty_rating ?? 1);

  const numericTokens = countMatches(source, /\b\d+(?:[.,]\d+)?\b/g);
  const operators = countMatches(source, /[+\-*/^=()%{}]/g);
  const advancedTerms = countMatches(
    source.toLowerCase(),
    /\b(surface area|trapezoid|prime factorisation|sample space|intersection|union|equation|probability|rectangular prism|triangular prism|mode|median|mean|hcf|lcm|estimate|difference|product|evaluate|compare|substitute)\b/g,
  );

  return (
    currentRating * 100 +
    question.length * 0.1 +
    explanation.length * 0.02 +
    numericTokens * 2 +
    operators * 1.5 +
    advancedTerms * 5 +
    (String(row.question_type).toLowerCase() === "drag_drop" ? 3 : 0)
  );
}

async function main() {
  loadEnv();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 5432),
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const result = await client.query(`
    SELECT
      id,
      topic,
      learning_objective,
      lower(question_type) AS question_type,
      question_text,
      explanation,
      difficulty_level,
      difficulty_rating
    FROM final_content_questions
    WHERE grade = '6'
      AND lower(question_type) IN ('fitb', 'drag_drop', 'drag n drop', 'drag_n_drop', 'drag-and-drop')
    ORDER BY topic, learning_objective, id
  `);

  const groups = new Map();
  for (const row of result.rows) {
    const key = `${row.topic}|||${row.learning_objective}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const assignments = [];
  for (const [key, rows] of groups.entries()) {
    if (rows.length !== 3) {
      throw new Error(`Expected 3 interactive rows per LO, found ${rows.length} for ${key}`);
    }

    const ranked = [...rows]
      .map((row) => ({ ...row, score: complexityScore(row) }))
      .sort((left, right) => {
        if (left.score !== right.score) return left.score - right.score;
        return String(left.id).localeCompare(String(right.id));
      });

    const levels = [
      { difficulty_level: "easy", difficulty_rating: 1 },
      { difficulty_level: "medium", difficulty_rating: 2 },
      { difficulty_level: "hard", difficulty_rating: 3 },
    ];

    for (let index = 0; index < ranked.length; index += 1) {
      assignments.push({
        id: ranked[index].id,
        topic: ranked[index].topic,
        learning_objective: ranked[index].learning_objective,
        question_type: ranked[index].question_type,
        question_text: ranked[index].question_text,
        old_level: ranked[index].difficulty_level,
        old_rating: ranked[index].difficulty_rating,
        score: ranked[index].score,
        ...levels[index],
      });
    }
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "planned-assignments.json"),
    JSON.stringify(assignments, null, 2),
  );

  for (const row of assignments) {
    await client.query(
      `
      UPDATE final_content_questions
      SET difficulty_level = $2,
          difficulty_rating = $3,
          updated_at = NOW()
      WHERE id = $1::uuid
      `,
      [row.id, row.difficulty_level, row.difficulty_rating],
    );
  }

  const verify = await client.query(`
    SELECT
      lower(coalesce(difficulty_level, '')) AS difficulty_level,
      count(*)::int AS count
    FROM final_content_questions
    WHERE grade = '6'
      AND lower(question_type) IN ('fitb', 'drag_drop', 'drag n drop', 'drag_n_drop', 'drag-and-drop')
    GROUP BY 1
    ORDER BY 1
  `);

  fs.writeFileSync(
    path.join(OUT_DIR, "summary.json"),
    JSON.stringify(
      {
        updated: assignments.length,
        distribution: verify.rows,
      },
      null,
      2,
    ),
  );

  console.log(
    JSON.stringify(
      {
        updated: assignments.length,
        distribution: verify.rows,
        planFile: path.join(OUT_DIR, "planned-assignments.json"),
      },
      null,
      2,
    ),
  );

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
