/* eslint-disable no-console */
/**
 * Geometry homework batch — generate + auto-review + auto-fix the 9 games for
 * EACH geometry topic (3 difficulties × 3 indexes = 9 per topic).
 *
 * By default it runs all 8 Grade-7/8 geometry topics (= 72 games). Pass a single
 * topic to run just one (the original "pilot" mode):
 *   PILOT_GRADE=8 PILOT_TOPIC="Properties of Quadrilaterals" pnpm geometry:pilot
 *
 * Pipeline per slot:
 *   1. Brainstorm an idea  (POST /api/admin/generator/ideas)
 *   2. Generate the game   (POST /api/admin/generator/generate, action=create)
 *   3. Hydrate the template (same substitution the homework runner does)
 *   4. Render at the real stage size with Playwright → screenshot
 *   5. Review the screenshot with a vision model against a GEOMETRY rubric
 *   6. If it fails, regenerate with the review feedback (up to MAX_FIX) and re-review
 *   7. Write a combined HTML report (per-topic sections) + results.json
 *
 * PREREQUISITES:
 *   - Dev server running:        pnpm dev           (BASE_URL, default http://localhost:3000)
 *   - DB env (same as app):      DB_USER/DB_PASSWORD/DB_NAME/DB_PORT[/DB_HOST]
 *   - Vision review key:         OPENAI_API_KEY     (REVIEW_MODEL default gpt-5.4)
 *   - Browser binary:            npx playwright install chromium
 *
 * RUN:  pnpm geometry:pilot            # all 8 topics (72 games)
 */

import fs from "node:fs";
import path from "node:path";
import * as dotenvx from "@dotenvx/dotenvx";
import OpenAI from "openai";
import { Pool } from "pg";
import { chromium } from "playwright";

// tsx does not auto-load .env the way Next does — pull in the same vars the app
// uses (DB_*, OPENAI_API_KEY). dotenvx handles encrypted .env files too.
dotenvx.config({
  path: [".env.local", ".env"],
  ignore: ["MISSING_ENV_FILE"],
  quiet: true,
});

/* ------------------------------- config ---------------------------------- */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const REVIEW_MODEL = process.env.REVIEW_MODEL ?? "gpt-5.4";
const MAX_FIX = Number(process.env.MAX_FIX ?? 2);
const OUT_DIR = path.join(process.cwd(), "scripts", "geometry-pilot", "out");

// The 8 geometry topics to generate. Edit this list to change the batch.
const ALL_TOPICS: Array<{ grade: number; name: string }> = [
  { grade: 7, name: "Geometric Constructions" },
  { grade: 7, name: "Lines & Angles" },
  { grade: 7, name: "Properties of Triangles" },
  { grade: 7, name: "Pythagoras Theorem" },
  { grade: 8, name: "3D Shapes & Mensuration" },
  { grade: 8, name: "Geometric Constructions" },
  { grade: 8, name: "Perimeter, Area & Volume" },
  { grade: 8, name: "Properties of Quadrilaterals" },
];

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const INDEXES = [1, 2, 3];
// Geometry-friendly archetypes, rotated across the 9 slots for variety.
const GEO_ARCHETYPES = ["tap-select", "drag-drop", "fill-slot", "sequence-order"];

const STAGE_W = 760;
const STAGE_H = 520;

/** Geometry-specific authoring guidance fed to the generator as `customPrompt`. */
const GEOMETRY_PROMPT = [
  "This is a GEOMETRY question. Diagram quality is the priority.",
  "- Draw the figure as clean, minimal, correctly-proportioned inline SVG (right angles must look like 90°, equal sides equal, etc.).",
  "- LABEL every vertex/side/angle the question refers to, with legible non-overlapping labels placed just outside the figure. Never let a label cross a line or another label.",
  "- Keep TEXT minimal: a one-line prompt at most. Do NOT add paragraphs, hints, or restated definitions — the figure carries the question.",
  `- EVERYTHING must fit inside the ${STAGE_W}×${STAGE_H} stage with comfortable margins: figure ≤ ~300px tall, controls ≤ ~110px, nothing clipped or cramped.`,
  "- Prefer the figure itself as the interaction (tap the right triangle, drag labels onto vertices, fill the missing side/angle). Avoid walls of choice-buttons.",
  "- Distractors must be plausible geometry mistakes (used wrong side, forgot to square/root, swapped angle), not random numbers.",
].join("\n");

