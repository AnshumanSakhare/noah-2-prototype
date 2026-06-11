import { NextResponse } from "next/server";
import { llmStructured, activeModelLabel, providerKeyConfigured, providerKeyName } from "@/lib/llm";
import { z } from "zod";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// LLM brainstorm can take 15–30s; raise the serverless function timeout (clamped to plan limit on Vercel).
export const maxDuration = 300;

// Helper to fetch subtopics, learning objectives and examples from Excel
function getXlsxContext(grade: number, topic: string) {
  try {
    const filePath = path.resolve(process.cwd(), "Question Bank Plan - 13 ap.xlsx");
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
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

// Zod schema for the OpenAI path (responses.parse + zodTextFormat)
const IdeaSchema = z.object({
  title: z.string(),
  concept: z.string(),
  description: z.string(),
  pedagogy: z.string()
});
const IdeasResponseSchema = z.object({
  ideas: z.array(IdeaSchema)
});

// JSON Schema for the Bedrock path (forced tool input_schema)
const IDEAS_SCHEMA = {
  type: "object",
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          concept: { type: "string" },
          description: { type: "string" },
          pedagogy: { type: "string" }
        },
        required: ["title", "concept", "description", "pedagogy"],
        additionalProperties: false
      }
    }
  },
  required: ["ideas"],
  additionalProperties: false
};

