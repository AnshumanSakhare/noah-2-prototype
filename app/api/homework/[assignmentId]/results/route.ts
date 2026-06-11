import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/homework/:assignmentId/results - Fetch results summary on assignment completion
export async function GET(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;

    // 1. Fetch assignment summary
    const assignRes = await query(`
      SELECT topic, difficulty_mode, question_ids, status, assigned_at, started_at, completed_at
      FROM public.homework_assignments
      WHERE id = $1
    `, [assignmentId]);

    if (assignRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Assignment not found" }, { status: 404 });
    }

    const assignment = assignRes.rows[0];

    // 2. Fetch student attempts
    // Join with variation and template to get text and correct answers
    const attemptsRes = await query(`
      SELECT 
        ha.id as attempt_id,
        ha.question_id,
        ha.student_answer,
        ha.is_correct,
        ha.time_taken_ms,
        ha.attempt_index,
        qv.variation_data,
        qv.answer_key,
        qv.difficulty,
        qt.interaction_type,
        qt.topic,
        qt.subtopic,
        qt.learning_objective,
        qt.slug as template_slug
      FROM public.homework_attempts ha
      JOIN public.question_variations qv ON ha.question_id = qv.id
      JOIN public.question_templates qt ON qv.template_id = qt.id
      WHERE ha.assignment_id = $1
      ORDER BY ha.created_at ASC
    `, [assignmentId]);

    const attempts = attemptsRes.rows;

    // Filter to latest attempt per question_id to prevent duplicates in results
    const uniqueAttemptsMap = new Map<string, typeof attempts[0]>();
    attempts.forEach(attempt => {
      uniqueAttemptsMap.set(attempt.question_id, attempt);
    });
    const finalAttempts = Array.from(uniqueAttemptsMap.values());

    const totalQuestions = assignment.question_ids.length;
    const totalAnswered = finalAttempts.length;
    const correctAnswers = finalAttempts.filter(a => a.is_correct === true).length;
    
    // Total elapsed time sum
    const totalTimeMs = finalAttempts.reduce((sum, a) => sum + (a.time_taken_ms || 0), 0);
    const avgTimeMs = totalAnswered > 0 ? Math.round(totalTimeMs / totalAnswered) : 0;

    // 3. Compute accuracy by difficulty tier
    const difficultyStats: Record<string, { total: number; correct: number; accuracy: number }> = {
      easy: { total: 0, correct: 0, accuracy: 0 },
      medium: { total: 0, correct: 0, accuracy: 0 },
      hard: { total: 0, correct: 0, accuracy: 0 }
    };

    finalAttempts.forEach(attempt => {
      const diff = attempt.difficulty || "medium";
      if (difficultyStats[diff]) {
        difficultyStats[diff].total++;
        if (attempt.is_correct) {
          difficultyStats[diff].correct++;
        }
      }
    });

    Object.keys(difficultyStats).forEach(tier => {
      const stat = difficultyStats[tier];
      stat.accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
    });

    // 4. Compute subtopic plan strength rating
    // Green = >= 75%, Yellow = 50-74%, Red = <50%
    const subtopicStats: Record<string, { total: number; correct: number; subtopic: string }> = {};

    finalAttempts.forEach(attempt => {
      const sub = attempt.subtopic || "General";
      if (!subtopicStats[sub]) {
        subtopicStats[sub] = { total: 0, correct: 0, subtopic: sub };
      }
      subtopicStats[sub].total++;
      if (attempt.is_correct) {
        subtopicStats[sub].correct++;
      }
    });

    const subtopicPlan = Object.keys(subtopicStats).map(sub => {
      const stat = subtopicStats[sub];
      const accuracy = Math.round((stat.correct / stat.total) * 100);
      let strength: "green" | "yellow" | "red" = "green";
      
      if (accuracy >= 75) strength = "green";
      else if (accuracy >= 50) strength = "yellow";
      else strength = "red";

      return {
        subtopic: sub,
        total: stat.total,
        correct: stat.correct,
        accuracy,
        strength
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        assignment: {
          topic: assignment.topic,
          difficulty_mode: assignment.difficulty_mode,
          status: assignment.status,
          assigned_at: assignment.assigned_at,
          completed_at: assignment.completed_at
        },
        stats: {
          score: correctAnswers,
          total: totalQuestions,
          accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
          avgTimeMs,
          totalTimeMs,
          difficulty: difficultyStats
        },
        attempts: finalAttempts.map(a => ({
          attempt_id: a.attempt_id,
          question_id: a.question_id,
          is_correct: a.is_correct,
          time_taken_ms: a.time_taken_ms,
          variation_data: a.variation_data,
          answer_key: a.answer_key, // safe to expose here on results page
          difficulty: a.difficulty,
          interaction_type: a.interaction_type,
          subtopic: a.subtopic,
          learning_objective: a.learning_objective
        })),
        plan: subtopicPlan
      }
    });

  } catch (error: any) {
    console.error("GET /api/homework/[assignmentId]/results error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
