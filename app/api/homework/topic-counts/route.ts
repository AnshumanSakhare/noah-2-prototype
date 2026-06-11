import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await query(`
      SELECT qt.topic, COUNT(qv.id)::int as count
      FROM public.question_variations qv
      JOIN public.question_templates qt ON qv.template_id = qt.id
      WHERE qv.status != 'deprecated' AND qv.verifier_status != 'failed'
      GROUP BY qt.topic
    `);

    const counts: Record<string, number> = {};
    res.rows.forEach(row => {
      counts[row.topic] = row.count;
    });

    return NextResponse.json({ success: true, counts });
  } catch (error: any) {
    console.error("GET /api/homework/topic-counts error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
