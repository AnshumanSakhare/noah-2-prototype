import "server-only";

import {
  serveQuestions,
  toClientQuizQuestion,
} from "@/agents/diagnostic/tools/contentQuiz";
import type {
  ClassLevel,
  DifficultyBand,
} from "@/agents/diagnostic/types/index";
import { query } from "@/lib/db";
import { scoreAnswer } from "@/lib/scoring";

/**
 * Prototype homework serving logic (READ-ONLY — never writes to the DB).
 *
 * Builds a 20-question homework for a single (grade, topic):
 *   • 15 from the DIAGNOSTIC pool (final_content_questions_1): 5 easy / 5 med /
 *     5 hard, with variety across mcq / drag_drop / fitb. If a difficulty band
 *     is short in the DB it borrows from the nearest band.
 *   • 5 from the INTERACTIVE pool (question_variations + question_templates):
 *     2 easy / 2 med / 1 hard, hydrated to runnable HTML.
 *
 * Serve order (20 slots):
 *   easy:   D D D I D D I
 *   medium: D D D I D D I
 *   hard:   D D D D D I
 */

export const PROTOTYPE_GRADES = [
  { value: 0, label: "KG" },
  { value: 1, label: "Grade 1" },
  { value: 2, label: "Grade 2" },
  { value: 3, label: "Grade 3" },
  { value: 4, label: "Grade 4" },
  { value: 5, label: "Grade 5" },
  { value: 6, label: "Grade 6" },
  { value: 7, label: "Grade 7" },
  { value: 8, label: "Grade 8" },
] as const;

const DIFFICULTIES: DifficultyBand[] = ["easy", "medium", "hard"];
// Diagnostic question types we want to rotate through for variety.
const VARIETY_TYPES = ["mcq", "drag_drop", "fitb"];

export interface PrototypeTopic {
  topic: string;
  diagnosticCount: number;
  interactiveCount: number;
}

export interface PrototypeDiagnosticOption {
  text: string;
  /** Per-option SVG visual (visual_mode = 'option_svg'). */
  svg?: string;
}

export interface PrototypeDiagnosticQuestion {
  kind: "diagnostic";
  slot: number;
  plannedDifficulty: DifficultyBand;
  difficulty: string;
  id: string;
  questionType: string;
  question: string;
  /** Optional question-level SVG visual (visual_mode = 'question_svg'). */
  questionSvg?: string;
  /** Student-safe options: text + optional SVG (no correctness flags). */
  options?: PrototypeDiagnosticOption[];
  /** Sanitized payload (structure/visuals only — answer keys stripped). */
  payload?: Record<string, unknown>;
}

export interface PrototypeInteractiveQuestion {
  kind: "interactive";
  slot: number;
  plannedDifficulty: DifficultyBand;
  difficulty: string;
  id: string;
  interactionType: string;
  learningObjective?: string;
  html: string;
}

export type PrototypeQuestion =
  | PrototypeDiagnosticQuestion
  | PrototypeInteractiveQuestion;

export interface PrototypeHomework {
  grade: number;
  gradeLabel: string;
  subject: string;
  topic: string;
  total: number;
  counts: { diagnostic: number; interactive: number };
  questions: PrototypeQuestion[];
}

function gradeToClassLevel(grade: number): ClassLevel {
  if (grade <= 0) return "classKG";
  return `class${Math.min(grade, 8)}` as ClassLevel;
}

function diagGradeText(grade: number): string {
  return grade <= 0 ? "KG" : String(grade);
}

function gradeLabel(grade: number): string {
  return (
    PROTOTYPE_GRADES.find((g) => g.value === grade)?.label ?? `Grade ${grade}`
  );
}

/** Topics that have data in BOTH pools for a grade — safe choices for the demo. */
export async function getPrototypeTopics(
  grade: number,
): Promise<PrototypeTopic[]> {
  const result = await query(
    `
    WITH diag AS (
      SELECT btrim(topic) AS topic, count(*)::int AS dc
      FROM final_content_questions_1
      WHERE question_type IS NOT NULL AND grade = $1
      GROUP BY btrim(topic)
    ),
    inter AS (
      SELECT btrim(qt.topic) AS topic, count(*)::int AS ic
      FROM question_variations qv
      JOIN question_templates qt ON qv.template_id = qt.id
      WHERE qv.status <> 'deprecated'
        AND qv.verifier_status <> 'failed'
        AND qt.grade = $2
      GROUP BY btrim(qt.topic)
    )
    SELECT d.topic, d.dc AS diagnostic_count, i.ic AS interactive_count
    FROM diag d
    JOIN inter i ON lower(d.topic) = lower(i.topic)
    ORDER BY d.topic
    `,
    [diagGradeText(grade), grade],
  );

  return result.rows.map(
    (row: {
      topic: string;
      diagnostic_count: number;
      interactive_count: number;
    }) => ({
      topic: row.topic,
      diagnosticCount: row.diagnostic_count,
      interactiveCount: row.interactive_count,
    }),
  );
}

