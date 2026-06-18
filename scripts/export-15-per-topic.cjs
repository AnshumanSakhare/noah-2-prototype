/**
 * export-15-per-topic.cjs — READ-ONLY export.
 *
 * For every topic in `topics`, pull 15 diagnostic questions:
 *   - difficulty split   5 easy / 5 medium / 5 hard
 *   - type split         7 mcq / 4 fitb / 4 drag_drop   (7:4:4)
 *                        → if fitb/dnd are short, the shortfall is filled with mcq
 *                          (so the topic still reaches 15).
 *   - region             GLOBAL questions first; regional (us/uk/…) used ONLY
 *                          when global can't fill the slot.
 * merging `questions` + `question_versions` (+ region) into the denormalized
 * CSV format (same headers as Placement_updated_questions.csv).
 *
 * Joint target matrix (rows sum 7/4/4, cols sum 5/5/5):
 *            easy med hard
 *   mcq        3   2   2
 *   fitb       1   2   1
 *   drag_drop  1   1   2
 *
 * SAFETY: only SELECT queries — nothing is inserted/updated/deleted.
 * Run:  node scripts/export-15-per-topic.cjs
 */
const fs = require("fs");
const path = require("path");

try {
  const env = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
  env.split(/\r?\n/).forEach((l) => {
    const t = l.trim();
    if (!t || t.startsWith("#")) return;
    const i = t.indexOf("=");
    if (i <= 0) return;
    process.env[t.slice(0, i).trim()] = t
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  });
} catch {}

const { Pool } = require("pg");
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "postgres",
  port: +(process.env.DB_PORT || 5432),
  ssl: { rejectUnauthorized: false },
});

const OUT = path.resolve(process.cwd(), "diagnostic_15_per_topic.csv");
const TYPES = ["mcq", "fitb", "drag_drop"];
const DIFFS = ["easy", "medium", "hard"];
const TARGET = {
  mcq: { easy: 3, medium: 2, hard: 2 },
  fitb: { easy: 1, medium: 2, hard: 1 },
  drag_drop: { easy: 1, medium: 1, hard: 2 },
};
const PER_TOPIC = 15;
const PER_DIFF = 5;

const HEADERS = [
  "id", "question_type", "question_text", "subject", "grade", "grade_level",
  "region", "topic", "subtopic", "learning_objective", "blooms_level",
  "difficulty_level", "difficulty_rating", "options", "explanation",
  "generation_metadata", "created_at", "updated_at", "rownumber", "summary",
];

const esc = (v) => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const iso = (d) => (d instanceof Date ? d.toISOString() : d ?? "");
const isGlobal = (r) => r.region === "global";

function pickForTopic(rows) {
  // candidates already arrive global-first within each (type,difficulty) cell.
  const buckets = {};
  for (const r of rows) {
    (buckets[`${r.question_type}|${r.difficulty_level}`] ||= []).push(r);
  }
  const chosen = [];
  const used = new Set();
  const diffCount = { easy: 0, medium: 0, hard: 0 };
  const take = (r) => {
    chosen.push(r);
    used.add(r.id);
    diffCount[r.difficulty_level]++;
  };

  // 1) fill the 7/4/4 × 5/5/5 matrix (global-first thanks to SQL ordering)
  for (const type of TYPES) {
    for (const diff of DIFFS) {
      const want = TARGET[type][diff];
      const cell = buckets[`${type}|${diff}`] || [];
      for (let i = 0; i < want && i < cell.length; i++) take(cell[i]);
    }
  }

  // 2) backfill to 15 — prefer (a) difficulty columns still under 5,
  //    (b) mcq, (c) global. So fitb/dnd shortfalls get topped up with mcq.
  if (chosen.length < PER_TOPIC) {
    const leftovers = rows.filter((r) => !used.has(r.id));
    leftovers.sort((a, b) => {
      const au = diffCount[a.difficulty_level] < PER_DIFF ? 0 : 1;
      const bu = diffCount[b.difficulty_level] < PER_DIFF ? 0 : 1;
      if (au !== bu) return au - bu;
      const am = a.question_type === "mcq" ? 0 : 1;
      const bm = b.question_type === "mcq" ? 0 : 1;
      if (am !== bm) return am - bm;
      const ag = isGlobal(a) ? 0 : 1;
      const bg = isGlobal(b) ? 0 : 1;
      if (ag !== bg) return ag - bg;
      return Math.random() - 0.5;
    });
    for (const r of leftovers) {
      if (chosen.length >= PER_TOPIC) break;
      take(r);
    }
  }
  return chosen.slice(0, PER_TOPIC);
}

