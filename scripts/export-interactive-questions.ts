/**
 * export-interactive-questions.ts
 * --------------------------------
 * Exports the interactive question bank (question_variations ⋈ question_templates)
 * to CSV, mapped onto the MERGED schema in "Schema Merging"
 * (questions + question_versions + question_templates / html_templates).
 *
 * Leading columns follow the Placement CSV sequence:
 *   id (= OLD question_variations.id / the stable id we already generate — also the
 *       external_id carried into migration), question_type, subject, grade, grade_level,
 *   region, topic, subtopic, learning_objective, blooms_level, difficulty_level,
 *   difficulty_rating, ...
 *
 * Nothing is lost: all interactive data lives in `payload`, the template_* columns,
 * and the source_* audit columns (every raw column of both tables is preserved verbatim).
 *
 * Usage:
 *   npx tsx scripts/export-interactive-questions.ts <limit|all> <outPath>
 *   npx tsx scripts/export-interactive-questions.ts --grade=KG          (whole grade -> one .xlsx sheet)
 *   npx tsx scripts/export-interactive-questions.ts --grade=5 all out.csv
 *
 * Flags:
 *   --grade=KG | 0..8   Export only that grade's questions (default: all grades).
 * Output format follows the outPath extension (.xlsx -> single sheet, else CSV).
 * When --grade is given and no outPath is passed, defaults to a per-grade .xlsx file.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  connectionTimeoutMillis: 8000,
});

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s: string;
  if (v instanceof Date) s = v.toISOString();
  else if (typeof v === "object") s = JSON.stringify(v);
  else s = String(v);
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}
const toRow = (vals: unknown[]) => vals.map(cell).join(",");

// Cell value for xlsx (no CSV quoting; objects -> JSON, Date -> ISO).
function xcell(v: unknown): string | number {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "number") return v;
  return String(v);
}

const HEADER = [
  // ---- questions (Placement-CSV sequence) ----
  "id", // = old question_variations.id (stable id / external_id)
  "question_type", // 'interactive'
  "question_text", // blank (interactive prompt is rendered from template + variation_data)
  "subject", // 'Math'
  "grade",
  "grade_level",
  "region", // default 0
  "topic",
  "subtopic", // blank
  "learning_objective",
  "blooms_level", // blank
  "difficulty_level",
  "difficulty_rating", // blank
  // ---- remaining questions fields ----
  "repeat_policy",
  "retired_at",
  "keywords",
  "created_by_admin_user_id",
  "created_at",
  "updated_at",
  "current_version_id",
  "template_id",
  // ---- question_versions ----
  "version_id",
  "version_number",
  "prompt",
  "options",
  "correct_answer",
  "model_answer",
  "explanation",
  "payload",
  "time_allocated_ms",
  "version_created_at",
  "version_created_by_admin_user_id",
  // ---- question_templates (html_templates) ----
  "template_slug",
  "template_interaction_type",
  "template_html",
  "template_props_schema",
  "template_output_schema",
  "template_answer_key_fn",
  "template_structural_fingerprint",
  "template_version",
  "template_status",
  "template_created_at",
  "template_updated_at",
  // ---- source/audit: raw columns preserved verbatim so nothing is lost ----
  "source_variation_status",
  "source_verifier_status",
  "source_last_edited_at",
  "source_template_difficulty",
  "source_template_subtopic",
];

async function main() {
  const argv = process.argv.slice(2);
  const flags = argv.filter((a) => a.startsWith("--"));
  const positional = argv.filter((a) => !a.startsWith("--"));

  // Optional grade filter: --grade=KG or --grade=0..8
  const gradeArg = flags
    .find((a) => a.startsWith("--grade="))
    ?.split("=")[1]
    ?.trim()
    .toLowerCase();
  let gradeFilter: number | null = null;
  let gradeLabel = "all";
  if (gradeArg) {
    gradeFilter = gradeArg === "kg" ? 0 : Number.parseInt(gradeArg, 10);
    if (Number.isNaN(gradeFilter) || gradeFilter < 0 || gradeFilter > 8) {
      console.error(`Invalid --grade="${gradeArg}". Use KG or 0-8.`);
      process.exit(1);
    }
    gradeLabel = gradeFilter === 0 ? "KG" : String(gradeFilter);
  }

  const limitArg = (positional[0] || "all").toLowerCase();
  const defaultName =
    gradeFilter !== null
      ? `exports/interactive_questions_grade_${gradeLabel}.xlsx`
      : `exports/interactive_questions_${limitArg}.csv`;
  const outPath = positional[1] || defaultName;
  const limitSql = limitArg === "all" ? "" : `LIMIT ${Number.parseInt(limitArg, 10)}`;
  const where = gradeFilter !== null ? "WHERE qt.grade = $1" : "";
  const params = gradeFilter !== null ? [gradeFilter] : [];

  const { rows } = await pool.query(
    `
    SELECT
      qv.id, qv.variation_index, qv.variation_data, qv.evaluation_spec, qv.difficulty,
      qv.locale, qv.content_hash, qv.verifier_status, qv.verifier_notes, qv.last_edited_by,
      qv.last_edited_at, qv.status AS v_status, qv.created_at, qv.updated_at,
      qt.id AS t_id, qt.slug AS t_slug, qt.grade AS t_grade, qt.topic AS t_topic,
      qt.subtopic AS t_subtopic, qt.difficulty AS t_difficulty,
      qt.learning_objective AS t_lo, qt.interaction_type AS t_interaction_type,
      qt.template_html AS t_html, qt.props_schema AS t_props, qt.output_schema AS t_output,
      qt.answer_key_fn AS t_answer_fn, qt.structural_fingerprint AS t_fingerprint,
      qt.version AS t_version, qt.status AS t_status,
      qt.created_at AS t_created, qt.updated_at AS t_updated
    FROM public.question_variations qv
    JOIN public.question_templates qt ON qt.id = qv.template_id
    ${where}
    ORDER BY qt.interaction_type, qt.topic, qv.created_at, qv.id
    ${limitSql}
  `,
    params,
  );

  const lines: string[] = [HEADER.join(",")];
  const aoa: (string | number)[][] = [HEADER];

  for (const r of rows) {
    const payload = {
      variation_data: r.variation_data,
      evaluation_spec: r.evaluation_spec,
      locale: r.locale,
      content_hash: r.content_hash,
      verifier_notes: r.verifier_notes,
    };
    const vals = [
        // ---- questions ----
        r.id, // id  (= old variation uuid / external_id)
        "interactive", // question_type
        "", // question_text (blank)
        "Math", // subject
        r.t_grade, // grade
        r.t_grade, // grade_level
        0, // region
        r.t_topic, // topic
        "", // subtopic (blank)
        r.t_lo, // learning_objective
        "", // blooms_level (blank)
        r.difficulty, // difficulty_level
        "", // difficulty_rating (blank)
        // ---- remaining questions fields ----
        "never_repeat", // repeat_policy
        "", // retired_at
        "", // keywords
        r.last_edited_by, // created_by_admin_user_id
        r.created_at, // created_at
        r.updated_at, // updated_at
        "", // current_version_id (resolved at import)
        r.t_id, // template_id
        // ---- question_versions ----
        "", // version_id (new bigint at import)
        r.variation_index, // version_number
        "", // prompt (null; rendered from template + variation_data)
        "", // options (null; lives in payload.variation_data)
        "", // correct_answer (null; answer in payload.evaluation_spec)
        "", // model_answer (null)
        "", // explanation (null)
        payload, // payload <- ALL interactive data
        "", // time_allocated_ms (not stored)
        r.created_at, // version_created_at
        r.last_edited_by, // version_created_by_admin_user_id
        // ---- question_templates ----
        r.t_slug,
        r.t_interaction_type,
        r.t_html,
        r.t_props,
        r.t_output,
        r.t_answer_fn,
        r.t_fingerprint,
        r.t_version,
        r.t_status,
        r.t_created,
        r.t_updated,
        // ---- source/audit (raw, verbatim) ----
        r.v_status, // source_variation_status
        r.verifier_status, // source_verifier_status
        r.last_edited_at, // source_last_edited_at
        r.t_difficulty, // source_template_difficulty
        r.t_subtopic, // source_template_subtopic (raw; main subtopic col is blank)
    ];
    lines.push(toRow(vals));
    aoa.push(vals.map(xcell));
  }

  const abs = path.resolve(process.cwd(), outPath);
  mkdirSync(path.dirname(abs), { recursive: true });

  if (outPath.toLowerCase().endsWith(".xlsx")) {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    const sheetName = (
      gradeFilter !== null ? `grade_${gradeLabel}` : "interactive_questions"
    ).slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, abs);
  } else {
    writeFileSync(abs, `${lines.join("\n")}\n`, "utf8");
  }

  const scope = gradeFilter !== null ? ` (grade ${gradeLabel})` : "";
  console.log(`✓ Wrote ${rows.length} interactive questions${scope} -> ${abs}`);
  await pool.end();
}

main().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