/** Round-robin across question types so a slate isn't all-MCQ. */
function pickWithVariety(
  candidates: PrototypeDiagnosticQuestion[],
  count: number,
  used: Set<string>,
): PrototypeDiagnosticQuestion[] {
  const byType = new Map<string, PrototypeDiagnosticQuestion[]>();
  for (const q of candidates) {
    if (used.has(q.id)) continue;
    if (!byType.has(q.questionType)) byType.set(q.questionType, []);
    byType.get(q.questionType)?.push(q);
  }
  // Order the type queues: preferred variety first, then any others present.
  const types = [
    ...VARIETY_TYPES.filter((t) => byType.has(t)),
    ...[...byType.keys()].filter((t) => !VARIETY_TYPES.includes(t)),
  ];

  const picked: PrototypeDiagnosticQuestion[] = [];
  let progressed = true;
  while (picked.length < count && progressed) {
    progressed = false;
    for (const type of types) {
      if (picked.length >= count) break;
      const queue = byType.get(type);
      const next = queue?.shift();
      if (next) {
        used.add(next.id);
        picked.push(next);
        progressed = true;
      }
    }
  }
  return picked;
}

async function loadDiagnosticCandidates(
  grade: number,
  topic: string,
  difficulty: DifficultyBand,
): Promise<PrototypeDiagnosticQuestion[]> {
  const { questions } = await serveQuestions({
    source: "diagnostic",
    classLevel: gradeToClassLevel(grade),
    region: "US",
    topics: [topic],
    questionTypes: ["mcq", "drag_drop", "fitb"],
    difficulties: [difficulty],
    order: "random",
    limit: 60,
    offset: 0,
  });

  return questions.map((q) => {
    // Strip answer keys for client delivery (answers stay server-side until grading).
    const safe = toClientQuizQuestion(q);
    const full = (q.payload ?? {}) as {
      questionSvg?: unknown;
      options?: Array<{ svg?: unknown }>;
    };
    const payloadOptions = Array.isArray(full.options) ? full.options : [];
    const options: PrototypeDiagnosticOption[] | undefined = q.options?.map(
      (text, i) => {
        const svg = payloadOptions[i]?.svg;
        return typeof svg === "string" && svg.trim().startsWith("<svg")
          ? { text, svg }
          : { text };
      },
    );
    const questionSvg =
      typeof full.questionSvg === "string" &&
      full.questionSvg.trim().startsWith("<svg")
        ? full.questionSvg
        : undefined;

    return {
      kind: "diagnostic" as const,
      slot: 0,
      plannedDifficulty: difficulty,
      difficulty: q.difficultyLevel || difficulty,
      id: q.id,
      questionType: q.questionType,
      question: q.question,
      questionSvg,
      options,
      payload: safe.payload as Record<string, unknown> | undefined,
    };
  });
}

/** Select 5/5/5 diagnostic questions with type variety + cross-band fallback. */
async function selectDiagnostic(
  grade: number,
  topic: string,
): Promise<Record<DifficultyBand, PrototypeDiagnosticQuestion[]>> {
  const candidates: Record<DifficultyBand, PrototypeDiagnosticQuestion[]> = {
    easy: await loadDiagnosticCandidates(grade, topic, "easy"),
    medium: await loadDiagnosticCandidates(grade, topic, "medium"),
    hard: await loadDiagnosticCandidates(grade, topic, "hard"),
  };

  const used = new Set<string>();
  const selected: Record<DifficultyBand, PrototypeDiagnosticQuestion[]> = {
    easy: [],
    medium: [],
    hard: [],
  };

  // Borrow order when a band is short (nearest band first).
  const fallback: Record<DifficultyBand, DifficultyBand[]> = {
    easy: ["medium", "hard"],
    medium: ["easy", "hard"],
    hard: ["medium", "easy"],
  };

  for (const band of DIFFICULTIES) {
    selected[band] = pickWithVariety(candidates[band], 5, used);
    if (selected[band].length < 5) {
      for (const alt of fallback[band]) {
        if (selected[band].length >= 5) break;
        const more = pickWithVariety(
          candidates[alt],
          5 - selected[band].length,
          used,
        );
        selected[band].push(...more);
      }
    }
  }

  return selected;
}

