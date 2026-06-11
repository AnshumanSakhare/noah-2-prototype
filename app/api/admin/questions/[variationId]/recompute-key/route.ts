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
      SELECT qv.variation_data, qv.answer_key, qt.answer_key_fn, qt.interaction_type, qt.id as template_id
      FROM public.question_variations qv
      JOIN public.question_templates qt ON qv.template_id = qt.id
      WHERE qv.id = $1
    `, [variationId]);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Question variation not found" }, { status: 404 });
    }

    const { variation_data: variationData, answer_key_fn: answerKeyFn, interaction_type: type, template_id: templateId } = rows[0];

    let computedKey: any = null;

    if (answerKeyFn && answerKeyFn.trim()) {
      try {
        // Evaluate the server-side function
        // The function is assumed to receive 'variation_data' and return the answer key object
        const runFn = new Function("variation_data", answerKeyFn);
        computedKey = runFn(variationData);
      } catch (err: any) {
        console.error("Error executing answer_key_fn:", err);
      }
    }

    // Fallbacks if function fails or is empty
    if (!computedKey) {
      if (type === "mcq") {
        computedKey = { correct: typeof variationData.correct === "number" ? variationData.correct : 0 };
      } else if (type === "fill") {
        computedKey = { correct: String(variationData.answer || "") };
      } else if (type === "blanks") {
        computedKey = { correct: variationData.answers || [] };
      } else if (type === "drag") {
        const correctMap: Record<string, string> = {};
        if (Array.isArray(variationData.pairs)) {
          variationData.pairs.forEach((p: any) => {
            correctMap[p.zone] = p.item;
          });
        }
        computedKey = { correct: correctMap };
      } else if (type === "game-tap") {
        computedKey = { correct: variationData.correctSide || "A" };
      } else if (type === "game-compare") {
        computedKey = { correct: variationData.correctSymbol || "=" };
      } else if (type === "game-sort") {
        computedKey = { correct: variationData.correctOrder || [] };
      } else {
        computedKey = { correct: null };
      }
    }

    // Save back to DB & set verifier_status = 'pending'
    await query(`
      UPDATE public.question_variations
      SET answer_key = $1, verifier_status = 'pending', updated_at = now()
      WHERE id = $2
    `, [JSON.stringify(computedKey), variationId]);

    // Log the run
    await query(`
      INSERT INTO public.generation_runs (run_type, template_id, variation_id, triggered_by, output_snapshot, notes)
      VALUES ('human_edit', $1, $2, 'admin@eduquest.in', $3, 'Recomputed answer key using template function')
    `, [templateId, variationId, JSON.stringify({ recomputedAnswerKey: computedKey })]);

    return NextResponse.json({
      success: true,
      message: "Answer key recomputed successfully",
      answerKey: computedKey
    });

  } catch (error: any) {
    console.error("POST /api/admin/questions/[variationId]/recompute-key error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
