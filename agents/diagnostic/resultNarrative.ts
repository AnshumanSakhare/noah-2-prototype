import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import type { DiagnosticReport, ResultNarrative } from "./types/index";

const MODEL = "gpt-5.4-mini";

const StudentFacingNarrativeSchema = z.object({
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
  parentNotes: z.array(z.string()),
});

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
    computedNextSteps: report.nextSteps ?? [],
    behavioralPatterns: report.behavioralPatterns ?? [],
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
          "You write short, kind, plain-English diagnostic test result copy for a school student.",
          "Audience: the student. Speak directly to them using 'you' and 'your'. Use their first name once at most.",
          "Tone: warm, calm, concrete, lightly encouraging. No hype, no jargon, no clichés, no emojis. Read like a thoughtful tutor leaving a sticky note, not a marketing email.",
          "STRICT anti-template rules:",
          "- Never open the mainSummary with phrasings like 'You did something really well…', 'Great job!', 'You crushed it', 'Awesome work', or any other generic opener. Start by naming a concrete thing they did or struggled with.",
          "- Vary sentence shape between fields. Do not reuse the same opener twice.",
          "- Avoid filler phrases like 'That shows your brain is starting to notice the pattern', 'Most students need a few tries', or 'Go slowly and say it out loud'. They've become formulaic.",
          "- Do not invent scores, mistakes, answers, or concepts. Base the copy only on the skill-level learning objective evidence provided.",
          "STRICT privacy and abstraction rules:",
          "- These are skill insights, not a question review. Never quote, reconstruct, or identify an individual question.",
          "- Do not mention exact numbers, expressions, answer choices, student selections, or correct answers from a test item.",
          "- Describe what the student understands well and what skill needs practice, using learning-objective language such as comparing fractions, simplifying fractions, or using place value.",
          "Field intent (write fresh sentences each time):",
          "- mainSummary (~2 short sentences): summarize the clearest skill strength and the most important skill gap without item-level evidence.",
          "- whatWentWell (1-2 sentences): explain the genuine skill strength and why that skill matters.",
          "- whatNeedsPractice (~2 sentences): explain the skill gap, plus one supportive next move tied to that skill.",
          "- practiceSteps: exactly 3 short imperative items, each specific to the weak concept (no generic 'retake the test' unless it adds value).",
          "- parentNotes: 2-3 short factual lines a parent can scan in 5 seconds.",
          "- learningObjectiveFeedback: one item per learning objective provided.",
          "- heroGreeting / heroSubtitle: short, simple, can be slightly warmer but still avoid generic openers.",
          "Example style: 'You are confident when comparing fractions on a number line. The next skill to build is recognizing equivalent fractions and simplifying them without a picture.'",
          "Keep every field compact enough for a small result card.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify(buildNarrativeInput(report)),
      },
    ],
    text: {
      verbosity: "low",
      format: zodTextFormat(
        StudentFacingNarrativeSchema,
        "student_facing_narrative",
      ),
    },
  });

  if (!response.output_parsed) {
    throw new Error("The AI result summary could not be parsed.");
  }

  return {
    ...response.output_parsed,
    questionReviewNotes: [],
  };
}