// ---- Interactive pool ----------------------------------------------------

const FIT_SHIM = `
<script>(function(){
  try {
    var st = document.createElement('style');
    st.textContent = 'html,body{height:100%!important;width:100%!important;margin:0!important;overflow:hidden!important;}body{display:block!important;}';
    (document.head||document.documentElement).appendChild(st);
  } catch(e){}
  function fit(){
    var g = document.querySelector('.game');
    if(!g) return;
    g.style.height = 'auto'; g.style.transform = 'none';
    g.style.position = 'absolute'; g.style.transformOrigin = 'top left';
    var w = g.offsetWidth, h = g.offsetHeight;
    if(!w || !h) return;
    var s = Math.min(window.innerWidth / w, window.innerHeight / h, 1);
    g.style.left = Math.max(0, (window.innerWidth - w * s) / 2) + 'px';
    g.style.top = Math.max(0, (window.innerHeight - h * s) / 2) + 'px';
    g.style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('load', fit);
  window.addEventListener('resize', fit);
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(fit, 50); });
  setTimeout(fit, 350);
})();</script>`;

function hydrate(
  templateHtml: string,
  variationData: Record<string, unknown>,
): string {
  let html = templateHtml;
  for (const key in variationData) {
    const val = variationData[key];
    const stringVal =
      typeof val === "object" ? JSON.stringify(val) : String(val);
    html = html.replaceAll(`{{${key}}}`, stringVal);
  }
  html = html.replace(/\{\{\s*[\w.-]+\s*\}\}/g, "");
  html = html.replace(
    /<head>/i,
    "<head>\n<script>window.SILENT_MODE = true;</script>",
  );
  html = /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, `${FIT_SHIM}\n</body>`)
    : html + FIT_SHIM;
  return html;
}

interface InteractiveRow {
  id: string;
  difficulty: string;
  interaction_type: string;
  learning_objective: string | null;
  template_html: string;
  variation_data: Record<string, unknown>;
}

/** Select 2/2/1 interactive questions (with fallback) and hydrate them. */
async function selectInteractive(
  grade: number,
  topic: string,
): Promise<Record<DifficultyBand, PrototypeInteractiveQuestion[]>> {
  const result = await query(
    `
    SELECT qv.id::text AS id,
           qv.difficulty,
           qv.variation_data,
           qt.interaction_type,
           qt.learning_objective,
           qt.template_html
    FROM question_variations qv
    JOIN question_templates qt ON qv.template_id = qt.id
    WHERE qt.grade = $1
      AND lower(btrim(qt.topic)) = lower($2)
      AND qv.status <> 'deprecated'
      AND qv.verifier_status <> 'failed'
      AND qt.template_html IS NOT NULL
    ORDER BY random()
    `,
    [grade, topic],
  );

  const rows = result.rows as InteractiveRow[];
  const pools: Record<DifficultyBand, InteractiveRow[]> = {
    easy: [],
    medium: [],
    hard: [],
  };
  for (const row of rows) {
    const band = (row.difficulty as DifficultyBand) || "easy";
    (pools[band] ?? pools.easy).push(row);
  }

  const used = new Set<string>();
  const targets: Record<DifficultyBand, number> = {
    easy: 2,
    medium: 2,
    hard: 1,
  };
  const fallback: Record<DifficultyBand, DifficultyBand[]> = {
    easy: ["medium", "hard"],
    medium: ["easy", "hard"],
    hard: ["medium", "easy"],
  };

  const toQuestion = (
    row: InteractiveRow,
    band: DifficultyBand,
  ): PrototypeInteractiveQuestion => ({
    kind: "interactive",
    slot: 0,
    plannedDifficulty: band,
    difficulty: row.difficulty || band,
    id: row.id,
    interactionType: row.interaction_type,
    learningObjective: row.learning_objective ?? undefined,
    html: hydrate(row.template_html, row.variation_data ?? {}),
  });

  const take = (
    band: DifficultyBand,
    n: number,
  ): PrototypeInteractiveQuestion[] => {
    const out: PrototypeInteractiveQuestion[] = [];
    const drawFrom = [band, ...fallback[band]];
    for (const src of drawFrom) {
      for (const row of pools[src]) {
        if (out.length >= n) break;
        if (used.has(row.id)) continue;
        used.add(row.id);
        out.push(toQuestion(row, band));
      }
      if (out.length >= n) break;
    }
    return out;
  };

  return {
    easy: take("easy", targets.easy),
    medium: take("medium", targets.medium),
    hard: take("hard", targets.hard),
  };
}

