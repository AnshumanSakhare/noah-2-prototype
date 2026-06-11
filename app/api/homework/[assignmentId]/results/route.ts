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
      SELECT topic, difficulty_mode, question_ids, status, overall_performance, assigned_at, started_at, completed_at
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
        ha.performance,
        ha.score_breakdown,
        ha.time_taken_ms,
        ha.attempt_index,
        qv.variation_data,
        qv.evaluation_spec,
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

    // Performance-based scoring: average the 0–100 score across answered questions
    const perfOf = (a: typeof finalAttempts[0]) => Number(a.performance ?? (a.is_correct ? 100 : 0));
    const totalPerformance = finalAttempts.reduce((sum, a) => sum + perfOf(a), 0);
    const meanPerformance = totalAnswered > 0 ? Math.round(totalPerformance / totalAnswered) : 0;

    // Total elapsed time sum
    const totalTimeMs = finalAttempts.reduce((sum, a) => sum + (a.time_taken_ms || 0), 0);
    const avgTimeMs = totalAnswered > 0 ? Math.round(totalTimeMs / totalAnswered) : 0;

    // 3. Compute mean performance by difficulty tier
    const difficultyStats: Record<string, { total: number; perfSum: number; accuracy: number }> = {
      easy: { total: 0, perfSum: 0, accuracy: 0 },
      medium: { total: 0, perfSum: 0, accuracy: 0 },
      hard: { total: 0, perfSum: 0, accuracy: 0 }
    };

    finalAttempts.forEach(attempt => {
      const diff = attempt.difficulty || "medium";
      if (difficultyStats[diff]) {
        difficultyStats[diff].total++;
        difficultyStats[diff].perfSum += perfOf(attempt);
      }
    });

    Object.keys(difficultyStats).forEach(tier => {
      const stat = difficultyStats[tier];
      stat.accuracy = stat.total > 0 ? Math.round(stat.perfSum / stat.total) : 0;
    });

    // 4. Compute subtopic plan strength rating from mean performance
    // Green = >= 75%, Yellow = 50-74%, Red = <50%
    const subtopicStats: Record<string, { total: number; perfSum: number; correct: number; subtopic: string }> = {};

    finalAttempts.forEach(attempt => {
      const sub = attempt.subtopic || "General";
      if (!subtopicStats[sub]) {
        subtopicStats[sub] = { total: 0, perfSum: 0, correct: 0, subtopic: sub };
      }
      subtopicStats[sub].total++;
      subtopicStats[sub].perfSum += perfOf(attempt);
      if (attempt.is_correct) subtopicStats[sub].correct++;
    });

    const subtopicPlan = Object.keys(subtopicStats).map(sub => {
      const stat = subtopicStats[sub];
      const accuracy = Math.round(stat.perfSum / stat.total);
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
          overall_performance: assignment.overall_performance,
          assigned_at: assignment.assigned_at,
          completed_at: assignment.completed_at
        },
        stats: {
          score: correctAnswers,                 // # questions at/above pass threshold
          total: totalQuestions,
          correctCount: correctAnswers,
          performance: meanPerformance,          // mean 0–100 across answered questions
          accuracy: meanPerformance,             // accuracy now reflects mean performance
          avgTimeMs,
          totalTimeMs,
          difficulty: difficultyStats
        },
        attempts: finalAttempts.map(a => ({
          attempt_id: a.attempt_id,
          question_id: a.question_id,
          is_correct: a.is_correct,
          performance: a.performance,
          score_breakdown: a.score_breakdown,
          time_taken_ms: a.time_taken_ms,
          variation_data: a.variation_data,
          evaluation_spec: a.evaluation_spec, // safe to expose here on results page
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
