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
  return `${sec} s`;
}

const OPT_LETTERS = ["A", "B", "C", "D", "E", "F"];

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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1000), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const questions = homework.questions;
  const step = questions[index];

  const setAnswer = (q: PQuestion, studentAnswer: unknown) => {
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { id: q.id, kind: q.kind, studentAnswer },
    }));
  };

  // Capture interactive game answers via postMessage.
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

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      onComplete(Object.values(answers), elapsed);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const isAttempted = (i: number) =>
    i < index || answers[questions[i].id] !== undefined;
  const cellStatus = (i: number) =>
    i === index ? "current" : isAttempted(i) ? "answered" : "upcoming";

  const isLast = index + 1 >= questions.length;

  return (
    <div className="pr">
      <style>{STYLES}</style>

      {/* Top bar */}
      <div className="pr-topbar">
        <h1 className="pr-h1">Homework</h1>
        <button type="button" className="pr-exit" onClick={onExit}>
          Exit ✕
        </button>
      </div>

      {/* Info banner */}
      <div className="pr-banner">
        <div className="pr-banner-left">
          <span className="pr-pill">Homework</span>
          <div className="pr-banner-topic">{homework.topic}</div>
          <div className="pr-banner-activity">
            <strong>Activity {index + 1}</strong> of {questions.length}
          </div>
        </div>
        <div className="pr-banner-time">
          <div className="pr-time-label">TIME TAKEN</div>
          <div className="pr-time-val">{formatElapsed(elapsed)}</div>
        </div>
      </div>

      {/* Body: card + map */}
      <div className="pr-body">
        <div className="pr-card">
          {step.kind === "interactive" ? (
            <iframe
              key={step.id}
              title="Interactive activity"
              sandbox="allow-scripts"
              srcDoc={step.html}
              className="pr-frame"
            />
          ) : (
            <div className="pr-q-wrap">
              <h2 className="pr-q">{step.question}</h2>
              {step.questionSvg && (
                <div
                  className="pr-qsvg"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from our DB
                  dangerouslySetInnerHTML={{ __html: step.questionSvg }}
                />
              )}
              <DiagnosticBody
                step={step}
                answer={answers[step.id]?.studentAnswer}
                onAnswer={(a) => setAnswer(step, a)}
              />
            </div>
          )}

          <div className="pr-card-foot">
            {index > 0 ? (
              <button
                type="button"
                className="pr-back"
                onClick={() => setIndex((i) => i - 1)}
              >
                ← Back
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="pr-next" onClick={handleNext}>
              {isLast ? "Finish" : "Next question"} <span aria-hidden>➜</span>
            </button>
            <span />
          </div>
        </div>

        {/* Question map */}
        <aside className="pr-map">
          <div className="pr-map-title">Question map</div>
          <div className="pr-map-grid">
            {questions.map((q, i) => {
              const status = cellStatus(i);
              const clickable = status !== "upcoming";
              return (
                <button
                  type="button"
                  key={q.id}
                  className={`pr-cell pr-cell-${status} ${q.kind === "interactive" ? "pr-cell-int" : ""}`}
                  disabled={!clickable}
                  onClick={() => clickable && setIndex(i)}
                  title={`Activity ${i + 1} · ${q.plannedDifficulty}${q.kind === "interactive" ? " · interactive" : ""}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="pr-map-legend">
            <span className="pr-leg">
              <span className="pr-dot pr-dot-answered" />
              Answered
            </span>
            <span className="pr-leg">
              <span className="pr-dot pr-dot-current" />
              Current
            </span>
            <span className="pr-leg">
              <span className="pr-dot pr-dot-upcoming" />
              Upcoming
            </span>
          </div>
          <div className="pr-map-hint">
            Tap an attempted question to navigate to it.
          </div>
        </aside>
      </div>
    </div>
  );
}

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

  if (step.questionType === "mcq" && step.options) {
    return (
      <div className={hasOptionSvg ? "pr-opts pr-opts-grid" : "pr-opts"}>
        {step.options.map((opt, i) => (
          <button
            type="button"
            key={`${step.id}-${i}`}
            className={`pr-opt ${opt.svg ? "pr-opt-visual" : ""} ${answer === i ? "pr-opt-sel" : ""}`}
            onClick={() => onAnswer(i)}
          >
            <span className="pr-opt-letter">{OPT_LETTERS[i]}</span>
            {opt.svg ? (
              <>
                <span
                  className="pr-opt-svg"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from our DB
                  dangerouslySetInnerHTML={{ __html: opt.svg }}
                />
                {opt.text?.trim() && (
                  <span className="pr-opt-cap">{opt.text}</span>
                )}
              </>
            ) : (
              <span className="pr-opt-text">{opt.text}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  if (step.questionType === "fitb") {
    return (
      <input
        className="pr-input"
        placeholder="Enter your answer"
        value={typeof answer === "string" ? answer : ""}
        onChange={(e) => onAnswer(e.target.value)}
      />
    );
  }

  if (step.questionType === "drag_drop") {
    return (
      <DiagnosticDrag payload={payload} answer={answer} onAnswer={onAnswer} />
    );
  }
  return null;
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
    <div className="pr-dnd">
      {items.map((item) => (
        <div className="pr-dnd-row" key={item}>
          <span className="pr-chip">{item}</span>
          <span className="pr-arrow">→</span>
          <select
            className="pr-select"
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

const STYLES = `
.pr { max-width: 1180px; margin: 0 auto; padding: 18px 22px 60px; font-family: 'Nunito', ui-sans-serif, system-ui, sans-serif; color: #1f2430; }
.pr-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.pr-h1 { font-size: 1.7rem; font-weight: 900; margin: 0; letter-spacing: -0.02em; }
.pr-exit { background: #f3f4f7; border: none; border-radius: 999px; padding: 8px 16px; font-size: 0.85rem; font-weight: 700; color: #6b7280; cursor: pointer; }
.pr-exit:hover { background: #e9eaef; }

.pr-banner { display: flex; align-items: center; justify-content: space-between; gap: 16px; background: #eef3ff; border: 2px solid #c3d4ff; border-radius: 16px; padding: 16px 22px; margin-bottom: 18px; }
.pr-pill { display: inline-block; background: #3b6ef6; color: #fff; font-size: 0.78rem; font-weight: 800; padding: 4px 14px; border-radius: 999px; }
.pr-banner-topic { margin: 8px 0 2px; color: #3b6ef6; font-size: 0.92rem; font-weight: 800; }
.pr-banner-activity { font-size: 1.15rem; color: #4b5168; font-weight: 600; }
.pr-banner-activity strong { color: #1f2430; font-weight: 900; }
.pr-banner-time { text-align: right; }
.pr-time-label { font-size: 0.66rem; font-weight: 800; letter-spacing: .08em; color: #9aa0b4; }
.pr-time-val { font-size: 1.35rem; font-weight: 900; color: #1f2430; font-variant-numeric: tabular-nums; }

.pr-body { display: grid; grid-template-columns: 1fr 290px; gap: 20px; align-items: start; }
@media (max-width: 880px) { .pr-body { grid-template-columns: 1fr; } }

.pr-card { background: #fff; border: 1px solid #eceef3; border-radius: 18px; min-height: 520px; display: flex; flex-direction: column; box-shadow: 0 2px 14px rgba(20,24,58,.04); overflow: hidden; }
.pr-q-wrap { flex: 1; padding: 40px 36px 16px; display: flex; flex-direction: column; align-items: center; }
.pr-q { text-align: center; font-size: 1.7rem; line-height: 1.35; font-weight: 800; color: #1f2430; margin: 6px 0 26px; max-width: 760px; }
.pr-qsvg { display: grid; place-items: center; margin: 0 auto 26px; }
.pr-qsvg svg { width: auto; height: 200px; max-width: 100%; display: block; }
.pr-frame { width: 100%; flex: 1; min-height: 480px; border: none; background: transparent; display: block; }

.pr-opts { display: grid; gap: 12px; width: 100%; max-width: 620px; }
.pr-opts-grid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; max-width: 720px; }
.pr-opt { display: flex; align-items: center; gap: 12px; text-align: left; padding: 15px 18px; border: 1.5px solid #e6e8ef; border-radius: 14px; background: #fff; font-size: 1rem; cursor: pointer; transition: border-color .12s, background .12s; color: #1f2430; }
.pr-opt:hover { border-color: #f5cf6b; background: #fffdf6; }
.pr-opt-sel { border-color: #f3b500; background: #fff6da; }
.pr-opt-visual { flex-direction: column; align-items: stretch; gap: 8px; padding: 14px; }
.pr-opt-visual .pr-opt-letter { align-self: flex-start; }
.pr-opt-svg { min-height: 120px; display: grid; place-items: center; }
.pr-opt-svg svg { width: 120px; height: 120px; display: block; }
.pr-opt-cap { text-align: center; font-size: 0.85rem; font-weight: 700; color: #6b7280; }
.pr-opt-text { flex: 1; }
.pr-opt-letter { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 8px; background: #f0f1f7; font-size: 0.78rem; font-weight: 800; color: #555; flex-shrink: 0; }
.pr-input { width: 100%; max-width: 560px; height: 54px; border: 1.5px solid #dfe1ea; border-radius: 14px; padding: 0 18px; font-size: 1rem; text-align: center; }
.pr-input:focus { outline: none; border-color: #f3b500; box-shadow: 0 0 0 3px #fff1c2; }
.pr-dnd { display: grid; gap: 12px; width: 100%; max-width: 520px; }
.pr-dnd-row { display: flex; align-items: center; gap: 12px; }
.pr-chip { background: #f0f1f7; border: 1px solid #e0e2ee; border-radius: 10px; padding: 9px 15px; font-size: 0.95rem; min-width: 80px; text-align: center; }
.pr-arrow { color: #9aa0b4; font-weight: 800; }
.pr-select { flex: 1; height: 44px; border: 1.5px solid #dfe1ea; border-radius: 10px; padding: 0 12px; font-size: 0.95rem; background: #fff; cursor: pointer; }

.pr-card-foot { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 16px 24px 26px; gap: 12px; }
.pr-back { justify-self: start; background: transparent; border: none; color: #8a8fa3; font-size: 0.9rem; font-weight: 700; cursor: pointer; }
.pr-back:hover { color: #4b5168; }
.pr-next { justify-self: center; display: inline-flex; align-items: center; gap: 9px; background: #fbc52b; color: #4a3a00; border: none; border-radius: 999px; padding: 13px 30px; font-size: 1rem; font-weight: 900; cursor: pointer; box-shadow: 0 4px 0 #e0a800; transition: transform .08s, box-shadow .08s; }
.pr-next:hover { filter: brightness(1.03); }
.pr-next:active { transform: translateY(3px); box-shadow: 0 1px 0 #e0a800; }

.pr-map { background: #f8f9fb; border: 1px solid #ececf1; border-radius: 18px; padding: 18px 16px; }
.pr-map-title { text-align: center; font-size: 1.05rem; font-weight: 900; color: #1f2430; margin-bottom: 16px; }
.pr-map-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 9px; }
.pr-cell { position: relative; aspect-ratio: 1; border-radius: 11px; border: 2px solid #e8eaef; background: #fff; font-size: 0.95rem; font-weight: 800; color: #c2c6d2; cursor: pointer; display: grid; place-items: center; transition: all .12s; }
.pr-cell:disabled { cursor: default; }
.pr-cell-answered { border-color: #f3b500; color: #1f2430; background: #fff; }
.pr-cell-current { border-color: #f3b500; background: #ffe9a8; color: #1f2430; box-shadow: 0 0 0 3px #fff3cf; }
.pr-cell-upcoming { border-color: #e8eaef; color: #c2c6d2; }
.pr-cell-answered:hover, .pr-cell-current:hover { filter: brightness(0.98); }
.pr-cell-int::after { content: ''; position: absolute; top: 5px; right: 5px; width: 6px; height: 6px; border-radius: 50%; background: #0d9488; }
.pr-map-legend { display: flex; flex-direction: column; gap: 7px; border-top: 1px solid #ececf1; margin-top: 16px; padding-top: 14px; }
.pr-leg { display: inline-flex; align-items: center; gap: 7px; font-size: 0.78rem; font-weight: 700; color: #6b7280; }
.pr-dot { width: 13px; height: 13px; border-radius: 50%; border: 2px solid #f3b500; box-sizing: border-box; }
.pr-dot-answered { background: #fff; }
.pr-dot-current { background: #fbc52b; }
.pr-dot-upcoming { border-color: #d6d9e0; background: #fff; }
.pr-map-hint { font-size: 0.74rem; color: #9aa0b4; text-align: center; margin-top: 14px; line-height: 1.4; }
`;