// Slot plan: 'd' = diagnostic, 'i' = interactive.
const SERVE_PLAN: Array<{ src: "d" | "i"; band: DifficultyBand }> = [
  { src: "d", band: "easy" },
  { src: "d", band: "easy" },
  { src: "d", band: "easy" },
  { src: "i", band: "easy" },
  { src: "d", band: "easy" },
  { src: "d", band: "easy" },
  { src: "i", band: "easy" },
  { src: "d", band: "medium" },
  { src: "d", band: "medium" },
  { src: "d", band: "medium" },
  { src: "i", band: "medium" },
  { src: "d", band: "medium" },
  { src: "d", band: "medium" },
  { src: "i", band: "medium" },
  { src: "d", band: "hard" },
  { src: "d", band: "hard" },
  { src: "d", band: "hard" },
  { src: "d", band: "hard" },
  { src: "d", band: "hard" },
  { src: "i", band: "hard" },
];

export async function buildPrototypeHomework(
  grade: number,
  topic: string,
): Promise<PrototypeHomework> {
  const [diagnostic, interactive] = await Promise.all([
    selectDiagnostic(grade, topic),
    selectInteractive(grade, topic),
  ]);

  // Mutable queues consumed in serve order.
  const dq: Record<DifficultyBand, PrototypeDiagnosticQuestion[]> = {
    easy: [...diagnostic.easy],
    medium: [...diagnostic.medium],
    hard: [...diagnostic.hard],
  };
  const iq: Record<DifficultyBand, PrototypeInteractiveQuestion[]> = {
    easy: [...interactive.easy],
    medium: [...interactive.medium],
    hard: [...interactive.hard],
  };

  const questions: PrototypeQuestion[] = [];
  let slot = 1;
  for (const step of SERVE_PLAN) {
    const item =
      step.src === "d" ? dq[step.band].shift() : iq[step.band].shift();
    if (!item) continue; // not enough data for this slot — skip gracefully
    questions.push({ ...item, slot });
    slot += 1;
  }

  const diagnosticCount = questions.filter(
    (q) => q.kind === "diagnostic",
  ).length;
  const interactiveCount = questions.length - diagnosticCount;

  return {
    grade,
    gradeLabel: gradeLabel(grade),
    subject: "Math",
    topic,
    total: questions.length,
    counts: { diagnostic: diagnosticCount, interactive: interactiveCount },
    questions,
  };
}

// ---- Grading (results page) ----------------------------------------------

export interface GradeItem {
  id: string;
  kind: "diagnostic" | "interactive";
  studentAnswer: unknown;
}

export interface GradeResult {
  id: string;
  performance: number; // 0-100
  isCorrect: boolean;
  yourAnswer: string;
  correctAnswer: string;
  /** MCQ only — option indices so the UI can highlight visual options. */
  yourIndex?: number;
  correctIndex?: number;
  /** Optional pedagogical note (working / distractor rationale) from the spec. */
  note?: string;
}

