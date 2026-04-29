"use client";

import {
  AlertCircle,
  Calculator,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Rocket,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { getCorrectQuestionPoints } from "../agents/diagnostic/timeScoring";
import type {
  DiagnosticReport,
  DragDropQuestionPayload,
  MatchingQuestionPayload,
} from "../agents/diagnostic/types/index";
import type {
  CreateSessionInput,
  DemoLoadedQuiz,
  DemoQuizCatalog,
  DemoQuizCatalogEntry,
  DemoQuizLoadResponse,
  DemoQuizQuestion,
  DemoQuizSubmitResponse,
} from "../lib/demo-types";
import { DIAGNOSTIC_CONTENT_DEFAULTS } from "../lib/diagnostic-content-defaults";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

const THEME = {
  page: "bg-[#faf8f5] text-[#1a1a2e] font-sans min-h-screen selection:bg-[#3a5ccc]/10",
  surface: "border border-[rgba(26,26,46,0.06)] bg-white",
  surfaceWarm: "bg-[#fff7ed]",
  surfaceSoft: "bg-[#f5f3f0]",
  textDim: "text-[#5a5a72]",
  textMuted: "text-[#8a8aa0]",
  primaryGradient: "bg-[linear-gradient(135deg,#3a5ccc,#7c5cfc)]",
  primaryText: "text-[#3a5ccc]",
  shadow: "shadow-[0_2px_24px_rgba(26,26,46,0.05)]",
  shadowFloat: "shadow-[0_20px_60px_rgba(26,26,46,0.18)]",
  rounded: "rounded-[20px]",
  roundedSm: "rounded-[12px]",
  roundedPill: "rounded-full",
};

const AMBIENT_BG = `
  radial-gradient(ellipse 600px 400px at 20% 10%, rgba(124, 92, 252, 0.04), transparent),
  radial-gradient(ellipse 500px 500px at 80% 80%, rgba(58, 92, 204, 0.03), transparent)
`;

const DIFFICULTY_BASE_POINTS: Record<string, number> = {
  easy: 2,
  medium: 3,
  hard: 4,
};

const DIFFICULTY_TIME_LIMITS_MS: Record<string, number> = {
  easy: 45_000,
  medium: 55_000,
  hard: 70_000,
};

const RAPID_RESPONSE_THRESHOLD_MS = 2_000;

const INTERSTITIALS = [
  {
    icon: "✨",
    title: "Great work! Keep going!",
    subtitle: "You are doing brilliantly. Stay focused on the next one.",
  },
  {
    icon: "🔥",
    title: "You are on fire!",
    subtitle: "Halfway there. Take a deep breath and let us keep going.",
  },
  {
    icon: "🏆",
    title: "Almost done!",
    subtitle: "Just a few more to go. You have got this!",
  },
] as const;

const GRADE_TEST_COUNTS: Record<string, { easy: number; medium: number; hard: number }> = {
  classKG: { easy: 3, medium: 5, hard: 7 },
  class1:  { easy: 3, medium: 5, hard: 7 },
  class2:  { easy: 4, medium: 6, hard: 8 },
  class3:  { easy: 4, medium: 7, hard: 9 },
  class4:  { easy: 5, medium: 7, hard: 10 },
  class5:  { easy: 6, medium: 8, hard: 11 },
  class6:  { easy: 6, medium: 8, hard: 11 },
  class7:  { easy: 7, medium: 10, hard: 13 },
  class8:  { easy: 7, medium: 10, hard: 13 },
};

// Utility functions
function classLabel(value: string) {
  if (value === "classKG") return "KG";
  if (value === "class1") return "Grade 1";
  if (value === "class2") return "Grade 2";
  if (value === "class3") return "Grade 3";
  if (value === "class4") return "Grade 4";
  if (value === "class5") return "Grade 5";
  if (value === "class6") return "Grade 6";
  if (value === "class7") return "Grade 7";
  if (value === "class8") return "Grade 8";
  return value;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function getDefaultCatalogEntry(catalog: DemoQuizCatalog) {
  return (
    catalog.entries.find(
      (entry) =>
        entry.subject === DIAGNOSTIC_CONTENT_DEFAULTS.subject &&
        entry.classLevel === DIAGNOSTIC_CONTENT_DEFAULTS.classLevel &&
        entry.topic === DIAGNOSTIC_CONTENT_DEFAULTS.topic,
    ) ?? catalog.entries[0]
  );
}

function buildDefaultForm(
  entry: DemoQuizCatalogEntry | null,
): CreateSessionInput {
  return entry
    ? {
        studentId: "Riya Sharma",
        testMode: "topic",
        subject: entry.subject,
        classLevel: entry.classLevel,
        topic: entry.topic,
        maxQuestions: 15,
      }
    : {
        studentId: "Riya Sharma",
        testMode: "topic",
        subject: DIAGNOSTIC_CONTENT_DEFAULTS.subject,
        classLevel: DIAGNOSTIC_CONTENT_DEFAULTS.classLevel,
        topic: "",
        maxQuestions: 15,
      };
}

function getAnswerMap(answer: string) {
  try {
    return JSON.parse(answer) as Record<string, string>;
  } catch {
    return {};
  }
}

function formatAnswer(question: DemoQuizQuestion, answer: string) {
  if (
    question.questionType !== "matching" &&
    question.questionType !== "drag_drop"
  ) {
    return answer || "(blank)";
  }

  const parts = Object.entries(getAnswerMap(answer)).map(
    ([left, right]) => `${left} -> ${right}`,
  );
  return parts.length > 0 ? parts.join("; ") : "(blank)";
}

function formatDuration(timeTakenMs?: number) {
  if (!timeTakenMs || timeTakenMs <= 0) return "-";
  return `${(timeTakenMs / 1000).toFixed(1)}s`;
}

function formatCompactDuration(timeTakenMs?: number) {
  if (!timeTakenMs || timeTakenMs <= 0) return "0s";

  const totalSeconds = timeTakenMs / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(totalSeconds >= 10 ? 0 : 1)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds}s`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

function formatQuestionTypeLabel(value: string) {
  return value.replace(/_/g, " ");
}

type QuestionDisplayData = {
  questionType: DemoQuizQuestion["questionType"];
  options?: string[];
  payload?: Record<string, unknown>;
  correctAnswer?: string;
  modelAnswer?: string;
};

function normalizeDifficultyLevel(value?: string) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "medium" || normalized === "hard") {
    return normalized;
  }
  return "easy";
}

function getQuestionTimeLimitMs(difficultyLevel?: string) {
  return DIFFICULTY_TIME_LIMITS_MS[normalizeDifficultyLevel(difficultyLevel)];
}

function getQuestionBasePoints(difficultyLevel?: string) {
  return DIFFICULTY_BASE_POINTS[normalizeDifficultyLevel(difficultyLevel)];
}

function getQuestionFinalPoints(record: {
  verdict: string;
  timeTakenMs?: number;
  question: { difficultyLevel?: string };
}) {
  const base = getQuestionBasePoints(record.question.difficultyLevel);
  if (record.verdict === "correct") {
    const slow =
      (record.timeTakenMs ?? 0) >
      getQuestionTimeLimitMs(record.question.difficultyLevel);
    return base * (slow ? 0.9 : 1);
  }
  if (record.verdict === "partial") return base * 0.5;
  return 0;
}

function formatPoints(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatAnswerSummary(question: QuestionDisplayData, answer: string) {
  if (question.questionType === "mcq" && question.options) {
    const normalized = answer.trim().toUpperCase();
    const labels = ["A", "B", "C", "D"] as const;
    const labelIndex = labels.indexOf(normalized as (typeof labels)[number]);
    if (labelIndex >= 0) {
      return `${labels[labelIndex]} · ${question.options[labelIndex] ?? ""}`.trim();
    }
    return answer || "(blank)";
  }

  if (question.questionType === "true_false") {
    return answer || "(blank)";
  }

  if (
    question.questionType === "matching" ||
    question.questionType === "drag_drop"
  ) {
    try {
      const parsed = JSON.parse(answer) as Record<string, string>;
      const pairs = Object.entries(parsed).map(
        ([left, right]) => `${left} → ${right}`,
      );
      return pairs.length > 0 ? pairs.join("; ") : "(blank)";
    } catch {
      return answer || "(blank)";
    }
  }

  if (
    question.questionType === "fitb" ||
    question.questionType === "short_answer"
  ) {
    return answer || "(blank)";
  }

  return answer || "(blank)";
}

function getCorrectAnswerSummary(question: QuestionDisplayData) {
  if (question.questionType === "mcq" && question.options) {
    const labels = ["A", "B", "C", "D"] as const;
    const correctAnswer =
      typeof question.correctAnswer === "string"
        ? question.correctAnswer.trim()
        : "";
    const selected = labels.indexOf(
      correctAnswer.toUpperCase() as (typeof labels)[number],
    );
    if (selected >= 0) {
      return `${labels[selected]} · ${question.options[selected] ?? ""}`.trim();
    }
    return correctAnswer || "—";
  }

  if (question.questionType === "true_false") {
    const payload = question.payload as { correctAnswer?: boolean } | undefined;
    return payload?.correctAnswer === true ? "True" : "False";
  }

  if (question.questionType === "matching") {
    const payload = question.payload as
      | { answerKey?: Array<{ prompt?: string; match?: string }> }
      | undefined;
    return (
      (payload?.answerKey ?? [])
        .map((pair) => `${pair.prompt ?? ""} → ${pair.match ?? ""}`.trim())
        .join("; ") || "See answer key"
    );
  }

  if (question.questionType === "drag_drop") {
    const payload = question.payload as
      | { answerKey?: Array<{ item?: string; target?: string }> }
      | undefined;
    return (
      (payload?.answerKey ?? [])
        .map((pair) => `${pair.item ?? ""} → ${pair.target ?? ""}`.trim())
        .join("; ") || "See answer key"
    );
  }

  return question.modelAnswer ?? question.correctAnswer ?? "—";
}

function buildTimeBucketLabels(allocatedTimeMs: number) {
  const totalSeconds = Math.max(5, Math.round(allocatedTimeMs / 1000));
  const step = Math.max(1, Math.ceil(totalSeconds / 5));

  return Array.from({ length: 5 }, (_, index) => {
    const start = index * step;
    const end =
      index === 4 ? totalSeconds : Math.min(totalSeconds, (index + 1) * step);

    if (index === 0) return `0-${end}s`;
    if (index === 4) return `${start}s+`;
    return `${start}-${end}s`;
  });
}

function getTimeBucketIndex(
  timeTakenMs: number | undefined,
  allocatedTimeMs: number,
) {
  if (!timeTakenMs || timeTakenMs <= 0) return 0;
  if (allocatedTimeMs <= 0) return 0;

  const ratio = timeTakenMs / allocatedTimeMs;
  return clamp(Math.floor(ratio * 5), 0, 4);
}

function getQuestionPoints(
  verdict: string,
  timeTakenMs?: number,
  difficultyLevel?: string,
) {
  if (verdict === "correct") {
    return getCorrectQuestionPoints(timeTakenMs, difficultyLevel);
  }
  if (verdict === "partial") return 0.5;
  return 0;
}

function getVerdictLabel(verdict: string, wasAutoSkipped?: boolean) {
  if (wasAutoSkipped) return "Timed out";
  if (verdict === "correct") return "Correct";
  if (verdict === "partial") return "Partial";
  if (verdict === "incorrect") return "Incorrect";
  return "No attempt";
}

function getStudentDisplayName(studentId?: string) {
  const normalized = studentId?.trim();
  return normalized && normalized.length > 0 ? normalized : "Student";
}

function getPossessiveName(name: string) {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

function formatLearningObjectiveLabel(learningObjective?: string) {
  if (!learningObjective) return "General";
  const stripped = learningObjective.replace(/^Students can\s+/i, "").trim();
  if (!stripped) return "General";
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

// API functions
async function loadQuiz(input: CreateSessionInput) {
  const response = await fetch("/api/quiz/section", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as DemoQuizLoadResponse & {
    error?: string;
  };
  if (!response.ok || !("quiz" in data)) {
    throw new Error(data.error ?? "Unable to load quiz.");
  }
  return data.quiz;
}

async function submitQuiz(
  quiz: DemoLoadedQuiz,
  answers: Record<string, string>,
  responseMeta: Record<
    string,
    { timeTakenMs: number; allocatedTimeMs: number; wasAutoSkipped: boolean }
  >,
) {
  const response = await fetch("/api/quiz/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: quiz.studentId,
      subject: quiz.subject,
      classLevel: quiz.classLevel,
      topic: quiz.topic,
      maxQuestions: quiz.maxQuestions,
      answers: quiz.questions.map((question) => ({
        questionId: question.id,
        answer: answers[question.id] ?? "",
        timeTakenMs: responseMeta[question.id]?.timeTakenMs ?? 0,
        allocatedTimeMs: responseMeta[question.id]?.allocatedTimeMs ?? 0,
        wasAutoSkipped: responseMeta[question.id]?.wasAutoSkipped ?? false,
      })),
    }),
  });
  const data = (await response.json()) as DemoQuizSubmitResponse & {
    error?: string;
  };
  if (!response.ok || !("report" in data)) {
    throw new Error(data.error ?? "Unable to submit quiz.");
  }
  return data.report;
}

// Components
function QuestionInput({
  question,
  answer,
  setAnswer,
}: {
  question: DemoQuizQuestion;
  answer: string;
  setAnswer: (value: string) => void;
}) {
  if (question.questionType === "mcq" && question.options) {
    return (
      <div className="flex flex-col gap-3">
        {question.options.map((option, index) => {
          const label = OPTION_LABELS[index] ?? "";
          const selected = answer === label;
          return (
            <button
              key={`${question.id}-${label}`}
              type="button"
              onClick={() => setAnswer(label)}
              className={`group flex w-full items-center gap-4 border-2 p-4 text-left transition-all duration-200 ${THEME.roundedSm} ${
                selected
                  ? "border-[#3a5ccc] bg-[rgba(58,92,204,0.06)] text-[#1a1a2e]"
                  : `border-[rgba(26,26,46,0.06)] bg-white text-[#1a1a2e] hover:translate-x-1 hover:border-[#3a5ccc]/50 hover:shadow-md`
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center border-2 font-bricolage text-[14px] font-extrabold transition-all ${THEME.roundedSm} ${
                  selected
                    ? "border-[#3a5ccc] bg-[#3a5ccc] text-white"
                    : `border-[rgba(26,26,46,0.08)] bg-[#f5f3f0] text-[#5a5a72] group-hover:border-[#3a5ccc] group-hover:text-[#3a5ccc]`
                }`}
              >
                {label}
              </span>
              <span className="font-sans text-[15px] font-semibold leading-snug">
                {option}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.questionType === "true_false") {
    return (
      <div className="flex flex-row gap-4">
        {["true", "false"].map((value) => {
          const selected = answer === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setAnswer(value)}
              className={`flex-1 border-2 p-5 text-center transition-all duration-200 ${THEME.roundedSm} ${
                selected
                  ? "border-[#3a5ccc] bg-[rgba(58,92,204,0.06)] text-[#1a1a2e] font-bold"
                  : `border-[rgba(26,26,46,0.06)] bg-white text-[#5a5a72] font-semibold hover:-translate-y-0.5 hover:border-[#3a5ccc]/50 hover:shadow-md`
              }`}
            >
              <span className="font-bricolage text-[16px] uppercase tracking-wider">
                {value === "true" ? "True" : "False"}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (
    question.questionType === "matching" ||
    question.questionType === "drag_drop"
  ) {
    const payload = question.payload as
      | MatchingQuestionPayload
      | DragDropQuestionPayload
      | undefined;
    const leftItems =
      question.questionType === "matching"
        ? ((payload as MatchingQuestionPayload)?.premises ?? [])
        : ((payload as DragDropQuestionPayload)?.draggableItems ?? []);
    const rightItems =
      question.questionType === "matching"
        ? ((payload as MatchingQuestionPayload)?.responses ?? [])
        : ((payload as DragDropQuestionPayload)?.dropZones ?? []);
    const answerMap = getAnswerMap(answer);

    return (
      <div className="flex flex-col gap-5">
        {leftItems.map((item) => (
          <div key={item} className="flex flex-col gap-2">
            <span className="font-bricolage text-[14px] font-bold text-[#1a1a2e]">
              {item}
            </span>
            <select
              value={answerMap[item] ?? ""}
              onChange={(event) =>
                setAnswer(
                  JSON.stringify({ ...answerMap, [item]: event.target.value }),
                )
              }
              className={`w-full appearance-none border border-[rgba(26,26,46,0.1)] bg-[#f5f3f0] px-4 py-3 font-sans text-[15px] font-semibold text-[#1a1a2e] outline-none transition-all focus:border-[#3a5ccc] focus:bg-white ${THEME.roundedSm}`}
            >
              <option value="">Select matching item...</option>
              {rightItems.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  if (question.questionType === "fitb") {
    return (
      <div className="flex flex-col">
        <input
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Type the missing word or phrase..."
          className={`w-full border border-[rgba(26,26,46,0.1)] bg-[#f5f3f0] px-4 py-4 font-sans text-[15px] font-semibold text-[#1a1a2e] outline-none transition-all focus:border-[#3a5ccc] focus:bg-white focus:shadow-sm ${THEME.roundedSm}`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <textarea
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder="Type your detailed response here..."
        className={`min-h-[140px] w-full resize-y border border-[rgba(26,26,46,0.1)] bg-[#f5f3f0] px-5 py-4 font-sans text-[15px] font-semibold text-[#1a1a2e] outline-none transition-all focus:border-[#3a5ccc] focus:bg-white focus:shadow-sm ${THEME.roundedSm}`}
      />
    </div>
  );
}

function ReportView({
  report,
  onReset,
}: {
  report: DiagnosticReport;
  onReset: () => void;
}) {
  const [countScore, setCountScore] = useState(0);
  const [countPct, setCountPct] = useState(0);

  const score = report.overallReadinessScore ?? report.readinessScore ?? 0;
  const roundedScore = Math.round(score);
  const studentName = getStudentDisplayName(report.studentId);
  const firstName = studentName.split(" ")[0];
  const results = report.results ?? [];
  const learningObjectives = report.learningObjectiveResults ?? [];

  const totalQuestions = results.length || report.totalQuestionsShown || 0;
  const correctCount = results.filter(
    (record) => record.verdict === "correct",
  ).length;
  const rapidCount = results.filter(
    (record) =>
      (record.timeTakenMs ?? 0) > 0 &&
      (record.timeTakenMs ?? 0) < RAPID_RESPONSE_THRESHOLD_MS,
  ).length;
  const penaltyCount = results.filter(
    (record) =>
      record.verdict === "correct" &&
      (record.timeTakenMs ?? 0) >
        getQuestionTimeLimitMs(record.question.difficultyLevel),
  ).length;
  const totalTimeTakenMs = results.reduce(
    (sum, record) => sum + (record.timeTakenMs ?? 0),
    0,
  );
  const avgTimeTakenMs =
    totalQuestions > 0 ? totalTimeTakenMs / totalQuestions : 0;
  const totalBasePoints = results.reduce(
    (sum, record) =>
      sum + getQuestionBasePoints(record.question.difficultyLevel),
    0,
  );
  const totalFinalPoints = results.reduce((sum, record) => {
    const base = getQuestionBasePoints(record.question.difficultyLevel);
    if (record.verdict === "correct") {
      const slow =
        (record.timeTakenMs ?? 0) >
        getQuestionTimeLimitMs(record.question.difficultyLevel);
      return sum + base * (slow ? 0.9 : 1);
    }
    if (record.verdict === "partial") return sum + base * 0.5;
    return sum;
  }, 0);
  const totalPenaltyPoints = totalBasePoints - totalFinalPoints;

  useEffect(() => {
    const timer = setTimeout(() => {
      const targetScore = Math.round(totalFinalPoints);
      const targetPct = roundedScore;
      const duration = 1200;
      const startTime = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCountScore(Math.round(eased * targetScore));
        setCountPct(Math.round(eased * targetPct));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, 250);
    return () => clearTimeout(timer);
  }, [totalFinalPoints, roundedScore]);

  const getHeroContent = (pct: number) => {
    if (pct >= 90)
      return {
        face: "🐰",
        badge: "🏆",
        title: `Top of the mountain, ${firstName}!`,
        line: "You aced almost every peak today. Keep this streak going on the next test.",
        tier: "Outstanding",
        tierColor: "#1e7e34",
      };
    if (pct >= 70)
      return {
        face: "🐰",
        badge: "⛰️",
        title: `Nice climb, ${firstName}!`,
        line: "Strong grip on most concepts. One more push on the tricky ones and you're at the summit.",
        tier: "Great effort",
        tierColor: "#1e7e34",
      };
    if (pct >= 50)
      return {
        face: "🐰",
        badge: "🥾",
        title: `Solid climb, ${firstName}!`,
        line: "You're halfway up. Let's revisit the trickier topics and try them again.",
        tier: "Solid climb",
        tierColor: "#b8860b",
      };
    return {
      face: "🐰",
      badge: "🧗",
      title: `Keep climbing, ${firstName}!`,
      line: "Every climber starts at base camp. Review the concepts below and give it another shot.",
      tier: "Building up",
      tierColor: "#b85a4a",
    };
  };

  const hero = getHeroContent(roundedScore);
  const accentColor =
    roundedScore >= 70 ? "#2ecc87" : roundedScore >= 50 ? "#3a5ccc" : "#f46853";
  const pctColor = accentColor;
  const pctBg =
    roundedScore >= 70
      ? "rgba(46,204,135,0.1)"
      : roundedScore >= 50
        ? "rgba(58,92,204,0.08)"
        : "rgba(244,104,83,0.08)";

  const masteredCount = learningObjectives.filter((lo) => lo.score >= 80).length;
  const developingCount = learningObjectives.filter(
    (lo) => lo.score >= 50 && lo.score < 80,
  ).length;
  const needsWorkLOs = learningObjectives.filter((lo) => lo.score < 50);
  const testModeLabel = report.mode === "grade" ? "Grade Test" : "Topic Test";
  const today = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="dash font-sans text-[#1a1a2e] pb-20 max-w-[720px] mx-auto px-6 flex flex-col gap-[14px]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes cardUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceIn { 0% { transform: scale(0) rotate(-10deg); } 50% { transform: scale(1.15) rotate(5deg); } 100% { transform: scale(1) rotate(0deg); } }

        .dash-card { background: white; border: 1px solid rgba(26,26,46,0.06); border-radius: 18px; box-shadow: 0 2px 20px rgba(26,26,46,0.05); overflow: hidden; animation: cardUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }

        .lo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px; }
        .lo-card { background: white; border: 1px solid rgba(26,26,46,0.06); border-radius: 12px; padding: 18px 20px; box-shadow: 0 2px 20px rgba(26,26,46,0.05); animation: cardUp 0.5s both; transition: transform 0.2s, box-shadow 0.2s; }
        .lo-card:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(26,26,46,0.08); }
        .lo-status-badge { font-size: 0.68rem; padding: 3px 10px; border-radius: 20px; font-weight: 700; white-space: nowrap; }
        .lo-status-badge.mastered { background: rgba(46,204,135,0.1); color: #2ecc87; }
        .lo-status-badge.developing { background: rgba(255,197,61,0.12); color: #b8860b; }
        .lo-status-badge.needs-work { background: rgba(244,104,83,0.08); color: #f46853; }

        .mascot-circle { width:88px; height:88px; flex-shrink:0; border-radius:50%; background: linear-gradient(145deg,#ffd166 0%,#ffb347 100%); display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(255,160,60,0.35); position:relative; animation: bounceIn 0.6s 0.2s both; }
        .mascot-face { font-size: 46px; line-height: 1; }
        .mascot-badge { position:absolute; top:-4px; right:-4px; background:#2aae4a; color:#fff; font-size:14px; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.15); }
        .speech-bubble { flex:1; background:#fff; border-radius:14px; padding:14px 16px; position:relative; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
        .speech-bubble::before { content:''; position:absolute; left:-8px; top:24px; width:0; height:0; border-top:8px solid transparent; border-bottom:8px solid transparent; border-right:10px solid #fff; }
      `,
        }}
      />

      {/* Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1.5 text-[12px] text-[#888]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#555]">
            {report.topic ? `${report.topic} · ` : ""}
            {classLabel(report.classLevel)}
          </span>
          <span className="rounded-[10px] bg-[#4338CA] px-2 py-[3px] font-mono text-[10px] font-bold uppercase tracking-wider text-white">
            {testModeLabel}
          </span>
        </div>
        <span>
          {studentName} · {today}
        </span>
      </div>

      {/* Mascot Hero */}
      <div className="dash-card">
        <div
          className="flex items-center gap-4 p-6"
          style={{
            background: "linear-gradient(135deg,#fff4e0 0%,#ffe8d2 100%)",
          }}
        >
          <div className="mascot-circle">
            <span className="mascot-face">{hero.face}</span>
            <span className="mascot-badge">{hero.badge}</span>
          </div>
          <div className="speech-bubble">
            <div className="font-bricolage text-[16px] font-extrabold text-[#1a1a2e]">
              {hero.title}
            </div>
            <div className="mt-1 font-sans text-[13px] leading-relaxed text-[#444]">
              {hero.line}
            </div>
          </div>
        </div>

        {/* Score Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#efece5] bg-[#fafaf7] px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className="font-sans text-[15px] font-bold"
              style={{ color: hero.tierColor }}
            >
              {hero.tier}
            </span>
            <span
              className="rounded-[10px] px-2.5 py-[3px] font-mono text-[12px] font-bold tabular-nums"
              style={{ background: pctBg, color: pctColor }}
            >
              {countScore}/{totalBasePoints} pts
            </span>
            <span className="rounded-[10px] bg-white px-2.5 py-[3px] font-mono text-[12px] font-bold tabular-nums text-[#1a1a2e]">
              {countPct}%
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#5a5a72]">
            <span>
              <span className="font-bricolage text-[15px] font-extrabold tracking-tight text-[#1a1a2e]">
                {correctCount}
              </span>
              /{totalQuestions} correct
            </span>
            <span>
              <span className="font-bricolage text-[15px] font-extrabold tracking-tight text-[#1a1a2e]">
                {formatCompactDuration(totalTimeTakenMs)}
              </span>{" "}
              total
            </span>
            <span>
              <span className="font-bricolage text-[15px] font-extrabold tracking-tight text-[#1a1a2e]">
                {formatDuration(avgTimeTakenMs)}
              </span>{" "}
              avg
            </span>
          </div>
        </div>
      </div>

      {/* Learning Objectives Grid */}
      <div className="dash-card">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <div>
            <div className="font-bricolage font-bold text-[0.95rem] flex items-center gap-2">
              🎯 Learning Objective Breakdown
            </div>
            <div className="text-[0.72rem] text-[#9a9ab0] font-medium">
              How you did across each learning outcome
            </div>
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="lo-grid">
            {learningObjectives.map((lo, i) => {
              let status = "needs-work",
                statusText = "Needs Practice",
                pctColor = "#f46853";
              if (lo.score >= 80) {
                status = "mastered";
                statusText = "Mastered";
                pctColor = "#2ecc87";
              } else if (lo.score >= 50) {
                status = "developing";
                statusText = "Developing";
                pctColor = "#b8860b";
              }

              const barColor =
                lo.score >= 80
                  ? "#2ecc87"
                  : lo.score >= 50
                    ? "#ffc53d"
                    : "#f46853";

              return (
                <div
                  key={lo.learningObjective}
                  className="lo-card"
                  style={{ animationDelay: `${0.2 + i * 0.06}s` }}
                >
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="font-bold text-[0.85rem] leading-snug truncate">
                      {formatLearningObjectiveLabel(lo.learningObjective)}
                    </span>
                    <span className={`lo-status-badge ${status}`}>
                      {statusText}
                    </span>
                  </div>
                  <div className="font-mono text-[0.75rem] text-[#5a5a72] mb-1.5">
                    {lo.correctCount}/{lo.correctCount + lo.incorrectCount}{" "}
                    correct · {Math.round(lo.score / 2)}/10 pts
                  </div>
                  <div className="text-[0.78rem] text-[#5a5a72] leading-relaxed font-medium mb-2.5 line-clamp-3">
                    {/* Feedback would go here, using report summary or generic per-status message */}
                    {lo.score >= 80
                      ? "You've mastered this objective! Strong grasp of concepts and reliable execution."
                      : lo.score >= 50
                        ? "You're getting there. Focus on the trickier scenarios to build more confidence."
                        : "This area needs more focus. Let's revisit the core concepts and try again."}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 h-1.5 rounded-full bg-[#f0eee9] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 delay-300"
                        style={{ width: `${lo.score}%`, background: barColor }}
                      />
                    </div>
                    <span
                      className="font-mono text-[0.72rem] font-bold min-w-[32px] text-right"
                      style={{ color: pctColor }}
                    >
                      {Math.round(lo.score)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Parent Strip */}
      <div className="dash-card border-t border-[#e8ecf2] bg-[#f6f8fb]">
        <div className="px-6 py-5">
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#5a6b85]">
            👨‍👩‍👧 For Parents
          </div>
          <div className="space-y-1.5">
            {[
              `${firstName} completed the ${testModeLabel.toLowerCase()} for ${report.topic || classLabel(report.classLevel)} today.`,
              `${correctCount} out of ${totalQuestions} questions correct (${roundedScore}% adjusted score).`,
              masteredCount > 0
                ? `Mastered ${masteredCount} learning objective${masteredCount === 1 ? "" : "s"}${developingCount > 0 ? `, ${developingCount} still developing` : ""}.`
                : `${developingCount} learning objective${developingCount === 1 ? "" : "s"} still developing.`,
              needsWorkLOs.length > 0
                ? `Suggested next step: practice ${formatLearningObjectiveLabel(needsWorkLOs[0].learningObjective).toLowerCase()}.`
                : `Suggested next step: try a harder topic to keep stretching.`,
            ].map((line, i) => (
              <div
                key={i}
                className="flex items-start gap-2 font-sans text-[12.5px] leading-relaxed text-[#3a4a64]"
              >
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#5a6b85]" />
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-10 py-4 font-sans text-[16px] font-bold text-white transition-all duration-300 bg-[linear-gradient(135deg,#3a5ccc,#7c5cfc)] rounded-full shadow-[0_8px_24px_rgba(58,92,204,0.25)] hover:-translate-y-1.5 hover:shadow-[0_12px_36px_rgba(58,92,204,0.35)]"
        >
          <RotateCcw className="h-4 w-4" />
          Take another test
        </button>
      </div>
    </div>
  );
}

function SetupForm({
  form,
  setForm,
  quizCatalog,
  defaultTopicEntry,
  onStart,
  onBack,
  isBusy,
}: {
  form: CreateSessionInput;
  setForm: React.Dispatch<React.SetStateAction<CreateSessionInput>>;
  quizCatalog: DemoQuizCatalog;
  defaultTopicEntry: DemoQuizCatalogEntry | null;
  onStart: () => void;
  onBack?: () => void;
  isBusy: boolean;
}) {
  const defaultEntry = defaultTopicEntry ?? getDefaultCatalogEntry(quizCatalog);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(() => {
    return form.topic || defaultEntry?.topic || null;
  });
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (defaultEntry?.classLevel) return defaultEntry.classLevel;
    const firstClass = quizCatalog.entries[0]?.classLevel;
    return firstClass ?? "class5";
  });

  const classLevels = useMemo(
    () =>
      Array.from(new Set(quizCatalog.entries.map((e) => e.classLevel))).sort(),
    [quizCatalog.entries],
  );

  const filteredEntries = useMemo(
    () => quizCatalog.entries.filter((e) => e.classLevel === activeTab),
    [activeTab, quizCatalog.entries],
  );

  const effectiveTopic = selectedTopic || defaultEntry?.topic || null;
  const effectiveTopicLabel =
    effectiveTopic ?? DIAGNOSTIC_CONTENT_DEFAULTS.topic;
  const effectiveTopicSlug = (
    effectiveTopic ?? DIAGNOSTIC_CONTENT_DEFAULTS.topic
  ).toLowerCase();

  const selectedEntry = useMemo(
    () =>
      quizCatalog.entries.find(
        (entry) =>
          entry.subject === form.subject &&
          entry.classLevel === form.classLevel &&
          entry.topic === effectiveTopic,
      ),
    [effectiveTopic, form.classLevel, form.subject, quizCatalog.entries],
  );

  useEffect(() => {
    if (selectedTopic || !defaultEntry?.topic) return;

    setSelectedTopic(defaultEntry.topic);
    setActiveTab(defaultEntry.classLevel);
    setForm((prev) => ({
      ...prev,
      subject: defaultEntry.subject,
      classLevel: defaultEntry.classLevel,
      topic: defaultEntry.topic,
    }));
  }, [defaultEntry, selectedTopic, setForm]);

  const handleSelectTopic = (topic: string, classLevel: string) => {
    setSelectedTopic(topic);
    setForm((prev) => ({ ...prev, topic, classLevel: classLevel as never }));
  };

  return (
    <div className="flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 py-4">
      <div
        className={`relative w-full max-w-[560px] overflow-hidden bg-white p-7 text-center border border-[rgba(26,26,46,0.06)] ${THEME.rounded} ${THEME.shadowFloat}`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-[linear-gradient(90deg,#3a5ccc,#7c5cfc)]" />

        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-1 font-sans text-[12px] font-medium text-[#8a8aa0] transition-colors hover:text-[#1a1a2e]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Choose test type</span>
          </button>
        )}

        <div className="mb-1 inline-block bg-[#EEF2FF] text-[#4338CA] font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md mb-3">
          Topic Test
        </div>

        {/* Icon + title */}
        <div className="mb-1 flex justify-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(58,92,204,0.06)]">
            <Calculator className="h-7 w-7 text-[#3a5ccc]" />
          </div>
        </div>

        <h2 className="mb-1 font-bricolage text-[24px] font-extrabold tracking-tight text-[#1a1a2e]">
          {effectiveTopicLabel}
        </h2>
        <p className="mx-auto mb-5 max-w-[400px] font-sans text-[13px] leading-relaxed text-[#8a8aa0]">
          A timed diagnostic to evaluate conceptual depth and readiness.
        </p>

        <div className="mb-5 flex justify-center gap-2">
          <span className="rounded-full bg-[rgba(58,92,204,0.08)] px-5 py-2 font-mono text-[12px] font-bold text-[#3a5ccc]">
            {selectedEntry
              ? `${selectedEntry.learningObjectives.length * 3} questions`
              : "— questions"}
          </span>
          <span className="rounded-full bg-[rgba(58,92,204,0.08)] px-5 py-2 font-mono text-[12px] font-bold uppercase text-[#3a5ccc]">
            {classLabel(form.classLevel)}
          </span>
        </div>

        <button
          className={`group relative flex w-full items-center justify-center gap-2 py-3 font-sans text-[15px] font-bold text-white transition-all duration-300 ${THEME.primaryGradient} rounded-full shadow-[0_6px_20px_rgba(58,92,204,0.2)] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(58,92,204,0.3)] disabled:opacity-50 disabled:hover:translate-y-0`}
          onClick={onStart}
          disabled={isBusy || !selectedEntry}
        >
          {isBusy ? (
            <>
              <div className="h-4 w-4 animate-spin border-2 border-white/30 border-t-white rounded-full" />
              <span>Preparing...</span>
            </>
          ) : (
            <>
              <span className="font-bricolage tracking-tight">
                Begin Diagnostic
              </span>
              <Rocket className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function TestSelectorScreen({
  quizCatalog,
  onSelect,
}: {
  quizCatalog: DemoQuizCatalog;
  onSelect: (mode: "topic" | "grade") => void;
}) {
  const gradeClassLevels = useMemo(
    () => Array.from(new Set(quizCatalog.entries.map((e) => e.classLevel))).sort(),
    [quizCatalog.entries],
  );
  const firstClass = gradeClassLevels[0] ?? "class4";
  const gradeTargets = GRADE_TEST_COUNTS[firstClass] ?? GRADE_TEST_COUNTS.class4;
  const gradeTotal = gradeTargets.easy + gradeTargets.medium + gradeTargets.hard;

  return (
    <div className="flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 py-8">
      <div className="text-center mb-8">
        <h2 className="font-bricolage text-[28px] font-extrabold tracking-tight text-[#1a1a2e] mb-2">
          Choose your test
        </h2>
        <p className="font-sans text-[14px] text-[#8a8aa0] max-w-[480px] leading-relaxed">
          Ready to see how you are doing in Maths? Pick the test that fits what you want to check.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-[820px]">
        {/* Topic Test card */}
        <button
          type="button"
          onClick={() => onSelect("topic")}
          className="group text-left bg-white border border-[rgba(26,26,46,0.06)] rounded-[20px] p-7 shadow-[0_2px_20px_rgba(26,26,46,0.05)] hover:border-[#7c5cfc]/40 hover:-translate-y-1 hover:shadow-[0_8px_28px_rgba(124,92,252,0.12)] transition-all duration-200"
        >
          <div className="w-14 h-14 rounded-[14px] bg-[linear-gradient(135deg,#EEF2FF,#DDD6FE)] flex items-center justify-center text-[28px] mb-4">
            📝
          </div>
          <h3 className="font-bricolage text-[20px] font-bold text-[#1a1a2e] mb-2">Topic Test</h3>
          <p className="font-sans text-[13px] text-[#8a8aa0] leading-relaxed mb-4">
            Test your knowledge on one specific topic. Good for checking if you have mastered what you just learnt.
          </p>
          <div className="flex gap-2 flex-wrap mb-4">
            <span className="bg-[#F5F2EB] px-3 py-1 rounded-full font-mono text-[11px] text-[#4B5563]">3 per LO</span>
            <span className="bg-[#F5F2EB] px-3 py-1 rounded-full font-mono text-[11px] text-[#4B5563]">One topic</span>
            <span className="bg-[#F5F2EB] px-3 py-1 rounded-full font-mono text-[11px] text-[#4B5563]">15–24 min</span>
          </div>
          <span className="font-sans text-[13px] font-semibold text-[#6366F1] group-hover:underline">
            Start a topic test →
          </span>
        </button>

        {/* Grade Test card */}
        <button
          type="button"
          onClick={() => onSelect("grade")}
          className="group text-left bg-white border border-[rgba(26,26,46,0.06)] rounded-[20px] p-7 shadow-[0_2px_20px_rgba(26,26,46,0.05)] hover:border-[#f59e0b]/40 hover:-translate-y-1 hover:shadow-[0_8px_28px_rgba(245,158,11,0.12)] transition-all duration-200"
        >
          <div className="w-14 h-14 rounded-[14px] bg-[linear-gradient(135deg,#FEF3C7,#FED7AA)] flex items-center justify-center text-[28px] mb-4">
            🏆
          </div>
          <h3 className="font-bricolage text-[20px] font-bold text-[#1a1a2e] mb-2">Grade Test</h3>
          <p className="font-sans text-[13px] text-[#8a8aa0] leading-relaxed mb-4">
            Test your knowledge across your whole grade. Good for finding which topics to focus on next.
          </p>
          <div className="flex gap-2 flex-wrap mb-4">
            <span className="bg-[#F5F2EB] px-3 py-1 rounded-full font-mono text-[11px] text-[#4B5563]">{gradeTotal} questions</span>
            <span className="bg-[#F5F2EB] px-3 py-1 rounded-full font-mono text-[11px] text-[#4B5563]">All topics</span>
            <span className="bg-[#F5F2EB] px-3 py-1 rounded-full font-mono text-[11px] text-[#4B5563]">20–30 min</span>
          </div>
          <span className="font-sans text-[13px] font-semibold text-[#d97706] group-hover:underline">
            Start a grade test →
          </span>
        </button>
      </div>
    </div>
  );
}

function GradeStartScreen({
  quizCatalog,
  form,
  setForm,
  onStart,
  onBack,
  isBusy,
}: {
  quizCatalog: DemoQuizCatalog;
  form: CreateSessionInput;
  setForm: React.Dispatch<React.SetStateAction<CreateSessionInput>>;
  onStart: () => void;
  onBack: () => void;
  isBusy: boolean;
}) {
  const classLevels = useMemo(
    () => Array.from(new Set(quizCatalog.entries.map((e) => e.classLevel))).sort(),
    [quizCatalog.entries],
  );

  const selectedClassLevel = form.classLevel;
  const targets = GRADE_TEST_COUNTS[selectedClassLevel] ?? GRADE_TEST_COUNTS.class4;
  const total = targets.easy + targets.medium + targets.hard;

  const topicsForGrade = useMemo(
    () =>
      quizCatalog.entries
        .filter((e) => e.classLevel === selectedClassLevel)
        .map((e) => e.topic),
    [quizCatalog.entries, selectedClassLevel],
  );

  return (
    <div className="flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 py-4">
      <div className={`relative w-full max-w-[560px] overflow-hidden bg-white p-7 border border-[rgba(26,26,46,0.06)] ${THEME.rounded} ${THEME.shadowFloat}`}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-[linear-gradient(90deg,#f59e0b,#ef4444)]" />

        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-1 font-sans text-[12px] font-medium text-[#8a8aa0] transition-colors hover:text-[#1a1a2e]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Choose test type</span>
        </button>

        <div className="mb-4 inline-block bg-[#FEF3C7] text-[#B45309] font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
          Grade Test
        </div>

        {/* Grade selector */}
        <div className="mb-4">
          <div className="mb-1.5 font-sans text-[10px] font-bold uppercase tracking-wider text-[#8a8aa0]">Select grade</div>
          <div className="flex flex-wrap gap-2">
            {classLevels.map((cl) => (
              <button
                key={cl}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, classLevel: cl as never }))}
                className={`rounded-full px-4 py-1.5 font-mono text-[12px] font-bold transition-all ${
                  selectedClassLevel === cl
                    ? "bg-[#3a5ccc] text-white"
                    : "bg-[rgba(58,92,204,0.08)] text-[#3a5ccc] hover:bg-[rgba(58,92,204,0.14)]"
                }`}
              >
                {classLabel(cl)}
              </button>
            ))}
          </div>
        </div>

        <h2 className="mb-1 font-bricolage text-[24px] font-extrabold tracking-tight text-[#1a1a2e]">
          {classLabel(selectedClassLevel)} · All Topics
        </h2>
        <p className="mx-auto mb-5 font-sans text-[13px] leading-relaxed text-[#8a8aa0]">
          A full-grade diagnostic covering all topics. Identifies your strengths and areas to focus on.
        </p>

        <div className="mb-5 flex justify-center gap-2 flex-wrap">
          <span className="rounded-full bg-[rgba(58,92,204,0.08)] px-4 py-1.5 font-mono text-[12px] font-bold text-[#3a5ccc]">
            {total} questions
          </span>
          <span className="rounded-full bg-[rgba(46,204,135,0.1)] px-4 py-1.5 font-mono text-[12px] font-bold text-[#2ecc87]">
            {targets.easy} easy
          </span>
          <span className="rounded-full bg-[rgba(255,197,61,0.12)] px-4 py-1.5 font-mono text-[12px] font-bold text-[#b8860b]">
            {targets.medium} medium
          </span>
          <span className="rounded-full bg-[rgba(244,104,83,0.08)] px-4 py-1.5 font-mono text-[12px] font-bold text-[#f46853]">
            {targets.hard} hard
          </span>
        </div>

        {topicsForGrade.length > 0 && (
          <div className="mb-5 text-left">
            <div className="mb-2 font-sans text-[10px] font-bold uppercase tracking-wider text-[#8a8aa0]">
              Topics covered
            </div>
            <div className="rounded-[14px] border border-[rgba(26,26,46,0.06)] bg-[#faf8f5] overflow-hidden">
              {topicsForGrade.map((topic, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 px-4 py-2.5 ${idx !== topicsForGrade.length - 1 ? "border-b border-[rgba(26,26,46,0.04)]" : ""}`}
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(245,158,11,0.1)] font-mono text-[10px] font-bold text-[#d97706]">
                    {idx + 1}
                  </div>
                  <span className="font-sans text-[12px] font-medium text-[#1a1a2e]">{topic}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          className={`group relative flex w-full items-center justify-center gap-2 py-3 font-sans text-[15px] font-bold text-white transition-all duration-300 bg-[linear-gradient(135deg,#f59e0b,#ef4444)] rounded-full shadow-[0_6px_20px_rgba(245,158,11,0.25)] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(245,158,11,0.35)] disabled:opacity-50 disabled:hover:translate-y-0`}
          onClick={onStart}
          disabled={isBusy}
        >
          {isBusy ? (
            <>
              <div className="h-4 w-4 animate-spin border-2 border-white/30 border-t-white rounded-full" />
              <span>Preparing...</span>
            </>
          ) : (
            <>
              <span className="font-bricolage tracking-tight">Begin Grade Test</span>
              <Rocket className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function DiagnosticDemo({
  quizCatalog,
  defaultTopicEntry,
}: {
  quizCatalog: DemoQuizCatalog;
  defaultTopicEntry: DemoQuizCatalogEntry | null;
}) {
  const [selectedTestMode, setSelectedTestMode] = useState<"topic" | "grade" | null>(null);
  const [form, setForm] = useState<CreateSessionInput>(() =>
    buildDefaultForm(defaultTopicEntry),
  );
  const [quiz, setQuiz] = useState<DemoLoadedQuiz | null>(null);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [responseMeta, setResponseMeta] = useState<
    Record<
      string,
      { timeTakenMs: number; allocatedTimeMs: number; wasAutoSkipped: boolean }
    >
  >({});
  const [interstitial, setInterstitial] = useState<
    (typeof INTERSTITIALS)[number] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"load" | "submit" | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const currentQuestion = quiz?.questions[currentIndex] ?? null;
  const currentQuestionTimeLimitMs = currentQuestion
    ? getQuestionTimeLimitMs(currentQuestion.difficultyLevel)
    : 0;
  const isBusy = isPending || pendingAction !== null;

  const quizRef = useRef<DemoLoadedQuiz | null>(quiz);
  const currentIndexRef = useRef(currentIndex);
  const currentAnswerRef = useRef(currentAnswer);
  const answersRef = useRef<Record<string, string>>(answers);
  const responseMetaRef = useRef(responseMeta);
  const advanceLockRef = useRef(false);
  const questionStartedAtRef = useRef<number>(Date.now());
  const advanceRef = useRef<
    (overrideAnswer?: string, meta?: { wasAutoSkipped?: boolean }) => void
  >(() => {});

  useEffect(() => {
    quizRef.current = quiz;
    currentIndexRef.current = currentIndex;
    currentAnswerRef.current = currentAnswer;
    answersRef.current = answers;
    responseMetaRef.current = responseMeta;
  }, [answers, currentAnswer, currentIndex, quiz, responseMeta]);

  const finalizeQuiz = (
    finalAnswers: Record<string, string>,
    finalResponseMeta: Record<
      string,
      { timeTakenMs: number; allocatedTimeMs: number; wasAutoSkipped: boolean }
    >,
  ) => {
    const activeQuiz = quizRef.current;
    if (!activeQuiz) return;

    setPendingAction("submit");
    startTransition(() => {
      void (async () => {
        try {
          setError(null);
          const finalReport = await submitQuiz(
            activeQuiz,
            finalAnswers,
            finalResponseMeta,
          );
          setReport(finalReport);
          setQuiz(null);
        } catch (err) {
          setError(toErrorMessage(err));
        } finally {
          setPendingAction(null);
        }
      })();
    });
  };

  advanceRef.current = (
    overrideAnswer = currentAnswerRef.current,
    meta = {},
  ) => {
    if (advanceLockRef.current) return;
    const activeQuiz = quizRef.current;
    const questionIndex = currentIndexRef.current;
    const question = activeQuiz?.questions[questionIndex];
    if (!activeQuiz || !question) return;

    advanceLockRef.current = true;
    const questionTimeLimitMs = getQuestionTimeLimitMs(
      question.difficultyLevel,
    );
    const nextAnswers = {
      ...answersRef.current,
      [question.id]: overrideAnswer,
    };
    const timeTakenMs = Math.max(0, Date.now() - questionStartedAtRef.current);
    const nextResponseMeta = {
      ...responseMetaRef.current,
      [question.id]: {
        timeTakenMs,
        allocatedTimeMs: questionTimeLimitMs,
        wasAutoSkipped: meta.wasAutoSkipped === true,
      },
    };
    answersRef.current = nextAnswers;
    responseMetaRef.current = nextResponseMeta;
    setAnswers(nextAnswers);
    setResponseMeta(nextResponseMeta);

    if (questionIndex >= activeQuiz.questions.length - 1) {
      finalizeQuiz(nextAnswers, nextResponseMeta);
      return;
    }

    const nextIndex = questionIndex + 1;
    const completedCount = questionIndex + 1;
    const totalQ = activeQuiz.questions.length;
    const t1 = Math.round(totalQ * 0.33);
    const t2 = Math.round(totalQ * 0.66);
    const t3 = Math.round(totalQ * 0.88);
    const interstitialToShow =
      completedCount === t1
        ? INTERSTITIALS[0]
        : completedCount === t2
          ? INTERSTITIALS[1]
          : completedCount === t3
            ? INTERSTITIALS[2]
            : null;

    setCurrentIndex(nextIndex);
    setCurrentAnswer(nextAnswers[activeQuiz.questions[nextIndex].id] ?? "");
    if (interstitialToShow) {
      setInterstitial(interstitialToShow);
      setTimeout(() => {
        setInterstitial((prev) =>
          prev === interstitialToShow ? null : prev,
        );
      }, 3200);
    }
  };

  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!currentQuestion) return;
    advanceLockRef.current = false;
    questionStartedAtRef.current = Date.now();
    setElapsedMs(0);
    const interval = setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - questionStartedAtRef.current));
    }, 250);
    return () => clearInterval(interval);
  }, [currentQuestion]);

  const startQuizRun = (overrideTestMode?: "topic" | "grade") => {
    const activeTestMode = overrideTestMode ?? selectedTestMode ?? "topic";
    const sessionForm = { ...form, testMode: activeTestMode };
    setPendingAction("load");
    startTransition(() => {
      void (async () => {
        try {
          setError(null);
          const loadedQuiz = await loadQuiz(sessionForm);
          setQuiz(loadedQuiz);
          setReport(null);
          setCurrentIndex(0);
          setAnswers({});
          setResponseMeta({});
          setCurrentAnswer("");
        } catch (err) {
          setError(toErrorMessage(err));
        } finally {
          setPendingAction(null);
        }
      })();
    });
  };

  const resetQuiz = () => {
    setSelectedTestMode(null);
    setQuiz(null);
    setReport(null);
    setCurrentIndex(0);
    setCurrentAnswer("");
    setAnswers({});
    setResponseMeta({});
    setInterstitial(null);
    setError(null);
    setPendingAction(null);
  };

  const canSubmitCurrent =
    !isBusy &&
    !!currentQuestion &&
    (currentQuestion.questionType === "matching" ||
    currentQuestion.questionType === "drag_drop"
      ? Object.keys(getAnswerMap(currentAnswer)).length > 0
      : currentAnswer.trim() !== "");

  const answeredCount = Object.keys(answers).length;
  const pctComplete = quiz
    ? Math.round((answeredCount / quiz.questions.length) * 100)
    : 0;

  return (
    <div className={THEME.page} style={{ backgroundImage: AMBIENT_BG }}>
      <div className="mx-auto max-w-[1200px] px-6 py-4 sm:px-10">
        {/* Compact Logo & Back Button Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#3a5ccc,#7c5cfc)] text-white shadow-sm">
              <FlaskConical className="h-4 w-4" />
            </div>
            <span className="font-bricolage text-[20px] font-extrabold tracking-tight text-[#1a1a2e] uppercase">
              Diagnostic Agent
            </span>
          </div>
          {quiz || report ? (
            <button
              onClick={resetQuiz}
              className="flex items-center gap-1 font-sans text-[13px] font-medium text-[#8a8aa0] transition-colors hover:text-[#1a1a2e]"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-1 font-sans text-[13px] font-medium text-[#8a8aa0] transition-colors hover:text-[#1a1a2e]"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
          )}
        </div>

        {error && (
          <div
            className={`mb-8 flex items-center gap-3 border border-[#f46853]/20 bg-[#f46853]/5 p-4 text-[#f46853] ${THEME.roundedSm}`}
          >
            <AlertCircle className="h-5 w-5" />
            <span className="font-sans text-[15px] font-semibold">{error}</span>
          </div>
        )}

        {!quiz && !report && selectedTestMode === null && (
          <TestSelectorScreen
            quizCatalog={quizCatalog}
            onSelect={(mode) => {
              setSelectedTestMode(mode);
              setForm((prev) => ({ ...prev, testMode: mode }));
            }}
          />
        )}

        {!quiz && !report && selectedTestMode === "topic" && (
          <SetupForm
            form={form}
            setForm={setForm}
            quizCatalog={quizCatalog}
            defaultTopicEntry={defaultTopicEntry}
            onStart={() => startQuizRun("topic")}
            onBack={() => setSelectedTestMode(null)}
            isBusy={isBusy}
          />
        )}

        {!quiz && !report && selectedTestMode === "grade" && (
          <GradeStartScreen
            quizCatalog={quizCatalog}
            form={form}
            setForm={setForm}
            onStart={() => startQuizRun("grade")}
            onBack={() => setSelectedTestMode(null)}
            isBusy={isBusy}
          />
        )}

        {quiz && interstitial && (
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
            <div
              className="pointer-events-auto flex max-w-[440px] items-center gap-3 rounded-full border border-[rgba(26,26,46,0.08)] bg-white/95 px-4 py-3 shadow-[0_12px_40px_rgba(26,26,46,0.18)] backdrop-blur"
              style={{
                animation:
                  "interstitialPop 0.4s cubic-bezier(0.17,0.89,0.32,1.49) both",
              }}
            >
              <div className="text-[24px] leading-none">
                {interstitial.icon}
              </div>
              <div className="text-left">
                <div className="font-bricolage text-[14px] font-extrabold leading-tight text-[#1a1a2e]">
                  {interstitial.title}
                </div>
                <div className="font-sans text-[12px] leading-snug text-[#5a5a72]">
                  {interstitial.subtitle}
                </div>
              </div>
            </div>
          </div>
        )}

        {quiz && currentQuestion && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Assessment Header */}
            <div
              className={`mb-5 flex flex-wrap items-center justify-between gap-4 bg-white px-5 py-4 shadow-sm border border-[rgba(26,26,46,0.06)] ${THEME.rounded}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[#3a5ccc]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3a5ccc]" />
                  Conceptual Diagnosis
                </div>
                <h2 className="mt-0.5 font-bricolage text-[18px] font-extrabold text-[#1a1a2e]">
                  {quiz.topic}
                </h2>
                <div className="mt-0.5 flex flex-wrap gap-2">
                  <span className="font-sans text-[12px] font-bold text-[#8a8aa0]">
                    {quiz.subject}
                  </span>
                  <span className="text-[#8a8aa0] opacity-30">|</span>
                  <span className="font-sans text-[12px] font-bold text-[#8a8aa0]">
                    {classLabel(quiz.classLevel)}
                  </span>
                  <span className="text-[#8a8aa0] opacity-30">|</span>
                  <span className="font-sans text-[12px] font-bold text-[#8a8aa0]">
                    {quiz.questions.length} Questions
                  </span>
                </div>
              </div>

            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
              {/* Question Area */}
              <div className="flex flex-col gap-6">
                <div className="mb-2">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#8a8aa0]">
                      Progress
                    </span>
                    <span className="font-mono text-[12px] font-bold text-[#3a5ccc]">
                      {answeredCount} / {quiz.questions.length}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#f5f3f0]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#3a5ccc,#7c5cfc)] transition-all duration-500 ease-out"
                      style={{ width: `${pctComplete}%` }}
                    />
                  </div>
                </div>

                <div
                  className={`relative overflow-hidden bg-white p-6 shadow-sm border border-[rgba(26,26,46,0.06)] ${THEME.rounded}`}
                >
                  <div className="relative z-10">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                      <div className="rounded-full bg-[rgba(58,92,204,0.08)] px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-[#3a5ccc]">
                        {formatLearningObjectiveLabel(
                          currentQuestion.learningObjective,
                        )}
                      </div>
                      {(() => {
                        const limit = currentQuestionTimeLimitMs || 0;
                        const ratio = limit > 0 ? elapsedMs / limit : 0;
                        const isWarn = ratio >= 0.66 && ratio < 0.9;
                        const isUrgent = ratio >= 0.9;
                        const tone = isUrgent
                          ? "bg-[rgba(220,38,38,0.1)] text-[#dc2626] border-[rgba(220,38,38,0.25)]"
                          : isWarn
                            ? "bg-[rgba(255,154,60,0.12)] text-[#ff9a3c] border-[rgba(255,154,60,0.3)]"
                            : "bg-[rgba(58,92,204,0.08)] text-[#3a5ccc] border-[rgba(58,92,204,0.2)]";
                        const seconds = Math.floor(elapsedMs / 1000);
                        const mm = String(Math.floor(seconds / 60)).padStart(
                          2,
                          "0",
                        );
                        const ss = String(seconds % 60).padStart(2, "0");
                        return (
                          <div
                            className={`flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[12px] font-bold tabular-nums ${tone} ${isUrgent ? "animate-pulse" : ""}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${isUrgent ? "bg-[#dc2626]" : isWarn ? "bg-[#ff9a3c]" : "bg-[#3a5ccc]"}`}
                            />
                            <span>
                              {mm}:{ss}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {"scenario" in (currentQuestion.payload ?? {}) && (
                      <div className="mb-6 rounded-[16px] bg-[#fff7ed] p-5 border border-[#ff9a3c]/10">
                        <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[#ff9a3c]">
                          Scenario
                        </div>
                        <p className="font-sans text-[15px] font-semibold leading-relaxed text-[#1a1a2e]">
                          {String(
                            (currentQuestion.payload as { scenario?: string })
                              .scenario ?? "",
                          )}
                        </p>
                      </div>
                    )}

                    <h3 className="mb-5 flex gap-3 font-bricolage text-[19px] font-bold leading-tight text-[#1a1a2e] sm:text-[21px]">
                      <span className="shrink-0 font-mono text-[#3a5ccc]">
                        Q{currentIndex + 1}.
                      </span>
                      <span className="flex-1 break-words">
                        {currentQuestion.question}
                      </span>
                    </h3>

                    <QuestionInput
                      question={currentQuestion}
                      answer={currentAnswer}
                      setAnswer={setCurrentAnswer}
                    />

                    <div className="mt-6 flex items-center justify-end border-t border-[rgba(26,26,46,0.06)] pt-5">
                      <button
                        className={`flex h-10 items-center gap-2 rounded-full ${THEME.primaryGradient} px-8 font-sans text-[13px] font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50`}
                        onClick={() => advanceRef.current(currentAnswer)}
                        disabled={!canSubmitCurrent || isBusy}
                      >
                        {isBusy
                          ? "Saving..."
                          : currentIndex === quiz.questions.length - 1
                            ? "Complete Diagnostic"
                            : "Next Question"}
                        {!isBusy && <ChevronRight className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <aside className="space-y-6">
                {/* Map Grid */}
                <div
                  className={`bg-white p-6 border border-[rgba(26,26,46,0.06)] shadow-sm ${THEME.rounded}`}
                >
                  <h4 className="mb-5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a8aa0]">
                    Question Map
                  </h4>
                  <div className="grid grid-cols-5 gap-2.5">
                    {quiz.questions.map((q, i) => {
                      const isActive = i === currentIndex;
                      const hasResponded = q.id in responseMeta;
                      const wasSkipped =
                        hasResponded && responseMeta[q.id]?.wasAutoSkipped;
                      let isAnswered = false;
                      if (hasResponded) {
                        const ans = answers[q.id] || "";
                        if (
                          q.questionType === "matching" ||
                          q.questionType === "drag_drop"
                        ) {
                          isAnswered =
                            Object.keys(getAnswerMap(ans)).length > 0;
                        } else {
                          isAnswered = ans.trim() !== "";
                        }
                      }
                      const isSkipped = hasResponded && !isAnswered;

                      return (
                        <div
                          key={q.id}
                          className={`flex aspect-square items-center justify-center border-2 font-mono text-[11px] font-bold transition-all duration-300 ${THEME.roundedSm} ${
                            isActive
                              ? "border-[#3a5ccc] bg-[#3a5ccc]/15 text-[#3a5ccc] shadow-sm"
                              : isAnswered
                                ? "border-[#1ab373] bg-[#1ab373]/15 text-[#0e9b61]"
                                : isSkipped
                                  ? "border-[#e8920a] bg-[#e8920a]/15 text-[#c47a08]"
                                  : "border-[rgba(26,26,46,0.12)] bg-[rgba(26,26,46,0.03)] text-[#a0a0b8]"
                          }`}
                          title={
                            isAnswered
                              ? "Done"
                              : isSkipped
                                ? `Skipped${wasSkipped ? " (timed out)" : ""}`
                                : "Not reached"
                          }
                        >
                          {i + 1}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[#8a8aa0]">
                      <span className="h-2.5 w-2.5 rounded-sm border-2 border-[#1ab373] bg-[#1ab373]/15" />
                      Done
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[#8a8aa0]">
                      <span className="h-2.5 w-2.5 rounded-sm border-2 border-[#e8920a] bg-[#e8920a]/15" />
                      Skipped
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[#8a8aa0]">
                      <span className="h-2.5 w-2.5 rounded-sm border-2 border-[rgba(26,26,46,0.05)] bg-[#faf8f5]" />
                      Upcoming
                    </span>
                  </div>
                </div>

                {/* Coverage */}
                <div
                  className={`bg-white p-6 border border-[rgba(26,26,46,0.06)] shadow-sm ${THEME.rounded}`}
                >
                  <h4 className="mb-5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a8aa0]">
                    LO Coverage
                  </h4>
                  <div className="space-y-3.5">
                    {Array.from(
                      new Set(quiz.questions.map((q) => q.learningObjective)),
                    ).map((lo) => {
                      const loQuestions = quiz.questions.filter(
                        (q) => q.learningObjective === lo,
                      );
                      const loAnswered = loQuestions.filter(
                        (q) => q.id in answers,
                      ).length;
                      const isComplete = loAnswered === loQuestions.length;
                      return (
                        <div key={lo} className="flex items-center gap-3">
                          <div
                            className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 transition-all ${
                              isComplete
                                ? "border-[#2ecc87] bg-[#2ecc87]"
                                : loAnswered > 0
                                  ? "border-[#3a5ccc] bg-[#3a5ccc]"
                                  : "border-[rgba(26,26,46,0.1)]"
                            }`}
                          />
                          <span
                            className={`truncate font-sans text-[12px] font-bold ${isComplete || loAnswered > 0 ? "text-[#1a1a2e]" : "text-[#8a8aa0]"}`}
                          >
                            {formatLearningObjectiveLabel(lo)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}

        {report && <ReportView report={report} onReset={resetQuiz} />}
      </div>
    </div>
  );
}
