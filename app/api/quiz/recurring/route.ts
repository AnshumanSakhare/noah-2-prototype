import { NextResponse } from "next/server";

import { getRecurringTestForClient } from "@/agents/diagnostic/tools/contentQuiz";
import type { ClassLevel, Subject } from "@/agents/diagnostic/types/index";
import pool from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNDERPERFORMANCE_THRESHOLD = 60;
const FAILED_STATUSES = new Set(["needs_teaching", "likely_weak"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      assessmentId?: string;
      studentId?: string;
    };

    if (!body.assessmentId) {
      return NextResponse.json(
        { error: "assessmentId is required." },
        { status: 400 },
      );
    }

    // 1. Fetch the completed assessment
    const assessmentResult = await pool.query<{
      id: string;
      student_id: string;
      subject: string;
      class_level: string;
      readiness_score: number;
      topic_results: Array<{ topic: string; status: string }>;
      learning_objective_results: Array<{ learningObjective: string; score: number }>;
    }>(
      `
        SELECT id, student_id, subject, class_level, readiness_score, topic_results, learning_objective_results
        FROM diagnostic_assessments
        WHERE id = $1
      `,
      [body.assessmentId],
    );

    const assessment = assessmentResult.rows[0];
    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found." },
        { status: 404 },
      );
    }

    // 2. Check if student is underperforming
    if (assessment.readiness_score >= UNDERPERFORMANCE_THRESHOLD) {
      return NextResponse.json({ eligible: false, reason: "score_above_threshold" });
    }

    // 3. Extract failed items from results JSONB
    const topicResults: Array<{ topic: string; status: string }> =
      Array.isArray(assessment.topic_results) ? assessment.topic_results : [];
    const loResults: Array<{ learningObjective: string; score: number }> =
      Array.isArray((assessment as any).learning_objective_results)
        ? (assessment as any).learning_objective_results
        : [];

    const failedTopics = topicResults
      .filter((t) => FAILED_STATUSES.has(t.status))
      .map((t) => t.topic)
      .filter(Boolean);

    const failedLOs = loResults
      .filter((l) => l.score < UNDERPERFORMANCE_THRESHOLD)
      .map((l) => l.learningObjective)
      .filter(Boolean);

    if (failedTopics.length === 0 && failedLOs.length === 0) {
      return NextResponse.json({ eligible: false, reason: "no_failed_items" });
    }

    // 4. Fetch all question IDs already seen by this student (across ALL assessments)
    const seenResult = await pool.query<{ question_id: string }>(
      `
        SELECT DISTINCT qr.question_id::text
        FROM diagnostic_question_results qr
        JOIN diagnostic_assessments a ON a.id = qr.assessment_id
        WHERE a.student_id = $1
      `,
      [assessment.student_id],
    );
    const excludedQuestionIds = seenResult.rows.map((r) => r.question_id);

    // 5. Build the recurring test
    const studentId = body.studentId?.trim() || "Student";
    const quiz = await getRecurringTestForClient({
      studentId,
      subject: assessment.subject as Subject,
      classLevel: `class${assessment.class_level === "kg" ? "KG" : assessment.class_level}` as ClassLevel,
      failedTopics,
      failedLOs,
      excludedQuestionIds,
    });

    return NextResponse.json({
      eligible: true,
      parentAssessmentId: body.assessmentId,
      failedTopics,
      excludedCount: excludedQuestionIds.length,
      quiz,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load recurring test.",
      },
      { status: 400 },
    );
  }
}
