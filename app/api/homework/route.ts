import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");

    if (!studentId) {
      return NextResponse.json({ success: false, error: "Missing student_id parameter" }, { status: 400 });
    }

    const res = await query(`
      SELECT 
        id, 
        student_id, 
        assigned_by, 
        teacher_id, 
        topic, 
        subtopic, 
        activity_count, 
        difficulty_mode, 
        question_ids, 
        status, 
        assigned_at, 
        due_at, 
        started_at, 
        completed_at
      FROM public.homework_assignments
      WHERE student_id = $1 AND status != 'completed'
      ORDER BY assigned_at DESC
    `, [studentId]);

    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    console.error("GET /api/homework error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
