import { NextResponse } from "next/server";

import {
  getPlacementQuestionsByIds,
  getQuizQuestionsByIds,
} from "@/agents/diagnostic/tools/contentQuiz";
import type {
  ClassLevel,
  DragDropQuestionPayload,
  FitbQuestionPayload,
  MatchingQuestionPayload,
  McqQuestionPayload,
  OpenResponseQuestionPayload,
  QuestionBankQuestion,
  ShortAnswerQuestionPayload,
  Subject,
  TrueFalseQuestionPayload,
  WordProblemQuestionPayload,
} from "@/agents/diagnostic/types/index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"] as const;

function deriveCorrectAnswer(question: QuestionBankQuestion): string {
  switch (question.questionType) {
    case "mcq": {
      const payload = question.payload as McqQuestionPayload | undefined;
      const correctIndex =
        payload?.options?.findIndex((option) => option.correct) ?? -1;
      return correctIndex >= 0 ? (OPTION_LABELS[correctIndex] ?? "") : "";
    }
    case "true_false": {
      const payload = question.payload as TrueFalseQuestionPayload | undefined;
      return payload?.correctAnswer ? "true" : "false";
    }
    case "fitb": {
      const payload = question.payload as FitbQuestionPayload | undefined;
      return payload?.answer ?? question.correctAnswer ?? "";
    }
    case "matching": {
      const payload = question.payload as MatchingQuestionPayload | undefined;
      const map: Record<string, string> = {};
      for (const pair of payload?.answerKey ?? []) {
        map[pair.prompt] = pair.match;
      }
      return JSON.stringify(map);
    }
    case "drag_drop": {
      const payload = question.payload as DragDropQuestionPayload | undefined;
      const map: Record<string, string> = {};
      for (const pair of payload?.answerKey ?? []) {
        map[pair.item] = pair.target;
      }
      return JSON.stringify(map);
    }
    case "short_answer": {
      const payload = question.payload as
        | ShortAnswerQuestionPayload
        | undefined;
      return (
        payload?.modelAnswer ??
        question.modelAnswer ??
        question.correctAnswer ??
        ""
      );
    }
    case "word_problem": {
      const payload = question.payload as
        | WordProblemQuestionPayload
        | undefined;
      return payload?.finalAnswer ?? question.correctAnswer ?? "";
    }
    case "open_response": {
      const payload = question.payload as
        | OpenResponseQuestionPayload
        | undefined;
      return payload?.exemplarAnswer ?? question.modelAnswer ?? "";
    }
    default:
      return question.correctAnswer ?? question.modelAnswer ?? "";
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      questionIds?: string[];
      subject?: string;
      classLevel?: string;
      topic?: string | null;
      testMode?: string;
    };

    const questionIds = (body.questionIds ?? []).filter(Boolean);
    if (questionIds.length === 0 || !body.subject || !body.classLevel) {
      return NextResponse.json({ answers: {} });
    }

    const fetched =
      body.testMode === "placement"
        ? await getPlacementQuestionsByIds({
            questionIds,
            subject: body.subject as Subject,
            classLevel: body.classLevel as ClassLevel,
          })
        : await getQuizQuestionsByIds({
            questionIds,
            subject: body.subject as Subject,
            classLevel: body.classLevel as ClassLevel,
            topic: body.topic ?? null,
          });

    const answers: Record<string, string> = {};
    for (const question of fetched.questions) {
      answers[question.id] = deriveCorrectAnswer(question);
    }

    return NextResponse.json({ answers });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch correct answers.",
      },
      { status: 400 },
    );
  }
}
