import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { mathGradeToInt } from "@/lib/grade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/homework/assign - Assign a new homework set to a student
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      student_id,
      topic,
      topics,
      activity_count,
      difficulty_mode,
      teacher_id,
      grade,
    } = body;

    // Optional grade scope: when provided, only questions tagged for this grade
    // are eligible (so a Grade-2 homework never pulls Grade-8 questions).
    const gradeInt = mathGradeToInt(grade);

    // ── Combine-all path ──
    // When a `topics` array is supplied (builder "Compile Homework"), include EVERY
    // available question across ALL those topics and ALL difficulties — nothing dropped,
    // ordered easy → medium → hard. (The single-`topic` adaptive path below is unchanged.)
    if (Array.isArray(topics) && topics.length > 0) {
      if (!student_id) {
        return NextResponse.json(
          { success: false, error: "Missing student_id" },
          { status: 400 },
        );
      }
      const allParams: unknown[] = [topics];
      let allGradeClause = "";
      if (gradeInt !== null) {
        allParams.push(gradeInt);
        allGradeClause = ` AND qt.grade = $2`;
      }
      const allRes = await query(
        `
        SELECT qv.id, qv.difficulty
        FROM public.question_variations qv
        JOIN public.question_templates qt ON qv.template_id = qt.id
        WHERE qt.topic = ANY($1)
          AND qv.status != 'deprecated'
          AND qv.verifier_status != 'failed'${allGradeClause}
      `,
        allParams,
      );

      const diffOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
      const allIds = allRes.rows
        .slice()
        .sort(
          (a, b) =>
            (diffOrder[a.difficulty] ?? 1) - (diffOrder[b.difficulty] ?? 1),
        )
        .map((r) => r.id);

      if (allIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No active questions found for the selected topics",
          },
          { status: 404 },
        );
      }

      const assignRes = await query(
        `
        INSERT INTO public.homework_assignments (
          student_id, assigned_by, teacher_id, topic, activity_count, difficulty_mode, question_ids, status, assigned_at
        )
        VALUES ($1, 'teacher', $2, $3, $4, $5, $6, 'assigned', now())
        RETURNING id, question_ids
      `,
        [
          student_id,
          teacher_id || null,
          topics.join(" + "),
          allIds.length,
          "adaptive",
          allIds,
        ],
      );

      return NextResponse.json({
        success: true,
        assignmentId: assignRes.rows[0].id,
        questionCount: assignRes.rows[0].question_ids.length,
      });
    }

    if (!student_id || !topic || !activity_count || !difficulty_mode) {
      return NextResponse.json(
        { success: false, error: "Missing required assignment parameters" },
        { status: 400 },
      );
    }

    // 1. Resolve Target Difficulty (incorporates adaptive difficulty logic)
    let targetDifficulty = "medium";
    if (difficulty_mode === "adaptive") {
      // Fetch student's last 10 attempts on this topic
      const historyRes = await query(
        `
        SELECT ha.performance, ha.is_correct, qv.difficulty
        FROM public.homework_attempts ha
        JOIN public.question_variations qv ON ha.question_id = qv.id
        JOIN public.question_templates qt ON qv.template_id = qt.id
        WHERE ha.student_id = $1 AND qt.topic = $2
        ORDER BY ha.created_at DESC
        LIMIT 10
      `,
        [student_id, topic],
      );

      if (historyRes.rows.length > 0) {
        // Mean performance (0–1) across recent attempts, falling back to is_correct if null
        const perfSum = historyRes.rows.reduce(
          (sum, r) =>
            sum +
            (r.performance != null
              ? Number(r.performance)
              : r.is_correct
                ? 100
                : 0),
          0,
        );
        const accuracy = perfSum / (historyRes.rows.length * 100);

        // Take the difficulty of the most recent attempt as base
        const lastDifficulty = historyRes.rows[0].difficulty || "medium";

        if (accuracy > 0.8) {
          // Bump difficulty up
          if (lastDifficulty === "easy") targetDifficulty = "medium";
          else if (lastDifficulty === "medium" || lastDifficulty === "hard")
            targetDifficulty = "hard";
        } else if (accuracy < 0.5) {
          // Step difficulty down
          if (lastDifficulty === "hard") targetDifficulty = "medium";
          else if (lastDifficulty === "medium" || lastDifficulty === "easy")
            targetDifficulty = "easy";
        } else {
          // Keep current
          targetDifficulty = lastDifficulty;
        }
      } else {
        // Start at medium if no history
        targetDifficulty = "medium";
      }
    } else {
      // Standard static difficulty mode
      targetDifficulty = difficulty_mode;
    }

    // 2. Fetch Seen Questions (last 30 days) to enforce freshness
    const seenRes = await query(
      `
      SELECT DISTINCT ha.question_id
      FROM public.homework_attempts ha
      JOIN public.question_variations qv ON ha.question_id = qv.id
      JOIN public.question_templates qt ON qv.template_id = qt.id
      WHERE ha.student_id = $1 
        AND qt.topic = $2 
        AND ha.created_at >= now() - interval '30 days'
    `,
      [student_id, topic],
    );
    const seenIds = seenRes.rows.map((r) => r.question_id);

    // 3. Query Candidate Pool
    const candParams: unknown[] = [topic, targetDifficulty];
    let candGradeClause = "";
    if (gradeInt !== null) {
      candParams.push(gradeInt);
      candGradeClause = ` AND qt.grade = $3`;
    }
    const candidateRes = await query(
      `
      SELECT qv.id
      FROM public.question_variations qv
      JOIN public.question_templates qt ON qv.template_id = qt.id
      WHERE qt.topic = $1
        AND qv.difficulty = $2
        AND qv.status != 'deprecated'
        AND qv.verifier_status != 'failed'${candGradeClause}
    `,
      candParams,
    );

    let candidates = candidateRes.rows.map((r) => r.id);

    // If candidate pool is too small, fetch general difficulty level candidates to fill
    if (candidates.length === 0) {
      const fbParams: unknown[] = [topic];
      let fbGradeClause = "";
      if (gradeInt !== null) {
        fbParams.push(gradeInt);
        fbGradeClause = ` AND qt.grade = $2`;
      }
      const fallbackRes = await query(
        `
        SELECT qv.id
        FROM public.question_variations qv
        JOIN public.question_templates qt ON qv.template_id = qt.id
        WHERE qt.topic = $1
          AND qv.status != 'deprecated'
          AND qv.verifier_status != 'failed'${fbGradeClause}
      `,
        fbParams,
      );
      candidates = fallbackRes.rows.map((r) => r.id);
    }

    // Filter out seen questions
    let freshPool = candidates.filter((id) => !seenIds.includes(id));
    let selectedIds: string[] = [];
    const targetCount = Math.min(activity_count, candidates.length);

    if (freshPool.length >= targetCount) {
      // Shuffled subset of fresh pool
      selectedIds = freshPool
        .sort(() => 0.5 - Math.random())
        .slice(0, targetCount);
    } else {
      // Use all fresh ones
      selectedIds = [...freshPool];
      // Backfill using seen ones, but without duplicating!
      const remainingNeeded = targetCount - selectedIds.length;
      const seenPool = candidates.filter((id) => seenIds.includes(id));
      const shuffledSeen = seenPool
        .sort(() => 0.5 - Math.random())
        .slice(0, remainingNeeded);
      selectedIds = [...selectedIds, ...shuffledSeen];
    }

    // Shuffle final selection
    selectedIds = selectedIds.sort(() => 0.5 - Math.random());

    if (selectedIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No active and verified questions found for this topic",
        },
        { status: 404 },
      );
    }

    // 4. Create assignment in DB
    const assignRes = await query(
      `
      INSERT INTO public.homework_assignments (
        student_id,
        assigned_by,
        teacher_id,
        topic,
        activity_count,
        difficulty_mode,
        question_ids,
        status,
        assigned_at
      )
      VALUES ($1, 'teacher', $2, $3, $4, $5, $6, 'assigned', now())
      RETURNING id, question_ids
    `,
      [
        student_id,
        teacher_id || null,
        topic,
        selectedIds.length,
        difficulty_mode,
        selectedIds,
      ],
    );

    const newAssignment = assignRes.rows[0];

    return NextResponse.json({
      success: true,
      assignmentId: newAssignment.id,
      questionCount: newAssignment.question_ids.length,
    });
  } catch (error: any) {
    console.error("POST /api/homework/assign error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
