"use client";

import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { DiagnosticReport } from "../agents/diagnostic/types/index";
import type {
  CreateSessionInput,
  DemoLoadedQuiz,
  DemoQuizCatalog,
  DemoQuizCatalogEntry,
} from "../lib/demo-types";
import {
  AIChatBubble,
  buildDefaultForm,
  classLabel,
  classNum,
  getAnswerMap,
  getCatalogEntryForClass,
  getEstimatedTestTimeLabel,
  getQuestionTimeLimitMs,
  loadQuiz,
  loadRecurringQuiz,
  QuestionInput,
  ResultTabs,
  submitQuiz,
  TOAST_CONFIGS,
  TOAST_TRIGGERS,
  toErrorMessage,
  toRomanNumeral,
  buildRandomAnswer,
  buildRandomQuizSubmission,
} from "./diagnostic-demo";
import { MultiStageLoadingScreen } from "./loading-screen";

const PLACEMENT_EXCLUDED_CLASS_LEVELS = new Set([
  "classKG",
  "class1",
  "class2",
]);

type PlacementScreen = "student-info" | "grade-start";

type StudentSetup = {
  studentId: string;
  classLevel: CreateSessionInput["classLevel"];
};

const PLACEMENT_3D_CARD_STYLE = {
  border: "2px solid rgba(46,196,182,0.25)",
  boxShadow: "0 6px 0 rgba(46,196,182,0.18), 0 4px 14px rgba(26,26,46,0.06)",
} as const;

const PLACEMENT_BUTTON_3D =
  "shadow-[0_6px_0_#C68213] hover:translate-y-0.5 hover:shadow-[0_3px_0_#C68213] active:translate-y-1 active:shadow-[0_0_0_#C68213] disabled:translate-y-0 disabled:shadow-[0_6px_0_#C68213]";

