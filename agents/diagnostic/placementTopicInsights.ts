import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import type {
  AskedQuestionRecord,
  DiagnosticReport,
  PlacementPlanInsights,
  QuestionBankQuestion,
} from "./types/index";

const MODEL = "gpt-5.4-mini";

const PlacementTopicInsightsSchema = z.object({
  topics: z.array(
    z.object({
      topic: z.string(),
      insights: z.array(z.string()),
    }),
  ),
  placementPlanInsights: z.object({
    bandName: z.string(),
    nextBandName: z.string(),
    placementSummary: z.string(),
    nextGoal: z.string(),
    planSummary: z.string(),
    focusAreas: z.array(
      z.object({
        topic: z.string(),
        learningObjective: z.string(),
        recommendation: z.enum([
          "needs_lecture",
          "high_practice",
          "light_practice",
          "on_track",
        ]),
        reason: z.string(),
      }),
    ),
  }),
});

export type PlacementTopicAIInsights = z.infer<
  typeof PlacementTopicInsightsSchema
>["topics"];

export interface PlacementAIInsights {
  topics: PlacementTopicAIInsights;
  placementPlanInsights: PlacementPlanInsights;
}

function getPlacementBand(scorePercent: number) {
  if (scorePercent >= 80)
    return { bandName: "Grade-Ahead", nextBandName: "Advanced stretch" };
  if (scorePercent >= 55)
    return { bandName: "Confident Solver", nextBandName: "Grade-Ahead" };
  if (scorePercent >= 35)
    return { bandName: "Foundation Builder", nextBandName: "Confident Solver" };
  return { bandName: "Early Start", nextBandName: "Foundation Builder" };
}

