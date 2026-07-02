import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import {
  generatePracticeHint,
  type HintLevel,
  type PracticeTry,
} from "@/lib/prototype-practice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The LLM call can take a few seconds; raise the function timeout.
export const maxDuration = 60;

/**
 * POST /api/prototype/practice/hint
 * Body: {
 *   questionId: string,
 *   grade: number (0-8),
 *   level: 1 | 2 | 3,          // 1 nudge · 2 method · 3 reveal
 *   tries: { answer: string, correct: boolean }[]
 * }
 * Stateless AI hint — the client passes its own try history; nothing is stored.
 */
export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return apiError("INTERNAL_ERROR", "OPENAI_API_KEY is not configured.", {
      status: 500,
    });
  }

  let body: {
    questionId?: unknown;
    grade?: unknown;
    level?: unknown;
    tries?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.", {
      status: 400,
    });
  }

  const questionId = typeof body.questionId === "string" ? body.questionId : "";
  const grade = Number(body.grade);
  const level = Number(body.level);
  const tries: PracticeTry[] = Array.isArray(body.tries)
    ? body.tries
        .filter(
          (t): t is { answer: unknown; correct: unknown } =>
            typeof t === "object" && t !== null,
        )
        .map((t) => ({
          answer: String((t as { answer?: unknown }).answer ?? ""),
          correct: Boolean((t as { correct?: unknown }).correct),
        }))
    : [];

  const errors: Array<{ field: string; issue: string }> = [];
  if (!questionId) errors.push({ field: "questionId", issue: "Required." });
  if (!Number.isInteger(grade) || grade < 0 || grade > 8) {
    errors.push({ field: "grade", issue: "Must be an integer 0-8." });
  }
  if (![1, 2, 3].includes(level)) {
    errors.push({ field: "level", issue: "Must be 1, 2, or 3." });
  }
  if (errors.length > 0) {
    return apiError("VALIDATION_ERROR", "One or more parameters are invalid.", {
      status: 400,
      details: errors,
    });
  }

  try {
    const hint = await generatePracticeHint({
      questionId,
      grade,
      level: level as HintLevel,
      tries,
    });
    return apiSuccess(hint);
  } catch (error) {
    // Verbose logging — surface the real cause (OpenAI APIError fields, stack).
    const e = error as {
      name?: string;
      status?: number;
      code?: string;
      type?: string;
      message?: string;
      error?: unknown;
      stack?: string;
    };
    console.error("[api/prototype/practice/hint] 500:", {
      name: e?.name,
      status: e?.status,
      code: e?.code,
      type: e?.type,
      message: e?.message,
      openaiError: e?.error,
    });
    console.error(e?.stack ?? error);
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to generate hint.",
      { status: 500 },
    );
  }
}
