import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gpt-5.4"; // Using the full model for higher quality concept brainstorming

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

// Zod response schema for the AI Ideas
const IdeaSchema = z.object({
  title: z.string(),
  concept: z.string(),
  description: z.string(),
  pedagogy: z.string(),
});

const IdeasResponseSchema = z.object({
  ideas: z.array(IdeaSchema)
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { grade, topic, difficulty, interactionArchetype, customPrompt } = body;

    if (grade === undefined || !topic || !difficulty || !interactionArchetype) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const openai = new OpenAI({
      timeout: 60000,
      maxRetries: 1
    });

    const gradeLabel = grade === 0 ? "KG" : `Grade ${grade}`;

    let systemPrompt = `You are a creative, expert EduQuest Game Designer.
Your task is to brainstorm exactly 3-4 unique, creative, and pedagogically sound ideas for an interactive educational game.

Game Parameters:
- Grade: ${gradeLabel}
- Topic Focus: ${topic}
- Target Difficulty: ${difficulty.toUpperCase()}
- Chosen Archetype: ${interactionArchetype}

DIFFICULTY GUIDELINES:
- EASY: Very straightforward recognition, counting small sets, extremely clear visuals, and single-step operations.
- MEDIUM: Multi-step, simple comparisons, introduces math symbols (>, <, =), includes fractions or simple equations.
- HARD: Multi-variable drag-matching, sequence sorting, complex number-line plotting, or abstract algebraic balances.

Each idea MUST have:
1. title: Short and catchy (e.g. "Feed the Frog", "Space Station Weigh-in")
2. concept: What specific math sub-concept this targets.
3. description: Exactly how the game works. Explain what is on the screen, the theme, visual assets/emojis used, and how the interaction works (what options they tap or where they drag). Keep it descriptive and visual.
4. pedagogy: Why this is excellent and suitable for the selected grade and difficulty.

Ensure the ideas are diverse, creative, fun, and use engaging themes or colorful visuals (emojis, boards, card layouts, etc.) that appeal to students. Avoid boring or repetitive formats.
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

    const userPrompt = `Generate 3 to 4 creative game ideas matching these constraints. Ensure they are creative and distinct from each other.`;

    const response = await openai.responses.parse({
      model: MODEL,
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      text: {
        verbosity: "low",
        format: zodTextFormat(IdeasResponseSchema, "game_ideas_response")
      }
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      return NextResponse.json({ success: false, error: "Could not parse ideas response." }, { status: 500 });
    }

    return NextResponse.json({ success: true, ideas: parsed.ideas });

  } catch (err: any) {
    console.error("Ideas generation error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
