const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const ROOT = process.cwd();

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

function cleanSpaces(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([?.!,;:])/g, "$1")
    .trim();
}

function transformFitb(text) {
  let next = text.trim();
  next = next.replace(/^Fill in the blank with the correct answer:\s*/i, "");
  next = next.replace(/\bChoose\b/gi, "Write");
  next = next.replace(/\bSelect\b/gi, "Write");
  next = next.replace(/\bPick\b/gi, "Write");
  next = next.replace(/\bwhich expression has the greater value\b/i, "write the expression with the greater value");
  next = next.replace(/\bthe right end seat is seat number\.?$/i, "write the seat number at the right end. Answer: ____.");
  next = next.replace(/\bthe water image of the capital letter M look like\b/i, "the water image of the capital letter M looks like");
  next = next.replace(/([.?!]\s*)write\b/g, "$1Write");
  next = next.replace(/,\s*Write\b/g, ", write");
  next = cleanSpaces(next);
  if (!/Answer:\s*_{2,}/i.test(next)) {
    next = `${next.replace(/[. ]+$/, "")}. Answer: ____.`;
  }
  return next;
}

function transformDragDrop(text) {
  let next = text.trim();
  next = next.replace(/^Drag each choice into the correct group:\s*/i, "");
  next = next.replace(/^Which\b/i, "Drag the");
  next = next.replace(/([.?!]\s*)Which\b/g, "$1Drag the");
  next = next.replace(/,\s*which\b/gi, ", drag the");
  next = next.replace(/\bChoose\b/gi, "Drag");
  next = next.replace(/\bSelect\b/gi, "Drag");
  next = next.replace(/\bPick\b/gi, "Drag");
  next = next.replace(/([.?!]\s*)drag\b/g, "$1Drag");
  next = next.replace(/,\s*Drag\b/g, ", drag");
  next = cleanSpaces(next);
  return next;
}

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "postgres",
    port: Number(process.env.DB_PORT || 5432),
    ssl: { rejectUnauthorized: false },
  });

  const result = await pool.query(`
    SELECT id, question_type, question_text
    FROM public.final_content_questions
    WHERE grade='6'
      AND (
        (question_type='fitb' AND question_text ~* '(choose|select|pick|^fill in the blank with the correct answer:)')
        OR (question_type='drag_drop' AND question_text ~* '(choose|select|pick|^drag each choice into the correct group:)')
      )
    ORDER BY question_type, topic, subtopic, id
  `);

  const updates = result.rows.map((row) => {
    const updatedText =
      row.question_type === "fitb"
        ? transformFitb(row.question_text)
        : transformDragDrop(row.question_text);
    return { ...row, updatedText };
  });

  console.log("Preview:");
  for (const row of updates.slice(0, 20)) {
    console.log(`\n${row.id} [${row.question_type}]`);
    console.log(`OLD: ${row.question_text}`);
    console.log(`NEW: ${row.updatedText}`);
  }

  for (const row of updates) {
    if (row.updatedText === row.question_text) continue;
    await pool.query(
      `
        UPDATE public.final_content_questions
        SET question_text = $1,
            updated_at = NOW()
        WHERE id = $2::uuid
      `,
      [row.updatedText, row.id],
    );
  }

  await pool.end();
  console.log(`Updated ${updates.length} rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