const REVIEW_RUBRIC = `You are a meticulous K-8 geometry content reviewer. You are shown a SCREENSHOT of one interactive geometry homework game (rendered at its real stage size). Judge ONLY what you can see.

Score each dimension true/false and explain any failure briefly:
- fitsStage:      the whole game (figure + prompt + answer controls) is fully visible — nothing clipped, cut off, or overflowing the frame.
- diagramCorrect: the geometric figure is drawn correctly and matches the prompt (right angles look 90°, proportions sane, the shape is what the question needs).
- labelsLegible:  all vertex/side/angle labels are readable and do NOT overlap each other or cross the figure's lines.
- notCluttered:   the layout is clean — no messy/overlapping elements, no random decoration, sensible whitespace.
- textConcise:    text is minimal (short prompt/labels), not paragraphs; text is not eating the space the figure/controls need.

Then set:
- overall: "pass" only if ALL five are true; otherwise "fix".
- issues: array of short, specific, actionable problems (empty if pass). Each issue should be phrased as a fix instruction, e.g. "Move the 'B' vertex label outside the triangle; it overlaps the hypotenuse."

Respond with STRICT JSON only, no markdown fences:
{"fitsStage":bool,"diagramCorrect":bool,"labelsLegible":bool,"notCluttered":bool,"textConcise":bool,"overall":"pass"|"fix","issues":[string]}`;

/* ------------------------------- clients --------------------------------- */

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "postgres",
  port: Number(process.env.DB_PORT || 5432),
  ssl: { rejectUnauthorized: false },
});

let _openai: OpenAI | null = null;
function openai(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

/* ------------------------------- types ----------------------------------- */

type Topic = { grade: number; name: string; slug: string };

type Slot = {
  difficulty: (typeof DIFFICULTIES)[number];
  index: number;
  archetype: string;
};

type Verdict = {
  fitsStage: boolean;
  diagramCorrect: boolean;
  labelsLegible: boolean;
  notCluttered: boolean;
  textConcise: boolean;
  overall: "pass" | "fix";
  issues: string[];
};

type SlotResult = {
  slot: Slot;
  variationId?: string;
  attempts: number;
  verdict?: Verdict;
  screenshot?: string;
  error?: string;
};

type TopicRun = { topic: Topic; results: SlotResult[] };

/* ------------------------------- helpers --------------------------------- */

function slugify(grade: number, name: string) {
  return `g${grade}-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<any>;
}

async function brainstormIdea(topic: Topic, slot: Slot) {
  try {
    const json = await postJson(`${BASE_URL}/api/admin/generator/ideas`, {
      grade: topic.grade,
      topic: topic.name,
      difficulty: slot.difficulty,
      interactionArchetype: slot.archetype,
      customPrompt: GEOMETRY_PROMPT,
    });
    if (json?.success && Array.isArray(json.ideas) && json.ideas.length > 0) {
      return json.ideas[0];
    }
  } catch (err) {
    console.warn("  idea step failed (continuing without):", err);
  }
  return null;
}

async function generateSlot(topic: Topic, slot: Slot): Promise<string> {
  const idea = await brainstormIdea(topic, slot);
  let lastErr = "unknown error";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const json = await postJson(`${BASE_URL}/api/admin/generator/generate`, {
      action: "create",
      grade: topic.grade,
      topic: topic.name,
      difficulty: slot.difficulty,
      variationIndex: slot.index,
      interactionArchetype: slot.archetype,
      customPrompt: GEOMETRY_PROMPT,
      selectedIdea: idea,
    });
    if (json?.success && json.data?.variationId) return json.data.variationId;
    lastErr = json?.error ?? "unknown error";
    console.warn(`  generate attempt ${attempt + 1} failed: ${lastErr}`);
  }
  throw new Error(lastErr);
}

async function regenerateSlot(
  topic: Topic,
  slot: Slot,
  variationId: string,
  issues: string[],
) {
  const json = await postJson(`${BASE_URL}/api/admin/generator/generate`, {
    action: "regenerate",
    grade: topic.grade,
    topic: topic.name,
    difficulty: slot.difficulty,
    variationIndex: slot.index,
    variationId,
    customPrompt: `Fix these specific review issues without changing the question's math:\n- ${issues.join("\n- ")}\n\n${GEOMETRY_PROMPT}`,
  });
  if (!json?.success) throw new Error(json?.error ?? "regenerate failed");
  return variationId;
}

