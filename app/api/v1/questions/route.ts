import type { NextRequest } from "next/server";

import {
  BLOOM_LEVELS,
  DEFAULT_DIAGNOSTIC_REGION,
  DIAGNOSTIC_REGIONS,
  DIFFICULTY_BANDS,
  QUESTION_ORDERINGS,
  QUESTION_SOURCES,
  QUESTION_TYPES,
  type QuestionOrdering,
  type QuestionSource,
  type ServeQuestionsParams,
  serveQuestions,
  toClientQuizQuestion,
} from "@/agents/diagnostic/tools/contentQuiz";
import type {
  BloomLevel,
  ClassLevel,
  DiagnosticRegion,
  DifficultyBand,
  QuestionType,
  Subject,
} from "@/agents/diagnostic/types/index";
import { API_ERROR_CODES, apiError, apiSuccess } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

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
  science: "Science",
  english: "English",
  "social studies": "Social Studies",
  social_studies: "Social Studies",
  socialstudies: "Social Studies",
};

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

const BLOOM_ALIASES: Record<string, BloomLevel> = {
  remember: "remember",
  knowing: "remember",
  understand: "understand",
  understanding: "understand",
  apply: "apply",
  applying: "apply",
};

/* ------------------------------ input parsing ----------------------------- */

type RawValue = string | string[] | number | boolean | undefined | null;
type RawInput = Record<string, RawValue>;

type FieldError = { field: string; issue: string };

function normKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function toList(value: RawValue): string[] {
  if (value === undefined || value === null) return [];
  const parts = Array.isArray(value) ? value : String(value).split(",");
  return parts.map((part) => String(part).trim()).filter(Boolean);
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

function parseInt0(raw: RawValue): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

interface ParsedInput {
  params: ServeQuestionsParams;
  includeAnswers: boolean;
}

function parseInput(raw: RawInput): {
  parsed?: ParsedInput;
  errors: FieldError[];
} {
  const errors: FieldError[] = [];

  // source / type
  const sourceRaw = raw.source ?? raw.type ?? raw.testType ?? raw.mode;
  let source: QuestionSource = "diagnostic";
  if (sourceRaw !== undefined && sourceRaw !== null && sourceRaw !== "") {
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

  // subject (optional)
  let subject: Subject | undefined;
  if (raw.subject !== undefined && raw.subject !== null && raw.subject !== "") {
    const mapped = SUBJECT_ALIASES[normKey(raw.subject)];
    if (!mapped) {
      errors.push({
        field: "subject",
        issue: `"${String(raw.subject)}" is not valid. Allowed: Maths, Science, English, Social Studies.`,
      });
    } else {
      subject = mapped;
    }
  }

  // grade / classLevel (optional)
  let classLevel: ClassLevel | undefined;
  const gradeRaw = raw.grade ?? raw.classLevel ?? raw.class;
  if (gradeRaw !== undefined && gradeRaw !== null && gradeRaw !== "") {
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

  // region (optional, diagnostic only)
  let region: DiagnosticRegion = DEFAULT_DIAGNOSTIC_REGION;
  if (raw.region !== undefined && raw.region !== null && raw.region !== "") {
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
    { easy: "easy", medium: "medium", hard: "hard" },
    DIFFICULTY_BANDS,
    errors,
  );
  const blooms = parseEnumList<BloomLevel>(
    "bloom",
    raw.bloom ?? raw.blooms ?? raw.bloomLevel,
    BLOOM_ALIASES,
    BLOOM_LEVELS,
    errors,
  );

  // order (optional)
  let order: QuestionOrdering = "default";
  if (raw.order !== undefined && raw.order !== null && raw.order !== "") {
    if (!QUESTION_ORDERINGS.includes(normKey(raw.order) as QuestionOrdering)) {
      errors.push({
        field: "order",
        issue: `"${String(raw.order)}" is not valid. Allowed: ${QUESTION_ORDERINGS.join(", ")}.`,
      });
    } else {
      order = normKey(raw.order) as QuestionOrdering;
    }
  }

  // limit
  let limit = DEFAULT_LIMIT;
  const limitParsed = parseInt0(raw.limit);
  if (raw.limit !== undefined && raw.limit !== null && raw.limit !== "") {
    if (limitParsed === null || limitParsed < 1) {
      errors.push({ field: "limit", issue: "Must be an integer >= 1." });
    } else if (limitParsed > MAX_LIMIT) {
      limit = MAX_LIMIT;
    } else {
      limit = limitParsed;
    }
  }

  // offset
  let offset = 0;
  const offsetParsed = parseInt0(raw.offset);
  if (raw.offset !== undefined && raw.offset !== null && raw.offset !== "") {
    if (offsetParsed === null || offsetParsed < 0) {
      errors.push({ field: "offset", issue: "Must be an integer >= 0." });
    } else {
      offset = offsetParsed;
    }
  }

  const includeAnswers =
    normKey(raw.includeAnswers) === "true" || raw.includeAnswers === true;

  const trim = (value: RawValue) => {
    const text =
      value === undefined || value === null ? "" : String(value).trim();
    return text.length > 0 ? text : undefined;
  };

  if (errors.length > 0) return { errors };

  return {
    errors,
    parsed: {
      includeAnswers,
      params: {
        source,
        subject,
        classLevel,
        region,
        topic: trim(raw.topic),
        subtopic: trim(raw.subtopic),
        learningObjective: trim(raw.learningObjective ?? raw.lo),
        questionTypes,
        difficulties,
        blooms,
        search: trim(raw.search ?? raw.q),
        order,
        limit,
        offset,
      },
    },
  };
}

/* -------------------------------- handler --------------------------------- */

async function handle(raw: RawInput) {
  const { parsed, errors } = parseInput(raw);

  if (!parsed) {
    return apiError(
      API_ERROR_CODES.VALIDATION_ERROR,
      "One or more query parameters are invalid.",
      { status: 400, details: errors },
    );
  }

  const { params, includeAnswers } = parsed;
  const { questions, total } = await serveQuestions(params);

  const payload = includeAnswers
    ? questions
    : questions.map(toClientQuizQuestion);

  const returned = payload.length;

  return apiSuccess(
    {
      questions: payload,
      pagination: {
        total,
        limit: params.limit,
        offset: params.offset,
        returned,
        hasMore: params.offset + returned < total,
      },
    },
    {
      meta: {
        source: params.source,
        includeAnswers,
        filters: {
          subject: params.subject ?? null,
          grade: params.classLevel ?? null,
          region: params.source === "diagnostic" ? params.region : null,
          topic: params.topic ?? null,
          subtopic: params.subtopic ?? null,
          learningObjective: params.learningObjective ?? null,
          questionTypes: params.questionTypes ?? null,
          difficulties: params.difficulties ?? null,
          blooms: params.blooms ?? null,
          search: params.search ?? null,
          order: params.order,
        },
      },
    },
  );
}

function wrap(handler: () => Promise<Response>) {
  return handler().catch((error) =>
    apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      error instanceof Error ? error.message : "Unable to serve questions.",
      { status: 500 },
    ),
  );
}

/** GET /api/v1/questions?type=diagnostic&grade=5&questionType=mcq,dnd&limit=20 */
export function GET(request: NextRequest) {
  return wrap(() => {
    const raw: RawInput = {};
    for (const key of request.nextUrl.searchParams.keys()) {
      const all = request.nextUrl.searchParams.getAll(key);
      raw[key] = all.length > 1 ? all : all[0];
    }
    return handle(raw);
  });
}

/** POST /api/v1/questions  with a JSON body of the same parameters. */
export function POST(request: NextRequest) {
  return wrap(async () => {
    let body: RawInput = {};
    try {
      const json = await request.json();
      if (json && typeof json === "object") body = json as RawInput;
    } catch {
      return apiError(
        API_ERROR_CODES.VALIDATION_ERROR,
        "Request body must be valid JSON.",
        { status: 400 },
      );
    }
    return handle(body);
  });
}