export async function POST(request: Request) {
  try {
    if (!providerKeyConfigured()) {
      return NextResponse.json({ success: false, error: `${providerKeyName()} is not configured` }, { status: 500 });
    }

    const body = await request.json();
    const { grade, topic, difficulty, interactionArchetype, customPrompt } = body;

    if (grade === undefined || !topic || !difficulty || !interactionArchetype) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const gradeLabel = grade === 0 ? "KG" : `Grade ${grade}`;

    // Grade-scaled visual aesthetic: playful/cartoonish for the youngest, cleaner & more
    // symbolic as grade rises. Difficulty nudges it one notch more restrained.
    const aesthetic =
      grade <= 1 ? "Very playful and cartoonish: big chunky tokens, friendly emoji/pictures, almost no text, picture-first."
      : grade <= 3 ? "Playful but tidy: medium tokens, a few emoji as accents, short labels, numerals visible."
      : grade <= 5 ? "Mostly clean: restrained emoji, numerals and simple symbols (>, <, =, fractions), minimal decoration."
      : "Clean and academic: little to no cartoon/emoji, symbolic and compact (numbers, symbols, number lines, bars), no childish theming.";

    // Per-archetype on-screen mechanic, so ideas are concretely renderable in the chosen interaction.
    const archetypeMechanic: Record<string, string> = {
      "tap-select": "A small set of 2–4 tappable options (cards/tokens). The child taps the one (or few) that answer the prompt. Output: the tapped value.",
      "drag-drop": "A few draggable items (≤4) and 2–3 labelled target bins/zones. The child drags each item into the correct bin. Output: item→bin mapping. Must also work by tap-to-pick then tap-to-place.",
      "fill-slot": "One short expression/equation with 1–3 blank slots. The child fills each blank from a tiny palette of values or symbols. Output: slot→value.",
      "sequence-order": "A single row of 3–5 items the child reorders (smallest→biggest, steps in order). Output: the ordered list. Keep it ONE row, no nested sorting.",
      "build-count": "A single target and a build area (e.g. a ten-frame, a small set of blocks/dots) the child adds to or removes from to hit the target. Output: the count.",
      "number-line": "ONE horizontal number line with a labelled range; the child drags a single marker to a spot. Output: the position. No multiple lines.",
      "partition": "ONE whole (a shape, a strip, or a group of ≤8 items) the child splits into equal parts/shares. Output: the part sizes. Keep the whole singular and simple.",
    };
    const mechanic = archetypeMechanic[interactionArchetype] || "A single, simple interaction that fits one screen.";

    let systemPrompt = `You are an expert EduQuest Game Designer brainstorming ideas for ONE interactive math mini-game that renders inside a FIXED, SMALL card.

Game Parameters:
- Grade: ${gradeLabel}
- Topic Focus: ${topic}
- Target Difficulty: ${difficulty.toUpperCase()}
- Chosen Archetype: ${interactionArchetype}

═══ THE CANVAS — every idea MUST fit this, this is the #1 constraint ═══
The game renders in a FIXED stage of exactly 760 × 520 pixels (a single small card). It does NOT scroll. There are no multiple screens, levels, rounds, or scenes — ONE screen, ONE question, ONE focal cluster, surrounded by generous whitespace (~55–65% empty).
The host app already provides the header, instruction line, reset button, and feedback — so the idea must NOT include titles, story intros, scoreboards, timers, lives, progress bars, multi-step narratives, or tutorial steps. Just the single playable interaction.

HARD LIMITS (reject any idea that needs more):
- At most ~6–8 interactive/visual elements on screen total. Fewer is better.
- Readable in one glance: no paragraphs, no word-problem stories, no multi-sentence setups. KG–2 ≈ ≤6 words on screen.
- No tiny dense grids, no scattered objects to hunt for, no animations that move things off-screen, no scrolling lists, no multi-stage flows ("first do X, then Y").
- One single interaction primitive only (the chosen archetype) — never combine drag + sort + tap.

═══ THE CHOSEN ARCHETYPE — '${interactionArchetype}' ═══
${mechanic}
Every idea must be a natural, screen-centric fit for THIS mechanic.

═══ VISUAL AESTHETIC FOR THIS GRADE/DIFFICULTY ═══
${aesthetic}
As grade and difficulty rise, dial DOWN cartoon themes and emoji and dial UP clean, symbolic, compact layouts. A Grade 7 idea should look like a tidy math tool, not a children's cartoon.

═══ DIFFICULTY (within the small canvas) ═══
- EASY: single-step recognition/counting of small sets; extremely clear; smallest numbers/sets.
- MEDIUM: one comparison or one short operation; may introduce symbols (>, <, =) or simple fractions.
- HARD: one slightly richer single-screen judgement (e.g. order 5 values, plot on a number line, split into equal parts) — still ONE screen, ONE interaction, no extra steps.

Each idea MUST have:
1. title: Short and catchy, but age-appropriate (playful for KG, neutral/clean for upper grades).
2. concept: The specific math sub-concept this targets.
3. description: Concretely how it looks and plays ON THE 760×520 CARD. State the few elements on screen, what the child taps/drags/orders, and roughly how many items. Must be implementable as-is — concrete, not vague or aspirational. 2–4 sentences max.
4. pedagogy: Why it suits this grade + difficulty.

Make the 3–4 ideas DISTINCT from each other, but every one must obey the canvas limits above. Prefer simple and clear over clever and crowded.
`;

    const xlsxContext = getXlsxContext(grade, topic);
    if (xlsxContext) {
      systemPrompt += `\nEXCEL CURRICULUM CONTEXT:
- Subtopics: ${xlsxContext.subtopics.join(", ")}
- Target Learning Objectives (LO):
${xlsxContext.learningObjectives.map((lo, i) => `  ${i + 1}. ${lo}`).join("\n")}
${xlsxContext.exampleQuestions.length > 0 ? `- Example Questions:\n${xlsxContext.exampleQuestions.map(q => `  * ${q}`).join("\n")}` : ""}
`;
    }

    if (customPrompt) {
      systemPrompt += `\nSTRICT CUSTOM DESIGN INSTRUCTIONS (HIGHEST PRIORITY):
The user provided these custom preferences: "${customPrompt}".
You must heavily incorporate and prioritize these instructions in your brainstormed ideas. Make sure they satisfy these guidelines precisely.
`;
    }

    const userPrompt = `Generate 3 to 4 distinct game ideas for the '${interactionArchetype}' archetype. Every idea MUST fit the fixed 760×520 single-screen card with ≤6–8 elements, one focal cluster, and no multi-step or story flow. Keep them concrete and implementable, and match the visual aesthetic to ${gradeLabel} / ${difficulty.toUpperCase()}.`;

    console.log(`[AI IDEAS GENERATOR] Dispatching to: ${activeModelLabel()}`);

    const { data, usage } = await llmStructured<{ ideas: any[] }>({
      system: systemPrompt,
      user: userPrompt,
      zodSchema: IdeasResponseSchema,
      schemaName: "game_ideas_response",
      jsonSchema: IDEAS_SCHEMA,
      toolName: "emit_game_ideas",
      toolDescription: "Return 3-4 brainstormed interactive game ideas.",
      maxTokens: 4000
    });

    if (usage) {
      console.log(`[AI IDEAS GENERATOR] Token Usage:`, JSON.stringify(usage));
    }

    if (!data?.ideas) {
      return NextResponse.json({ success: false, error: "Could not parse ideas response." }, { status: 500 });
    }

    return NextResponse.json({ success: true, ideas: data.ideas });

  } catch (err: any) {
    console.error("Ideas generation error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
