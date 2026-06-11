import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { scoreAnswer, EvaluationSpec } from "@/lib/scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/homework/:assignmentId/answer - Submit a question answer
export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    const body = await request.json();
    const { question_id, student_answer, time_taken_ms } = body;

    if (!question_id || student_answer === undefined) {
      return NextResponse.json({ success: false, error: "Missing answer submission details" }, { status: 400 });
    }

    // 1. Fetch assignment details
    const assignRes = await query(`
      SELECT student_id, question_ids, status
      FROM public.homework_assignments
      WHERE id = $1
    `, [assignmentId]);

    if (assignRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Assignment not found" }, { status: 404 });
    }

    const { student_id: studentId, question_ids: questionIds } = assignRes.rows[0];

    // 2. Fetch the evaluation spec for this variation
    const variationRes = await query(`
      SELECT evaluation_spec
      FROM public.question_variations
      WHERE id = $1
    `, [question_id]);

    if (variationRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    const evaluationSpec = variationRes.rows[0].evaluation_spec as EvaluationSpec;

    // 3. Score the canonical output 0–100 via the generic engine
    const { performance, isCorrect, breakdown } = scoreAnswer(evaluationSpec, student_answer);

    // 4. Check attempt index (multi-attempt safeguard)
    const countRes = await query(`
      SELECT COALESCE(MAX(attempt_index), 0) as max_idx
      FROM public.homework_attempts
      WHERE assignment_id = $1 AND question_id = $2
    `, [assignmentId, question_id]);
    const attemptIndex = (countRes.rows[0]?.max_idx || 0) + 1;

    // 5. Insert Attempt
    await query(`
      INSERT INTO public.homework_attempts (
        assignment_id,
        question_id,
        student_id,
        student_answer,
        performance,
        is_correct,
        score_breakdown,
        time_taken_ms,
        attempt_index
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      assignmentId,
      question_id,
      studentId,
      JSON.stringify(student_answer),
      performance,
      isCorrect,
      JSON.stringify(breakdown),
      time_taken_ms || 0,
      attemptIndex
    ]);

    // 6. Check if this completes the assignment
    // Get unique question IDs that have been attempted in this assignment
    const attemptedRes = await query(`
      SELECT DISTINCT question_id
      FROM public.homework_attempts
      WHERE assignment_id = $1
    `, [assignmentId]);

    const attemptedIds = attemptedRes.rows.map(r => r.question_id);
    const allAttempted = questionIds.every((id: string) => attemptedIds.includes(id));

    if (allAttempted) {
      // Compute overall performance as the mean of the latest attempt per question
      const overallRes = await query(`
        SELECT ROUND(AVG(latest.performance))::int AS overall
        FROM (
          SELECT DISTINCT ON (question_id) performance
          FROM public.homework_attempts
          WHERE assignment_id = $1
          ORDER BY question_id, attempt_index DESC
        ) latest
      `, [assignmentId]);
      const overall = overallRes.rows[0]?.overall ?? 0;

      await query(`
        UPDATE public.homework_assignments
        SET status = 'completed', completed_at = now(), overall_performance = $2
        WHERE id = $1
      `, [assignmentId, overall]);
    }

    // NEVER return evaluation details to student client during session (only received: true)
    return NextResponse.json({
      success: true,
      received: true
    });

  } catch (error: any) {
    console.error("POST /api/homework/[assignmentId]/answer error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
