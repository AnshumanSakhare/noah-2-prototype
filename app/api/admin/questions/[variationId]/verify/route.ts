import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/questions/:variationId/verify
export async function POST(
  request: Request,
  { params }: { params: Promise<{ variationId: string }> }
) {
  try {
    const { variationId } = await params;

    // Fetch variation & template
    const { rows } = await query(`
      SELECT qv.variation_data, qv.answer_key, qt.props_schema, qt.interaction_type, qt.id as template_id
      FROM public.question_variations qv
      JOIN public.question_templates qt ON qv.template_id = qt.id
      WHERE qv.id = $1
    `, [variationId]);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Question variation not found" }, { status: 404 });
    }

    const { variation_data: variationData, answer_key: answerKey, props_schema: propsSchema, interaction_type: type, template_id: templateId } = rows[0];

    // Simple automated verification logic
    let verifierStatus: "verified" | "failed" = "verified";
    let verifierNotes = "All validations passed: Variation data structure complies with props_schema and answer_key exists.";

    // 1. Basic check: properties existence based on schema
    if (propsSchema && typeof propsSchema === "object") {
      const required = propsSchema.required || [];
      const missingKeys = required.filter((key: string) => variationData[key] === undefined);
      
      if (missingKeys.length > 0) {
        verifierStatus = "failed";
        verifierNotes = `Validation failed: Missing required variation_data keys: ${missingKeys.join(", ")}`;
      }
    }

    // 2. Validate answer_key is non-empty
    if (!answerKey || Object.keys(answerKey).length === 0) {
      verifierStatus = "failed";
      verifierNotes = "Validation failed: Answer key is empty or undefined.";
    }

    // Update status in DB
    await query(`
      UPDATE public.question_variations
      SET verifier_status = $1, verifier_notes = $2, updated_at = now()
      WHERE id = $3
    `, [verifierStatus, verifierNotes, variationId]);

    // Log verification run
    await query(`
      INSERT INTO public.generation_runs (run_type, template_id, variation_id, triggered_by, verifier_result, notes)
      VALUES ('re_verify', $1, $2, 'verifier_bot', $3, $4)
    `, [
      templateId, 
      variationId, 
      verifierStatus === "verified" ? "pass" : "fail", 
      verifierNotes
    ]);

    return NextResponse.json({
      success: true,
      verifierStatus,
      verifierNotes
    });

  } catch (error: any) {
    console.error("POST /api/admin/questions/[variationId]/verify error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