(async () => {
  const topics = await pool.query("SELECT id, name FROM public.topics ORDER BY id");
  console.log(`Topics: ${topics.rows.length}`);

  const lines = [HEADERS.join(",")];
  let rownumber = 0;
  const short = [];
  let globalCount = 0;
  let regionalCount = 0;

  for (const topic of topics.rows) {
    // up to 12 candidates per (type,difficulty), ordered GLOBAL-first then random,
    // so the matrix pick prefers global and only spills to regional when needed.
    const res = await pool.query(
      `
      WITH ranked AS (
        SELECT
          q.id::text AS id,
          q.question_type::text AS question_type,
          q.difficulty_band::text AS difficulty_level,
          q.difficulty_rating,
          q.bloom_level::text AS blooms_level,
          q.grade, q.grade_level, q.created_at, q.updated_at,
          t.name AS topic, t.subject_label AS subject,
          st.name AS subtopic, lo.description AS learning_objective,
          v.prompt AS question_text, v.options, v.explanation, v.payload,
          reg.code AS region,
          row_number() OVER (
            PARTITION BY q.question_type, q.difficulty_band
            ORDER BY (reg.code = 'global') DESC, random()
          ) AS rn
        FROM public.questions q
        JOIN public.topics t ON t.id = q.topic_id
        LEFT JOIN public.subtopics st ON st.id = q.subtopic_id
        LEFT JOIN public.learning_objectives lo ON lo.id = q.learning_objective_id
        JOIN LATERAL (
          SELECT prompt, options, explanation, payload
          FROM public.question_versions
          WHERE question_id = q.id
          ORDER BY (id = q.current_version_id) DESC, version_number DESC
          LIMIT 1
        ) v ON true
        LEFT JOIN LATERAL (
          SELECT r.code
          FROM public.question_region_mappings m
          JOIN public.regions r ON r.id = m.region_id
          WHERE m.question_id = q.id
          ORDER BY (r.code = 'global') DESC
          LIMIT 1
        ) reg ON true
        WHERE q.topic_id = $1
          AND q.lifecycle_status = 'active'
          AND q.question_type IN ('mcq','fitb','drag_drop')
      )
      SELECT * FROM ranked WHERE rn <= 12
      `,
      [topic.id],
    );

    const chosen = pickForTopic(res.rows);
    if (chosen.length < PER_TOPIC) short.push(`${topic.name} (${chosen.length}/15)`);

    for (const r of chosen) {
      rownumber += 1;
      if (isGlobal(r)) globalCount++;
      else regionalCount++;
      const optionsOut =
        r.options === null || r.options === undefined ? "[]" : r.options;
      const row = {
        id: r.id,
        question_type: r.question_type,
        question_text: r.question_text,
        subject: r.subject,
        grade: r.grade,
        grade_level: r.grade_level,
        region: r.region ?? "",
        topic: r.topic,
        subtopic: r.subtopic,
        learning_objective: r.learning_objective,
        blooms_level: r.blooms_level,
        difficulty_level: r.difficulty_level,
        difficulty_rating: r.difficulty_rating,
        options: optionsOut,
        explanation: r.explanation,
        generation_metadata: r.payload ?? {},
        created_at: iso(r.created_at),
        updated_at: iso(r.updated_at),
        rownumber,
        summary: `${r.question_type} for ${r.topic}`,
      };
      lines.push(HEADERS.map((h) => esc(row[h])).join(","));
    }
  }

  fs.writeFileSync(OUT, lines.join("\n"), "utf8");
  console.log(`\n✅ Wrote ${OUT}`);
  console.log(`   rows: ${rownumber}  (target ${topics.rows.length * 15})`);
  console.log(`   region: ${globalCount} global / ${regionalCount} regional`);
  if (short.length) {
    console.log(`\n⚠ ${short.length} topics had < 15 available:`);
    console.log("   " + short.join("\n   "));
  }
  await pool.end();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
