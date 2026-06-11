import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { CANONICAL_TYPES } from "@/lib/scoring";
import { validateAnswerConsistency } from "@/lib/archetypeContracts";

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
      SELECT qv.variation_data, qv.evaluation_spec, qt.props_schema, qt.interaction_type, qt.id as template_id
      FROM public.question_variations qv
      JOIN public.question_templates qt ON qv.template_id = qt.id
      WHERE qv.id = $1
    `, [variationId]);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Question variation not found" }, { status: 404 });
    }

    const { variation_data: variationData, evaluation_spec: evaluationSpec, props_schema: propsSchema, interaction_type: type, template_id: templateId } = rows[0];

    // Simple automated verification logic
    let verifierStatus: "verified" | "failed" = "verified";
    let verifierNotes = "All validations passed: Variation data complies with props_schema and evaluation_spec is well-formed.";

    // 1. Basic check: properties existence based on schema
    if (propsSchema && typeof propsSchema === "object") {
      const required = propsSchema.required || [];
      const missingKeys = required.filter((key: string) => variationData[key] === undefined);

      if (missingKeys.length > 0) {
        verifierStatus = "failed";
        verifierNotes = `Validation failed: Missing required variation_data keys: ${missingKeys.join(", ")}`;
      }
    }

    // 2. Validate evaluation_spec: must be canonical type with a defined answer
    if (!evaluationSpec || typeof evaluationSpec !== "object") {
      verifierStatus = "failed";
      verifierNotes = "Validation failed: evaluation_spec is missing or not an object.";
    } else if (!CANONICAL_TYPES.includes(evaluationSpec.type)) {
      verifierStatus = "failed";
      verifierNotes = `Validation failed: evaluation_spec.type "${evaluationSpec.type}" is not a canonical archetype.`;
    } else if (evaluationSpec.answer === undefined || evaluationSpec.answer === null) {
      verifierStatus = "failed";
      verifierNotes = "Validation failed: evaluation_spec.answer is empty or undefined.";
    } else {
      // 3. Cross-validate: answer must reference ids/values present in variation_data.
      const consistencyError = validateAnswerConsistency(evaluationSpec.type, variationData, evaluationSpec);
      if (consistencyError) {
        verifierStatus = "failed";
        verifierNotes = `Validation failed: ${consistencyError}`;
      }
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
