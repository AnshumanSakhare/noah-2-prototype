import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const MODEL = "gpt-5.4-mini";

const PlacementAIPlanSchema = z.object({
  planNarrative: z.string(),
  nextSteps: z.array(z.string()),
});

export type PlacementAIPlan = z.infer<typeof PlacementAIPlanSchema>;

export interface GeneratePlacementAIPlanInput {
  studentFirstName: string;
  consolidatedInsights: string;
  bandName?: string;
  nextBandName?: string;
  nextGoal?: string;
  planSummary?: string;
}

export async function generatePlacementAIPlan(
  input: GeneratePlacementAIPlanInput,
): Promise<PlacementAIPlan> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to generate the AI plan.");
  }

  const openai = new OpenAI({
    timeout: 90_000,
    maxRetries: 1,
  });

  const response = await openai.responses.parse({
    model: MODEL,
    reasoning: { effort: "medium" },
    input: [
      {
        role: "system",
        content: [
          "You write a short, personalised learning plan for a parent, based on a placement-test insights summary.",
          "Audience: parent. Voice: warm, plain-spoken tutor talking over a cup of tea. No jargon, no hype, no emojis.",
          "Use the student's first name once early, then natural pronouns. Do not start every sentence with the name.",
          "Use everyday words (avoid 'foundational', 'prerequisite', 'cognitive', 'sequencing', 'mastery').",
          "Output fields:",
          "- planNarrative: ONE flowing paragraph (around 90-140 words, 5-7 sentences) describing the recommended learning plan. It must reflect the strengths and gaps named in the consolidated insights, name what to teach first, how to practice, and how progress will be checked. No bullet points, no line breaks, no headings, no week labels — one continuous paragraph.",
          "- nextSteps: 3 short imperative next-step lines (each 8-14 words). Each is a concrete action a tutor or parent can take this week, tied to a gap from the insights. No filler.",
          "STRICT rules:",
          "- Do not invent topics that are not implied by the insights summary.",
          "- Do not quote individual learning-objective titles verbatim.",
          "- Do not repeat the consolidated insights paragraph back — extend it into a plan.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
    text: {
      verbosity: "low",
      format: zodTextFormat(PlacementAIPlanSchema, "placement_ai_plan"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("The AI plan could not be parsed.");
  }

  return response.output_parsed;
}
