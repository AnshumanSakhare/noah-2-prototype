"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PAnswer, PHomework, PQuestion } from "./PrototypeRunner";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

interface ReviewItem {
  q: PQuestion;
  yourIndex?: number;
  correctIndex?: number;
}

/** Scaled, read-only iframe preview of an interactive question (like the studio). */
function QuestionPreview({ html }: { html: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, (el.clientWidth - 2) / 760));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={wrapRef}
      style={{
        margin: "4px 0 14px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 760 * scale,
          height: 520 * scale,
          overflow: "hidden",
          border: "1px solid #E5E7F0",
          borderRadius: 14,
          background: "#fff",
        }}
      >
        <iframe
          title="Question preview"
          sandbox="allow-scripts"
          srcDoc={html}
          style={{
            width: 760,
            height: 520,
            border: "none",
            background: "transparent",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
}

/** Renders the question itself in the review: interactive game OR visual MCQ. */
function ReviewPreview({ review }: { review: ReviewItem }) {
  const q = review.q;
  if (q.kind === "interactive" && q.html) {
    return <QuestionPreview html={q.html} />;
  }
  if (q.kind !== "diagnostic") return null;
  const hasOptionSvg = q.options?.some((o) => o.svg) ?? false;
  if (!q.questionSvg && !hasOptionSvg) return null;

  return (
    <div className="rev-visual">
      {q.questionSvg && (
        <div
          className="rev-qsvg"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from our DB
          dangerouslySetInnerHTML={{ __html: q.questionSvg }}
        />
      )}
      {hasOptionSvg && q.options && (
        <div className="rev-opts">
          {q.options.map((opt, i) => {
            const isCorrect = i === review.correctIndex;
            const isYour = i === review.yourIndex;
            return (
              <div
                key={`${q.id}-${i}`}
                className={`rev-opt ${isCorrect ? "rev-correct" : ""} ${isYour && !isCorrect ? "rev-your" : ""}`}
              >
                <span className="rev-letter">{LETTERS[i]}</span>
                {opt.svg ? (
                  <span
                    className="rev-svg"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from our DB
                    dangerouslySetInnerHTML={{ __html: opt.svg }}
                  />
                ) : (
                  <span>{opt.text}</span>
                )}
                {isCorrect && (
                  <span className="rev-tag rev-tag-correct">Correct</span>
                )}
                {isYour && !isCorrect && (
                  <span className="rev-tag rev-tag-your">Your pick</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface GradeResult {
  id: string;
  performance: number;
  isCorrect: boolean;
  yourAnswer: string;
  correctAnswer: string;
  yourIndex?: number;
  correctIndex?: number;
  note?: string;
}

const band = (v: number) =>
  v >= 75 ? "#16B981" : v >= 50 ? "#FF9F43" : "#F0556B";

function ScoreRing({
  value,
  size = 132,
  stroke = 13,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) {
  const v = Math.max(0, Math.min(100, value || 0));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - v / 100);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${v} / 100`}
    >
      <title>{`Score ${v} out of 100`}</title>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#eef0f5"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={band(v)}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: "stroke-dashoffset 0.9s cubic-bezier(.22,.61,.36,1)",
        }}
      />
      <text
        x="50%"
        y="48%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.27}
        fontWeight={900}
        fill="#20243A"
      >
        {v}
      </text>
      <text
        x="50%"
        y="66%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.1}
        fontWeight={700}
        fill="#A0A4B8"
      >
        / 100
      </text>
    </svg>
  );
}

function Meter({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {label !== "" && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span
            style={{ fontSize: "0.78rem", fontWeight: 800, color: "#52586F" }}
          >
            {label}
          </span>
          <span
            style={{ fontSize: "0.78rem", fontWeight: 900, color: band(v) }}
          >
            {v}%
          </span>
        </div>
      )}
      <div
        style={{
          height: "8px",
          borderRadius: "999px",
          background: "#eef0f5",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${v}%`,
            height: "100%",
            background: band(v),
            borderRadius: "999px",
            transition: "width 0.8s ease",
          }}
        />
      </div>
    </div>
  );
}

export default function PrototypeResults({
  homework,
  answers,
  elapsedMs,
  onRestart,
}: {
  homework: PHomework;
  answers: PAnswer[];
  elapsedMs: number;
  onRestart: () => void;
}) {
  const [results, setResults] = useState<Record<string, GradeResult> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);

  const answersById = useMemo(() => {
    const m: Record<string, unknown> = {};
    for (const a of answers) m[a.id] = a.studentAnswer;
    return m;
  }, [answers]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: grade once on mount
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const items = homework.questions.map((q) => ({
          id: q.id,
          kind: q.kind,
          studentAnswer: answersById[q.id] ?? null,
        }));
        const res = await fetch("/api/prototype/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const json = await res.json();
        if (json.success) {
          const map: Record<string, GradeResult> = {};
          for (const r of json.data.results as GradeResult[]) map[r.id] = r;
          setResults(map);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const reviews = useMemo(() => {
    return homework.questions.map((q: PQuestion, i) => {
      const r = results?.[q.id];
      const performance = r?.performance ?? 0;
      const state: "correct" | "partial" | "wrong" = r?.isCorrect
        ? "correct"
        : performance > 0
          ? "partial"
          : "wrong";
      return {
        num: i + 1,
        q,
        text:
          q.kind === "interactive"
            ? `Interactive activity · ${q.interactionType ?? ""}`
            : q.question || "Question",
        difficulty: q.plannedDifficulty.toUpperCase(),
        type:
          q.kind === "interactive"
            ? (q.interactionType ?? "interactive")
            : (q.questionType ?? ""),
        performance,
        state,
        isCorrect: !!r?.isCorrect,
        yourAnswer: r?.yourAnswer ?? "No answer",
        correctAnswer: r?.correctAnswer ?? "—",
        yourIndex: r?.yourIndex,
        correctIndex: r?.correctIndex,
        note: r?.note,
      };
    });
  }, [homework.questions, results]);

  const totalQ = reviews.length;
  const score = reviews.filter((r) => r.isCorrect).length;
  const pct = totalQ
    ? Math.round(reviews.reduce((s, r) => s + r.performance, 0) / totalQ)
    : 0;
  const timeMin = Math.max(1, Math.round(elapsedMs / 60000));
  const avgTime = totalQ ? `${(elapsedMs / totalQ / 1000).toFixed(1)}s` : "0s";

  const tier = (bandName: string) => {
    const rs = reviews.filter(
      (_, i) => homework.questions[i].plannedDifficulty === bandName,
    );
    const acc = rs.length
      ? Math.round(rs.reduce((s, r) => s + r.performance, 0) / rs.length)
      : 0;
    return { total: rs.length, accuracy: acc };
  };
  const easy = tier("easy");
  const medium = tier("medium");
  const hard = tier("hard");

  const active = reviews[selected];

  if (loading) {
    return (
      <div
        className="success-screen show"
        style={{
          display: "grid",
          placeItems: "center",
          height: "70vh",
          color: "var(--text-dim)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            className="spin-icon"
            style={{
              fontSize: "2.5rem",
              animation: "spin 1s linear infinite",
              marginBottom: "16px",
            }}
          >
            ⚙️
          </div>
          <h3 style={{ fontWeight: 800 }}>Scoring your homework…</h3>
        </div>
      </div>
    );
  }

  return (
    <div
      className="success-screen show"
      style={{ display: "flex", flexDirection: "column" }}
    >
      {/* Hero */}
      <div className="success-hero-new">
        <div className="shn-eyebrow">HOMEWORK COMPLETE</div>
        <div className="shn-title">Here is your score recap.</div>
        <div className="shn-desc">
          You sit in the{" "}
          <strong>
            {pct >= 80
              ? "Mastery Achieved"
              : pct >= 50
                ? "Foundation Builder"
                : "Early Start"}
          </strong>{" "}
          band for <strong>{homework.topic}</strong>.
        </div>
        <div
          className="shn-score-section"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <ScoreRing value={pct} />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="shn-stars">
              {["s1", "s2", "s3", "s4", "s5"].map((k, i) => (
                <span
                  key={k}
                  className={
                    i < Math.max(1, Math.round(pct / 20))
                      ? "star filled"
                      : "star"
                  }
                >
                  ★
                </span>
              ))}
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--text-dim)",
              }}
            >
              Mean performance across {totalQ} questions
            </div>
          </div>
        </div>
        <div className="shn-tags-row">
          <span className="shn-tag primary-badge">
            {pct >= 80 ? "Mastery" : pct >= 50 ? "Foundation" : "Early Start"}
          </span>
          <span className="shn-tag neutral-badge">
            {score}/{totalQ} mastered
          </span>
          <span className="shn-tag neutral-badge">{timeMin}m total</span>
        </div>
      </div>

      {/* KPI grid */}
      <div className="success-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap">📊</div>
          <div className="kpi-value">
            {pct}
            <span style={{ fontSize: "1rem", color: "var(--text-dim)" }}>
              {" "}
              / 100
            </span>
          </div>
          <div className="kpi-title">Mean Performance</div>
          <div style={{ width: "100%", marginTop: "8px" }}>
            <Meter value={pct} label="Score" />
          </div>
          <div className="kpi-sub" style={{ marginTop: "6px" }}>
            {score}/{totalQ} questions mastered
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap">⏳</div>
          <div className="kpi-value">{avgTime}</div>
          <div className="kpi-title">Avg Time / Q</div>
          <div className="kpi-sub">{timeMin}m total elapsed</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap">📈</div>
          <div className="kpi-title" style={{ marginBottom: "10px" }}>
            Performance by Tier
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              width: "100%",
            }}
          >
            <Meter value={easy.accuracy} label={`Easy · ${easy.total}q`} />
            <Meter
              value={medium.accuracy}
              label={`Medium · ${medium.total}q`}
            />
            <Meter value={hard.accuracy} label={`Hard · ${hard.total}q`} />
          </div>
        </div>
      </div>

      {/* Answer review */}
      <div className="review-answers-panel">
        <div className="rap-header">
          <div className="rap-title">
            <span className="checked-icon">✓</span>
            <strong style={{ fontSize: "0.94rem", fontWeight: 900 }}>
              Review your answers
            </strong>
          </div>
          <div className="rap-legend">
            <span className="leg-item">
              <span className="leg-dot correct" />
              Mastered
            </span>
            <span className="leg-item">
              <span className="leg-dot partial" />
              Partial
            </span>
            <span className="leg-item">
              <span className="leg-dot wrong" />
              Incorrect
            </span>
          </div>
        </div>
        <div className="rap-intro">
          Tap any question to see your answer and the correct answer.
        </div>
        <div className="rap-buttons-row">
          {reviews.map((r, idx) => (
            <button
              type="button"
              key={`rb-${r.num}`}
              className={`rap-q-btn ${r.state} ${selected === idx ? "active" : ""}`}
              onClick={() => setSelected(idx)}
              title={`${r.performance}/100`}
            >
              {r.num}
            </button>
          ))}
        </div>

        {active && (
          <div className="rap-details-card animate-fade">
            <div className="rap-details-header">
              <div className="rdh-title">
                QUESTION {active.num} &bull;{" "}
                <span style={{ textTransform: "uppercase" }}>
                  {active.difficulty}
                </span>
                <span
                  style={{
                    marginLeft: "8px",
                    fontWeight: 900,
                    color: "var(--text-dim)",
                  }}
                >
                  · {active.performance}/100
                </span>
              </div>
              <div className={`rdh-status-badge ${active.state}`}>
                {active.state === "correct"
                  ? "MASTERED"
                  : active.state === "partial"
                    ? "PARTIAL CREDIT"
                    : "INCORRECT"}
              </div>
            </div>
            <div className="rap-question-text">{active.text}</div>

            <ReviewPreview review={active} />

            <div className="rap-comparison-grid">
              <div className="comp-item">
                <div className="comp-label">YOUR ANSWER</div>
                <div className={`comp-val-box ${active.state}`}>
                  {active.yourAnswer}
                </div>
              </div>
              {active.state !== "correct" && (
                <div className="comp-item" style={{ marginTop: "10px" }}>
                  <div className="comp-label">CORRECT ANSWER</div>
                  <div className="comp-val-box correct">
                    {active.correctAnswer}
                  </div>
                </div>
              )}
            </div>
            {active.note && (
              <div className="rap-explanation-box">
                <div className="reb-label">WHY</div>
                <div className="reb-content">{active.note}</div>
              </div>
            )}
            <div className="rap-card-footer">
              <button
                type="button"
                className="rap-nav-btn"
                disabled={selected === 0}
                onClick={() => setSelected((p) => p - 1)}
              >
                ← Previous
              </button>
              <button
                type="button"
                className="rap-nav-btn"
                disabled={selected === reviews.length - 1}
                onClick={() => setSelected((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "16px 0 40px" }}>
        <button type="button" className="nav-btn primary" onClick={onRestart}>
          🏠 New homework
        </button>
      </div>

      <style>{`
        .rap-q-btn.partial { background: #FFF1E2; border-color: #FF9F43; color: #B45309; }
        .rap-q-btn.partial.active { background: #FF9F43; color: #fff; }
        .rdh-status-badge.partial { background: #FFF1E2; color: #B45309; }
        .comp-val-box.partial { outline: 2px solid #FF9F43; background: #FFF8EF; }
        .leg-dot.partial { background: #FF9F43; }
        .rev-visual { margin: 6px 0 16px; }
        .rev-qsvg { display: grid; place-items: center; margin: 0 auto 16px; }
        .rev-qsvg svg { width: auto; height: 150px; max-width: 100%; display: block; }
        .rev-opts { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
        .rev-opt { position: relative; border: 1.5px solid #e2e4ee; border-radius: 12px; padding: 22px 10px 10px; display: flex; flex-direction: column; align-items: center; gap: 6px; background: #fff; }
        .rev-opt.rev-correct { border-color: #16B981; background: rgba(22,185,129,.05); }
        .rev-opt.rev-your { border-color: #F0556B; background: rgba(240,85,107,.05); }
        .rev-letter { position: absolute; top: 6px; left: 8px; font-size: 0.68rem; font-weight: 800; color: #8a8fa3; }
        .rev-svg { width: 100%; min-height: 96px; display: grid; place-items: center; }
        .rev-svg svg { width: 96px; height: 96px; display: block; }
        .rev-tag { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: .03em; padding: 2px 7px; border-radius: 999px; }
        .rev-tag-correct { background: #d8f5e9; color: #0f6e56; }
        .rev-tag-your { background: #fde2e8; color: #a01b38; }
      `}</style>
    </div>
  );
}
