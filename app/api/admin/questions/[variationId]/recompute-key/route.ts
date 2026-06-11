import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/questions/:variationId/recompute-key
export async function POST(
  request: Request,
  { params }: { params: Promise<{ variationId: string }> }
) {
  try {
    const { variationId } = await params;

    // Fetch variation & template
    const { rows } = await query(`
      SELECT qv.variation_data, qv.evaluation_spec, qt.answer_key_fn, qt.interaction_type, qt.id as template_id
      FROM public.question_variations qv
      JOIN public.question_templates qt ON qv.template_id = qt.id
      WHERE qv.id = $1
    `, [variationId]);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Question variation not found" }, { status: 404 });
    }

    const { variation_data: variationData, answer_key_fn: answerKeyFn, interaction_type: type, template_id: templateId } = rows[0];

    let computedSpec: any = null;

    if (answerKeyFn && answerKeyFn.trim()) {
      try {
        // Evaluate the server-side function.
        // It receives 'variation_data' and returns a canonical evaluation_spec.
        const runFn = new Function("variation_data", answerKeyFn);
        computedSpec = runFn(variationData);
      } catch (err: any) {
        console.error("Error executing answer_key_fn:", err);
      }
    }

    // Fallbacks if the function fails or is empty — produce a canonical evaluation_spec
    // by reading conventional answer fields from variation_data.
    if (!computedSpec) {
      const base = { type, scoring: "partial" as const };
      if (type === "tap-select") {
        computedSpec = { ...base, scoring: "binary", answer: variationData.answer ?? variationData.correct ?? null };
      } else if (type === "fill-slot") {
        computedSpec = { ...base, answer: variationData.slots ?? variationData.answers ?? {} };
      } else if (type === "drag-drop") {
        computedSpec = { ...base, answer: variationData.placements ?? variationData.pairs ?? {} };
      } else if (type === "sequence-order") {
        computedSpec = { ...base, answer: variationData.order ?? variationData.correctOrder ?? [] };
      } else if (type === "build-count") {
        computedSpec = { ...base, scoring: "binary", answer: variationData.count ?? variationData.answer ?? 0 };
      } else if (type === "number-line") {
        computedSpec = { ...base, answer: variationData.position ?? variationData.answer ?? 0, min: variationData.min ?? 0, max: variationData.max ?? 1 };
      } else if (type === "partition") {
        computedSpec = { ...base, answer: variationData.parts ?? [] };
      } else {
        computedSpec = { ...base, answer: null };
      }
    }

    // Save back to DB & set verifier_status = 'pending'
    await query(`
      UPDATE public.question_variations
      SET evaluation_spec = $1, verifier_status = 'pending', updated_at = now()
      WHERE id = $2
    `, [JSON.stringify(computedSpec), variationId]);

    // Log the run
    await query(`
      INSERT INTO public.generation_runs (run_type, template_id, variation_id, triggered_by, output_snapshot, notes)
      VALUES ('human_edit', $1, $2, 'admin@eduquest.in', $3, 'Recomputed evaluation_spec using template function')
    `, [templateId, variationId, JSON.stringify({ recomputedEvaluationSpec: computedSpec })]);

    return NextResponse.json({
      success: true,
      message: "Evaluation spec recomputed successfully",
      evaluationSpec: computedSpec
    });

  } catch (error: any) {
    console.error("POST /api/admin/questions/[variationId]/recompute-key error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
