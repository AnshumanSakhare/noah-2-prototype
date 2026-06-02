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
  placementPlanInsights: z.object({
    bandName: z.string(),
    nextBandName: z.string(),
    placementSummary: z.string(),
    nextGoal: z.string(),
    planSummary: z.string(),
    consolidatedInsights: z.string(),
  }),
});

export type PlacementTopicAIInsights = Array<{ topic: string }>;

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
        consolidatedInsights: "Not enough questions were answered to generate feedback.",
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
          "Return a compact overall placement plan.",
          "You will receive each question, the student's answer, the correct answer, the verdict, and a 'whyWrong' note. USE this data only as private evidence to diagnose the underlying conceptual misunderstanding. NEVER surface it in the output.",
          "Goal: name the fundamental concept, skill, or prerequisite the student is shaky or solid on — not what happened on any specific question.",
          "Voice: a warm, plain-spoken tutor talking to a parent. Friendly, simple, easy to read out loud. No emojis. No hype. No jargon.",
          "Naming rules:",
          "- Use the student's first name (from input.student.name — use only the first word) once, ideally in the first line.",
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
          "- Vary the opener of every line. Do not start lines with the same word or phrase.",
          "- Ban stock phrases: 'needs more practice with…', 'This shows…', 'Great job', 'Keep going', 'Strong foundation'.",
          "Content rules by performance:",
          "- All correct: name the idea the student has clearly understood, in plain words, and the next small step that would stretch the student.",
          "- Mixed: name the specific everyday idea the wrong attempts point to (e.g., 'splitting things into equal parts', 'comparing two amounts fairly', 'doing the steps in the right order') — without referencing the specific items.",
          "- Mostly wrong: be honest but kind; name the simpler idea that needs to come first, in everyday words.",
          "- placementPlanInsights fields:",
          "- bandName and nextBandName must use the placement values from the user input exactly.",
          "- placementSummary: one short sentence explaining the student's current band from accuracy, timing, and topic spread.",
          "- nextGoal: one short sentence naming the next band and the main skill shift needed.",
          "- planSummary: one short sentence for what Codeyoung should teach/practice first.",
          "- consolidatedInsights: a single warm, plain-spoken paragraph (around 130-180 words, 8-11 sentences) that gives a thorough overall picture. It MUST cover the student's status on EVERY topic and focus area (learning objective) provided in the input — both the ones she is solid on and the ones she is shaky on — translated into everyday-language ideas (e.g., 'splitting things into equal parts', 'comparing two amounts fairly', 'doing the steps in the right order'). Weave them into one flowing summary that also includes a short note on what to teach or practice first. It must read as ONE continuous paragraph. DO NOT use bullet points, dash prefixes, list numbers, headings, line breaks, or separate lines. DO NOT quote learning-objective titles verbatim — describe the underlying skill in plain words.",
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

  return {
    topics: [],
    placementPlanInsights: response.output_parsed.placementPlanInsights,
  };
}

export async function generatePlacementTopicInsights(
  report: DiagnosticReport,
): Promise<PlacementTopicAIInsights> {
  const insights = await generatePlacementAIInsights(report);
  return insights.topics;
}
