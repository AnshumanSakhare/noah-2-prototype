import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/homework/assign - Assign a new homework set to a student
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { student_id, topic, activity_count, difficulty_mode, teacher_id } = body;

    if (!student_id || !topic || !activity_count || !difficulty_mode) {
      return NextResponse.json({ success: false, error: "Missing required assignment parameters" }, { status: 400 });
    }

    // 1. Resolve Target Difficulty (incorporates adaptive difficulty logic)
    let targetDifficulty = "medium";
    if (difficulty_mode === "adaptive") {
      // Fetch student's last 10 attempts on this topic
      const historyRes = await query(`
        SELECT ha.is_correct, qv.difficulty
        FROM public.homework_attempts ha
        JOIN public.question_variations qv ON ha.question_id = qv.id
        JOIN public.question_templates qt ON qv.template_id = qt.id
        WHERE ha.student_id = $1 AND qt.topic = $2
        ORDER BY ha.created_at DESC
        LIMIT 10
      `, [student_id, topic]);

      if (historyRes.rows.length > 0) {
        const correctCount = historyRes.rows.filter(r => r.is_correct === true).length;
        const totalCount = historyRes.rows.length;
        const accuracy = correctCount / totalCount;
        
        // Take the difficulty of the most recent attempt as base
        const lastDifficulty = historyRes.rows[0].difficulty || "medium";

        if (accuracy > 0.80) {
          // Bump difficulty up
          if (lastDifficulty === "easy") targetDifficulty = "medium";
          else if (lastDifficulty === "medium" || lastDifficulty === "hard") targetDifficulty = "hard";
        } else if (accuracy < 0.50) {
          // Step difficulty down
          if (lastDifficulty === "hard") targetDifficulty = "medium";
          else if (lastDifficulty === "medium" || lastDifficulty === "easy") targetDifficulty = "easy";
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
    const seenRes = await query(`
      SELECT DISTINCT ha.question_id
      FROM public.homework_attempts ha
      JOIN public.question_variations qv ON ha.question_id = qv.id
      JOIN public.question_templates qt ON qv.template_id = qt.id
      WHERE ha.student_id = $1 
        AND qt.topic = $2 
        AND ha.created_at >= now() - interval '30 days'
    `, [student_id, topic]);
    const seenIds = seenRes.rows.map(r => r.question_id);

    // 3. Query Candidate Pool
    // Filtered by: topic + difficulty + status = 'active' + verifier_status = 'verified'
    const candidateRes = await query(`
      SELECT qv.id
      FROM public.question_variations qv
      JOIN public.question_templates qt ON qv.template_id = qt.id
      WHERE qt.topic = $1
        AND qv.difficulty = $2
        AND qv.status = 'active'
        AND qv.verifier_status = 'verified'
    `, [topic, targetDifficulty]);

    let candidates = candidateRes.rows.map(r => r.id);

    // If candidate pool is too small, fetch general difficulty level candidates to fill
    if (candidates.length === 0) {
      const fallbackRes = await query(`
        SELECT qv.id
        FROM public.question_variations qv
        JOIN public.question_templates qt ON qv.template_id = qt.id
        WHERE qt.topic = $1
          AND qv.status = 'active'
          AND qv.verifier_status = 'verified'
      `, [topic]);
      candidates = fallbackRes.rows.map(r => r.id);
    }

    // Filter out seen questions
    let freshPool = candidates.filter(id => !seenIds.includes(id));
    let selectedIds: string[] = [];

    // Check if fresh pool is big enough
    if (freshPool.length >= activity_count) {
      // Shuffle fresh pool and take activity_count
      selectedIds = freshPool.sort(() => 0.5 - Math.random()).slice(0, activity_count);
    } else {
      // Not enough fresh questions, take all fresh questions and backfill with oldest-seen questions
      selectedIds = [...freshPool];
      const needed = activity_count - freshPool.length;
      
      // Fetch seen questions ordered by oldest attempt first to backfill
      const backfillRes = await query(`
        SELECT qv.id, MAX(ha.created_at) as last_seen
        FROM public.question_variations qv
        JOIN public.homework_attempts ha ON ha.question_id = qv.id
        JOIN public.question_templates qt ON qv.template_id = qt.id
        WHERE ha.student_id = $1 
          AND qt.topic = $2
          AND qv.id = ANY($3)
        GROUP BY qv.id
        ORDER BY last_seen ASC
        LIMIT $4
      `, [student_id, topic, candidates, needed]);
      
      const backfillIds = backfillRes.rows.map(r => r.id);
      selectedIds = [...selectedIds, ...backfillIds];
      
      // If we still need more (e.g. very few questions total in DB), just repeat candidates
      if (selectedIds.length < activity_count && candidates.length > 0) {
        let loopSafety = 0;
        while (selectedIds.length < activity_count && loopSafety < 100) {
          const randId = candidates[Math.floor(Math.random() * candidates.length)];
          if (!selectedIds.includes(randId)) {
            selectedIds.push(randId);
          } else {
            // allow duplicate as fallback
            selectedIds.push(randId);
          }
          loopSafety++;
        }
      }
    }

    // Shuffle final selection
    selectedIds = selectedIds.sort(() => 0.5 - Math.random()).slice(0, activity_count);

    if (selectedIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "No active and verified questions found for this topic" 
      }, { status: 404 });
    }

    // 4. Create assignment in DB
    const assignRes = await query(`
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
    `, [
      student_id, 
      teacher_id || null, 
      topic, 
      selectedIds.length, 
      difficulty_mode, 
      selectedIds
    ]);

    const newAssignment = assignRes.rows[0];

    return NextResponse.json({
      success: true,
      assignmentId: newAssignment.id,
      questionCount: newAssignment.question_ids.length
    });

  } catch (error: any) {
    console.error("POST /api/homework/assign error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
