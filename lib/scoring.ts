// ─────────────────────────────────────────────────────────────────────────────
// EduQuest scoring engine
//
// One generic scorer for all 7 interaction archetypes. Evaluation is declarative:
// each variation stores an `evaluation_spec` JSONB (the correct answer + a
// binary/partial flag) and the student submits a canonical `output` JSONB. The
// scorer matches them and returns a 0–100 performance score.
//
// Scoring math is FIXED per type here in code — `evaluation_spec` only carries
// data (the answer, plus number-line's min/max range), never tunable knobs.
// ─────────────────────────────────────────────────────────────────────────────

export const CANONICAL_TYPES = [
  "tap-select",
  "drag-drop",
  "fill-slot",
  "sequence-order",
  "build-count",
  "number-line",
  "partition",
] as const;

export type CanonicalType = (typeof CANONICAL_TYPES)[number];

// A submission scoring >= this counts as "correct" for is_correct / adaptive logic.
export const PASS_THRESHOLD = 70;

// number-line: full credit within FULL_BAND of the line range, linear falloff to
// zero at ZERO_BAND. Expressed as a fraction of (max - min).
const NUMBER_LINE_FULL_BAND = 0.02;
const NUMBER_LINE_ZERO_BAND = 0.1;

export interface EvaluationSpec {
  type: CanonicalType;
  scoring?: "binary" | "partial"; // defaults to the per-type natural rule
  answer: any;
  // number-line only:
  min?: number;
  max?: number;
}

export interface ScoreResult {
  performance: number; // 0–100 integer
  isCorrect: boolean; // performance >= PASS_THRESHOLD
  breakdown: Record<string, any>;
}

const clampPct = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

const normStr = (v: any): string => String(v ?? "").trim().toLowerCase();

// Numeric-aware equality: compares as numbers when both parse, else as strings.
const valuesEqual = (a: any, b: any): boolean => {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && normStr(a) !== "" && normStr(b) !== "") {
    return na === nb;
  }
  return normStr(a) === normStr(b);
};

// Defensive normalization: accept a bare scalar/array and wrap it into the
// canonical output shape for the given type. Lets older games that emit a raw
// getState() value still be scored.
function normalizeOutput(type: CanonicalType, output: any): any {
  if (output && typeof output === "object" && !Array.isArray(output)) return output;

  switch (type) {
    case "tap-select":
      return { selected: output };
    case "drag-drop":
      return { placements: output && typeof output === "object" ? output : {} };
    case "fill-slot":
      return { slots: output && typeof output === "object" ? output : {} };
    case "sequence-order":
      return { order: Array.isArray(output) ? output : [] };
    case "build-count":
      return { count: output };
    case "number-line":
      return { position: output };
    case "partition":
      return { parts: Array.isArray(output) ? output : [] };
    default:
      return output;
  }
}

function scoreTapSelect(spec: EvaluationSpec, out: any): { pct: number; breakdown: any } {
  const answer = spec.answer;
  const selected = out?.selected;

  // Multi-select when the answer is an array.
  if (Array.isArray(answer)) {
    const chosen: any[] = Array.isArray(selected) ? selected : selected != null ? [selected] : [];
    const correctSet = answer.map(normStr);
    const chosenSet = chosen.map(normStr);

    const correctHits = chosenSet.filter((c) => correctSet.includes(c)).length;
    const wrongHits = chosenSet.filter((c) => !correctSet.includes(c)).length;
    const total = correctSet.length || 1;

    if (spec.scoring === "binary") {
      const perfect = correctHits === correctSet.length && wrongHits === 0;
      return { pct: perfect ? 100 : 0, breakdown: { correctHits, wrongHits, total } };
    }
    const raw = ((correctHits - wrongHits) / total) * 100;
    return { pct: clampPct(raw), breakdown: { correctHits, wrongHits, total } };
  }

  // Single-select — inherently binary.
  const ok = valuesEqual(selected, answer);
  return { pct: ok ? 100 : 0, breakdown: { selected, expected: answer, ok } };
}

function scoreMapping(
  spec: EvaluationSpec,
  studentMap: Record<string, any>,
  key: string
): { pct: number; breakdown: any } {
  const answer = (spec.answer || {}) as Record<string, any>;
  const keys = Object.keys(answer);
  if (keys.length === 0) return { pct: 0, breakdown: { reason: "empty answer key" } };

  let correct = 0;
  const detail: Record<string, boolean> = {};
  for (const k of keys) {
    const ok = valuesEqual(studentMap?.[k], answer[k]);
    detail[k] = ok;
    if (ok) correct++;
  }

  if (spec.scoring === "binary") {
    const perfect = correct === keys.length;
    return { pct: perfect ? 100 : 0, breakdown: { [key]: detail, correct, total: keys.length } };
  }
  return { pct: clampPct((correct / keys.length) * 100), breakdown: { [key]: detail, correct, total: keys.length } };
}

