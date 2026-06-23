import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/questions - List variations with filters and pagination
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Filters
    const grade = searchParams.get("grade"); // e.g. "0,6"
    const topic = searchParams.get("topic");
    const subtopic = searchParams.get("subtopic");
    const interactionType = searchParams.get("interaction_type"); // e.g. "mcq,fill"
    const difficulty = searchParams.get("difficulty");
    const status = searchParams.get("status");
    const verifierStatus = searchParams.get("verifier_status");
    const search = searchParams.get("search");

    // Pagination (clamp limit to a sane range so large requests stay safe)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const rawLimit = parseInt(searchParams.get("limit") || "10") || 10;
    const limit = Math.min(Math.max(rawLimit, 1), 500);
    const offset = (page - 1) * limit;

    // Build dynamic query
    let baseQuery = `
      FROM public.question_variations qv
      JOIN public.question_templates qt ON qv.template_id = qt.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (grade) {
      const grades = grade
        .split(",")
        .map((g) => parseInt(g.trim()))
        .filter((g) => !isNaN(g));
      if (grades.length > 0) {
        baseQuery += ` AND qt.grade = ANY($${paramIndex})`;
        params.push(grades);
        paramIndex++;
      }
    }

    if (topic) {
      baseQuery += ` AND qt.topic = $${paramIndex}`;
      params.push(topic);
      paramIndex++;
    }

    if (subtopic) {
      baseQuery += ` AND qt.subtopic = $${paramIndex}`;
      params.push(subtopic);
      paramIndex++;
    }

    if (interactionType) {
      const types = interactionType.split(",").map((t) => t.trim());
      if (types.length > 0) {
        baseQuery += ` AND qt.interaction_type = ANY($${paramIndex})`;
        params.push(types);
        paramIndex++;
      }
    }

    if (difficulty) {
      baseQuery += ` AND qv.difficulty = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }

    if (status) {
      baseQuery += ` AND qv.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (verifierStatus) {
      baseQuery += ` AND qv.verifier_status = $${paramIndex}`;
      params.push(verifierStatus);
      paramIndex++;
    }

    if (search) {
      baseQuery += ` AND (qt.slug ILIKE $${paramIndex} OR qt.topic ILIKE $${paramIndex} OR qt.subtopic ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Count query
    const countRes = await query(
      `SELECT COUNT(*)::integer as total ${baseQuery}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;

    // Fetch query
    const fetchQuery = `
      SELECT 
        qv.id,
        qv.template_id,
        qv.variation_index,
        qv.variation_data,
        qv.difficulty,
        qv.locale,
        qv.verifier_status,
        qv.verifier_notes,
        qv.last_edited_by,
        qv.last_edited_at,
        qv.status,
        qv.created_at,
        qv.updated_at,
        qt.slug as template_slug,
        qt.grade,
        qt.topic,
        qt.subtopic,
        qt.interaction_type,
        qt.learning_objective
      ${baseQuery}
      ORDER BY qt.topic, qv.template_id, qv.variation_index
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const finalParams = [...params, limit, offset];
    const { rows } = await query(fetchQuery, finalParams);

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/questions error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// PUT /api/admin/questions - Bulk Actions
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { ids, action, statusValue } = body; // ids is UUID[]

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid variation IDs list" },
        { status: 400 },
      );
    }

    if (action === "mark_status") {
      if (!statusValue) {
        return NextResponse.json(
          { success: false, error: "Missing status value" },
          { status: 400 },
        );
      }

      await query(
        `UPDATE public.question_variations SET status = $1, updated_at = now() WHERE id = ANY($2)`,
        [statusValue, ids],
      );

      // Log bulk edit
      for (const id of ids) {
        await query(
          `
          INSERT INTO public.generation_runs (run_type, variation_id, triggered_by, notes)
          VALUES ('human_edit', $1, 'system_bulk_admin', $2)
        `,
          [id, `Bulk set status to: ${statusValue}`],
        );
      }

      return NextResponse.json({
        success: true,
        message: `Successfully updated status to ${statusValue} for ${ids.length} questions`,
      });
    }

    if (action === "flag_reverify") {
      await query(
        `UPDATE public.question_variations SET verifier_status = 'pending', updated_at = now() WHERE id = ANY($1)`,
        [ids],
      );

      for (const id of ids) {
        await query(
          `
          INSERT INTO public.generation_runs (run_type, variation_id, triggered_by, notes)
          VALUES ('re_verify', $1, 'system_bulk_admin', 'Bulk flagged for re-verification')
        `,
          [id],
        );
      }

      return NextResponse.json({
        success: true,
        message: `Successfully flagged ${ids.length} questions for re-verification`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action type" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("PUT /api/admin/questions error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
