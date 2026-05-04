import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import type {
  AskedQuestionRecord,
  DiagnosticReport,
  QuestionBankQuestion,
  ResultNarrative,
} from "./types/index";

const MODEL = "gpt-5.4-mini";

const ResultNarrativeSchema = z.object({
  heroGreeting: z.string(),
  heroSubtitle: z.string(),
  mainSummary: z.string(),
  whatWentWell: z.string(),
  whatNeedsPractice: z.string(),
  practiceSteps: z.array(z.string()),
  learningObjectiveFeedback: z.array(
    z.object({
      learningObjective: z.string(),
      feedback: z.string(),
    }),
  ),
  questionReviewNotes: z.array(
    z.object({
      questionId: z.string(),
      note: z.string(),
    }),
  ),
  parentNotes: z.array(z.string()),
});

function compactText(value?: string | null, maxLength = 420) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function normalizeAnswer(value?: string) {
  return compactText(value || "(blank)", 240);
}

function getAnswerMap(answer: string) {
  try {
    const parsed = JSON.parse(answer) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
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

  if (question.questionType === "matching") {
    const answerKey =
      (
        question.payload as
          | { answerKey?: Array<{ prompt?: string; match?: string }> }
          | undefined
      )?.answerKey ?? [];
    return compactText(
      answerKey
        .map((pair) => `${pair.prompt ?? ""} -> ${pair.match ?? ""}`.trim())
        .join("; "),
      360,
    );
  }

  if (question.questionType === "drag_drop") {
    const answerKey =
      (
        question.payload as
          | { answerKey?: Array<{ item?: string; target?: string }> }
          | undefined
      )?.answerKey ?? [];
    return compactText(
      answerKey
        .map((pair) => `${pair.item ?? ""} -> ${pair.target ?? ""}`.trim())
        .join("; "),
      360,
    );
  }

  return compactText(question.modelAnswer ?? question.correctAnswer ?? "");
}

function summarizeStudentAnswer(record: AskedQuestionRecord) {
  if (
    record.question.questionType === "matching" ||
    record.question.questionType === "drag_drop"
  ) {
    const pairs = Object.entries(getAnswerMap(record.studentAnswer)).map(
      ([left, right]) => `${left} -> ${right}`,
    );
    return pairs.length > 0 ? compactText(pairs.join("; "), 360) : "(blank)";
  }

  return normalizeAnswer(record.studentAnswer);
}

function buildNarrativeInput(report: DiagnosticReport) {
  const totalQuestions = report.results.length || report.totalQuestionsShown;
  const correctCount = report.results.filter(
    (record) => record.verdict === "correct",
  ).length;
  const partialCount = report.results.filter(
    (record) => record.verdict === "partial",
  ).length;

  return {
    student: {
      name: report.studentId,
      subject: report.subject,
      classLevel: report.classLevel,
      topic: report.topic,
    },
    score: {
      readinessScore: report.readinessScore,
      attemptedReadinessScore: report.attemptedReadinessScore,
      overallReadinessScore: report.overallReadinessScore,
      totalQuestions,
      correctCount,
      partialCount,
      nonAttemptCount: report.nonAttemptCount ?? 0,
    },
    learningObjectives: report.learningObjectiveResults.map((objective) => ({
      learningObjective: objective.learningObjective,
      score: objective.score,
      overallScore: objective.overallScore,
      status: objective.status,
      masteryState: objective.masteryState,
      correctCount: objective.correctCount,
      partialCount: objective.partialCount,
      incorrectCount: objective.incorrectCount,
      nonAttemptCount: objective.nonAttemptCount,
      likelyIssues: objective.likelyIssues.slice(0, 2),
      teacherFocus: objective.teacherFocus.slice(0, 2),
      nextSteps: objective.nextSteps.slice(0, 2),
    })),
    questions: report.results.map((record, index) => ({
      questionNumber: index + 1,
      questionId: record.question.id,
      learningObjective: record.question.learningObjective,
      questionType: record.question.questionType,
      difficultyLevel: record.question.difficultyLevel,
      question: compactText(record.question.question),
      studentAnswer: summarizeStudentAnswer(record),
      correctAnswer: summarizeCorrectAnswer(record.question),
      verdict: record.verdict,
      feedback: compactText(record.feedback),
      explanation: compactText(record.question.explanation),
      whyWrong: compactText(record.whyWrong),
      behavioralSignals: record.behavioralSignals ?? [],
      timeTakenMs: record.timeTakenMs ?? 0,
    })),
    computedNextSteps: report.nextSteps ?? [],
    behavioralPatterns: report.behavioralPatterns ?? [],
    distractorInsights: report.distractorInsights ?? [],
  };
}

export async function generateResultNarrative(
  report: DiagnosticReport,
): Promise<ResultNarrative> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required to generate the result summary.",
    );
  }

  const openai = new OpenAI({
    timeout: 25_000,
    maxRetries: 0,
  });

  const response = await openai.responses.parse({
    model: MODEL,
    reasoning: { effort: "medium" },
    input: [
      {
        role: "system",
        content:
          "You write short diagnostic test result copy for a school student. Use the provided facts only. Do not invent scores, answers, questions, concepts, or mistakes. Keep the tone friendly, simple, specific, and encouraging. Speak mainly to the student. Parent notes should be factual and brief. Return one learningObjectiveFeedback item for every provided learning objective, and one questionReviewNotes item for every provided question. Keep every field concise enough for a compact result page.",
      },
      {
        role: "user",
        content: JSON.stringify(buildNarrativeInput(report)),
      },
    ],
    text: {
      verbosity: "low",
      format: zodTextFormat(ResultNarrativeSchema, "result_narrative"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("The AI result summary could not be parsed.");
  }

  return response.output_parsed;
}
