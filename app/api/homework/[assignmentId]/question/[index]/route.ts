import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/homework/:assignmentId/question/:index - Serve a single hydrated question HTML
export async function GET(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string; index: string }> }
) {
  try {
    const { assignmentId, index } = await params;
    const qIndex = parseInt(index);

    if (isNaN(qIndex)) {
      return NextResponse.json({ success: false, error: "Invalid question index" }, { status: 400 });
    }

    // 1. Fetch assignment question IDs
    const assignRes = await query(`
      SELECT question_ids, status, topic
      FROM public.homework_assignments
      WHERE id = $1
    `, [assignmentId]);

    if (assignRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Assignment not found" }, { status: 404 });
    }

    const { question_ids: questionIds, status: assignmentStatus, topic: assignmentTopic } = assignRes.rows[0];

    if (qIndex < 0 || qIndex >= questionIds.length) {
      return NextResponse.json({ success: false, error: "Question index out of bounds" }, { status: 400 });
    }

    const targetQuestionId = questionIds[qIndex];

    // Update assignment status to in_progress if currently assigned
    if (assignmentStatus === "assigned") {
      await query(`
        UPDATE public.homework_assignments
        SET status = 'in_progress', started_at = now()
        WHERE id = $1
      `, [assignmentId]);
    }

    // 2. Fetch the question variation and parent template details
    const variationRes = await query(`
      SELECT 
        qv.id,
        qv.variation_data,
        qv.difficulty,
        qt.template_html,
        qt.interaction_type,
        qt.grade,
        qt.topic,
        qt.subtopic,
        qt.learning_objective,
        qt.slug as template_slug
      FROM public.question_variations qv
      JOIN public.question_templates_1 qt ON qv.template_id = qt.id
      WHERE qv.id = $1
    `, [targetQuestionId]);

    if (variationRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Question variation not found" }, { status: 404 });
    }

    const question = variationRes.rows[0];
    const { template_html: templateHtml, variation_data: variationData } = question;

    // 3. Hydrate Template HTML
    // Replace all {{VAR_NAME}} placeholders with variation_data values
    let hydratedHtml = templateHtml;
    
    // Check all keys in variationData
    for (const key in variationData) {
      const val = variationData[key];
      const stringVal = typeof val === "object" ? JSON.stringify(val) : String(val);
      
      // Perform global replace
      hydratedHtml = hydratedHtml.replaceAll(`{{${key}}}`, stringVal);
    }

    // Safety net: strip any leftover {{token}} that had no matching variation_data
    // key, so the student never sees a literal "{{...}}" in the rendered question.
    hydratedHtml = hydratedHtml.replace(/\{\{\s*[\w.\-]+\s*\}\}/g, "");

    // Inject Silent Mode — suppress in-game correct/incorrect feedback
    // Games that honor SILENT_MODE will show neutral selection styles only
    hydratedHtml = hydratedHtml.replace(/<head>/i, '<head>\n<script>window.SILENT_MODE = true;</script>');

    // Fit-to-viewport shim: scale the .game so the whole game (including bottom
    // controls) always fits the runner card — never clipped, responsive to width.
    const FIT_SHIM = `
<script>(function(){
  try {
    var st = document.createElement('style');
    st.textContent = 'html,body{height:100%!important;width:100%!important;margin:0!important;overflow:hidden!important;}body{display:block!important;}';
    (document.head||document.documentElement).appendChild(st);
  } catch(e){}
  function fit(){
    var g = document.querySelector('.game');
    if(!g) return;
    g.style.height = 'auto';
    g.style.transform = 'none';
    g.style.position = 'absolute';
    g.style.transformOrigin = 'top left';
    var w = g.offsetWidth, h = g.offsetHeight;
    if(!w || !h) return;
    var s = Math.min(window.innerWidth / w, window.innerHeight / h, 1);
    g.style.left = Math.max(0, (window.innerWidth - w * s) / 2) + 'px';
    g.style.top = Math.max(0, (window.innerHeight - h * s) / 2) + 'px';
    g.style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('load', fit);
  window.addEventListener('resize', fit);
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(fit, 50); });
  setTimeout(fit, 350);
})();</script>`;
    hydratedHtml = /<\/body>/i.test(hydratedHtml)
      ? hydratedHtml.replace(/<\/body>/i, FIT_SHIM + "\n</body>")
      : hydratedHtml + FIT_SHIM;

    // Return hydrated HTML + clean metadata (exclude answer_key completely)
    return NextResponse.json({
      success: true,
      data: {
        id: question.id,
        interaction_type: question.interaction_type,
        grade: question.grade,
        topic: question.topic,
        subtopic: question.subtopic,
        learning_objective: question.learning_objective,
        difficulty: question.difficulty,
        template_slug: question.template_slug,
        html: hydratedHtml,
        variation_data: variationData
      }
    });

  } catch (error: any) {
    console.error("GET /api/homework/[assignmentId]/question/[index] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
