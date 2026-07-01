import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import {
  type GradeItem,
  gradePrototypeAnswers,
} from "@/lib/prototype-homework";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/prototype/grade
 * Body: { items: [{ id, kind: "diagnostic"|"interactive", studentAnswer }] }
 * Grades the answers server-side (answer keys never leave the server during the run).
 */
export async function POST(request: NextRequest) {
  let body: { items?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.", {
      status: 400,
    });
  }

  if (!Array.isArray(body.items)) {
    return apiError("VALIDATION_ERROR", "items must be an array.", {
      status: 400,
    });
  }

  const items: GradeItem[] = body.items
    .filter(
      (i): i is GradeItem =>
        !!i &&
        typeof i === "object" &&
        typeof (i as GradeItem).id === "string" &&
        ((i as GradeItem).kind === "diagnostic" ||
          (i as GradeItem).kind === "interactive"),
    )
    .map((i) => ({
      id: i.id,
      kind: i.kind,
      studentAnswer: i.studentAnswer ?? null,
    }));

  try {
    const results = await gradePrototypeAnswers(items);
    return apiSuccess({ results });
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to grade answers.",
      { status: 500 },
    );
  }
}
