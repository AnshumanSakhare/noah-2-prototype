import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import { checkPracticeAnswer } from "@/lib/prototype-practice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/prototype/practice/check
 * Body: { id: string, studentAnswer: unknown }
 * Grades a single diagnostic answer (read-only). Drives the wrong-answer →
 * Noah-help flow. The correct answer stays server-side unless the question is
 * already correct (the UI reveals it only via the hint ladder's reveal step).
 */
export async function POST(request: NextRequest) {
  let body: { id?: unknown; studentAnswer?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.", {
      status: 400,
    });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return apiError("VALIDATION_ERROR", "`id` is required.", { status: 400 });
  }

  try {
    const result = await checkPracticeAnswer(id, body.studentAnswer);
    // Only surface the correct answer once the student has it right.
    return apiSuccess({
      id: result.id,
      isCorrect: result.isCorrect,
      performance: result.performance,
      correctAnswer: result.isCorrect ? result.correctAnswer : null,
    });
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to check answer.",
      { status: 500 },
    );
  }
}