/** Replicates the homework runner's hydration so the screenshot matches production. */
function hydrate(templateHtml: string, variationData: Record<string, unknown>) {
  let html = templateHtml;
  for (const key of Object.keys(variationData)) {
    const val = variationData[key];
    const stringVal = typeof val === "object" ? JSON.stringify(val) : String(val);
    html = html.replaceAll(`{{${key}}}`, stringVal);
  }
  html = html.replace(/\{\{\s*[\w.\-]+\s*\}\}/g, "");
  // Standalone (not silent) so the figure renders exactly as a student first sees it.
  const FIT_SHIM = `
<script>(function(){
  function fit(){
    var g=document.querySelector('.game'); if(!g) return;
    g.style.transform='none'; g.style.position='absolute'; g.style.transformOrigin='top left';
    var w=g.offsetWidth,h=g.offsetHeight; if(!w||!h) return;
    var s=Math.min(window.innerWidth/w, window.innerHeight/h, 1);
    g.style.left=Math.max(0,(window.innerWidth-w*s)/2)+'px';
    g.style.top=Math.max(0,(window.innerHeight-h*s)/2)+'px';
    g.style.transform='scale('+s+')';
  }
  window.addEventListener('load',fit); window.addEventListener('resize',fit);
  document.addEventListener('DOMContentLoaded',function(){setTimeout(fit,50);});
  setTimeout(fit,350);
})();</script>`;
  return /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, `${FIT_SHIM}\n</body>`)
    : html + FIT_SHIM;
}

async function fetchHydrated(variationId: string) {
  const res = await pool.query(
    `SELECT qv.variation_data, qt.template_html, qt.interaction_type, qt.learning_objective
     FROM public.question_variations qv
     JOIN public.question_templates qt ON qv.template_id = qt.id
     WHERE qv.id = $1`,
    [variationId],
  );
  if (res.rows.length === 0) throw new Error("variation not found in DB");
  const row = res.rows[0];
  return {
    html: hydrate(row.template_html, row.variation_data ?? {}),
    learningObjective: row.learning_objective as string,
    interactionType: row.interaction_type as string,
  };
}

async function screenshot(html: string, outPath: string) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: STAGE_W, height: STAGE_H },
      deviceScaleFactor: 2,
    });
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForTimeout(700); // let the fit shim + any SVG settle
    await page.screenshot({ path: outPath, type: "png" });
  } finally {
    await browser.close();
  }
}

async function review(pngPath: string, ctx: string): Promise<Verdict> {
  const b64 = fs.readFileSync(pngPath).toString("base64");
  const resp = await openai().responses.create({
    model: REVIEW_MODEL,
    input: [
      { role: "system", content: REVIEW_RUBRIC },
      {
        role: "user",
        content: [
          { type: "input_text", text: ctx },
          {
            type: "input_image",
            image_url: `data:image/png;base64,${b64}`,
            detail: "high",
          },
        ],
      },
    ],
  } as any);
  const text = (resp as any).output_text ?? "";
  const jsonText = text.replace(/```json|```/g, "").trim();
  return JSON.parse(jsonText) as Verdict;
}

/* --------------------------------- run ----------------------------------- */

async function processSlot(topic: Topic, slot: Slot): Promise<SlotResult> {
  const label = `${topic.slug} • ${slot.difficulty}#${slot.index} (${slot.archetype})`;
  console.log(`  ▶ ${label}`);
  try {
    const variationId = await generateSlot(topic, slot);
    let attempts = 1;
    let verdict: Verdict | undefined;
    let shotPath = "";

    for (;;) {
      const { html, learningObjective } = await fetchHydrated(variationId);
      shotPath = path.join(
        OUT_DIR,
        `${topic.slug}-${slot.difficulty}-${slot.index}-try${attempts}.png`,
      );
      await screenshot(html, shotPath);
      verdict = await review(
        shotPath,
        `Grade ${topic.grade} • ${topic.name} • ${slot.difficulty} • ${slot.archetype}\nLearning objective: ${learningObjective}`,
      );
      console.log(
        `    review: ${verdict.overall}${verdict.issues.length ? ` — ${verdict.issues.join("; ")}` : ""}`,
      );

      if (verdict.overall === "pass" || attempts > MAX_FIX) break;
      console.log(`    regenerating (attempt ${attempts + 1})…`);
      await regenerateSlot(topic, slot, variationId, verdict.issues);
      attempts += 1;
    }

    return {
      slot,
      variationId,
      attempts,
      verdict,
      screenshot: path.basename(shotPath),
    };
  } catch (err: any) {
    console.error(`    ✗ ${label}: ${err.message}`);
    return { slot, attempts: 0, error: err.message };
  }
}

function buildSlots(): Slot[] {
  const slots: Slot[] = [];
  let a = 0;
  for (const difficulty of DIFFICULTIES) {
    for (const index of INDEXES) {
      slots.push({
        difficulty,
        index,
        archetype: GEO_ARCHETYPES[a % GEO_ARCHETYPES.length],
      });
      a += 1;
    }
  }
  return slots;
}

