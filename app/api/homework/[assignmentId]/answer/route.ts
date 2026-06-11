import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Helper to evaluate answer correctness server-side
function evaluateAnswer(type: string, studentAnswer: any, correctAnswer: any): boolean {
  try {
    if (studentAnswer === undefined || studentAnswer === null || correctAnswer === undefined || correctAnswer === null) {
      return false;
    }

    if (type === "mcq") {
      const studentIdx = typeof studentAnswer === "object" ? studentAnswer.answer : studentAnswer;
      const correctIdx = typeof correctAnswer === "object" ? correctAnswer.correct : correctAnswer;
      return Number(studentIdx) === Number(correctIdx);
    }

    if (type === "fill") {
      const studentStr = String(studentAnswer).trim().toLowerCase();
      const correctStr = String(typeof correctAnswer === "object" ? correctAnswer.correct : correctAnswer).trim().toLowerCase();
      return studentStr === correctStr;
    }

    if (type === "blanks") {
      const studentArr = Array.isArray(studentAnswer) ? studentAnswer : [];
      const correctArr = Array.isArray(typeof correctAnswer === "object" ? correctAnswer.correct : correctAnswer) 
        ? (correctAnswer.correct || correctAnswer) 
        : [];

      if (studentArr.length !== correctArr.length) return false;
      return studentArr.every(
        (val, idx) => String(val).trim().toLowerCase() === String(correctArr[idx]).trim().toLowerCase()
      );
    }

    if (type === "drag") {
      const studentMap = (typeof studentAnswer === "object" ? studentAnswer : {}) as Record<string, string>;
      const correctMap = (typeof correctAnswer === "object" ? (correctAnswer.correct || correctAnswer) : {}) as Record<string, string>;

      const studentKeys = Object.keys(studentMap);
      const correctKeys = Object.keys(correctMap);

      if (studentKeys.length !== correctKeys.length) return false;
      return correctKeys.every(
        (key) => String(studentMap[key]).trim().toLowerCase() === String(correctMap[key]).trim().toLowerCase()
      );
    }

    if (type === "game-tap") {
      const studentVal = String(studentAnswer).trim().toUpperCase();
      const correctVal = String(typeof correctAnswer === "object" ? correctAnswer.correct : correctAnswer).trim().toUpperCase();
      return studentVal === correctVal;
    }

    if (type === "game-compare") {
      const studentVal = String(studentAnswer).trim();
      const correctVal = String(typeof correctAnswer === "object" ? correctAnswer.correct : correctAnswer).trim();
      return studentVal === correctVal;
    }

    if (type === "game-sort") {
      const studentArr = Array.isArray(studentAnswer) ? studentAnswer.map(Number) : [];
      const correctArr = Array.isArray(typeof correctAnswer === "object" ? correctAnswer.correct : correctAnswer)
        ? (correctAnswer.correct || correctAnswer).map(Number)
        : [];
      
      if (studentArr.length !== correctArr.length) return false;
      return studentArr.every((val, idx) => val === correctArr[idx]);
    }

    // Default basic equality
    return JSON.stringify(studentAnswer) === JSON.stringify(correctAnswer);

  } catch (err) {
    console.error("Evaluation error:", err);
    return false;
  }
}

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

    // 2. Fetch answer key & interaction type
    const variationRes = await query(`
      SELECT qv.answer_key, qt.interaction_type
      FROM public.question_variations qv
      JOIN public.question_templates qt ON qv.template_id = qt.id
      WHERE qv.id = $1
    `, [question_id]);

    if (variationRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    const { answer_key: answerKey, interaction_type: type } = variationRes.rows[0];

    // 3. Evaluate Correctness
    const isCorrect = evaluateAnswer(type, student_answer, answerKey);

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
        is_correct,
        time_taken_ms,
        attempt_index
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      assignmentId,
      question_id,
      studentId,
      JSON.stringify(student_answer),
      isCorrect,
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
      // Complete the assignment
      await query(`
        UPDATE public.homework_assignments
        SET status = 'completed', completed_at = now()
        WHERE id = $1
      `, [assignmentId]);
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
