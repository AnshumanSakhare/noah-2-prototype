import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gpt-5.4-mini"; // Using the proxy model alias configured in other agents

// Helper to fetch subtopics, learning objectives and examples from Excel
function getXlsxContext(grade: number, topic: string) {
  try {
    const filePath = path.resolve(process.cwd(), "Question Bank Plan - 13 ap.xlsx");
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    const gradeLabel = grade === 0 ? "KG" : `G${grade}`;
    const matchingRows = data.filter((row) => {
      const g = String(row.Grade || row.grade || "").trim();
      const t = String(row.Topic || row.topic || "").trim();
      return g === gradeLabel && t === topic;
    });

    if (matchingRows.length === 0) {
      return null;
    }

    const subtopics = Array.from(new Set(matchingRows.map((r) => r.Subtopic || r.subtopic || "").filter(Boolean)));
    const learningObjectives = Array.from(new Set(matchingRows.map((r) => r["Learning Objective"] || r.learning_objective || "").filter(Boolean)));
    const exampleQuestions = Array.from(new Set(matchingRows.map((r) => r["Example Question"] || r.example_question || "").filter(Boolean)));

    return {
      subtopics,
      learningObjectives,
      exampleQuestions
    };
  } catch (err) {
    console.error("Failed to read context from Excel sheet:", err);
    return null;
  }
}

