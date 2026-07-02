import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import { buildPrototypePractice } from "@/lib/prototype-practice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/prototype/practice
 * Body: { grade: number (0-8), topic: string }
 * Returns the ordered 10-question practice set (read-only, no DB writes).
 */
export async function POST(request: NextRequest) {
  let body: { grade?: unknown; topic?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.", {
      status: 400,
    });
  }

  const grade = Number(body.grade);
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";

  const errors: Array<{ field: string; issue: string }> = [];
  if (!Number.isInteger(grade) || grade < 0 || grade > 8) {
    errors.push({ field: "grade", issue: "Must be an integer 0-8 (0 = KG)." });
  }
  if (!topic) errors.push({ field: "topic", issue: "Required." });
  if (errors.length > 0) {
    return apiError("VALIDATION_ERROR", "One or more parameters are invalid.", {
      status: 400,
      details: errors,
    });
  }

  try {
    const practice = await buildPrototypePractice(grade, topic);
    if (practice.total === 0) {
      return apiError(
        "NOT_FOUND",
        `No questions found for grade ${grade} / "${topic}".`,
        { status: 404 },
      );
    }
    return apiSuccess(practice);
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to build practice.",
      { status: 500 },
    );
  }
}
