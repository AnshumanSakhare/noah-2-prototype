import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/questions/:variationId
export async function GET(
  request: Request,
  { params }: { params: Promise<{ variationId: string }> }
) {
  try {
    const { variationId } = await params;
    
    const { rows } = await query(`
      SELECT 
        qv.id,
        qv.template_id,
        qv.variation_index,
        qv.variation_data,
        qv.answer_key,
        qv.difficulty,
        qv.locale,
        qv.verifier_status,
        qv.verifier_notes,
        qv.last_edited_by,
        qv.last_edited_at,
        qv.status,
        qv.created_at as variation_created_at,
        qv.updated_at as variation_updated_at,
        qt.slug as template_slug,
        qt.grade,
        qt.topic,
        qt.subtopic,
        qt.learning_objective,
        qt.interaction_type,
        qt.template_html,
        qt.props_schema,
        qt.answer_key_fn
      FROM public.question_variations qv
      JOIN public.question_templates qt ON qv.template_id = qt.id
      WHERE qv.id = $1
    `, [variationId]);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Question variation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });

  } catch (error: any) {
    console.error("GET /api/admin/questions/[variationId] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/questions/:variationId - Update variation details
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ variationId: string }> }
) {
  try {
    const { variationId } = await params;
    const body = await request.json();
    const { variation_data, answer_key, status, verifier_notes } = body;

    // Fetch "before" snapshot first
    const beforeRes = await query(`
      SELECT variation_data, answer_key, status, verifier_status, verifier_notes
      FROM public.question_variations
      WHERE id = $1
    `, [variationId]);

    if (beforeRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Question variation not found" }, { status: 404 });
    }
    const beforeData = beforeRes.rows[0];

    const editorEmail = "admin@eduquest.in"; // Mock session email
    const editorTime = new Date().toISOString();

    // Update
    await query(`
      UPDATE public.question_variations
      SET 
        variation_data = $1,
        answer_key = $2,
        status = $3,
        verifier_notes = $4,
        last_edited_by = $5,
        last_edited_at = $6,
        updated_at = now()
      WHERE id = $7
    `, [
      JSON.stringify(variation_data), 
      JSON.stringify(answer_key), 
      status, 
      verifier_notes, 
      editorEmail, 
      editorTime,
      variationId
    ]);

    // Fetch the updated state to be safe
    const afterRes = await query(`
      SELECT id, template_id, variation_data, answer_key, status, verifier_notes, last_edited_by, last_edited_at
      FROM public.question_variations
      WHERE id = $1
    `, [variationId]);
    const afterData = afterRes.rows[0];

    // Log the change in public.generation_runs
    await query(`
      INSERT INTO public.generation_runs (run_type, template_id, variation_id, triggered_by, output_snapshot, notes)
      VALUES ('human_edit', $1, $2, $3, $4, $5)
    `, [
      afterData.template_id,
      variationId,
      editorEmail,
      JSON.stringify({ before: beforeData, after: afterData }),
      `Manual edit by editor ${editorEmail}`
    ]);

    return NextResponse.json({ success: true, message: "Changes saved successfully", data: afterData });

  } catch (error: any) {
    console.error("PUT /api/admin/questions/[variationId] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/questions/:variationId - Permanently remove a variation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ variationId: string }> }
) {
  try {
    const { variationId } = await params;

    // Verify it exists first
    const check = await query(
      `SELECT qv.id FROM public.question_variations qv WHERE qv.id = $1`,
      [variationId]
    );

    if (check.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Question variation not found" }, { status: 404 });
    }

    // Nullify FK references in audit log before deletion (preserves history)
    await query(
      `UPDATE public.generation_runs SET variation_id = NULL WHERE variation_id = $1`,
      [variationId]
    );

    // Delete the variation
    await query(`DELETE FROM public.question_variations WHERE id = $1`, [variationId]);

    return NextResponse.json({ success: true, message: `Variation deleted successfully` });

  } catch (error: any) {
    console.error("DELETE /api/admin/questions/[variationId] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
