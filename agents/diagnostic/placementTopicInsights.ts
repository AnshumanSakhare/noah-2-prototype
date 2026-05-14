import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import type {
  AskedQuestionRecord,
  DiagnosticReport,
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
});

export type PlacementTopicAIInsights = z.infer<
  typeof PlacementTopicInsightsSchema
>["topics"];

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
  if (question.questionType === "matching" || question.questionType === "drag_drop") {
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
    const nonAttempt = records.filter((r) => r.verdict === "non_attempt").length;
    const earned = correct + 0.5 * partial;
    const scorePercent = records.length > 0 ? Math.round((earned / records.length) * 100) : 0;

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

  return {
    student: {
      name: report.studentId,
      subject: report.subject,
      classLevel: report.classLevel,
    },
    topics,
  };
}

export async function generatePlacementTopicInsights(
  report: DiagnosticReport,
): Promise<PlacementTopicAIInsights> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required to generate placement insights.",
    );
  }

  const input = buildTopicInput(report);
  if (input.topics.length === 0) return [];

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
          "You write 2-3 short, concrete insight lines per topic for a placement-test result card.",
          "Each topic has up to 5 questions. Use only the data given. Never invent facts, scores, mistakes, or concepts.",
          "Voice: a calm, observant tutor talking to a parent. Third person, use the student's first name once per card max. No emojis. No hype.",
          "Each line: 8-16 words, one idea, plain English. Tie to actual question content (specific numbers, expressions, scenarios) whenever you can.",
          "STRICT anti-template rules:",
          "- Vary the opener of every line and across topics. Do not start lines with the same word or phrase.",
          "- Ban these openers and stock phrases: 'She needs more practice with…', 'He needs more practice with…', '<Name> needs more practice with…', '<Name> handled X correctly', 'This shows…', 'Great job', 'Keep going', 'Strong foundation'.",
          "- Do not use the same verb shape twice in one card (e.g., avoid two lines both starting with 'She…' or both ending with 'would help').",
          "- Mix sentence types: one observation line, one diagnosis line, one suggestion line — but rephrase each freshly.",
          "Content rules by performance:",
          "- All 5 correct: name the hardest thing they nailed and the kind of challenge they're ready for next. No vague praise.",
          "- Mixed: surface the specific concept the wrong answers expose, with at least one concrete reference (a number, expression, or scenario from the questions).",
          "- Mostly wrong: be honest but kind; point at the foundational concept that needs to come first, again referencing a specific question when possible.",
          "Return one entry per topic provided, with the exact topic string.",
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

  return response.output_parsed.topics;
}