function norm(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

async function gradeDiagnostic(items: GradeItem[]): Promise<GradeResult[]> {
  const ids = items.map((i) => i.id);
  if (ids.length === 0) return [];
  const { questions } = await serveQuestions({
    source: "diagnostic",
    region: "US",
    ids,
    order: "default",
    limit: ids.length,
    offset: 0,
  });
  const byId = new Map(questions.map((q) => [q.id, q]));

  return items.map((item) => {
    const q = byId.get(item.id);
    if (!q) {
      return {
        id: item.id,
        performance: 0,
        isCorrect: false,
        yourAnswer: "—",
        correctAnswer: "—",
      };
    }
    const payload = (q.payload ?? {}) as Record<string, unknown>;

    if (q.questionType === "mcq") {
      const idx =
        typeof item.studentAnswer === "number" ? item.studentAnswer : -1;
      const correctIdx = q.correctAnswer
        ? LETTERS.indexOf(q.correctAnswer)
        : -1;
      const isCorrect = idx >= 0 && idx === correctIdx;
      // Visual options have empty text — fall back to the option letter.
      const label = (i: number) => {
        const text = q.options?.[i];
        return text?.trim() ? text : `Option ${LETTERS[i] ?? i + 1}`;
      };
      return {
        id: item.id,
        performance: isCorrect ? 100 : 0,
        isCorrect,
        yourAnswer: idx >= 0 ? label(idx) : "No answer",
        correctAnswer: correctIdx >= 0 ? label(correctIdx) : "—",
        yourIndex: idx >= 0 ? idx : undefined,
        correctIndex: correctIdx >= 0 ? correctIdx : undefined,
      };
    }

    if (q.questionType === "fitb") {
      const model = q.modelAnswer ?? String(payload.answer ?? "");
      const acceptable = Array.isArray(payload.acceptableAnswers)
        ? (payload.acceptableAnswers as unknown[]).map(norm)
        : [];
      const given = norm(item.studentAnswer);
      const isCorrect =
        given.length > 0 &&
        (given === norm(model) || acceptable.includes(given));
      return {
        id: item.id,
        performance: isCorrect ? 100 : 0,
        isCorrect,
        yourAnswer: given ? String(item.studentAnswer) : "No answer",
        correctAnswer: model || "—",
      };
    }

    // drag_drop: studentAnswer is { item: zone }
    const answerKey = Array.isArray(payload.answerKey)
      ? (payload.answerKey as Array<{ item: string; target: string }>)
      : [];
    const given =
      item.studentAnswer && typeof item.studentAnswer === "object"
        ? (item.studentAnswer as Record<string, string>)
        : {};
    let correct = 0;
    for (const pair of answerKey) {
      if (norm(given[pair.item]) === norm(pair.target)) correct += 1;
    }
    const total = answerKey.length || 1;
    const performance = Math.round((correct / total) * 100);
    return {
      id: item.id,
      performance,
      isCorrect: correct === answerKey.length && answerKey.length > 0,
      yourAnswer:
        Object.entries(given)
          .map(([k, v]) => `${k} → ${v}`)
          .join(", ") || "No answer",
      correctAnswer: answerKey.map((p) => `${p.item} → ${p.target}`).join(", "),
    };
  });
}

async function gradeInteractive(items: GradeItem[]): Promise<GradeResult[]> {
  const ids = items.map((i) => i.id);
  if (ids.length === 0) return [];
  const result = await query(
    `SELECT id::text AS id, evaluation_spec FROM question_variations WHERE id = ANY($1::uuid[])`,
    [ids],
  );
  const specById = new Map<string, unknown>(
    result.rows.map((r: { id: string; evaluation_spec: unknown }) => [
      r.id,
      r.evaluation_spec,
    ]),
  );

  return items.map((item) => {
    const spec = specById.get(item.id);
    // biome-ignore lint/suspicious/noExplicitAny: scoreAnswer takes the runtime spec
    const score = scoreAnswer(spec as any, item.studentAnswer);
    // biome-ignore lint/suspicious/noExplicitAny: answer field is spec-shaped
    const answer = (spec as any)?.answer;
    // Pull the solution "working" notes (pedagogical feedback) when present.
    // biome-ignore lint/suspicious/noExplicitAny: notes is a free-form object
    const notes = (spec as any)?.notes;
    let note: string | undefined;
    if (notes && typeof notes === "object") {
      const working = Object.entries(notes)
        .filter(([k]) => /working|solution/i.test(k))
        .map(([, v]) => String(v));
      if (working.length > 0) note = working.join(" · ");
    }
    return {
      id: item.id,
      performance: score.performance,
      isCorrect: score.isCorrect,
      yourAnswer:
        item.studentAnswer == null
          ? "No answer"
          : typeof item.studentAnswer === "object"
            ? JSON.stringify(item.studentAnswer)
            : String(item.studentAnswer),
      correctAnswer:
        answer == null
          ? "—"
          : typeof answer === "object"
            ? JSON.stringify(answer)
            : String(answer),
      ...(note ? { note } : {}),
    };
  });
}

/** Grade a mixed set of answered questions (read-only — answers stay server-side). */
export async function gradePrototypeAnswers(
  items: GradeItem[],
): Promise<GradeResult[]> {
  const diag = items.filter((i) => i.kind === "diagnostic");
  const inter = items.filter((i) => i.kind === "interactive");
  const [a, b] = await Promise.all([
    gradeDiagnostic(diag),
    gradeInteractive(inter),
  ]);
  return [...a, ...b];
}