// ─── Placement Student Info Screen ────────────────────────────────────────────
function PlacementStudentInfoScreen({
  setup,
  classLevels,
  onChange,
  onContinue,
}: {
  setup: StudentSetup;
  classLevels: CreateSessionInput["classLevel"][];
  onChange: (setup: StudentSetup) => void;
  onContinue: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-160px)] max-w-[760px] flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 sm:block sm:min-h-0">
      <div className="mb-8 text-center">
        <h2 className="text-[24px] font-extrabold tracking-tight text-[#1B4A4A] sm:text-[32px]">
          Student details
        </h2>
        <p className="mx-auto mt-2 max-w-[520px] text-[15px] leading-relaxed text-[#6B7280] sm:text-[16px]">
          Add the student name and grade before starting the placement test.
        </p>
      </div>

      <div
        className="rounded-[20px] bg-white p-5 sm:p-8"
        style={PLACEMENT_3D_CARD_STYLE}
      >
        <div className="grid gap-5">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">
              <UserRound className="h-4 w-4 text-[#2EC4B6]" />
              Student name
            </span>
            <input
              type="text"
              value={setup.studentId}
              onChange={(event) =>
                onChange({ ...setup, studentId: event.target.value })
              }
              placeholder="Enter student name"
              className="h-12 w-full rounded-[14px] border border-gray-200 bg-[#F8F9FA] px-4 text-[16px] font-semibold text-[#1a1a1a] outline-none transition-all placeholder:text-[#9CA3AF] focus:border-[#2EC4B6] focus:bg-white focus:ring-4 focus:ring-[#2EC4B6]/10"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">
              <GraduationCap className="h-4 w-4 text-[#F5A623]" />
              Grade
            </span>
            <div className="relative">
              <select
                value={setup.classLevel}
                onChange={(event) =>
                  onChange({
                    ...setup,
                    classLevel: event.target
                      .value as CreateSessionInput["classLevel"],
                  })
                }
                className="h-12 w-full appearance-none rounded-[14px] border border-gray-200 bg-[#F8F9FA] px-4 pr-11 text-[16px] font-semibold text-[#1a1a1a] outline-none transition-all focus:border-[#F5A623] focus:bg-white focus:ring-4 focus:ring-[#F5A623]/10"
              >
                {classLevels.map((classLevel) => (
                  <option key={classLevel} value={classLevel}>
                    {classLabel(classLevel)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            </div>
          </label>
        </div>

        <button
          type="button"
          onClick={onContinue}
          className={`mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-[#F5A623] py-4 font-bold text-[16px] text-white transition-all hover:bg-[#E0941A] disabled:opacity-50 ${PLACEMENT_BUTTON_3D}`}
        >
          Start Placement Test
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Placement Grade Start Screen ─────────────────────────────────────────────
function PlacementGradeStartScreen({
  classLevel,
  subject,
  onBegin,
  onBack,
  isBusy,
}: {
  classLevel: string;
  subject: string;
  onBegin: () => void;
  onBack: () => void;
  isBusy: boolean;
}) {
  const questionCount = 20;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-160px)] max-w-[680px] flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 sm:block sm:min-h-0">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[13px] font-medium text-[#6B7280] transition-colors hover:text-[#1a1a1a]"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <div
        className="rounded-[20px] bg-white p-5 sm:p-8"
        style={PLACEMENT_3D_CARD_STYLE}
      >
        <div className="mb-3 inline-block rounded-full bg-[#FFF8E7] px-3 py-1 font-mono text-[11px] font-bold tracking-wider text-[#1B4A4A]">
          PLACEMENT TEST
        </div>

        <h2 className="mb-2 text-[24px] font-extrabold tracking-tight text-[#1B4A4A] sm:text-[30px]">
          Grade {classNum(classLevel)} {subject}
        </h2>
        <p className="mb-6 text-[14px] leading-relaxed text-[#6B7280]">
          Answer each question carefully. The test is designed to estimate
          readiness across the grade.
        </p>

        <div className="mb-6 rounded-[14px] border border-[#2EC4B6]/30 bg-[#E6F8F6]/50 p-4 flex gap-3 items-start">
          <Sparkles className="h-5 w-5 shrink-0 text-[#2EC4B6] mt-0.5" />
          <div className="text-[13px] sm:text-[14px] leading-relaxed text-[#1B4A4A] font-semibold">
            This short test covers the 3 core math areas and mixes in questions
            from the previous grade so you&apos;ll know if your child is truly
            ready for what&apos;s ahead, or quietly missing something from
            before.
          </div>
        </div>

        <div className="mb-7 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Questions", value: String(questionCount) },
            {
              label: "Estimated time",
              value: getEstimatedTestTimeLabel(questionCount),
            },
            { label: "Grade", value: `Grade ${classNum(classLevel)}` },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[14px] border border-gray-100 bg-[#F8F9FA] p-4"
            >
              <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                {item.label}
              </div>
              <div className="mt-1 text-[18px] font-extrabold text-[#1B4A4A]">
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onBegin}
          disabled={isBusy}
          className={`flex w-full items-center justify-center gap-3 rounded-full bg-[#F5A623] py-4 font-bold text-[17px] text-white transition-all hover:bg-[#E0941A] disabled:opacity-60 ${PLACEMENT_BUTTON_3D}`}
        >
          {isBusy ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Preparing…
            </>
          ) : (
            "Begin Test"
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Placement Demo Component ─────────────────────────────────────────────
export function PlacementDemo({
  quizCatalog,
}: {
  quizCatalog: DemoQuizCatalog;
}) {
  const visibleQuizCatalog = useMemo(
    () => ({
      entries: quizCatalog.entries.filter(
        (entry) => !PLACEMENT_EXCLUDED_CLASS_LEVELS.has(entry.classLevel),
      ),
    }),
    [quizCatalog.entries],
  );

  const initialClassLevel = (visibleQuizCatalog.entries[0]?.classLevel ??
    "class6") as CreateSessionInput["classLevel"];

  const [appScreen, setAppScreen] = useState<PlacementScreen>("student-info");
  const [studentSetup, setStudentSetup] = useState<StudentSetup>({
    studentId: "Riya Sharma",
    classLevel: initialClassLevel,
  });
  const [selectedGradeClass, setSelectedGradeClass] =
    useState<string>(initialClassLevel);
  const [toast, setToast] = useState<{
    emoji: string;
    title: string;
    message: string;
  } | null>(null);

  const [form, setForm] = useState<CreateSessionInput>(() =>
    buildDefaultForm(visibleQuizCatalog.entries[0] ?? null, "Riya Sharma"),
  );
  const [quiz, setQuiz] = useState<DemoLoadedQuiz | null>(null);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionElapsedMs, setQuestionElapsedMs] = useState(0);
  const [responseMeta, setResponseMeta] = useState<
    Record<
      string,
      { timeTakenMs: number; allocatedTimeMs: number; wasAutoSkipped: boolean }
    >
  >({});
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"load" | "submit" | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const currentQuestion = quiz?.questions[currentIndex] ?? null;
  const isBusy = isPending || pendingAction !== null;
  const isSubmitting = pendingAction === "submit";

  const classLevels = useMemo(() => {
    const available = Array.from(
      new Set(visibleQuizCatalog.entries.map((entry) => entry.classLevel)),
    ).sort();
    return available.length > 0
      ? (available as CreateSessionInput["classLevel"][])
      : [initialClassLevel];
  }, [initialClassLevel, visibleQuizCatalog.entries]);

  const gradeSubject = useMemo(() => {
    if (!selectedGradeClass) return "Maths";
    return (
      visibleQuizCatalog.entries.find(
        (e) => e.classLevel === selectedGradeClass,
      )?.subject ?? "Maths"
    );
  }, [visibleQuizCatalog.entries, selectedGradeClass]);

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
  const setToastRef = useRef(setToast);

  useEffect(() => {
    setToastRef.current = setToast;
  }, [setToast]);

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
          setPendingAction(null);
        } catch (err) {
          setError(toErrorMessage(err));
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

    const toastIdx = TOAST_TRIGGERS.indexOf(questionIndex);
    if (toastIdx >= 0) {
      setToastRef.current(TOAST_CONFIGS[toastIdx] ?? null);
    }

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
    if (!currentQuestion) return;
    advanceLockRef.current = false;
    questionStartedAtRef.current = Date.now();
    setQuestionElapsedMs(0);
  }, [currentQuestion]);

  useEffect(() => {
    if (!currentQuestion || !quiz) return;
    const timer = window.setInterval(() => {
      setQuestionElapsedMs(
        Math.max(0, Date.now() - questionStartedAtRef.current),
      );
    }, 250);
    return () => window.clearInterval(timer);
  }, [currentQuestion, quiz]);

  const startQuizRun = useCallback(() => {
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
          setQuestionElapsedMs(0);
          setResponseMeta({});
          setCurrentAnswer("");
        } catch (err) {
          setError(toErrorMessage(err));
        } finally {
          setPendingAction(null);
        }
      })();
    });
  }, [form]);

  const startRecurringTest = useCallback(
    (assessmentId: string) => {
      setPendingAction("load");
      startTransition(() => {
        void (async () => {
          try {
            setError(null);
            const studentId = studentSetup.studentId.trim() || "Student";
            const recurringQuiz = await loadRecurringQuiz(
              assessmentId,
              studentId,
            );
            setQuiz(recurringQuiz);
            setReport(null);
            setCurrentIndex(0);
            setAnswers({});
            setQuestionElapsedMs(0);
            setResponseMeta({});
            setCurrentAnswer("");
          } catch (err) {
            setError(toErrorMessage(err));
          } finally {
            setPendingAction(null);
          }
        })();
      });
    },
    [studentSetup.studentId],
  );

  const continueFromStudentInfo = () => {
    const studentId = studentSetup.studentId.trim() || "Placement Student";

    const entry = getCatalogEntryForClass(
      visibleQuizCatalog,
      studentSetup.classLevel,
    );
    setSelectedGradeClass(studentSetup.classLevel);
    const baseForm = buildDefaultForm(entry, studentId);
    setForm({ ...baseForm, testMode: "placement" });
    setError(null);
    setAppScreen("grade-start");
  };

  const resetQuiz = () => {
    setQuiz(null);
    setReport(null);
    setCurrentIndex(0);
    setCurrentAnswer("");
    setAnswers({});
    setQuestionElapsedMs(0);
    setResponseMeta({});
    setError(null);
    setPendingAction(null);
    setAppScreen("student-info");
    setSelectedGradeClass(studentSetup.classLevel);
    setForm(
      buildDefaultForm(
        visibleQuizCatalog.entries[0] ?? null,
        studentSetup.studentId.trim(),
      ),
    );
  };

  const answerAllRandomly = useCallback(() => {
    const activeQuiz = quizRef.current;
    if (!activeQuiz || isBusy) return;

    const { randomAnswers, randomResponseMeta } =
      buildRandomQuizSubmission(activeQuiz);

    answersRef.current = randomAnswers;
    responseMetaRef.current = randomResponseMeta;
    setAnswers(randomAnswers);
    setResponseMeta(randomResponseMeta);
    setCurrentAnswer(
      activeQuiz.questions[currentIndexRef.current]
        ? (randomAnswers[activeQuiz.questions[currentIndexRef.current].id] ??
            "")
        : "",
    );
    finalizeQuiz(randomAnswers, randomResponseMeta);
  }, [isBusy]);

  const canSubmitCurrent =
    !isBusy &&
    !!currentQuestion &&
    (currentQuestion.questionType === "matching" ||
    currentQuestion.questionType === "drag_drop"
      ? Object.keys(getAnswerMap(currentAnswer)).length > 0
      : currentAnswer.trim() !== "");

  const answeredCount = Object.keys(responseMeta).length;
  const isQuizActive = !!quiz && !!currentQuestion;
  const showResult = !!report;

  return (
    <div className="bg-white text-[#1a1a1a] font-sans min-h-screen">
      <div className="mx-auto max-w-[1480px] px-3 py-3 sm:px-6 sm:py-4 lg:px-10">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between sm:mb-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[10px] border-2 border-[#F5A623] bg-white text-[20px]">
              🎯
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-[15px] tracking-[0.02em] text-[#1B4A4A] uppercase sm:text-[18px]">
                <span className="hidden sm:inline">Placement Test</span>
                <span className="sm:hidden">Placement</span>
              </span>
              <span className="hidden text-[11px] font-medium tracking-[0.08em] text-[#6B7280] uppercase sm:inline">
                Find the right level
              </span>
            </div>
          </div>

          {isQuizActive || isSubmitting || showResult ? (
            <button
              onClick={resetQuiz}
              className="flex items-center gap-1 text-[14px] text-[#6B7280] transition-colors hover:text-[#1a1a1a]"
            >
              ‹ Back
            </button>
          ) : appScreen !== "student-info" ? (
            <button
              onClick={() => setAppScreen("student-info")}
              className="flex items-center gap-1 text-[14px] text-[#6B7280] transition-colors hover:text-[#1a1a1a]"
            >
              ‹ Back
            </button>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-1 text-[14px] text-[#6B7280] transition-colors hover:text-[#1a1a1a]"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Link>
          )}
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-[12px] border border-[#f46853]/20 bg-[#f46853]/5 p-4 text-[#f46853]">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-[15px] font-semibold">{error}</span>
          </div>
        )}

        {/* Student Info */}
        {!isQuizActive &&
          !isSubmitting &&
          !showResult &&
          appScreen === "student-info" && (
            <PlacementStudentInfoScreen
              setup={studentSetup}
              classLevels={classLevels}
              onChange={setStudentSetup}
              onContinue={continueFromStudentInfo}
            />
          )}

        {/* Grade Start */}
        {!isQuizActive &&
          !isSubmitting &&
          !showResult &&
          appScreen === "grade-start" && (
            <PlacementGradeStartScreen
              classLevel={selectedGradeClass}
              subject={gradeSubject}
              onBegin={startQuizRun}
              onBack={() => setAppScreen("student-info")}
              isBusy={isBusy}
            />
          )}

        {/* Quiz */}
        {isQuizActive && quiz && currentQuestion && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Question header card */}
            <div
              className="mb-4 rounded-[16px] bg-white px-3.5 py-3 sm:mb-5 sm:px-5 sm:py-4"
              style={PLACEMENT_3D_CARD_STYLE}
            >
              <div className="flex items-start justify-between gap-3 sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#2EC4B6] sm:text-[11px]">
                    PLACEMENT / {classLabel(quiz.classLevel)}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[16px] font-extrabold text-[#1a1a1a] sm:text-[20px]">
                    <span>
                      Q{currentIndex + 1}
                      <span className="text-[#9CA3AF]">
                        /{quiz.questions.length}
                      </span>
                    </span>
                    {(currentQuestion as { gradeLevel?: string })
                      .gradeLevel && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#2EC4B6]/30 bg-[#E6F8F6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1B4A4A] sm:px-2.5 sm:py-1 sm:text-[11px]">
                        <span className="text-[#2EC4B6]">●</span>
                        {`Grade ${String(
                          (currentQuestion as { gradeLevel?: string })
                            .gradeLevel,
                        ).replace(/^grade\s*/i, "")}`}
                      </span>
                    )}
                  </div>
                  {quiz.topic && (
                    <div className="mt-0.5 hidden text-[12px] font-medium text-[#6B7280] sm:block">
                      {quiz.topic}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-full bg-[#F8F9FA] px-2.5 py-1 sm:flex-col sm:items-end sm:rounded-[14px] sm:px-4 sm:py-2 sm:text-right">
                  <div className="hidden font-mono text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] sm:block">
                    Time taken
                  </div>
                  <div className="font-mono text-[13px] font-extrabold text-[#1B4A4A] sm:text-[22px]">
                    {(() => {
                      const totalSeconds = Math.floor(questionElapsedMs / 1000);
                      if (totalSeconds < 60) return `${totalSeconds}s`;
                      const m = Math.floor(totalSeconds / 60);
                      const s = totalSeconds % 60;
                      return `${m}m ${String(s).padStart(2, "0")}s`;
                    })()}
                  </div>
                  <div className="mt-0.5 hidden font-mono text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] sm:block">
                    This question
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile progress bar */}
            <div className="mb-4 lg:hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[11px] font-bold text-[#6B7280]">
                  Progress
                </span>
                <span className="font-mono text-[11px] font-bold text-[#6B7280]">
                  {answeredCount}/{quiz.questions.length} answered
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#F0EDE6]">
                <div
                  className="h-full rounded-full bg-[#F5A623] transition-all duration-500"
                  style={{
                    width: `${(answeredCount / quiz.questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
              {/* Question card */}
              <div
                className="overflow-hidden rounded-[16px] bg-white"
                style={PLACEMENT_3D_CARD_STYLE}
              >
                <div className="relative border-b border-[rgba(0,0,0,0.08)] px-3.5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
                  <div className="pointer-events-none absolute right-3 top-1 z-0 hidden font-mono text-[80px] font-extrabold leading-none text-[#1a1a1a] opacity-[0.06] select-none sm:block">
                    {toRomanNumeral(currentIndex + 1)}
                  </div>

                  <div className="relative z-10">
                    {"scenario" in (currentQuestion.payload ?? {}) && (
                      <div className="mb-4 rounded-[12px] border border-[#F5A623]/10 bg-[#FFF8E7] p-4">
                        <div className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#F5A623]">
                          Scenario
                        </div>
                        <p className="text-[15px] font-semibold leading-relaxed text-[#1a1a1a]">
                          {String(
                            (currentQuestion.payload as { scenario?: string })
                              .scenario ?? "",
                          )}
                        </p>
                      </div>
                    )}

                    {typeof (
                      currentQuestion.payload as
                        | { questionSvg?: unknown }
                        | undefined
                    )?.questionSvg === "string" && (
                      <div className="mb-5 flex justify-center rounded-[14px] border border-[#E8E3D8] bg-[#FAFAF7] p-4">
                        <div
                          className="h-[180px] w-full max-w-[360px] [&_svg]:h-full [&_svg]:w-full"
                          dangerouslySetInnerHTML={{
                            __html: String(
                              (
                                currentQuestion.payload as {
                                  questionSvg?: string;
                                }
                              ).questionSvg,
                            ),
                          }}
                        />
                      </div>
                    )}

                    <h3 className="text-[17px] font-semibold leading-normal text-[#1a1a1a]">
                      {currentQuestion.question}
                    </h3>
                  </div>
                </div>

                <div className="px-3.5 py-4 sm:px-7 sm:py-5">
                  <QuestionInput
                    question={currentQuestion}
                    answer={currentAnswer}
                    setAnswer={setCurrentAnswer}
                    assessmentKind="placement"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[rgba(0,0,0,0.08)] px-3.5 py-3 sm:px-7 sm:py-4">
                  <button
                    type="button"
                    onClick={answerAllRandomly}
                    disabled={isBusy}
                    className="flex items-center gap-1.5 rounded-full border border-dashed border-[#F5A623] bg-[#FFFBF4] px-4 py-2.5 text-[12px] font-extrabold text-[#F5A623] transition-all hover:bg-[#FFF7E6] disabled:opacity-55"
                  >
                    🎲 Complete Test Instantly
                  </button>
                  <button
                    onClick={() => advanceRef.current(currentAnswer)}
                    disabled={!canSubmitCurrent || isBusy}
                    className={`flex w-full items-center justify-center gap-2 rounded-full bg-[#F5A623] px-5 py-3 font-bold text-[14px] text-white transition-all hover:bg-[#E0941A] disabled:opacity-50 sm:w-auto sm:px-7 sm:text-[15px] ${PLACEMENT_BUTTON_3D}`}
                  >
                    {isBusy ? (
                      <span className="flex items-center gap-2.5">
                        <Sparkles className="h-4 w-4 animate-[ai-pulse_1.4s_ease-in-out_infinite]" />
                        <span className="bg-[linear-gradient(90deg,rgba(255,255,255,0.55)_0%,#fff_50%,rgba(255,255,255,0.55)_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-[ai-shimmer_1.8s_linear_infinite]">
                          Analyzing
                        </span>
                      </span>
                    ) : (
                      <>
                        {currentIndex === quiz.questions.length - 1
                          ? "Finish Test"
                          : "Next Question"}
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sidebar */}
              <aside className="hidden lg:block">
                <div
                  className="rounded-2xl bg-white p-5"
                  style={PLACEMENT_3D_CARD_STYLE}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">
                      Question Map
                    </h4>
                    <span className="font-mono text-[10px] font-bold text-[#9CA3AF]">
                      {answeredCount}/{quiz.questions.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {quiz.questions.map((q, i) => {
                      const isActive = i === currentIndex;
                      const hasResponded = q.id in responseMeta;
                      const ans = answers[q.id] || "";
                      const isAnswered =
                        hasResponded &&
                        (q.questionType === "matching" ||
                        q.questionType === "drag_drop"
                          ? Object.keys(getAnswerMap(ans)).length > 0
                          : ans.trim() !== "");
                      const mapTileClass = isAnswered
                        ? "border-[#F5A623] bg-[#FFF8E7] text-[#1B4A4A]"
                        : "border-gray-200 bg-[#F8F9FA] text-[#8B95A5]";
                      return (
                        <div
                          key={q.id}
                          className={`flex aspect-square items-center justify-center rounded-xl border-2 font-mono text-[11px] font-bold transition-all ${
                            isActive
                              ? `${
                                  isAnswered
                                    ? mapTileClass
                                    : "border-[#F5A623] bg-white text-[#1B4A4A]"
                                } shadow-[0_0_0_3px_rgba(245,166,35,0.20)]`
                              : mapTileClass
                          }`}
                        >
                          {i + 1}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2.5 font-mono text-[10px] text-[#6B7280]">
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full border border-[#F5A623] bg-[#FFF8E7]" />
                      Answered
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full border-2 border-[#F5A623] bg-white" />
                      Current
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full border border-[#E2DED4] bg-[#F8F9FA]" />
                      Upcoming
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}

        {/* Submitting */}
        {isSubmitting && (
          <MultiStageLoadingScreen
            onBack={resetQuiz}
            studentName={studentSetup.studentId}
            assessmentKind="placement"
          />
        )}

        {/* Result */}
        {showResult && report && (
          <ResultTabs
            report={report}
            onReset={resetQuiz}
            onRecurring={startRecurringTest}
            isBusy={isBusy}
          />
        )}
      </div>

      <AIChatBubble config={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
