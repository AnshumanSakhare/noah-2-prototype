import type { NextRequest } from "next/server";

import {
  BLOOM_FILTERS,
  type BloomFilter,
  DEFAULT_DIAGNOSTIC_REGION,
  DIAGNOSTIC_REGIONS,
  DIFFICULTY_BANDS,
  DIFFICULTY_RATING_MAX,
  DIFFICULTY_RATING_MIN,
  QUESTION_ORDERINGS,
  QUESTION_SOURCES,
  QUESTION_TYPES,
  type QuestionOrdering,
  type QuestionSource,
  type ServeQuestionsFilters,
} from "@/agents/diagnostic/tools/contentQuiz";
import type {
  ClassLevel,
  DiagnosticRegion,
  DifficultyBand,
  QuestionType,
  Subject,
} from "@/agents/diagnostic/types/index";
import { API_ERROR_CODES, apiError } from "@/lib/api-response";

export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 20;

/* ----------------------------- input mappings ----------------------------- */

const SOURCE_ALIASES: Record<string, QuestionSource> = {
  diagnostic: "diagnostic",
  diagnostic_test: "diagnostic",
  diagnostictest: "diagnostic",
  topic: "diagnostic",
  grade: "diagnostic",
  placement: "placement",
  placement_test: "placement",
  placementtest: "placement",
};

const SUBJECT_ALIASES: Record<string, Subject> = {
  maths: "Maths",
  math: "Maths",
  mathematics: "Maths",
  // `Geometry` is a real (rare) value stored in the diagnostic bank.
  geometry: "Geometry" as Subject,
  science: "Science",
  english: "English",
  "social studies": "Social Studies",
  social_studies: "Social Studies",
  socialstudies: "Social Studies",
};
const SUBJECT_LABELS = "Maths, Geometry, Science, English, Social Studies";

const QUESTION_TYPE_ALIASES: Record<string, QuestionType> = {
  mcq: "mcq",
  multiple_choice: "mcq",
  true_false: "true_false",
  truefalse: "true_false",
  tf: "true_false",
  fitb: "fitb",
  gitb: "fitb",
  fill_in_the_blank: "fitb",
  fillintheblank: "fitb",
  matching: "matching",
  match: "matching",
  drag_drop: "drag_drop",
  dnd: "drag_drop",
  draganddrop: "drag_drop",
  "drag-and-drop": "drag_drop",
  drag_n_drop: "drag_drop",
  short_answer: "short_answer",
  shortanswer: "short_answer",
  word_problem: "word_problem",
  wordproblem: "word_problem",
  open_response: "open_response",
  openresponse: "open_response",
};

const DIFFICULTY_ALIASES: Record<string, DifficultyBand> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

const BLOOM_ALIASES: Record<string, BloomFilter> = {
  remember: "remember",
  remembering: "remember",
  knowing: "remember",
  understand: "understand",
  understanding: "understand",
  apply: "apply",
  applying: "apply",
  analyze: "analyze",
  analyse: "analyze",
  analyzing: "analyze",
  evaluate: "evaluate",
  evaluating: "evaluate",
  create: "create",
  creating: "create",
};

/* ------------------------------ input parsing ----------------------------- */

export type RawValue = string | string[] | number | boolean | undefined | null;
export type RawInput = Record<string, RawValue>;

export type FieldError = { field: string; issue: string };

function normKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function isSet(value: RawValue): boolean {
  return value !== undefined && value !== null && value !== "";
}

/** Comma-split safe values (e.g. enums, uuids — never free text with commas). */
function toList(value: RawValue): string[] {
  if (!isSet(value)) return [];
  const parts = Array.isArray(value) ? value : String(value).split(",");
  return parts.map((part) => String(part).trim()).filter(Boolean);
}

/** Repeated/array values WITHOUT comma-splitting (topics contain commas). */
function toListNoSplit(value: RawValue): string[] {
  if (!isSet(value)) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((item) => String(item).trim()).filter(Boolean);
}

