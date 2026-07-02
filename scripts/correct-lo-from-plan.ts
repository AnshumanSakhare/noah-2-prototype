/**
 * correct-lo-from-plan.ts
 * -----------------------
 * Reads an exported interactive-questions .xlsx and, WITHOUT changing any
 * columns, overwrites two existing cells per row:
 *   - learning_objective  -> the best-matching canonical LO from question_bank_plan
 *   - subtopic            -> that LO's canonical subtopic
 *
 * Matching is per (grade, topic): the row's current (AI) LO is fuzzy-matched
 * (Dice coefficient over word tokens) against ONLY that topic's real LOs, and the
 * highest-probability one is chosen. No DB writes — input/output are .xlsx files.
 *
 * Usage:
 *   npx tsx scripts/correct-lo-from-plan.ts exports/interactive_questions_grade_KG.xlsx
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import * as XLSX from "xlsx";

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

const normKey = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[‐-―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const tokens = (s: string) =>
  new Set(normKey(s).split(/[^a-z0-9]+/).filter((w) => w.length > 1));

// Dice similarity over word-token sets (0..1).
function dice(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return (2 * inter) / (A.size + B.size);
}

// question_bank_plan grade -> 0..8 (KG=0).
function planGradeToNum(g: unknown): number {
  const v = normKey(g).replace("grade", "").trim();
  if (v === "kg" || v === "kindergarten") return 0;
  return Number.parseInt(v.replace(/^g/, ""), 10);
}

async function main() {
  const inPath = process.argv[2] || "exports/interactive_questions_grade_KG.xlsx";
  const abs = path.resolve(process.cwd(), inPath);
  const outAbs = abs.replace(/(\.[^.]+)$/, "_lo_corrected$1");

  // 1. Load canonical (grade, topic) -> [{subtopic, lo}] from the plan.
  const plan = await pool.query(
    "SELECT grade, topic, subtopic, learning_objective FROM public.question_bank_plan",
  );
  const candMap = new Map<string, { subtopic: string; lo: string }[]>();
  for (const r of plan.rows) {
    const key = `${planGradeToNum(r.grade)}|${normKey(r.topic)}`;
    if (!candMap.has(key)) candMap.set(key, []);
    candMap.get(key)?.push({
      subtopic: String(r.subtopic ?? "").trim(),
      lo: String(r.learning_objective ?? "").trim(),
    });
  }

  // 2. Read the export sheet as a 2D array (no structural change).
  const wb = XLSX.readFile(abs);
  const sheetName = wb.SheetNames[0];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    blankrows: false,
  });
  const header = (aoa[0] as string[]).map((h) => String(h));
  const idx = (name: string) => header.indexOf(name);
  const cGrade = idx("grade");
  const cTopic = idx("topic");
  const cLo = idx("learning_objective");
  const cSub = idx("subtopic");
  if (cLo < 0 || cSub < 0 || cTopic < 0) {
    throw new Error("Sheet missing learning_objective / subtopic / topic columns.");
  }

  let matched = 0;
  let noCandidates = 0;
  const low: string[] = [];

  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i] as unknown[];
    const gradeNum = planGradeToNum(row[cGrade]) || Number(row[cGrade]) || 0;
    const topic = String(row[cTopic] ?? "");
    const currentLo = String(row[cLo] ?? "");
    const cands = candMap.get(`${gradeNum}|${normKey(topic)}`);
    if (!cands || cands.length === 0) {
      noCandidates++;
      continue;
    }
    // Pick the highest-probability canonical LO.
    let best = cands[0];
    let bestScore = -1;
    for (const c of cands) {
      const s = dice(currentLo, c.lo);
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    row[cLo] = best.lo;
    row[cSub] = best.subtopic;
    matched++;
    if (bestScore < 0.4) {
      low.push(`  [score ${bestScore.toFixed(2)}] ${topic} -> ${best.lo.slice(0, 70)}`);
    }
  }

  // 3. Write a new file with identical columns.
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (outAbs.toLowerCase().endsWith(".csv")) {
    // UTF-8 BOM so Excel renders unicode (box-drawing chars, etc.) correctly.
    writeFileSync(outAbs, `﻿${XLSX.utils.sheet_to_csv(ws)}`, "utf8");
  } else {
    const outWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(outWb, ws, sheetName.slice(0, 31));
    XLSX.writeFile(outWb, outAbs);
  }

  console.log(`✓ Corrected ${matched} rows (LO + subtopic) -> ${outAbs}`);
  if (noCandidates) console.log(`  ${noCandidates} rows had no plan topic match (left unchanged).`);
  if (low.length) {
    console.log(`\n${low.length} low-confidence matches (< 0.40) worth a glance:`);
    console.log(low.join("\n"));
  }
  await pool.end();
}

main().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