// Define Zod response schema for OpenAI Structured Outputs
// We use JSON-encoded strings for properties, variationData and answerKey to bypass schema constraints
const GenerateResponseSchema = z.object({
  learningObjective: z.string(),
  interactionType: z.string(),
  templateHtml: z.string(),
  propsSchemaJson: z.string(),
  variationDataJson: z.string(),
  answerKeyJson: z.string()
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    const body = await request.json();
    const {
      action,
      grade,
      topic,
      difficulty,
      variationIndex,
      interactionArchetype,
      customPrompt,
      variationId
    } = body;

    if (!action || grade === undefined || !topic || !difficulty || !variationIndex) {
      return NextResponse.json({ success: false, error: "Missing required fields in payload" }, { status: 400 });
    }

    // Load instructions and skeletal tokens from htmlGenerate.md
    let markdownPrompt = "";
    try {
      const promptPath = path.join(process.cwd(), ".claude", "htmlGenerate.md");
      markdownPrompt = fs.readFileSync(promptPath, "utf-8");
    } catch (err) {
      console.warn("Could not read htmlGenerate.md prompt template, falling back to manual instructions.", err);
    }

    const openai = new OpenAI({
      timeout: 150_000,
      maxRetries: 1
    });

    // Determine the grade key prefix (e.g. KG, Grade 3)
    const gradeLabel = grade === 0 ? "KG" : `Grade ${grade}`;

    let systemPrompt = `You are an expert EduQuest Interactive Game Designer.
Your task is to generate or revise a self-contained, interactive, colorful math game for a student.

Grade: ${gradeLabel}
Topic Focus: ${topic}
Target Difficulty: ${difficulty.toUpperCase()} (Index: ${variationIndex} out of 3 for this difficulty level)
Chosen Archetype: ${interactionArchetype || "Any suitable archetype"}

PEDAGOGICAL DIFFICULTY GUIDES:
- EASY: Very straightforward recognition, counting small sets, extremely clear visuals, and single-step operations.
- MEDIUM: Multi-step, simple comparisons, introduces math symbols (>, <, =), includes fractions or simple equations.
- HARD: Multi-variable drag-matching, sequence sorting, complex number-line plotting, or abstract algebraic balances.

Here are the strict design, HTML skeleton, and interaction rules you MUST follow:
---
${markdownPrompt}
---

STRICT SKELETON PARAMETERIZATION REQUIREMENT:
The HTML template must be editable by the testing team.
You must replace the main variable parameters inside the HTML (like question text, choices, numbers, correct answers, etc.) with template placeholders in double curly braces, e.g. {{question_text}}, {{correct_answer}}, etc.
For example, inside script block: const CORRECT = {{correct_answer}};

OUTPUT FORMAT FOR COMPLEX OBJECTS:
Because of Structured Outputs API schema constraints, you must output propsSchemaJson, variationDataJson, and answerKeyJson as serialized JSON-encoded strings.

For example, if your game compares two numbers:
- In templateHtml:
  - display the numbers inside elements like <div class="token">{{numberA}}</div>
  - script CORRECT logic: const CORRECT = "{{correctAnswerSide}}"; // 'A' or 'B'
- propsSchemaJson (JSON-encoded string):
  "{\\\"type\\\":\\\"object\\\",\\\"properties\\\":{\\\"question_text\\\":{\\\"type\\\":\\\"string\\\",\\\"description\\\":\\\"Instructions at top\\\"},\\\"numberA\\\":{\\\"type\\\":\\\"number\\\",\\\"description\\\":\\\"First number\\\"},\\\"numberB\\\":{\\\"type\\\":\\\"number\\\",\\\"description\\\":\\\"Second number\\\"},\\\"correctAnswerSide\\\":{\\\"type\\\":\\\"string\\\",\\\"description\\\":\\\"Correct side\\\"}},\\\"required\\\":[\\\"question_text\\\",\\\"numberA\\\",\\\"numberB\\\",\\\"correctAnswerSide\\\"]}"
- variationDataJson (JSON-encoded string):
  "{\\\"question_text\\\":\\\"Which side has the larger number?\\\",\\\"numberA\\\":8,\\"numberB\\":5,\\"correctAnswerSide\\":\\\"A\\\"}"
- answerKeyJson (JSON-encoded string):
  "\\\"A\\\""
`;

    // Fetch context from Excel sheet
    const xlsxContext = getXlsxContext(grade, topic);
    let xlsxPromptContext = "";
    if (xlsxContext) {
      xlsxPromptContext = `
EXCEL CURRICULUM CONTEXT:
- Subtopics in Excel Plan: ${xlsxContext.subtopics.join(", ")}
- Target Learning Objectives (LO):
${xlsxContext.learningObjectives.map((lo, i) => `  ${i + 1}. ${lo}`).join("\n")}
${xlsxContext.exampleQuestions.length > 0 ? `- Example Questions from Plan:\n${xlsxContext.exampleQuestions.map(q => `  * ${q}`).join("\n")}` : ""}
`;
      systemPrompt += xlsxPromptContext;
    }

    // Append STRICT DIRECTIVE ON USER CUSTOM PROMPT at the very end of systemPrompt
    systemPrompt += `
STRICT DIRECTIVE ON USER CUSTOM PROMPT:
If the user provides custom guidelines, revision instructions, or tester guidance (e.g. via the custom prompt or tester instructions), they take the ABSOLUTE HIGHEST PRIORITY. You must adapt the game's mechanics, colors, numbers, layout, and pedagogical goals to satisfy the custom prompt/guidelines, overriding any default rules, system objectives, or Excel curriculum contexts if they conflict.
`;

    let userPrompt = "";

    if (action === "create") {
      userPrompt = `Please create a brand new interactive game from scratch.
Topic focus: ${topic}
Grade: ${gradeLabel}
Difficulty: ${difficulty}
Interaction archetype: ${interactionArchetype}
Optional tester guidance: ${customPrompt || "None. Be creative, colorful, and pedagocially accurate."}
`;
      if (customPrompt) {
        userPrompt += `
STRICT REQUIREMENT: The "Optional tester guidance" provided above takes the absolute highest priority and MUST override any conflicting default guidelines, subtopics, learning objectives, or Excel curriculum contexts. Adhere to it precisely.
`;
      }
      userPrompt += `
Return a completely unique design suited for this topic, avoiding repeating the same old formats. Make it visually beautiful, engaging, and premium.`;
    } else if (action === "regenerate") {
      if (!variationId) {
        return NextResponse.json({ success: false, error: "Missing variationId for action: regenerate" }, { status: 400 });
      }

      // Fetch current database variation & template to pass as context
      const existingRes = await query(
        `SELECT 
          qv.id,
          qv.variation_data,
          qv.answer_key,
          qt.template_html,
          qt.props_schema,
          qt.interaction_type,
          qt.learning_objective
        FROM public.question_variations qv
        JOIN public.question_templates qt ON qv.template_id = qt.id
        WHERE qv.id = $1`,
        [variationId]
      );

      if (existingRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Existing variation not found" }, { status: 404 });
      }

      const existing = existingRes.rows[0];

      userPrompt = `Please revise and edit the existing interactive game.
The current game details are:
- Learning Objective: ${existing.learning_objective}
- Interaction Format: ${existing.interaction_type}
- HTML Template:
\`\`\`html
${existing.template_html}
\`\`\`
- Props Schema:
${JSON.stringify(existing.props_schema, null, 2)}
- Current Variation Data:
${JSON.stringify(existing.variation_data, null, 2)}
- Answer Key:
${JSON.stringify(existing.answer_key, null, 2)}

Tester instructions for editing/regenerating:
"${customPrompt}"
`;
      if (customPrompt) {
        userPrompt += `
STRICT REQUIREMENT: The "Tester instructions for editing/regenerating" provided above take the absolute highest priority and MUST override any conflicting default guidelines, original learning objectives, or Excel curriculum contexts. Adhere to it precisely.
`;
      }
      userPrompt += `
Please update the template HTML, variables schema, and default variation data according to these instructions. Ensure you preserve the required skeletal formatting and JavaScript interaction contract.`;
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    // Logging prompt details and sizes
    const systemPromptLength = systemPrompt.length;
    const userPromptLength = userPrompt.length;
    const systemPromptWordCount = systemPrompt.split(/\s+/).length;
    const userPromptWordCount = userPrompt.split(/\s+/).length;
    // Estimate tokens (roughly 1 token per 4 characters)
    const estimatedSystemTokens = Math.round(systemPromptLength / 4);
    const estimatedUserTokens = Math.round(userPromptLength / 4);
    const totalEstimatedTokens = estimatedSystemTokens + estimatedUserTokens;

    console.log(`[AI QUESTION GENERATOR] [VERBOSE LOG] Prompt Details:`);
    console.log(`- System Prompt Size: ${systemPromptLength} chars, ~${systemPromptWordCount} words, ~${estimatedSystemTokens} estimated tokens`);
    console.log(`- User Prompt Size: ${userPromptLength} chars, ~${userPromptWordCount} words, ~${estimatedUserTokens} estimated tokens`);
    console.log(`- Total Estimated Input Tokens: ~${totalEstimatedTokens}`);
    console.log(`- Target Model: ${MODEL}`);
    console.log(`- Action: ${action}, Topic: ${topic}, Grade: ${gradeLabel}, Difficulty: ${difficulty}`);

    const startTime = Date.now();
    console.log(`[AI QUESTION GENERATOR] [VERBOSE LOG] Dispatching request to OpenAI API...`);

    // Call OpenAI with Structured Outputs
    const response = await openai.responses.parse({
      model: MODEL,
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      text: {
        verbosity: "low",
        format: zodTextFormat(GenerateResponseSchema, "game_generator_response")
      }
    });

    const endTime = Date.now();
    const durationSec = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`[AI QUESTION GENERATOR] [VERBOSE LOG] Received response from OpenAI API in ${durationSec} seconds.`);

    // Log metadata usage if returned in response
    if (response.usage) {
      console.log(`[AI QUESTION GENERATOR] [VERBOSE LOG] Token Usage:`, JSON.stringify(response.usage, null, 2));
    }

    const parsed = response.output_parsed;
    if (!parsed) {
      return NextResponse.json({ success: false, error: "Could not parse AI response output schema." }, { status: 500 });
    }

    const {
      learningObjective,
      interactionType,
      templateHtml,
      propsSchemaJson,
      variationDataJson,
      answerKeyJson
    } = parsed;

    let propsSchema: any;
    let variationData: any;
    let answerKey: any;

    try {
      propsSchema = JSON.parse(propsSchemaJson);
      variationData = JSON.parse(variationDataJson);
      answerKey = JSON.parse(answerKeyJson);
    } catch (parseErr: any) {
      console.error("Failed to parse JSON strings from AI response:", parseErr);
      return NextResponse.json({
        success: false,
        error: `AI returned invalid JSON structures: ${parseErr.message}. Raw schema: ${propsSchemaJson}, data: ${variationDataJson}, key: ${answerKeyJson}`
      }, { status: 500 });
    }

    if (action === "create") {
      // Create a unique slug for the new template
      const topicSlug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const templateSlug = `gen-${topicSlug}-${difficulty}-v${variationIndex}-${Date.now()}`;

      // Start database transaction
      const client = await query("BEGIN");
      try {
        // 1. Insert Template (Stringify propsSchema for JSONB binding)
        const templateRes = await query(
          `INSERT INTO public.question_templates (slug, grade, topic, subtopic, learning_objective, interaction_type, template_html, props_schema, status, difficulty)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id`,
          [templateSlug, grade, topic, "Interactive AI", learningObjective, interactionType, templateHtml, JSON.stringify(propsSchema), "draft", difficulty]
        );

        const templateId = templateRes.rows[0].id;

        // 2. Insert Variation (Stringify variationData and answerKey for JSONB binding)
        const variationRes = await query(
          `INSERT INTO public.question_variations (template_id, variation_index, variation_data, answer_key, difficulty, locale, verifier_status, status, last_edited_by, last_edited_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
          RETURNING id`,
          [templateId, variationIndex, JSON.stringify(variationData), JSON.stringify(answerKey), difficulty, "en-IN", "pending", "draft", "ai_generator"]
        );

        const variationId = variationRes.rows[0].id;

        // 3. Log to generation_runs
        await query(
          `INSERT INTO public.generation_runs (run_type, template_id, variation_id, triggered_by, notes)
          VALUES ('ai_generate', $1, $2, 'tester_ai_generator', $3)`,
          [templateId, variationId, `AI generated slot ${variationIndex} with archetype: ${interactionType}`]
        );

        await query("COMMIT");

        return NextResponse.json({
          success: true,
          message: "Successfully generated new interactive question slot!",
          data: {
            variationId: variationRes.rows[0].id,
            templateId
          }
        });
      } catch (dbErr) {
        await query("ROLLBACK");
        throw dbErr;
      }
    } else {
      // action === "regenerate"
      // Retrieve the template ID linked to this variation
      const getTemplateRes = await query(
        "SELECT template_id FROM public.question_variations WHERE id = $1",
        [variationId]
      );
      if (getTemplateRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Variation template reference not found" }, { status: 404 });
      }
      const templateId = getTemplateRes.rows[0].template_id;

      // Start database transaction
      const client = await query("BEGIN");
      try {
        // 1. Update Template (Stringify propsSchema for JSONB binding)
        await query(
          `UPDATE public.question_templates
          SET template_html = $1, props_schema = $2, learning_objective = $3, interaction_type = $4
          WHERE id = $5`,
          [templateHtml, JSON.stringify(propsSchema), learningObjective, interactionType, templateId]
        );

        // 2. Update Variation (Stringify variationData and answerKey for JSONB binding)
        await query(
          `UPDATE public.question_variations
          SET variation_data = $1, answer_key = $2, verifier_status = 'pending', last_edited_by = $3, last_edited_at = now()
          WHERE id = $4`,
          [JSON.stringify(variationData), JSON.stringify(answerKey), "ai_regenerator", variationId]
        );

        // 3. Log to generation_runs
        await query(
          `INSERT INTO public.generation_runs (run_type, template_id, variation_id, triggered_by, notes)
          VALUES ('ai_generate', $1, $2, 'tester_ai_generator', $3)`,
          [templateId, variationId, `AI revised slot with instructions: ${customPrompt}`]
        );

        await query("COMMIT");

        return NextResponse.json({
          success: true,
          message: "Successfully revised question variation!",
          data: {
            variationId,
            templateId
          }
        });
      } catch (dbErr) {
        await query("ROLLBACK");
        throw dbErr;
      }
    }

  } catch (error: any) {
    console.error("POST /api/admin/generator/generate error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
