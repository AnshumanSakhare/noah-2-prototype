/**
 * validate-lo-corrected.ts
 * ------------------------
 * Verifies that every learning_objective + subtopic in a corrected export file
 * (.csv or .xlsx) is an EXACT, real entry in question_bank_plan, scoped to that
 * row's own (grade, topic). Read-only — no writes.
 *
 * Usage:
 *   npx tsx scripts/validate-lo-corrected.ts                 # all exports/*_lo_corrected.{csv,xlsx}
 *   npx tsx scripts/validate-lo-corrected.ts <file> [file2]  # specific files
 */
import { readdirSync, readFileSync } from "node:fs";
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

const norm = (s: unknown) =>
  String(s ?? "").toLowerCase().replace(/[‐-―]/g, "-").replace(/\s+/g, " ").trim();
const gnum = (g: unknown) => {
  const v = norm(g).replace("grade", "").trim();
  if (v === "kg" || v === "kindergarten") return 0;
  return Number.parseInt(v.replace(/^g/, ""), 10);
};

async function main() {
  let files = process.argv.slice(2);
  if (files.length === 0) {
    const dir = path.resolve(process.cwd(), "exports");
    files = readdirSync(dir)
      .filter((f) => /_lo_corrected\.(csv|xlsx)$/i.test(f))
      .sort()
      .map((f) => path.join("exports", f));
  }

  const plan = await pool.query(
    "SELECT grade, topic, subtopic, learning_objective FROM question_bank_plan",
  );
  const loSet = new Set<string>();
  const pairSet = new Set<string>();
  const gtLoSet = new Set<string>();
  for (const r of plan.rows) {
    const g = gnum(r.grade);
    const lo = String(r.learning_objective ?? "").trim();
    const st = String(r.subtopic ?? "").trim();
    loSet.add(lo);
    pairSet.add(`${lo}||${st}`);
    gtLoSet.add(`${g}|${norm(r.topic)}|${lo}`);
  }

  let allPass = true;
  console.log("file | rows | LO verbatim | LO+subtopic | LO valid for (grade,topic) | result");
  for (const file of files) {
    const wb = XLSX.readFile(path.resolve(process.cwd(), file));
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], {
      header: 1,
      blankrows: false,
    });
    const h = (rows[0] as string[]).map(String);
    const ci = (n: string) => h.indexOf(n);
    let total = 0;
    let loE = 0;
    let pairE = 0;
    let gtE = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] as unknown[];
      total++;
      const lo = String(r[ci("learning_objective")] ?? "").trim();
      const st = String(r[ci("subtopic")] ?? "").trim();
      const g = gnum(r[ci("grade")]);
      const tp = String(r[ci("topic")] ?? "");
      if (loSet.has(lo)) loE++;
      if (pairSet.has(`${lo}||${st}`)) pairE++;
      if (gtLoSet.has(`${g}|${norm(tp)}|${lo}`)) gtE++;
    }
    const pass = loE === total && pairE === total && gtE === total;
    if (!pass) allPass = false;
    console.log(
      `${path.basename(file)} | ${total} | ${loE}/${total} | ${pairE}/${total} | ${gtE}/${total} | ${pass ? "✓ PASS" : "✗ FAIL"}`,
    );
  }
  console.log(allPass ? "\nALL FILES PASS ✓" : "\nSOME FILES FAILED ✗");
  await pool.end();
  if (!allPass) process.exit(1);
}

main().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