function compactText(value?: string | null, maxLength = 320) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function getAnswerMap(answer: string) {
  try {
    const parsed = JSON.parse(answer) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function summarizeStudentAnswer(record: AskedQuestionRecord) {
  if (
    record.question.questionType === "matching" ||
    record.question.questionType === "drag_drop"
  ) {
    const pairs = Object.entries(getAnswerMap(record.studentAnswer)).map(
      ([left, right]) => `${left} -> ${right}`,
    );
    return pairs.length > 0 ? compactText(pairs.join("; "), 240) : "(blank)";
  }
  return compactText(record.studentAnswer || "(blank)", 200);
}

function summarizeCorrectAnswer(question: QuestionBankQuestion) {
  if (question.questionType === "mcq" && question.options) {
    const labels = ["A", "B", "C", "D"] as const;
    const label = question.correctAnswer?.trim().toUpperCase();
    const index = labels.indexOf(label as (typeof labels)[number]);
    return index >= 0
      ? `${labels[index]} - ${question.options[index] ?? ""}`.trim()
      : compactText(question.correctAnswer);
  }
  if (question.questionType === "true_false") {
    const expected =
      (question.payload as { correctAnswer?: boolean } | undefined)
        ?.correctAnswer === true;
    return expected ? "True" : "False";
  }
  if (
    question.questionType === "matching" ||
    question.questionType === "drag_drop"
  ) {
    const answerKey =
      (
        question.payload as
          | {
              answerKey?: Array<{
                prompt?: string;
                match?: string;
                item?: string;
                target?: string;
              }>;
            }
          | undefined
      )?.answerKey ?? [];
    return compactText(
      answerKey
        .map((pair) =>
          `${pair.prompt ?? pair.item ?? ""} -> ${pair.match ?? pair.target ?? ""}`.trim(),
        )
        .join("; "),
      240,
    );
  }
  return compactText(question.modelAnswer ?? question.correctAnswer ?? "");
}

function buildTopicInput(report: DiagnosticReport) {
  const grouped = new Map<string, AskedQuestionRecord[]>();
  for (const record of report.results ?? []) {
    const topic = record.question.topic ?? "General";
    const list = grouped.get(topic) ?? [];
    list.push(record);
    grouped.set(topic, list);
  }

  const topics = Array.from(grouped.entries()).map(([topic, records]) => {
    const correct = records.filter((r) => r.verdict === "correct").length;
    const partial = records.filter((r) => r.verdict === "partial").length;
    const incorrect = records.filter((r) => r.verdict === "incorrect").length;
    const nonAttempt = records.filter(
      (r) => r.verdict === "non_attempt",
    ).length;
    const earned = correct + 0.5 * partial;
    const scorePercent =
      records.length > 0 ? Math.round((earned / records.length) * 100) : 0;

    return {
      topic,
      total: records.length,
      correct,
      partial,
      incorrect,
      nonAttempt,
      scorePercent,
      questions: records.map((record, index) => ({
        questionNumber: index + 1,
        learningObjective: record.question.learningObjective ?? null,
        bloomLevel: record.question.bloomLevel ?? null,
        difficultyLevel: record.question.difficultyLevel ?? null,
        question: compactText(record.question.question, 240),
        studentAnswer: summarizeStudentAnswer(record),
        correctAnswer: summarizeCorrectAnswer(record.question),
        verdict: record.verdict,
        whyWrong: compactText(record.whyWrong, 200),
        timeTakenMs: record.timeTakenMs ?? 0,
      })),
    };
  });

  const totalQuestions =
    report.results.length || report.totalQuestionsShown || 0;
  const earned = report.results.reduce((sum, record) => {
    if (record.verdict === "correct") return sum + 1;
    if (record.verdict === "partial") return sum + 0.5;
    return sum;
  }, 0);
  const overallScorePercent =
    totalQuestions > 0 ? Math.round((earned / totalQuestions) * 100) : 0;
  const placementBand = getPlacementBand(overallScorePercent);

  return {
    student: {
      name: report.studentId,
      subject: report.subject,
      classLevel: report.classLevel,
    },
    placement: {
      overallScorePercent,
      totalQuestions,
      correctCount: report.results.filter((r) => r.verdict === "correct")
        .length,
      partialCount: report.results.filter((r) => r.verdict === "partial")
        .length,
      nonAttemptCount: report.nonAttemptCount ?? 0,
      totalTimeTakenMs: report.results.reduce(
        (sum, r) => sum + (r.timeTakenMs ?? 0),
        0,
      ),
      rapidAnswerCount: report.results.filter(
        (r) => (r.timeTakenMs ?? 0) > 0 && (r.timeTakenMs ?? 0) < 2_000,
      ).length,
      ...placementBand,
    },
    learningObjectives: (report.learningObjectiveResults ?? []).map((lo) => ({
      topic:
        report.results.find(
          (record) =>
            record.question.learningObjective === lo.learningObjective,
        )?.question.topic ?? "General",
      learningObjective: lo.learningObjective,
      score: Math.round(lo.score),
      overallScore: Math.round(lo.overallScore),
      correctCount: lo.correctCount,
      partialCount: lo.partialCount,
      incorrectCount: lo.incorrectCount,
      nonAttemptCount: lo.nonAttemptCount,
      likelyIssues: lo.likelyIssues.slice(0, 2),
      nextSteps: lo.nextSteps.slice(0, 2),
    })),
    topics,
  };
}

export async function generatePlacementAIInsights(
  report: DiagnosticReport,
): Promise<PlacementAIInsights> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required to generate placement insights.",
    );
  }

  const input = buildTopicInput(report);
  if (input.topics.length === 0) {
    return {
      topics: [],
      placementPlanInsights: {
        bandName: "Not enough data",
        nextBandName: "Not enough data",
        placementSummary:
          "There were not enough answered questions to place the student.",
        nextGoal: "Complete a full placement test.",
        planSummary:
          "Run the placement test again with enough questions answered.",
        focusAreas: [],
      },
    };
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
          "You write placement-test result copy for a parent-facing result page.",
          "Return both topic insight cards and a compact placement plan.",
          "You will receive each question, the student's answer, the correct answer, the verdict, and a 'whyWrong' note. USE this data only as private evidence to diagnose the underlying conceptual misunderstanding. NEVER surface it in the output.",
          "Goal: name the fundamental concept, skill, or prerequisite the student is shaky or solid on — not what happened on any specific question.",
          "Voice: a warm, plain-spoken tutor talking to a parent. Friendly, simple, easy to read out loud. No emojis. No hype. No jargon.",
          "Naming rules:",
          "- Use the student's first name (from input.student.name — use only the first word) once per card, ideally in the first line.",
          "- After that, use natural pronouns ('she', 'he', 'her', 'his', 'they', 'them') — whichever fits — instead of repeating the name. Repeated names sound robotic.",
          "- Do not start every line with the student's name.",
          "Language rules:",
          "- Use everyday words a parent without a teaching background can understand. Avoid academic or fancy words like 'fragile', 'inconsistent', 'foundational', 'prerequisite', 'sequencing', 'cognitive', 'reasoning' — say the same thing in simple words.",
          "- Prefer short, plain sentences. 8-16 words each. One idea per line.",
          "- Talk like you're explaining over a cup of tea — not like you're writing a report.",
          "STRICT output rules:",
          "- Do NOT quote or paraphrase question text, scenarios, numbers, expressions, or option text from the input.",
          "- Do NOT mention specific items: no 'in the question about…', 'when asked…', 'they picked option B', 'they answered 12', no question numbers.",
          "- Do NOT describe the student's specific answers. Instead, infer the misconception and describe the concept itself in simple words.",
          "- Generalise. If the student got fraction-equivalence items wrong, write about understanding equal fractions as an idea, not about the specific fractions seen.",
          "STRICT anti-template rules:",
          "- Vary the opener of every line and across topics. Do not start lines with the same word or phrase.",
          "- Ban stock phrases: 'needs more practice with…', 'This shows…', 'Great job', 'Keep going', 'Strong foundation'.",
          "- Mix sentence types across the 2-3 lines: one line on where the student stands, one line naming the specific idea or skill that's the gap or strength, one line with a friendly forward suggestion — each freshly phrased.",
          "Content rules by performance:",
          "- All correct: name the idea the student has clearly understood, in plain words, and the next small step that would stretch the student.",
          "- Mixed: name the specific everyday idea the wrong attempts point to (e.g., 'splitting things into equal parts', 'comparing two amounts fairly', 'doing the steps in the right order') — without referencing the specific items.",
          "- Mostly wrong: be honest but kind; name the simpler idea that needs to come first, in everyday words.",
          "Topic insights: return one entry per topic provided, with the exact topic string and 2-3 lines.",
          "Placement plan fields:",
          "- bandName and nextBandName must use the placement values from the user input exactly.",
          "- placementSummary: one short sentence explaining the student's current band from accuracy, timing, and topic spread.",
          "- nextGoal: one short sentence naming the next band and the main skill shift needed.",
          "- planSummary: one short sentence for what Codeyoung should teach/practice first.",
          "- focusAreas: 4-8 learning objectives from the provided learningObjectives array. Use exact topic and learningObjective strings. recommendation must be needs_lecture for scores below 35, high_practice for 35-54, light_practice for 55-74, and on_track for 75+.",
          "- reason: one parent-friendly sentence. Do not mention question numbers, exact answers, or option text.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
    text: {
      verbosity: "low",
      format: zodTextFormat(
        PlacementTopicInsightsSchema,
        "placement_topic_insights",
      ),
    },
  });

  if (!response.output_parsed) {
    throw new Error("The AI placement insights could not be parsed.");
  }

  return response.output_parsed;
}

export async function generatePlacementTopicInsights(
  report: DiagnosticReport,
): Promise<PlacementTopicAIInsights> {
  const insights = await generatePlacementAIInsights(report);
  return insights.topics;
}
