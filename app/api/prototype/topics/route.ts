import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import { getPrototypeTopics, PROTOTYPE_GRADES } from "@/lib/prototype-homework";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/prototype/topics?grade=5 — topics available in BOTH pools for a grade. */
export async function GET(request: NextRequest) {
  const gradeRaw = request.nextUrl.searchParams.get("grade");
  const grade = Number(gradeRaw);

  if (gradeRaw === null || !Number.isInteger(grade) || grade < 0 || grade > 8) {
    return apiError(
      "VALIDATION_ERROR",
      "grade must be an integer 0-8 (0 = KG).",
      {
        status: 400,
      },
    );
  }

  try {
    const topics = await getPrototypeTopics(grade);
    return apiSuccess(
      { grade, topics },
      { meta: { grades: PROTOTYPE_GRADES } },
    );
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to load topics.",
      { status: 500 },
    );
  }
}
