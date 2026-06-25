import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/questions/excess
// Lists grade+topic groups that hold MORE than the intended 9 variations
// (the 3 difficulties × 3 slots design), so reviewers can trim duplicates.
export async function GET() {
  try {
    const { rows } = await query(`
      SELECT qt.grade, qt.topic, COUNT(*)::int AS count
      FROM public.question_variations qv
      JOIN public.question_templates_1 qt ON qv.template_id = qt.id
      GROUP BY qt.grade, qt.topic
      HAVING COUNT(*) > 9
      ORDER BY COUNT(*) DESC, qt.grade, qt.topic
    `);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error("GET /api/admin/questions/excess error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
