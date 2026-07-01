import type { NextRequest } from "next/server";

import {
  serveQuestions,
  toClientQuizQuestion,
} from "@/agents/diagnostic/tools/contentQuiz";
import { apiSuccess } from "@/lib/api-response";
import {
  filtersMeta,
  parseFilters,
  parseListOptions,
  type RawInput,
  rawInputFromQuery,
  validationError,
  wrap,
} from "./shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(raw: RawInput) {
  const { filters, errors: filterErrors } = parseFilters(raw);
  const { options, errors: optionErrors } = parseListOptions(raw);
  const errors = [...filterErrors, ...optionErrors];

  if (!filters || !options || errors.length > 0) {
    return validationError(errors);
  }

  const { questions, total } = await serveQuestions({ ...filters, ...options });

  const payload = options.includeAnswers
    ? questions
    : questions.map(toClientQuizQuestion);
  const returned = payload.length;

  return apiSuccess(
    {
      questions: payload,
      pagination: {
        total,
        limit: options.limit,
        offset: options.offset,
        returned,
        hasMore: options.offset + returned < total,
      },
    },
    {
      meta: {
        includeAnswers: options.includeAnswers,
        order: options.order,
        filters: filtersMeta(filters),
      },
    },
  );
}

/** GET /api/v1/questions?type=diagnostic&grade=5&questionType=mcq,dnd&limit=20 */
export function GET(request: NextRequest) {
  return wrap(() => handle(rawInputFromQuery(request)));
}

/** POST /api/v1/questions with a JSON body of the same parameters. */
export function POST(request: NextRequest) {
  return wrap(async () => {
    let body: RawInput = {};
    try {
      const json = await request.json();
      if (json && typeof json === "object") body = json as RawInput;
    } catch {
      return validationError([
        { field: "body", issue: "Request body must be valid JSON." },
      ]);
    }
    return handle(body);
  });
}
