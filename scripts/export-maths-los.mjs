import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";

for (const line of readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i <= 0) continue;
  process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "postgres",
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  ssl: { rejectUnauthorized: false },
});

function cell(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const { rows } = await pool.query(`
  SELECT id, grade, topic, subtopic, learning_objective
  FROM public.question_bank_plan
  ORDER BY (CASE WHEN upper(grade) = 'KG' THEN 0
                 ELSE NULLIF(regexp_replace(grade, '\\D', '', 'g'), '')::int END),
           topic, subtopic, id
`);

const header = ["id", "grade", "topic", "subtopic", "learning_objective"];
const lines = [header.join(",")];
for (const r of rows) {
  lines.push([r.id, r.grade, r.topic, r.subtopic, r.learning_objective].map(cell).join(","));
}
const out = "exports/maths_learning_objectives.csv";
writeFileSync(out, `﻿${lines.join("\n")}\n`, "utf8");

const perGrade = {};
for (const r of rows) perGrade[r.grade] = (perGrade[r.grade] || 0) + 1;
console.log(`✓ Wrote ${rows.length} learning objectives -> ${out}`);
console.log("per grade:", JSON.stringify(perGrade));
console.log(
  "distinct (grade,topic):",
  new Set(rows.map((r) => `${r.grade}|${r.topic}`)).size,
  "| distinct (grade,topic,subtopic):",
  new Set(rows.map((r) => `${r.grade}|${r.topic}|${r.subtopic}`)).size,
);
await pool.end();
