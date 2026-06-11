import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/questions/:variationId/duplicate
export async function POST(
  request: Request,
  { params }: { params: Promise<{ variationId: string }> }
) {
  try {
    const { variationId } = await params;

    // Fetch existing variation
    const { rows } = await query(`
      SELECT template_id, variation_data, answer_key, difficulty, locale
      FROM public.question_variations
      WHERE id = $1
    `, [variationId]);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Question variation not found" }, { status: 404 });
    }

    const { template_id: templateId, variation_data: variationData, answer_key: answerKey, difficulty, locale } = rows[0];

    // Find next variation_index
    const maxIdxRes = await query(`
      SELECT COALESCE(MAX(variation_index), 0) as max_idx
      FROM public.question_variations
      WHERE template_id = $1
    `, [templateId]);
    
    const nextIndex = (maxIdxRes.rows[0]?.max_idx || 0) + 1;

    // Insert new duplicated variation in draft status
    const insertRes = await query(`
      INSERT INTO public.question_variations (
        template_id, 
        variation_index, 
        variation_data, 
        answer_key, 
        difficulty, 
        locale, 
        status, 
        verifier_status,
        verifier_notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'draft', 'pending', 'Duplicated from existing variation')
      RETURNING id, variation_index
    `, [
      templateId,
      nextIndex,
      JSON.stringify(variationData),
      JSON.stringify(answerKey),
      difficulty,
      locale
    ]);

    const newVariation = insertRes.rows[0];

    // Log the duplication run
    await query(`
      INSERT INTO public.generation_runs (run_type, template_id, variation_id, triggered_by, notes)
      VALUES ('ai_generate', $1, $2, 'admin@eduquest.in', $3)
    `, [
      templateId, 
      newVariation.id, 
      `Duplicated from variation ID ${variationId} as variation index ${newVariation.variation_index}`
    ]);

    return NextResponse.json({
      success: true,
      message: "Question variation duplicated successfully",
      data: {
        id: newVariation.id,
        variationIndex: newVariation.variation_index
      }
    });

  } catch (error: any) {
    console.error("POST /api/admin/questions/[variationId]/duplicate error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
