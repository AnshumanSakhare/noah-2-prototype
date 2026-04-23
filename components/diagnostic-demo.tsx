"use client";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
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
  hard: 5,
};

const DIFFICULTY_TIME_LIMITS_MS: Record<string, number> = {
  easy: 45_000,
  medium: 55_000,
  hard: 70_000,
};

const RAPID_RESPONSE_THRESHOLD_MS = 2_000;

// Utility functions
function classLabel(value: string) {
  if (value === "class8") return "Grade 7";
  if (value === "class7") return "Grade 6";
  return "Grade 5";
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
        subject: entry.subject,
        classLevel: entry.classLevel,
        topic: entry.topic,
        maxQuestions: 15,
      }
    : {
        studentId: "Riya Sharma",
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
  const [showMethodology, setShowMethodology] = useState(false);
  const [countScore, setCountScore] = useState(0);
  const [countPct, setCountPct] = useState(0);
  const [rocketBottom, setRocketBottom] = useState(0);
  const [showParticles, setShowParticles] = useState(false);

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
    setShowParticles(true);
    const timer = setTimeout(() => {
      const targetScore = Math.round(totalFinalPoints);
      const targetPct = roundedScore;

      const duration = 1400;
      const startTime = performance.now();

      const animate = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCountScore(Math.round(eased * targetScore));
        setCountPct(Math.round(eased * targetPct));
        setRocketBottom(eased * targetPct);
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, 500);
    return () => clearTimeout(timer);
  }, [totalFinalPoints, roundedScore]);

  const getHeroContent = (pct: number) => {
    if (pct >= 90)
      return {
        emoji: "🏆",
        greeting: `Outstanding work, ${firstName}!`,
        subtitle:
          "You've absolutely crushed this diagnostic — your understanding is rock-solid. Keep up this incredible momentum!",
        altitude: "🌌 Stratosphere reached!",
      };
    if (pct >= 70)
      return {
        emoji: "🌟",
        greeting: `Great job, ${firstName}!`,
        subtitle:
          "You've got a strong grip on most concepts. A little more focus on the tricky ones and you'll be unstoppable!",
        altitude: "☁️ Cruising through the clouds",
      };
    if (pct >= 50)
      return {
        emoji: "💪",
        greeting: `Nice effort, ${firstName}!`,
        subtitle:
          "You're building a solid foundation. Let's work on the areas where you stumbled — you're closer than you think!",
        altitude: "🛫 Gaining altitude",
      };
    return {
      emoji: "🧪",
      greeting: `Keep going, ${firstName}!`,
      subtitle:
        "Every scientist starts somewhere. Review the concepts below and give it another shot — you've got this!",
      altitude: "🔧 Pre-flight check — preparing for takeoff",
    };
  };

  const hero = getHeroContent(roundedScore);
  const accentColor =
    roundedScore >= 70 ? "#2ecc87" : roundedScore >= 50 ? "#3a5ccc" : "#f46853";
  const pctColor =
    roundedScore >= 70 ? "#2ecc87" : roundedScore >= 50 ? "#3a5ccc" : "#f46853";
  const pctBg =
    roundedScore >= 70
      ? "rgba(46,204,135,0.1)"
      : roundedScore >= 50
        ? "rgba(58,92,204,0.08)"
        : "rgba(244,104,83,0.08)";

  return (
    <div className="dash font-sans text-[#1a1a2e] pb-20 max-w-[1480px] mx-auto px-6 flex flex-col gap-[18px]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes cardUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceIn { 0% { transform: scale(0) rotate(-10deg); } 50% { transform: scale(1.25) rotate(5deg); } 100% { transform: scale(1) rotate(0deg); } }
        @keyframes exhaustFade { 0% { transform: translateY(0) scale(1); opacity: 0.8; } 100% { transform: translateY(40px) scale(0.1); opacity: 0; } }
        @keyframes starTwinkle { 0% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1.3); } 100% { opacity: 0.6; transform: scale(1); } }
        @keyframes floatUp { 0% { transform: translateY(100vh) scale(0); opacity: 0; } 10% { opacity: 0.35; } 90% { opacity: 0.35; } 100% { transform: translateY(-10vh) scale(1); opacity: 0; } }
        
        .dash-card { background: white; border: 1px solid rgba(26,26,46,0.06); border-radius: 18px; box-shadow: 0 2px 20px rgba(26,26,46,0.05); overflow: hidden; animation: cardUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .result-hero { padding: 44px 36px 40px; text-align: center; position: relative; overflow: hidden; background: white; border: 1px solid rgba(26,26,46,0.06); border-radius: 18px; box-shadow: 0 2px 20px rgba(26,26,46,0.05); animation: cardUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .result-hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 0%, rgba(58,92,204,0.05), transparent 70%); }
        .result-emoji { font-size: 3.6rem; margin-bottom: 8px; display: block; animation: bounceIn 0.6s 0.2s both; }
        .result-greeting { font-family: var(--font-bricolage); font-size: 1.5rem; font-weight: 800; margin-bottom: 4px; position: relative; }
        .result-title { font-family: var(--font-bricolage); font-size: 1.05rem; font-weight: 600; color: #5a5a72; margin-bottom: 24px; position: relative; line-height: 1.5; max-width: 600px; margin-left: auto; margin-right: auto; }
        
        .rocket-score { display: flex; align-items: center; justify-content: center; gap: 44px; position: relative; margin-bottom: 20px; }
        .rocket-launchpad { position: relative; width: 120px; height: 240px; flex-shrink: 0; }
        .rocket-track { position: absolute; left: 50%; top: 20px; bottom: 20px; width: 3px; margin-left: -1.5px; background: #f0eee9; border-radius: 3px; }
        .rocket-track-fill { position: absolute; bottom: 0; left: 0; width: 100%; border-radius: 3px; transition: height 1.8s cubic-bezier(0.22,1,0.36,1); }
        .rocket-marker { position: absolute; left: -16px; width: 35px; height: 1px; background: rgba(26,26,46,0.06); }
        .rocket-marker-label { position: absolute; left: -38px; top: -7px; font-family: var(--font-mono); font-size: 0.55rem; color: #9a9ab0; font-weight: 700; }
        .rocket-ship { position: absolute; left: 50%; bottom: 0; transform: translateX(-50%) translateY(10px); transition: bottom 1.8s cubic-bezier(0.22,1,0.36,1); z-index: 3; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.12)); }
        
        .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .kpi { background: white; border: 1px solid rgba(26,26,46,0.06); border-radius: 18px; padding: 18px 20px; box-shadow: 0 2px 20px rgba(26,26,46,0.05); position: relative; overflow: hidden; animation: cardUp 0.5s cubic-bezier(0.22,1,0.36,1) both; transition: transform 0.2s, box-shadow 0.2s; }
        .kpi:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(26,26,46,0.09); }
        .kpi-val { font-family: var(--font-bricolage); font-weight: 800; font-size: 1.7rem; letter-spacing: -0.02em; line-height: 1; }
        .kpi-label { font-size: 0.75rem; color: #5a5a72; margin-top: 4px; font-weight: 500; }
        .kpi-detail { font-size: 0.7rem; color: #9a9ab0; margin-top: 6px; font-weight: 500; line-height: 1.5; }
        
        .lo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px; }
        .lo-card { background: white; border: 1px solid rgba(26,26,46,0.06); border-radius: 12px; padding: 18px 20px; box-shadow: 0 2px 20px rgba(26,26,46,0.05); animation: cardUp 0.5s both; transition: transform 0.2s, box-shadow 0.2s; }
        .lo-card:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(26,26,46,0.08); }
        .lo-status-badge { font-size: 0.68rem; padding: 3px 10px; border-radius: 20px; font-weight: 700; white-space: nowrap; }
        .lo-status-badge.mastered { background: rgba(46,204,135,0.1); color: #2ecc87; }
        .lo-status-badge.developing { background: rgba(255,197,61,0.12); color: #b8860b; }
        .lo-status-badge.needs-work { background: rgba(244,104,83,0.08); color: #f46853; }
        
        .student-table { width: 100%; border-collapse: separate; border-spacing: 0 5px; font-size: 0.88rem; }
        .student-table th { text-align: left; font-size: 0.72rem; font-weight: 700; color: #9a9ab0; text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 12px; cursor: default; user-select: none; }
        .student-table td { padding: 11px 12px; background: #f5f3f0; border: none; vertical-align: middle; }
        .student-table tr td:first-child { border-radius: 10px 0 0 10px; }
        .student-table tr td:last-child { border-radius: 0 10px 10px 0; }
        .student-table tbody tr { transition: transform 0.15s; }
        .student-table tbody tr:hover { transform: scale(1.005); }
        .student-table tbody tr:hover td { background: rgba(58,92,204,0.04); }
        
        .q-num-cell { font-family: var(--font-mono); font-weight: 700; font-size: 0.82rem; width: 30px; height: 30px; display: grid; place-items: center; border-radius: 8px; background: white; }
        .diff-badge { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 4px 12px; border-radius: 14px; white-space: nowrap; }
        .diff-badge.easy { background: rgba(46,204,135,0.1); color: #2ecc87; }
        .diff-badge.medium { background: rgba(255,197,61,0.12); color: #b8860b; }
        .diff-badge.hard { background: rgba(244,104,83,0.08); color: #f46853; }
        
        .particle { position: absolute; border-radius: 50%; animation: floatUp linear infinite; opacity: 0; pointer-events: none; }
        
        @media(max-width: 900px) { .kpi-strip { grid-template-columns: repeat(2, 1fr); } }
        @media(max-width: 700px) { .rocket-score { flex-direction: column; gap: 16px; } .kpi-strip { grid-template-columns: 1fr 1fr; } }
      `,
        }}
      />

      {showParticles && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                width: `${Math.random() * 4 + 2}px`,
                height: `${Math.random() * 4 + 2}px`,
                left: `${Math.random() * 100}%`,
                background: [
                  "#3a5ccc",
                  "#f46853",
                  "#7c5cfc",
                  "#ffc53d",
                  "#2ecc87",
                ][Math.floor(Math.random() * 5)],
                animationDuration: `${Math.random() * 14 + 12}s`,
                animationDelay: `${Math.random() * 10}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Hero Section */}
      <div className="result-hero">
        <span className="result-emoji">{hero.emoji}</span>
        <div className="result-greeting">{hero.greeting}</div>
        <div className="result-title">{hero.subtitle}</div>

        <div className="rocket-score">
          <div className="rocket-launchpad">
            <div className="rocket-track">
              {[25, 50, 75, 100].map((m) => (
                <div
                  key={m}
                  className="rocket-marker"
                  style={{ bottom: `${m}%` }}
                >
                  <span className="rocket-marker-label">
                    {m}
                    {m === 100 ? "" : "%"}
                  </span>
                </div>
              ))}
              <div
                className="rocket-track-fill"
                style={{
                  height: `${rocketBottom}%`,
                  background: `linear-gradient(to top, ${accentColor}, ${accentColor}44)`,
                }}
              />
            </div>

            <svg
              className="rocket-ship"
              style={{ bottom: `${(rocketBottom / 100) * 200}px` }}
              width="40"
              height="56"
              viewBox="0 0 40 56"
            >
              <defs>
                <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e8e4dc" />
                  <stop offset="100%" stopColor="#d4d0c8" />
                </linearGradient>
              </defs>
              <path d="M8,40 L4,52 L14,44 Z" fill={accentColor} opacity=".8" />
              <path
                d="M32,40 L36,52 L26,44 Z"
                fill={accentColor}
                opacity=".8"
              />
              <rect
                x="12"
                y="14"
                width="16"
                height="32"
                rx="3"
                fill="url(#bodyGrad)"
                stroke="#c4bfb4"
                strokeWidth="1"
              />
              <path d="M12,14 Q12,2 20,0 Q28,2 28,14 Z" fill={accentColor} />
              <circle
                cx="20"
                cy="24"
                r="4.5"
                fill="#3a5ccc"
                stroke="#2d4db3"
                strokeWidth="1"
              />
              <circle
                cx="18.5"
                cy="22.5"
                r="1.2"
                fill="rgba(255,255,255,0.5)"
              />
              <rect
                x="12"
                y="36"
                width="16"
                height="3"
                fill={accentColor}
                opacity=".3"
              />
            </svg>

            {/* Stars */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({
                length: Math.max(3, Math.floor(roundedScore / 10)),
              }).map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-[#ffc53d] opacity-0"
                  style={{
                    width: `${Math.random() * 3 + 2}px`,
                    height: `${Math.random() * 3 + 2}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 70}%`,
                    animation: `starTwinkle 1.5s ease both ${Math.random() * 1.2 + 0.6}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="text-left">
            <div
              className="font-bricolage font-extrabold text-[4rem] leading-none tracking-tighter"
              style={{ color: accentColor }}
            >
              {countScore}
            </div>
            <div className="font-mono text-[1.1rem] text-[#9a9ab0] font-bold mt-1">
              out of {totalBasePoints}
            </div>
            <div
              className="font-mono text-[0.85rem] font-bold mt-[10px] px-3.5 py-[5px] rounded-[20px] inline-block"
              style={{ background: pctBg, color: pctColor }}
            >
              {countPct}%
            </div>
            <div className="text-[0.72rem] text-[#9a9ab0] font-semibold mt-2">
              {hero.altitude}
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 flex-wrap">
          <span className="text-[0.78rem] text-[#5a5a72] font-semibold flex items-center gap-1.5 bg-[#f0eee9] px-3.5 py-1.5 rounded-full transition-transform hover:scale-105">
            👤 {studentName}
          </span>
          <span className="text-[0.78rem] text-[#5a5a72] font-semibold flex items-center gap-1.5 bg-[#f0eee9] px-3.5 py-1.5 rounded-full transition-transform hover:scale-105">
            ✅ {correctCount}/{totalQuestions} Correct
          </span>
          <span className="text-[0.78rem] text-[#5a5a72] font-semibold flex items-center gap-1.5 bg-[#f0eee9] px-3.5 py-1.5 rounded-full transition-transform hover:scale-105">
            ⏱ {formatCompactDuration(totalTimeTakenMs)} Total
          </span>
          <span className="text-[0.78rem] text-[#5a5a72] font-semibold flex items-center gap-1.5 bg-[#f0eee9] px-3.5 py-1.5 rounded-full transition-transform hover:scale-105">
            📝 {report.topic}
          </span>
        </div>
      </div>

      {/* KPI Section */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="w-10 h-10 rounded-[12px] grid place-items-center text-[1.1rem] mb-[10px] bg-[rgba(58,92,204,0.08)] text-[#3a5ccc]">
            📊
          </div>
          <div className="kpi-val">{roundedScore}%</div>
          <div className="kpi-label">Adjusted Score</div>
          <div className="kpi-detail">
            {Math.round(totalFinalPoints)} out of {totalBasePoints} points
          </div>
        </div>
        <div className="kpi">
          <div className="w-10 h-10 rounded-[12px] grid place-items-center text-[1.1rem] mb-[10px] bg-[rgba(244,104,83,0.08)] text-[#f46853]">
            ⏱️
          </div>
          <div className="kpi-val">{penaltyCount}</div>
          <div className="kpi-label">Time Penalties</div>
          <div className="kpi-detail">
            −{totalPenaltyPoints.toFixed(1)} pts deducted for slow answers
          </div>
        </div>
        <div className="kpi">
          <div className="w-10 h-10 rounded-[12px] grid place-items-center text-[1.1rem] mb-[10px] bg-[rgba(124,92,252,0.08)] text-[#7c5cfc]">
            ⚡
          </div>
          <div className="kpi-val">{rapidCount}</div>
          <div className="kpi-label">Rapid Answers</div>
          <div className="kpi-detail">Answered in under 2s (flagged)</div>
        </div>
        <div className="kpi">
          <div className="w-10 h-10 rounded-[12px] grid place-items-center text-[1.1rem] mb-[10px] bg-[rgba(46,204,135,0.08)] text-[#2ecc87]">
            ⏳
          </div>
          <div className="kpi-val">{formatDuration(avgTimeTakenMs)}</div>
          <div className="kpi-label">Avg Time / Question</div>
          <div className="kpi-detail">
            {formatCompactDuration(totalTimeTakenMs)} total test time
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

      {/* Detailed Table */}
      <div className="dash-card">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="font-bricolage font-bold text-[0.95rem] flex items-center gap-2">
              📋 Question-by-Question Breakdown
            </div>
            <div className="text-[0.72rem] text-[#9a9ab0] font-medium">
              Detailed analysis with time-adjusted scoring
            </div>
          </div>
          <button
            onClick={() => setShowMethodology(true)}
            className="px-[18px] py-[7px] rounded-full font-bold text-[0.78rem] border border-[rgba(124,92,252,0.2)] bg-[rgba(124,92,252,0.06)] text-[#7c5cfc] transition-all hover:bg-[rgba(124,92,252,0.12)] hover:-translate-y-px flex items-center gap-1.5"
          >
            🔬 Methodology
          </button>
        </div>
        <div className="px-5 pb-5">
          <div className="overflow-x-auto">
            <table className="student-table min-w-[1100px] whitespace-nowrap">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Difficulty</th>
                  <th>Your Ans</th>
                  <th>Correct Ans</th>
                  <th>Result</th>
                  <th>Time Taken</th>
                  <th>Time Limit</th>
                  <th>Base</th>
                  <th>Final</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {results.map((record, index) => {
                  const difficulty = normalizeDifficultyLevel(
                    record.question.difficultyLevel,
                  );
                  const timeLimitMs = getQuestionTimeLimitMs(difficulty);
                  const isCorrect = record.verdict === "correct";
                  const isOverTime = (record.timeTakenMs ?? 0) > timeLimitMs;
                  const isRapid =
                    (record.timeTakenMs ?? 0) > 0 &&
                    (record.timeTakenMs ?? 0) < RAPID_RESPONSE_THRESHOLD_MS;
                  const finalPoints = getQuestionFinalPoints(record);
                  const basePoints = getQuestionBasePoints(difficulty);
                  const penaltyApplied = isCorrect && isOverTime;

                  const scoreColor =
                    finalPoints === 0
                      ? "#f46853"
                      : penaltyApplied
                        ? "#ff9a3c"
                        : "#2ecc87";

                  return (
                    <tr key={record.question.id}>
                      <td>
                        <div className="q-num-cell">{index + 1}</div>
                      </td>
                      <td>
                        <span className={`diff-badge ${difficulty}`}>
                          {difficulty}
                        </span>
                      </td>
                      <td className="max-w-[200px]">
                        <span
                          className={`font-mono font-bold text-[0.85rem] block truncate ${isCorrect ? "text-[#2ecc87]" : "text-[#f46853]"}`}
                          title={formatAnswerSummary(
                            record.question as QuestionDisplayData,
                            record.studentAnswer,
                          )}
                        >
                          {formatAnswerSummary(
                            record.question as QuestionDisplayData,
                            record.studentAnswer,
                          )}
                        </span>
                      </td>
                      <td className="max-w-[200px]">
                        <span
                          className="font-mono font-bold text-[0.85rem] text-[#2ecc87] block truncate"
                          title={getCorrectAnswerSummary(
                            record.question as QuestionDisplayData,
                          )}
                        >
                          {getCorrectAnswerSummary(
                            record.question as QuestionDisplayData,
                          )}
                        </span>
                      </td>
                      <td className="font-bold text-[1.05rem]">
                        {isCorrect ? "✓" : "✗"}
                      </td>
                      <td>
                        <span
                          className={`font-mono text-[0.82rem] font-bold ${isOverTime ? "text-[#f46853]" : "text-[#5a5a72]"}`}
                        >
                          {formatDuration(record.timeTakenMs)}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-[0.82rem] font-bold text-[#5a5a72]">
                          {formatDuration(timeLimitMs)}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-[0.88rem] font-bold text-[#5a5a72]">
                          {basePoints}
                        </span>
                      </td>
                      <td>
                        <span
                          className="font-mono text-[0.88rem] font-bold"
                          style={{ color: scoreColor }}
                        >
                          {formatPoints(finalPoints)}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1.5 flex-nowrap">
                          {isRapid && (
                            <span className="text-[0.68rem] font-bold px-2.5 py-1 rounded-full bg-[rgba(124,92,252,0.1)] text-[#7c5cfc]">
                              ⚡ Rapid
                            </span>
                          )}
                          {penaltyApplied && (
                            <span className="text-[0.68rem] font-bold px-2.5 py-1 rounded-full bg-[rgba(244,104,83,0.08)] text-[#f46853]">
                              −10%
                            </span>
                          )}
                          {isCorrect && !isOverTime && !isRapid && (
                            <span className="text-[0.68rem] font-bold px-2.5 py-1 rounded-full bg-[rgba(46,204,135,0.08)] text-[#2ecc87]">
                              ✓ Clean
                            </span>
                          )}
                          {!isCorrect && !isRapid && "—"}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr
                  className="font-bold"
                  style={{ background: "rgba(58,92,204,0.05)" }}
                >
                  <td
                    colSpan={6}
                    className="text-right py-4 font-bricolage text-[0.92rem]"
                  >
                    Total
                  </td>
                  <td className="font-mono text-[0.82rem]">
                    {formatCompactDuration(totalTimeTakenMs)}
                  </td>
                  <td></td>
                  <td className="font-mono text-[0.88rem]">
                    {totalBasePoints}
                  </td>
                  <td className="font-mono text-[0.95rem] text-[#3a5ccc]">
                    {Math.round(totalFinalPoints)}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2.5 mt-3.5 pt-3.5 border-t border-[rgba(26,26,46,0.06)]">
            <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-[#5a5a72]">
              <span className="w-2.5 h-2.5 rounded-[4px] bg-[#2ecc87]"></span>{" "}
              Correct — full score
            </span>
            <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-[#5a5a72]">
              <span className="w-2.5 h-2.5 rounded-[4px] bg-[#ff9a3c]"></span>{" "}
              Time Penalty — 10% deducted
            </span>
            <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-[#5a5a72]">
              <span className="w-2.5 h-2.5 rounded-[4px] bg-[#f46853]"></span>{" "}
              Incorrect — 0 score
            </span>
            <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-[#5a5a72]">
              <span className="w-2.5 h-2.5 rounded-[4px] bg-[#7c5cfc]"></span>{" "}
              ⚡ Rapid — under 2s (flagged, no penalty)
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-10 py-4 font-sans text-[16px] font-bold text-white transition-all duration-300 bg-[linear-gradient(135deg,#3a5ccc,#7c5cfc)] rounded-full shadow-[0_8px_24px_rgba(58,92,204,0.25)] hover:-translate-y-1.5 hover:shadow-[0_12px_36px_rgba(58,92,204,0.35)]"
        >
          <RotateCcw className="h-4 w-4" />
          Run New Diagnostic
        </button>
      </div>

      {/* Methodology Modal */}
      {showMethodology && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[rgba(26,26,46,0.35)] backdrop-blur-[4px] animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMethodology(false);
          }}
        >
          <div className="bg-white rounded-[18px] max-w-[620px] w-full max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(26,26,46,0.18)] animate-in zoom-in-95 duration-300">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[rgba(26,26,46,0.06)] bg-white p-6">
              <h3 className="font-bricolage text-[1.05rem] font-bold flex items-center gap-2">
                🔬 Scoring Methodology
              </h3>
              <button
                onClick={() => setShowMethodology(false)}
                className="w-8 h-8 rounded-full border border-[rgba(26,26,46,0.06)] bg-white flex items-center justify-center text-[0.9rem] text-[#5a5a72] transition-colors hover:bg-[#f5f3f0]"
              >
                ✕
              </button>
            </div>
            <div className="p-6 pt-0 space-y-6">
              <p className="text-[0.84rem] text-[#5a5a72] leading-relaxed mt-4">
                Your diagnostic score isn&apos;t just about right or wrong — it
                factors in <strong>how quickly</strong> you answer, because
                speed reflects confidence and fluency with the material.
              </p>

              <div>
                <h4 className="font-bricolage font-bold text-[0.9rem] mb-2 flex items-center gap-1.5">
                  📐 Base Scoring
                </h4>
                <p className="text-[0.84rem] text-[#5a5a72] leading-relaxed mb-3">
                  Each question carries a base score weighted by difficulty.
                  Harder questions reward more points because they test deeper
                  understanding.
                </p>
                <div className="border border-[rgba(26,26,46,0.06)] rounded-xl overflow-hidden">
                  <table className="w-full text-[0.82rem] border-collapse">
                    <thead className="bg-[#f5f3f0] border-b border-[rgba(26,26,46,0.06)]">
                      <tr>
                        <th className="text-left px-3 py-2 font-bold text-[#9a9ab0] uppercase tracking-wider text-[0.7rem]">
                          Difficulty
                        </th>
                        <th className="text-left px-3 py-2 font-bold text-[#9a9ab0] uppercase tracking-wider text-[0.7rem]">
                          Base Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(26,26,46,0.06)]">
                      <tr>
                        <td className="px-3 py-2">
                          <span className="diff-badge easy">Easy</span>
                        </td>
                        <td className="px-3 py-2 font-bold">2 pts</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">
                          <span className="diff-badge medium">Medium</span>
                        </td>
                        <td className="px-3 py-2 font-bold">3 pts</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">
                          <span className="diff-badge hard">Hard</span>
                        </td>
                        <td className="px-3 py-2 font-bold">5 pts</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-bricolage font-bold text-[0.9rem] mb-2 flex items-center gap-1.5">
                  ⏱️ Time Thresholds & Penalty
                </h4>
                <p className="text-[0.84rem] text-[#5a5a72] leading-relaxed mb-3">
                  Each difficulty level has a maximum expected response time. If
                  you take longer than the threshold, a{" "}
                  <strong>10% penalty</strong> is applied to your base score.
                </p>
                <div className="border border-[rgba(26,26,46,0.06)] rounded-xl overflow-hidden">
                  <table className="w-full text-[0.82rem] border-collapse">
                    <thead className="bg-[#f5f3f0] border-b border-[rgba(26,26,46,0.06)]">
                      <tr>
                        <th className="text-left px-3 py-2 font-bold text-[#9a9ab0] uppercase tracking-wider text-[0.7rem]">
                          Difficulty
                        </th>
                        <th className="text-left px-3 py-2 font-bold text-[#9a9ab0] uppercase tracking-wider text-[0.7rem]">
                          Time Limit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(26,26,46,0.06)]">
                      <tr>
                        <td className="px-3 py-2">Easy</td>
                        <td className="px-3 py-2 font-bold">45 seconds</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">Medium</td>
                        <td className="px-3 py-2 font-bold">55 seconds</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">Hard</td>
                        <td className="px-3 py-2 font-bold">70 seconds</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[rgba(58,92,204,0.04)] border border-[rgba(58,92,204,0.1)] text-[0.82rem] text-[#5a5a72] leading-relaxed">
                <strong className="text-[#3a5ccc]">💡 Why time matters:</strong>{" "}
                Two students answering identically can get different scores. A
                student who answers correctly but slowly may be less fluent —
                the time penalty captures this nuance.
              </div>

              <div className="pb-4">
                <h4 className="font-bricolage font-bold text-[0.9rem] mb-2">
                  🧮 Final Score Calculation
                </h4>
                <div className="p-4 rounded-xl bg-[#f5f3f0] font-mono text-[0.78rem] font-bold">
                  Final = Base Score × (1 − Penalty)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SetupForm({
  form,
  setForm,
  quizCatalog,
  defaultTopicEntry,
  onStart,
  isBusy,
}: {
  form: CreateSessionInput;
  setForm: React.Dispatch<React.SetStateAction<CreateSessionInput>>;
  quizCatalog: DemoQuizCatalog;
  defaultTopicEntry: DemoQuizCatalogEntry | null;
  onStart: () => void;
  isBusy: boolean;
}) {
  const defaultEntry = defaultTopicEntry ?? getDefaultCatalogEntry(quizCatalog);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(() => {
    return form.topic || defaultEntry?.topic || null;
  });
  const [activeTab, setActiveTab] = useState<string>("class6");

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

        {/* Icon + title */}
        <div className="mb-1 flex justify-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(58,92,204,0.06)]">
            <FlaskConical className="h-7 w-7 text-[#3a5ccc]" />
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
            15 questions
          </span>
          <span className="rounded-full bg-[rgba(58,92,204,0.08)] px-5 py-2 font-mono text-[12px] font-bold uppercase text-[#3a5ccc]">
            {classLabel(form.classLevel)}
          </span>
        </div>

        {/* Learning objectives */}
        {selectedEntry?.learningObjectives.length ? (
          <div className="mb-5 text-left">
            <div className="mb-2 font-sans text-[10px] font-bold uppercase tracking-wider text-[#8a8aa0]">
              Learning objectives
            </div>
            <div className="rounded-[14px] border border-[rgba(26,26,46,0.06)] bg-[#faf8f5] overflow-hidden">
              {selectedEntry.learningObjectives.map((lo, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 px-4 py-2.5 ${idx !== selectedEntry.learningObjectives.length - 1 ? "border-b border-[rgba(26,26,46,0.04)]" : ""}`}
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(58,92,204,0.1)] font-mono text-[10px] font-bold text-[#3a5ccc]">
                    {idx + 1}
                  </div>
                  <span className="font-sans text-[12px] font-medium text-[#1a1a2e]">
                    {lo}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

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

export function DiagnosticDemo({
  quizCatalog,
  defaultTopicEntry,
}: {
  quizCatalog: DemoQuizCatalog;
  defaultTopicEntry: DemoQuizCatalogEntry | null;
}) {
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
  const [remaining, setRemaining] = useState<number | null>(null);
  const [quizRemaining, setQuizRemaining] = useState<number | null>(null);
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
    questionStartedAtRef.current = Date.now();
    setCurrentIndex(nextIndex);
    setCurrentAnswer(nextAnswers[activeQuiz.questions[nextIndex].id] ?? "");
  };

  useEffect(() => {
    if (!currentQuestion) {
      setRemaining(null);
      return;
    }
    advanceLockRef.current = false;
    questionStartedAtRef.current = Date.now();
    const deadline = Date.now() + currentQuestionTimeLimitMs;

    const tick = () => {
      const nextRemaining = Math.max(
        0,
        Math.ceil((deadline - Date.now()) / 1000),
      );
      setRemaining(nextRemaining);
      if (nextRemaining <= 0) {
        clearInterval(id);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => clearInterval(id);
  }, [currentQuestion, currentQuestionTimeLimitMs]);

  const QUIZ_TOTAL_SECONDS = 10 * 60;
  useEffect(() => {
    if (!quiz) {
      setQuizRemaining(null);
      return;
    }
    const deadline = Date.now() + QUIZ_TOTAL_SECONDS * 1000;
    setQuizRemaining(QUIZ_TOTAL_SECONDS);
    const tick = () => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setQuizRemaining(next);
      if (next <= 0) {
        clearInterval(id);
        finalizeQuiz(answersRef.current, responseMetaRef.current);
      }
    };
    const id = window.setInterval(tick, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz]);

  const startQuizRun = () => {
    setPendingAction("load");
    startTransition(() => {
      void (async () => {
        try {
          setError(null);
          const loadedQuiz = await loadQuiz(form);
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
    setQuiz(null);
    setReport(null);
    setCurrentIndex(0);
    setCurrentAnswer("");
    setAnswers({});
    setResponseMeta({});
    setRemaining(null);
    setQuizRemaining(null);
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
  const maxHeight = 120;
  const liquidHeight = quiz
    ? (answeredCount / quiz.questions.length) * maxHeight
    : 0;
  const yPos = 140 - liquidHeight;
  const currentQuestionLimitSeconds = Math.max(
    1,
    Math.round(currentQuestionTimeLimitMs / 1000),
  );

  const formatTime = (secs: number | null) => {
    if (secs == null) return "00:00";
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className={THEME.page} style={{ backgroundImage: AMBIENT_BG }}>
      <div className="mx-auto max-w-[1480px] px-6 py-4 sm:px-10">
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

        {!quiz && !report && (
          <SetupForm
            form={form}
            setForm={setForm}
            quizCatalog={quizCatalog}
            defaultTopicEntry={defaultTopicEntry}
            onStart={startQuizRun}
            isBusy={isBusy}
          />
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

              <div className="flex shrink-0 flex-col items-end gap-1">
                <div
                  className={`flex items-center gap-2 rounded-full px-4 py-2 shadow-inner ${quizRemaining !== null && quizRemaining < 60 ? "bg-[#f46853]/10" : "bg-[#f5f3f0]"}`}
                >
                  <Clock
                    className={`h-4 w-4 ${quizRemaining !== null && quizRemaining < 60 ? "text-[#f46853] animate-pulse" : "text-[#3a5ccc]"}`}
                  />
                  <span
                    className={`font-mono text-[16px] font-bold ${quizRemaining !== null && quizRemaining < 60 ? "text-[#f46853]" : "text-[#1a1a2e]"}`}
                  >
                    {formatTime(quizRemaining)}
                  </span>
                </div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a8aa0]">
                  10 min limit
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
                  <div className="absolute top-0 right-0 p-5">
                    <div className="font-mono text-[32px] font-extrabold text-[#f5f3f0] leading-none select-none">
                      {String(currentIndex + 1).padStart(2, "0")}
                    </div>
                  </div>

                  <div className="relative z-10">
                    <div className="mb-6 flex flex-wrap gap-2">
                      <div className="rounded-full bg-[rgba(58,92,204,0.08)] px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-[#3a5ccc]">
                        {formatLearningObjectiveLabel(
                          currentQuestion.learningObjective,
                        )}
                      </div>
                      <div className="rounded-full bg-[rgba(255,154,60,0.08)] px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-[#ff9a3c]">
                        {formatQuestionTypeLabel(currentQuestion.questionType)}
                      </div>
                      <div className="rounded-full bg-[rgba(26,26,46,0.05)] px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-[#8a8aa0]">
                        {normalizeDifficultyLevel(
                          currentQuestion.difficultyLevel,
                        )}
                      </div>
                      <div className="rounded-full bg-[rgba(46,204,135,0.08)] px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-[#2ecc87]">
                        {formatTime(currentQuestionLimitSeconds)}
                      </div>
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

                    <h3 className="mb-5 max-w-2xl font-bricolage text-[19px] font-bold leading-tight text-[#1a1a2e] sm:text-[21px]">
                      {currentQuestion.question}
                    </h3>

                    <QuestionInput
                      question={currentQuestion}
                      answer={currentAnswer}
                      setAnswer={setCurrentAnswer}
                    />

                    <div className="mt-6 flex items-center justify-between border-t border-[rgba(26,26,46,0.06)] pt-5">
                      <button
                        className="flex h-10 items-center gap-2 rounded-full border border-[rgba(26,26,46,0.1)] bg-white px-6 font-sans text-[13px] font-bold text-[#5a5a72] transition-all hover:bg-[#f5f3f0]"
                        onClick={() => advanceRef.current("")}
                        disabled={isBusy}
                      >
                        Skip Question
                      </button>
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
                {/* Progress Visualization */}
                <div
                  className={`bg-white p-6 text-center border border-[rgba(26,26,46,0.06)] shadow-sm ${THEME.rounded}`}
                >
                  <h4 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a8aa0]">
                    Test Quality
                  </h4>
                  <p className="mb-6 font-sans text-[12px] font-semibold leading-relaxed text-[#5a5a72]">
                    Timing and answer density are tracked to spot rushed,
                    stalled, or patterned responses.
                  </p>
                  <div className="relative mx-auto w-[80px]">
                    <svg className="h-[120px] w-[80px]" viewBox="0 0 100 150">
                      <defs>
                        <clipPath id="beakerClip">
                          <path d="M20,10 L20,130 Q20,145 35,145 L65,145 Q80,145 80,130 L80,10 Z" />
                        </clipPath>
                      </defs>
                      <path
                        d="M20,10 L20,130 Q20,145 35,145 L65,145 Q80,145 80,130 L80,10"
                        fill="none"
                        stroke="rgba(26,26,46,0.1)"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <line
                        x1="15"
                        y1="10"
                        x2="85"
                        y2="10"
                        stroke="rgba(26,26,46,0.1)"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <g clipPath="url(#beakerClip)">
                        <rect
                          className="transition-all duration-700 ease-out"
                          x="20"
                          y={yPos}
                          width="60"
                          height={liquidHeight}
                          fill="#3a5ccc"
                        />
                        <path
                          d={`M20,${yPos} Q35,${yPos - 4} 50,${yPos} Q65,${yPos + 4} 80,${yPos} L80,${yPos + liquidHeight + 10} L20,${yPos + liquidHeight + 10} Z`}
                          fill="#7c5cfc"
                          opacity=".4"
                          className="transition-all duration-700 ease-out"
                        />
                      </g>
                    </svg>
                  </div>
                  <div className="mt-4 font-bricolage text-[28px] font-extrabold text-[#3a5ccc]">
                    {pctComplete}%
                  </div>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#8a8aa0]">
                    In-Progress Coverage
                  </span>
                </div>

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
                              ? `Done · ${formatQuestionTypeLabel(q.questionType)} · ${normalizeDifficultyLevel(q.difficultyLevel)}`
                              : isSkipped
                                ? `Skipped${wasSkipped ? " (timed out)" : ""} · ${formatQuestionTypeLabel(q.questionType)} · ${normalizeDifficultyLevel(q.difficultyLevel)}`
                                : `Not reached · ${formatQuestionTypeLabel(q.questionType)} · ${normalizeDifficultyLevel(q.difficultyLevel)}`
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