function topicTable(run: TopicRun): string {
  const rows = run.results
    .map((r) => {
      const v = r.verdict;
      const badge = r.error
        ? "⚠️ ERROR"
        : v?.overall === "pass"
          ? "✅ PASS"
          : "🔧 FIX";
      const issues = r.error
        ? r.error
        : (v?.issues ?? []).map((i) => `<li>${i}</li>`).join("") || "—";
      const img = r.screenshot
        ? `<img src="out/${r.screenshot}" width="360" style="border:1px solid #ddd;border-radius:8px"/>`
        : "(no screenshot)";
      return `<tr>
        <td>${r.slot.difficulty} #${r.slot.index}<br><small>${r.slot.archetype}</small></td>
        <td>${img}</td>
        <td><b>${badge}</b><br>attempts: ${r.attempts}<br><ul>${issues}</ul></td>
      </tr>`;
    })
    .join("\n");
  const passed = run.results.filter((r) => r.verdict?.overall === "pass").length;
  return `<h2>Grade ${run.topic.grade} · ${run.topic.name} <small>(${passed}/${run.results.length} passed)</small></h2>
<table cellpadding="10" style="border-collapse:collapse" border="1">
<tr><th>Slot</th><th>Render</th><th>Review</th></tr>
${rows}
</table>`;
}

function writeReport(runs: TopicRun[]) {
  const all = runs.flatMap((r) => r.results);
  const passed = all.filter((r) => r.verdict?.overall === "pass").length;
  const summaryRows = runs
    .map((run) => {
      const p = run.results.filter((r) => r.verdict?.overall === "pass").length;
      return `<tr><td>Grade ${run.topic.grade} · ${run.topic.name}</td><td>${p}/${run.results.length}</td></tr>`;
    })
    .join("\n");

  const html = `<!doctype html><meta charset="utf-8">
<title>Geometry batch report</title>
<body style="font-family:system-ui;max-width:1150px;margin:24px auto">
<h1>Geometry batch — ${runs.length} topics · ${all.length} games</h1>
<p><b>${passed}/${all.length}</b> passed review. Model: ${REVIEW_MODEL}.</p>
<table cellpadding="8" style="border-collapse:collapse" border="1"><tr><th>Topic</th><th>Passed</th></tr>${summaryRows}</table>
${runs.map(topicTable).join("\n")}
</body>`;

  fs.writeFileSync(path.join(OUT_DIR, "report.html"), html);
  fs.writeFileSync(
    path.join(OUT_DIR, "results.json"),
    JSON.stringify(runs, null, 2),
  );
  console.log(
    `\n📄 Report: scripts/geometry-pilot/out/report.html  (${passed}/${all.length} passed)`,
  );
}

function preflight() {
  if (!process.env.OPENAI_API_KEY) {
    console.error(
      "\nMissing OPENAI_API_KEY (needed for the vision review).\n" +
        "It should load from .env.local; if not, export it in this shell:\n" +
        '  $env:OPENAI_API_KEY="sk-..."   (PowerShell)\n',
    );
    process.exit(1);
  }
  if (!process.env.DB_NAME && !process.env.DB_USER) {
    console.warn(
      "⚠ No DB_* env detected — the pg pool will fall back to localhost defaults.",
    );
  }
}

function selectTopics(): Topic[] {
  // Single-topic mode if PILOT_TOPIC is given; otherwise the full list.
  if (process.env.PILOT_TOPIC) {
    const grade = Number(process.env.PILOT_GRADE ?? 7);
    const name = process.env.PILOT_TOPIC;
    return [{ grade, name, slug: slugify(grade, name) }];
  }
  return ALL_TOPICS.map((t) => ({ ...t, slug: slugify(t.grade, t.name) }));
}

async function main() {
  preflight();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const topics = selectTopics();
  const slots = buildSlots();
  console.log(
    `Geometry batch — ${topics.length} topic(s) × ${slots.length} slots = ${topics.length * slots.length} games`,
  );

  // Sequential: each slot calls the generator + review model (+ up to MAX_FIX
  // regenerations). Keeps load on the dev server sane and logs readable.
  const runs: TopicRun[] = [];
  for (const topic of topics) {
    console.log(`\n=== Grade ${topic.grade} · ${topic.name} ===`);
    const results: SlotResult[] = [];
    for (const slot of slots) {
      results.push(await processSlot(topic, slot));
    }
    runs.push({ topic, results });
    // Write the report incrementally so progress is visible / crash-safe.
    writeReport(runs);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
