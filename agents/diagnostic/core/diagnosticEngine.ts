import type {
  AskedQuestionRecord,
  LessonPlanGroup,
  QuestionBank,
  QuestionBankQuestion,
  QuestionVerdict,
  TopicColor,
  TopicMasteryStatus,
  TopicResult,
} from "../types/index";

const STATUS_SCORES: Record<TopicMasteryStatus, number> = {
  mastered: 100,
  developing: 60,
  partial: 30,
  needs_teaching: 0,
  likely_weak: 5,
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isCommonNonAttempt(value: string): boolean {
  const normalized = normalizeText(value);
  if (normalized === "") return true;
  if (/^[\?\.\-_/\\]+$/.test(normalized)) return true;
  if (/^[a-z]$/i.test(normalized) && !["a", "b", "c", "d"].includes(normalized)) return true;

  return [
    "idk",
    "i dont know",
    "i don't know",
    "dont know",
    "don't know",
    "no idea",
    "not sure",
    "skip",
    "pass",
    "na",
    "n/a",
    "blank",
  ].includes(normalized);
}

function normalizeChoice(value: string): string {
  const trimmed = value.trim().toUpperCase();
  if (["A", "B", "C", "D"].includes(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^([A-D])[\)\.\s-]?.*$/);
  return match?.[1] ?? trimmed;
}

function ensureSentence(text: string): string {
  const trimmed = text.trim();
  if (trimmed === "") return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function shouldStop(totalQuestionsShown: number, maxQuestions: number): boolean {
  return totalQuestionsShown >= maxQuestions;
}

export function buildQuestionBankIndex(bank: QuestionBank): Map<string, QuestionBankQuestion> {
  const index = new Map<string, QuestionBankQuestion>();

  for (const question of bank.questions) {
    index.set(`${question.topic}:${question.bloomLevel}`, question);
  }

  return index;
}

export function getQuestionFromBank(
  index: Map<string, QuestionBankQuestion>,
  topic: string,
  bloomLevel: QuestionBankQuestion["bloomLevel"]
): QuestionBankQuestion {
  const question = index.get(`${topic}:${bloomLevel}`);
  if (!question) {
    throw new Error(`Missing question for topic "${topic}" at bloom "${bloomLevel}"`);
  }
  return question;
}

export function evaluateClosedQuestion(
  question: QuestionBankQuestion,
  studentAnswer: string
): Pick<AskedQuestionRecord, "verdict" | "feedback"> {
  const explanation = ensureSentence(question.explanation);

  if (question.questionType === "mcq") {
    if (isCommonNonAttempt(studentAnswer)) {
      return { verdict: "non_attempt", feedback: "No attempt recorded." };
    }

    const normalizedStudent = normalizeChoice(studentAnswer);
    const normalizedCorrect = normalizeChoice(question.correctAnswer ?? "");
    const chosenOption = question.options?.find(
      (option) => normalizeChoice(option) === normalizedStudent
    );

    if (normalizedStudent === normalizedCorrect) {
      return { verdict: "correct", feedback: `Correct. ${explanation}` };
    }

    if (!chosenOption && !["A", "B", "C", "D"].includes(normalizedStudent)) {
      return { verdict: "non_attempt", feedback: "No attempt recorded." };
    }

    const chosenOptionText = chosenOption ?? studentAnswer.trim();
    const correctOptionText = question.options?.find(
      (option) => normalizeChoice(option) === normalizedCorrect
    ) ?? question.correctAnswer ?? "";

    return {
      verdict: "incorrect",
      feedback:
        `You chose "${chosenOptionText}", which reflects a different idea from the one NCERT teaches here. ` +
        `"${correctOptionText}" is correct because ${question.explanation.trim().replace(/[.!?]$/, "")}.`,
    };
  }

  throw new Error(`Closed-question evaluator cannot handle question type "${question.questionType}"`);
}

export function colorForStatus(status: TopicMasteryStatus): TopicColor {
  switch (status) {
    case "mastered":
      return "green";
    case "developing":
      return "yellow";
    case "partial":
      return "orange";
    case "needs_teaching":
    case "likely_weak":
      return "red";
  }
}

export function computeReadinessScore(topicResults: TopicResult[]): number {
  if (topicResults.length === 0) return 0;

  const total = topicResults.reduce((sum, topic) => sum + STATUS_SCORES[topic.status], 0);
  return Math.round(total / topicResults.length);
}

export function buildLessonPlan(topicResults: TopicResult[]): LessonPlanGroup {
  return {
    teachFirst: topicResults
      .filter((topic) => topic.status === "needs_teaching" || topic.status === "likely_weak")
      .map((topic) => topic.topic),
    reinforceSoon: topicResults
      .filter((topic) => topic.status === "partial")
      .map((topic) => topic.topic),
    reinforceDeeply: topicResults
      .filter((topic) => topic.status === "developing")
      .map((topic) => topic.topic),
    enrichOrSkip: topicResults
      .filter((topic) => topic.status === "mastered")
      .map((topic) => topic.topic),
  };
}

export function verdictToBoolean(verdict: QuestionVerdict): boolean {
  return verdict === "correct";
}
