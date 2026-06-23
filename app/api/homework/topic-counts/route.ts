import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { mathGradeToInt } from "@/lib/grade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/homework/topic-counts[?grade=G2]
// When a grade is supplied, counts are scoped to that grade so the builder's
// "DB Qs" badge matches what a homework for that grade would actually draw from.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gradeInt = mathGradeToInt(searchParams.get("grade"));

    const params: unknown[] = [];
    let gradeClause = "";
    if (gradeInt !== null) {
      params.push(gradeInt);
      gradeClause = ` AND qt.grade = $1`;
    }

    const res = await query(
      `
      SELECT qt.topic, COUNT(qv.id)::int as count
      FROM public.question_variations qv
      JOIN public.question_templates qt ON qv.template_id = qt.id
      WHERE qv.status != 'deprecated' AND qv.verifier_status != 'failed'${gradeClause}
      GROUP BY qt.topic
    `,
      params,
    );

    const counts: Record<string, number> = {};
    res.rows.forEach((row) => {
      counts[row.topic] = row.count;
    });

    return NextResponse.json({ success: true, counts });
  } catch (error: any) {
    console.error("GET /api/homework/topic-counts error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