function trimOrUndef(value: RawValue): string | undefined {
  if (!isSet(value)) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function parseGrade(raw: string): ClassLevel | null {
  const value = normKey(raw)
    .replace(/^class/, "")
    .replace(/^grade/, "")
    .trim();
  if (value === "kg" || value === "k") return "classKG";
  const n = Number(value);
  if (Number.isInteger(n) && n >= 1 && n <= 8) {
    return `class${n}` as ClassLevel;
  }
  return null;
}

function parseEnumList<T extends string>(
  field: string,
  raw: RawValue,
  aliases: Record<string, T>,
  allowed: readonly T[],
  errors: FieldError[],
): T[] | undefined {
  const tokens = toList(raw);
  if (tokens.length === 0) return undefined;
  const result: T[] = [];
  for (const token of tokens) {
    const mapped = aliases[normKey(token)];
    if (!mapped) {
      errors.push({
        field,
        issue: `"${token}" is not valid. Allowed: ${allowed.join(", ")}.`,
      });
      continue;
    }
    if (!result.includes(mapped)) result.push(mapped);
  }
  return result.length > 0 ? result : undefined;
}

function parseRating(
  field: string,
  raw: RawValue,
  errors: FieldError[],
): number | undefined {
  if (!isSet(raw)) return undefined;
  const n = Number(raw);
  if (
    !Number.isFinite(n) ||
    n < DIFFICULTY_RATING_MIN ||
    n > DIFFICULTY_RATING_MAX
  ) {
    errors.push({
      field,
      issue: `Must be a number between ${DIFFICULTY_RATING_MIN} and ${DIFFICULTY_RATING_MAX}.`,
    });
    return undefined;
  }
  return n;
}

function parseInt0(raw: RawValue): number | null {
  if (!isSet(raw)) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/**
 * Parse the shared filter set (everything except order/limit/offset).
 * Used by both the list endpoint and the facets endpoint.
 */
export function parseFilters(raw: RawInput): {
  filters?: ServeQuestionsFilters;
  errors: FieldError[];
} {
  const errors: FieldError[] = [];

  // source / type
  const sourceRaw = raw.source ?? raw.type ?? raw.testType ?? raw.mode;
  let source: QuestionSource = "diagnostic";
  if (isSet(sourceRaw)) {
    const mapped = SOURCE_ALIASES[normKey(sourceRaw)];
    if (!mapped) {
      errors.push({
        field: "type",
        issue: `"${String(sourceRaw)}" is not valid. Allowed: ${QUESTION_SOURCES.join(", ")}.`,
      });
    } else {
      source = mapped;
    }
  }

  // subject
  let subject: Subject | undefined;
  if (isSet(raw.subject)) {
    const mapped = SUBJECT_ALIASES[normKey(raw.subject)];
    if (!mapped) {
      errors.push({
        field: "subject",
        issue: `"${String(raw.subject)}" is not valid. Allowed: ${SUBJECT_LABELS}.`,
      });
    } else {
      subject = mapped;
    }
  }

  // grade / classLevel
  let classLevel: ClassLevel | undefined;
  const gradeRaw = raw.grade ?? raw.classLevel ?? raw.class;
  if (isSet(gradeRaw)) {
    const mapped = parseGrade(String(gradeRaw));
    if (!mapped) {
      errors.push({
        field: "grade",
        issue: `"${String(gradeRaw)}" is not valid. Allowed: kg, 1-8.`,
      });
    } else {
      classLevel = mapped;
    }
  }

  // region (diagnostic only)
  let region: DiagnosticRegion = DEFAULT_DIAGNOSTIC_REGION;
  if (isSet(raw.region)) {
    const mapped = DIAGNOSTIC_REGIONS.find(
      (item) => normKey(item) === normKey(raw.region),
    );
    if (!mapped) {
      errors.push({
        field: "region",
        issue: `"${String(raw.region)}" is not valid. Allowed: ${DIAGNOSTIC_REGIONS.join(", ")}.`,
      });
    } else {
      region = mapped;
    }
  }

  const questionTypes = parseEnumList<QuestionType>(
    "questionType",
    raw.questionType ?? raw.questionTypes ?? raw.type_filter,
    QUESTION_TYPE_ALIASES,
    QUESTION_TYPES,
    errors,
  );
  const difficulties = parseEnumList<DifficultyBand>(
    "difficulty",
    raw.difficulty ?? raw.difficulties,
    DIFFICULTY_ALIASES,
    DIFFICULTY_BANDS,
    errors,
  );
  const blooms = parseEnumList<BloomFilter>(
    "bloom",
    raw.bloom ?? raw.blooms ?? raw.bloomLevel,
    BLOOM_ALIASES,
    BLOOM_FILTERS,
    errors,
  );

  const minRating = parseRating("minRating", raw.minRating, errors);
  const maxRating = parseRating("maxRating", raw.maxRating, errors);
  if (
    typeof minRating === "number" &&
    typeof maxRating === "number" &&
    minRating > maxRating
  ) {
    errors.push({
      field: "minRating",
      issue: "minRating cannot be greater than maxRating.",
    });
  }

  const topics = toListNoSplit(raw.topic ?? raw.topics);
  const subtopics = toListNoSplit(raw.subtopic ?? raw.subtopics);
  const learningObjectives = toListNoSplit(
    raw.learningObjective ?? raw.learningObjectives ?? raw.lo,
  );
  const ids = toList(raw.ids ?? raw.id);
  const excludeIds = toList(raw.excludeIds ?? raw.notIds);

  if (errors.length > 0) return { errors };

  return {
    errors,
    filters: {
      source,
      subject,
      classLevel,
      region,
      topics: topics.length ? topics : undefined,
      subtopics: subtopics.length ? subtopics : undefined,
      learningObjectives: learningObjectives.length
        ? learningObjectives
        : undefined,
      questionTypes,
      difficulties,
      blooms,
      minRating,
      maxRating,
      ids: ids.length ? ids : undefined,
      excludeIds: excludeIds.length ? excludeIds : undefined,
      questionNumber: trimOrUndef(raw.questionNumber),
      search: trimOrUndef(raw.search ?? raw.q),
    },
  };
}

export interface ListOptions {
  order: QuestionOrdering;
  limit: number;
  offset: number;
  includeAnswers: boolean;
}

/** Parse pagination/order/answer options (list endpoint only). */
export function parseListOptions(raw: RawInput): {
  options?: ListOptions;
  errors: FieldError[];
} {
  const errors: FieldError[] = [];

  let order: QuestionOrdering = "default";
  if (isSet(raw.order)) {
    const candidate = normKey(raw.order) as QuestionOrdering;
    if (!QUESTION_ORDERINGS.includes(candidate)) {
      errors.push({
        field: "order",
        issue: `"${String(raw.order)}" is not valid. Allowed: ${QUESTION_ORDERINGS.join(", ")}.`,
      });
    } else {
      order = candidate;
    }
  }

  let limit = DEFAULT_LIMIT;
  const limitParsed = parseInt0(raw.limit);
  if (isSet(raw.limit)) {
    if (limitParsed === null || limitParsed < 1) {
      errors.push({ field: "limit", issue: "Must be an integer >= 1." });
    } else {
      limit = Math.min(limitParsed, MAX_LIMIT);
    }
  }

  let offset = 0;
  const offsetParsed = parseInt0(raw.offset);
  if (isSet(raw.offset)) {
    if (offsetParsed === null || offsetParsed < 0) {
      errors.push({ field: "offset", issue: "Must be an integer >= 0." });
    } else {
      offset = offsetParsed;
    }
  }

  const includeAnswers =
    normKey(raw.includeAnswers) === "true" || raw.includeAnswers === true;

  if (errors.length > 0) return { errors };
  return { errors, options: { order, limit, offset, includeAnswers } };
}

/* ----------------------------- request helpers ---------------------------- */

/** Collect query params (repeated keys become arrays) into a RawInput map. */
export function rawInputFromQuery(request: NextRequest): RawInput {
  const raw: RawInput = {};
  for (const key of request.nextUrl.searchParams.keys()) {
    if (key in raw) continue;
    const all = request.nextUrl.searchParams.getAll(key);
    raw[key] = all.length > 1 ? all : all[0];
  }
  return raw;
}

export function validationError(details: FieldError[]) {
  return apiError(
    API_ERROR_CODES.VALIDATION_ERROR,
    "One or more parameters are invalid.",
    { status: 400, details },
  );
}

/** Wrap a handler so any thrown error becomes a clean 500 envelope. */
export function wrap(handler: () => Promise<Response>) {
  return handler().catch((error) =>
    apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      error instanceof Error ? error.message : "Unexpected error.",
      { status: 500 },
    ),
  );
}

/** Echo the resolved filters for the response `meta` (region nulled for placement). */
export function filtersMeta(filters: ServeQuestionsFilters) {
  return {
    source: filters.source,
    subject: filters.subject ?? null,
    grade: filters.classLevel ?? null,
    region: filters.source === "diagnostic" ? filters.region : null,
    topics: filters.topics ?? null,
    subtopics: filters.subtopics ?? null,
    learningObjectives: filters.learningObjectives ?? null,
    questionTypes: filters.questionTypes ?? null,
    difficulties: filters.difficulties ?? null,
    blooms: filters.blooms ?? null,
    minRating: filters.minRating ?? null,
    maxRating: filters.maxRating ?? null,
    ids: filters.ids ?? null,
    excludeIds: filters.excludeIds ?? null,
    questionNumber: filters.questionNumber ?? null,
    search: filters.search ?? null,
  };
}
