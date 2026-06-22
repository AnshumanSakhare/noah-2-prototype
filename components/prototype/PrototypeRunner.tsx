"use client";

import { useEffect, useRef, useState } from "react";

export interface PQuestion {
  kind: "diagnostic" | "interactive";
  slot: number;
  plannedDifficulty: string;
  difficulty: string;
  id: string;
  // diagnostic
  questionType?: string;
  question?: string;
  questionSvg?: string;
  options?: Array<{ text: string; svg?: string }>;
  payload?: Record<string, unknown>;
  // interactive
  interactionType?: string;
  learningObjective?: string;
  html?: string;
}

export interface PHomework {
  grade: number;
  gradeLabel: string;
  topic: string;
  total: number;
  counts: { diagnostic: number; interactive: number };
  questions: PQuestion[];
}

export interface PAnswer {
  id: string;
  kind: "diagnostic" | "interactive";
  studentAnswer: unknown;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

const ContentIcon = ({ color }: { color: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color }}
    aria-hidden="true"
  >
    <rect x="3" y="9" width="14" height="12" rx="2" />
    <path d="M7 5h14v12" />
  </svg>
);

export default function PrototypeRunner({
  homework,
  onComplete,
  onExit,
}: {
  homework: PHomework;
  onComplete: (answers: PAnswer[], elapsedMs: number) => void;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, PAnswer>>({});
  const [elapsed, setElapsed] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [dir, setDir] = useState<"forward" | "backward">("forward");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1000), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const questions = homework.questions;
  const step = questions[index];

  // Capture interactive game answers via postMessage (same protocol as homework).
  // biome-ignore lint/correctness/useExhaustiveDependencies: setAnswer is stable
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (
        e.data &&
        e.data.type === "EDUQUEST_ANSWER" &&
        step?.kind === "interactive"
      ) {
        setAnswer(step, e.data.answer);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [step]);

  if (!step) return null;

  const setAnswer = (q: PQuestion, studentAnswer: unknown) => {
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { id: q.id, kind: q.kind, studentAnswer },
    }));
  };

  const go = (next: number, direction: "forward" | "backward") => {
    setDir(direction);
    setTransitioning(true);
    setTimeout(() => {
      setIndex(next);
      setTransitioning(false);
    }, 220);
  };

  const handleBack = () => {
    if (index > 0) go(index - 1, "backward");
  };
  const handleNext = () => {
    if (index + 1 >= questions.length) {
      onComplete(Object.values(answers), elapsed);
    } else {
      go(index + 1, "forward");
    }
  };

  // ── Sidebar metrics ──
  const completedCount = questions.filter(
    (q, i) => answers[q.id] !== undefined || i < index,
  ).length;

  const getStatus = (i: number) =>
    i === index ? "current" : i < index ? "done" : "pending";

  const cardTransitionClass = transitioning
    ? dir === "forward"
      ? "card-exit-left"
      : "card-exit-right"
    : dir === "forward"
      ? "card-enter-right"
      : "card-enter-left";

  const stepProgressText = `Step ${index + 1} of ${questions.length}`;
  const sourceLabel =
    step.kind === "interactive" ? "Interactive" : "Diagnostic";

  return (
    <div
      id="hwUI"
      className="homework-studio hw-runner-page student-runner-layout"
    >
      {/* Top bar */}
      <div className="hwrh-bar">
        <div className="hwrh-left">
          <div
            className="hwrh-step-title"
            style={{
              fontSize: "1.25rem",
              fontWeight: 850,
              color: "var(--text)",
              letterSpacing: "-0.02em",
            }}
          >
            Homework Agent
          </div>
        </div>
        <div className="hwrh-right">
          <div className="hwrh-timer">
            <div className="hwrh-timer-label">TIME TAKEN</div>
            <div className="hwrh-timer-value">{formatElapsed(elapsed)}</div>
            <div className="hwrh-timer-sub">this session</div>
          </div>
        </div>
      </div>

      <div
        className={`hw-runner-body ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      >
        {/* Sidebar */}
        <div className="hw-runner-sidebar">
          <div className="hw-sidebar-tabs">
            <div className="hw-sidebar-tab-base">
              <button
                type="button"
                className={`hw-sidebar-tab-pill pill-map ${sidebarCollapsed ? "collapsed" : ""}`}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? "Expand" : "Collapse"}
              >
                <div
                  className="hw-sidebar-tab-icon-wrap"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transition: "transform 0.3s ease",
                      transform: sidebarCollapsed
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                    }}
                    aria-hidden="true"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          <div className="hw-sidebar-scroll-content">
            <div className="hwmap-section hwmap-section-topics">
              <div className="hwmap-section-label">TOPICS</div>
              <div className="hwmap-topic-row active">
                <div className="hwmap-topic-info">
                  <span className="hwmap-topic-name">{homework.topic}</span>
                  <span className="hwmap-topic-count">
                    {completedCount}/{questions.length}
                  </span>
                </div>
                <div className="hwmap-topic-track">
                  <div
                    className="hwmap-topic-fill"
                    style={{
                      width: `${Math.round((completedCount / questions.length) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="hwmap-section hwmap-section-map">
              <div className="hwmap-section-label">
                STEP MAP
                <span className="hwmap-qcount">
                  {index + 1}/{questions.length}
                </span>
              </div>
              <div className="hwmap-grid">
                {questions.map((q, i) => {
                  const status = getStatus(i);
                  const isInteractive = q.kind === "interactive";
                  let bubbleStyle: React.CSSProperties = {};
                  if (isInteractive && status !== "current") {
                    bubbleStyle = {
                      borderColor: "#0d9488",
                      background: "rgba(13, 148, 136, 0.06)",
                      color: "#0d9488",
                    };
                  }
                  return (
                    <button
                      type="button"
                      key={q.id}
                      className={`hwmap-bubble hwmap-${status} ${
                        isInteractive ? "hwmap-is-content" : "hwmap-is-question"
                      }`}
                      style={bubbleStyle}
                      title={`Step ${i + 1} · ${q.plannedDifficulty} · ${sourceLabelFor(q)}`}
                      onClick={() => setIndex(i)}
                    >
                      {isInteractive ? (
                        <ContentIcon
                          color={status === "current" ? "#b45309" : "#0d9488"}
                        />
                      ) : (
                        i + 1
                      )}
                    </button>
                  );
                })}
              </div>
              <div
                className="hwmap-legend"
                style={{
                  borderTop: "1px solid #f3f4f6",
                  paddingTop: "12px",
                  marginTop: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  <span
                    className="hwmap-leg"
                    style={{
                      color: "var(--text-dim)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <div
                      className="hwmap-bubble hwmap-is-question"
                      style={{
                        width: "18px",
                        height: "18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.6rem",
                      }}
                    >
                      1
                    </div>
                    Diagnostic
                  </span>
                  <span
                    className="hwmap-leg"
                    style={{
                      color: "var(--text-dim)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <div
                      className="hwmap-bubble hwmap-is-content"
                      style={{
                        width: "18px",
                        height: "18px",
                        border: "1px solid #0d9488",
                        background: "rgba(13, 148, 136, 0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "4px",
                      }}
                    >
                      <ContentIcon color="#0d9488" />
                    </div>
                    Interactive
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    fontSize: "0.64rem",
                  }}
                >
                  <span className="hwmap-leg hwmap-leg-current">● Current</span>
                  <span
                    className="hwmap-leg hwmap-leg-pending"
                    style={{ color: "#9ca3af" }}
                  >
                    ● Completed
                  </span>
                  <span className="hwmap-leg hwmap-leg-pending">
                    ● Upcoming
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button type="button" className="hw-pause-btn" onClick={onExit}>
            ⏸ Save &amp; Exit
          </button>
        </div>

        {/* Main card */}
        <div className="hw-runner-content">
          <div className={`card-wrapper ${cardTransitionClass}`}>
            <div className="hw-card hw-card-question animate-fade-in">
              <div className="hw-card-header">
                <h3
                  className="hw-card-header-title"
                  style={{
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "1.25rem",
                    fontWeight: 850,
                    color: "var(--text)",
                  }}
                >
                  <span
                    style={{
                      color: "var(--c-grape)",
                      textTransform: "uppercase",
                      fontSize: "0.75rem",
                      fontWeight: 900,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {sourceLabel}
                  </span>
                  &bull; {homework.topic}
                </h3>
                <p
                  className="hw-card-header-instruction"
                  style={{
                    margin: "4px 0 0",
                    fontSize: "0.92rem",
                    color: "var(--text-dim)",
                    fontWeight: 600,
                  }}
                >
                  {step.kind === "interactive"
                    ? step.learningObjective ||
                      "Interactively solve the challenge below."
                    : "Choose the best answer below."}
                </p>
              </div>

              <div
                className="hw-card-body"
                style={
                  step.kind === "interactive"
                    ? {
                        padding: 0,
                        position: "relative",
                        height: "520px",
                        overflow: "hidden",
                      }
                    : undefined
                }
              >
                {step.kind === "interactive" ? (
                  <iframe
                    key={step.id}
                    title="Interactive activity"
                    sandbox="allow-scripts"
                    srcDoc={step.html}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      background: "transparent",
                    }}
                  />
                ) : (
                  <DiagnosticBody
                    step={step}
                    answer={answers[step.id]?.studentAnswer}
                    onAnswer={(a) => setAnswer(step, a)}
                  />
                )}
              </div>

              <div className="hw-card-footer">
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="nav-btn secondary"
                    onClick={handleBack}
                    disabled={index === 0}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="nav-btn secondary"
                    onClick={() =>
                      setAnswers((p) => {
                        const next = { ...p };
                        delete next[step.id];
                        return next;
                      })
                    }
                  >
                    Reset
                  </button>
                </div>
                <span className="footer-step-indicator">
                  {stepProgressText}
                </span>
                <button
                  type="button"
                  className="nav-btn primary"
                  onClick={handleNext}
                >
                  {index + 1 >= questions.length ? "Finish →" : "Next →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function sourceLabelFor(q: PQuestion) {
  return q.kind === "interactive"
    ? "interactive"
    : (q.questionType ?? "diagnostic");
}

const OPT_LETTERS = ["A", "B", "C", "D", "E", "F"];

function DiagnosticBody({
  step,
  answer,
  onAnswer,
}: {
  step: PQuestion;
  answer: unknown;
  onAnswer: (a: unknown) => void;
}) {
  const payload = step.payload ?? {};

  const hasOptionSvg = step.options?.some((o) => o.svg) ?? false;

  return (
    <div style={{ padding: "8px 4px" }}>
      <style>{DIAG_STYLES}</style>
      <p className="pp-q">{step.question}</p>

      {step.questionSvg && (
        <div
          className="pp-qsvg"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from our DB
          dangerouslySetInnerHTML={{ __html: step.questionSvg }}
        />
      )}

      {step.questionType === "mcq" && step.options && (
        <div className={hasOptionSvg ? "pp-opts pp-opts-grid" : "pp-opts"}>
          {step.options.map((opt, i) => (
            <button
              type="button"
              key={`${step.id}-${i}`}
              className={`pp-opt ${opt.svg ? "pp-opt-visual" : ""} ${answer === i ? "pp-opt-sel" : ""}`}
              onClick={() => onAnswer(i)}
            >
              <span className="pp-opt-letter">{OPT_LETTERS[i]}</span>
              {opt.svg ? (
                <>
                  <span
                    className="pp-opt-svg"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from our DB
                    dangerouslySetInnerHTML={{ __html: opt.svg }}
                  />
                  {opt.text?.trim() && (
                    <span className="pp-opt-cap">{opt.text}</span>
                  )}
                </>
              ) : (
                <span className="pp-opt-text">{opt.text}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {step.questionType === "fitb" && (
        <input
          className="pp-input"
          placeholder="Type your answer…"
          value={typeof answer === "string" ? answer : ""}
          onChange={(e) => onAnswer(e.target.value)}
        />
      )}

      {step.questionType === "drag_drop" && (
        <DiagnosticDrag payload={payload} answer={answer} onAnswer={onAnswer} />
      )}
    </div>
  );
}

function DiagnosticDrag({
  payload,
  answer,
  onAnswer,
}: {
  payload: Record<string, unknown>;
  answer: unknown;
  onAnswer: (a: unknown) => void;
}) {
  const items = Array.isArray(payload.draggableItems)
    ? (payload.draggableItems as string[])
    : [];
  const zones = Array.isArray(payload.dropZones)
    ? (payload.dropZones as string[])
    : [];
  const current = (
    answer && typeof answer === "object" ? answer : {}
  ) as Record<string, string>;

  return (
    <div className="pp-dnd">
      {items.map((item) => (
        <div className="pp-dnd-row" key={item}>
          <span className="pp-chip">{item}</span>
          <span className="pp-arrow">→</span>
          <select
            className="pp-select"
            value={current[item] ?? ""}
            onChange={(e) => onAnswer({ ...current, [item]: e.target.value })}
          >
            <option value="">Pick a group…</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

const DIAG_STYLES = `
.pp-q { font-size: 1.08rem; font-weight: 750; line-height: 1.5; margin: 6px 0 16px; color: var(--text); }
.pp-qsvg { display: grid; place-items: center; margin: 0 auto 22px; }
.pp-qsvg svg { width: auto; height: 200px; max-width: 100%; display: block; }
.pp-opts { display: grid; gap: 10px; }
.pp-opts-grid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; }
.pp-opt { display: flex; align-items: center; gap: 11px; text-align: left; padding: 13px 15px; border: 1.5px solid #e2e4ee; border-radius: 12px; background: #fff; font-size: 0.95rem; cursor: pointer; transition: border-color .12s, background .12s; color: var(--text); }
.pp-opt:hover { border-color: #bcc0ec; }
.pp-opt-sel { border-color: var(--c-grape, #6C5CE7); background: rgba(108,92,231,.06); }
.pp-opt-visual { flex-direction: column; align-items: stretch; gap: 8px; padding: 12px; }
.pp-opt-visual .pp-opt-letter { align-self: flex-start; }
.pp-opt-svg { min-height: 120px; display: grid; place-items: center; }
.pp-opt-svg svg { width: 120px; height: 120px; display: block; }
.pp-opt-cap { text-align: center; font-size: 0.82rem; font-weight: 700; color: var(--text-dim); }
.pp-opt-text { flex: 1; }
.pp-opt-letter { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 7px; background: #f0f1f7; font-size: 0.74rem; font-weight: 800; color: #555; flex-shrink: 0; }
.pp-input { width: 100%; max-width: 360px; height: 44px; border: 1.5px solid #d8dae6; border-radius: 11px; padding: 0 14px; font-size: 0.95rem; }
.pp-dnd { display: grid; gap: 10px; }
.pp-dnd-row { display: flex; align-items: center; gap: 10px; }
.pp-chip { background: #f0f1f7; border: 1px solid #e0e2ee; border-radius: 9px; padding: 8px 13px; font-size: 0.9rem; min-width: 70px; text-align: center; }
.pp-arrow { color: #9aa0b4; font-weight: 800; }
.pp-select { height: 40px; border: 1.5px solid #d8dae6; border-radius: 9px; padding: 0 10px; font-size: 0.9rem; background: #fff; cursor: pointer; }
`;