function scoreOrderedArray(
  spec: EvaluationSpec,
  studentArr: any[]
): { pct: number; breakdown: any } {
  const answer: any[] = Array.isArray(spec.answer) ? spec.answer : [];
  if (answer.length === 0) return { pct: 0, breakdown: { reason: "empty answer" } };

  let correctPositions = 0;
  for (let i = 0; i < answer.length; i++) {
    if (valuesEqual(studentArr?.[i], answer[i])) correctPositions++;
  }

  if (spec.scoring === "binary") {
    const perfect = correctPositions === answer.length && studentArr?.length === answer.length;
    return { pct: perfect ? 100 : 0, breakdown: { correctPositions, total: answer.length } };
  }
  return {
    pct: clampPct((correctPositions / answer.length) * 100),
    breakdown: { correctPositions, total: answer.length },
  };
}

function scoreBuildCount(spec: EvaluationSpec, out: any): { pct: number; breakdown: any } {
  const ok = valuesEqual(out?.count, spec.answer);
  return { pct: ok ? 100 : 0, breakdown: { count: out?.count, expected: spec.answer, ok } };
}

function scoreNumberLine(spec: EvaluationSpec, out: any): { pct: number; breakdown: any } {
  const pos = Number(out?.position);
  const target = Number(spec.answer);
  const min = Number(spec.min ?? 0);
  const max = Number(spec.max ?? 1);
  const range = Math.abs(max - min) || 1;

  if (Number.isNaN(pos) || Number.isNaN(target)) {
    return { pct: 0, breakdown: { reason: "non-numeric", pos, target } };
  }

  const errFrac = Math.abs(pos - target) / range;
  let pct: number;
  if (spec.scoring === "binary") {
    pct = errFrac <= NUMBER_LINE_FULL_BAND ? 100 : 0;
  } else if (errFrac <= NUMBER_LINE_FULL_BAND) {
    pct = 100;
  } else if (errFrac >= NUMBER_LINE_ZERO_BAND) {
    pct = 0;
  } else {
    // Linear falloff between the full band and the zero band.
    const span = NUMBER_LINE_ZERO_BAND - NUMBER_LINE_FULL_BAND;
    pct = (1 - (errFrac - NUMBER_LINE_FULL_BAND) / span) * 100;
  }
  return { pct: clampPct(pct), breakdown: { pos, target, errFrac: Number(errFrac.toFixed(4)), range } };
}

function scorePartition(spec: EvaluationSpec, out: any): { pct: number; breakdown: any } {
  const answer: any[] = Array.isArray(spec.answer) ? spec.answer : [];
  const parts: any[] = Array.isArray(out?.parts) ? out.parts : [];
  if (answer.length === 0) return { pct: 0, breakdown: { reason: "empty answer" } };

  // Equal-sharing / fractional splits are order-independent: compare as multisets.
  const sortedAns = [...answer].map(Number).sort((a, b) => a - b);
  const sortedStu = [...parts].map(Number).sort((a, b) => a - b);

  let matched = 0;
  const remaining = [...sortedStu];
  for (const a of sortedAns) {
    const idx = remaining.findIndex((s) => s === a);
    if (idx !== -1) {
      matched++;
      remaining.splice(idx, 1);
    }
  }

  if (spec.scoring === "binary") {
    const perfect = matched === answer.length && parts.length === answer.length;
    return { pct: perfect ? 100 : 0, breakdown: { matched, total: answer.length } };
  }
  return { pct: clampPct((matched / answer.length) * 100), breakdown: { matched, total: answer.length } };
}

/**
 * Score a student's canonical output against an evaluation spec.
 * Always returns a result — never throws — so a malformed submission scores 0.
 */
export function scoreAnswer(evaluationSpec: EvaluationSpec, studentOutput: any): ScoreResult {
  const fail = (reason: string): ScoreResult => ({
    performance: 0,
    isCorrect: false,
    breakdown: { reason },
  });

  try {
    if (!evaluationSpec || typeof evaluationSpec !== "object") return fail("missing evaluation_spec");
    const type = evaluationSpec.type;
    if (!CANONICAL_TYPES.includes(type as CanonicalType)) return fail(`unknown type: ${type}`);
    if (studentOutput === undefined || studentOutput === null) return fail("no student output");

    const out = normalizeOutput(type as CanonicalType, studentOutput);

    let res: { pct: number; breakdown: any };
    switch (type) {
      case "tap-select":
        res = scoreTapSelect(evaluationSpec, out);
        break;
      case "drag-drop":
        res = scoreMapping(evaluationSpec, out?.placements || {}, "placements");
        break;
      case "fill-slot":
        res = scoreMapping(evaluationSpec, out?.slots || {}, "slots");
        break;
      case "sequence-order":
        res = scoreOrderedArray(evaluationSpec, out?.order || []);
        break;
      case "build-count":
        res = scoreBuildCount(evaluationSpec, out);
        break;
      case "number-line":
        res = scoreNumberLine(evaluationSpec, out);
        break;
      case "partition":
        res = scorePartition(evaluationSpec, out);
        break;
      default:
        return fail(`unhandled type: ${type}`);
    }

    const performance = clampPct(res.pct);
    return {
      performance,
      isCorrect: performance >= PASS_THRESHOLD,
      breakdown: { type, scoring: evaluationSpec.scoring || "partial", ...res.breakdown },
    };
  } catch (err: any) {
    return fail(`scoring error: ${err?.message || String(err)}`);
  }
}
