"use client";

import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import PrototypeResults from "@/components/prototype/PrototypeResults";
import PrototypeRunner, {
  type PAnswer,
  type PHomework,
} from "@/components/prototype/PrototypeRunner";

interface TopicOption {
  topic: string;
  diagnosticCount: number;
  interactiveCount: number;
}

const DEMO_ROWS = [
  {
    id: "r1",
    title: "Number Sense & Operations",
    level: "Medium",
    tag: "AI homework",
  },
  { id: "r2", title: "Addition of one digit number", tag: "Exercise" },
  { id: "r3", title: "Addition of five digit number.pdf", tag: "File" },
];

const REC_BADGES = ["Easy", "Hard", "Medium"];

const GRADES = [
  { value: 0, label: "KG" },
  { value: 1, label: "Grade 1" },
  { value: 2, label: "Grade 2" },
  { value: 3, label: "Grade 3" },
  { value: 4, label: "Grade 4" },
  { value: 5, label: "Grade 5" },
  { value: 6, label: "Grade 6" },
  { value: 7, label: "Grade 7" },
  { value: 8, label: "Grade 8" },
];

type Screen = "start" | "running" | "results";

export default function PrototypePage() {
  const [screen, setScreen] = useState<Screen>("start");
  const [grade, setGrade] = useState(5);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [topic, setTopic] = useState("");
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [homework, setHomework] = useState<PHomework | null>(null);
  const [answers, setAnswers] = useState<PAnswer[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [demoRows, setDemoRows] = useState(DEMO_ROWS);

  const loadTopics = useCallback(async (g: number) => {
    setLoadingTopics(true);
    setTopics([]);
    setTopic("");
    try {
      const res = await fetch(`/api/prototype/topics?grade=${g}`);
      const json = await res.json();
      if (json.success) setTopics(json.data.topics ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoadingTopics(false);
    }
  }, []);

  // Allow deep-linking a grade via ?grade=KG (or 0–8, G1, grade3, …).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("grade");
    if (!raw) return;
    const cleaned = raw
      .trim()
      .toLowerCase()
      .replace(/^(class|grade|g)/, "");
    if (
      cleaned === "kg" ||
      cleaned === "k" ||
      raw.trim().toLowerCase() === "kg"
    ) {
      setGrade(0);
      return;
    }
    const n = Number(cleaned);
    if (Number.isInteger(n) && n >= 0 && n <= 8) setGrade(n);
  }, []);

  useEffect(() => {
    loadTopics(grade);
  }, [grade, loadTopics]);

  const generate = async (topicOverride?: string) => {
    const targetTopic = topicOverride ?? topic;
    if (!targetTopic || generating) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/prototype/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, subject: "Math", topic: targetTopic }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Could not generate homework.");
        return;
      }
      setHomework(json.data);
      setScreen("running");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setGenerating(false);
    }
  };

  const restart = () => {
    setScreen("start");
    setHomework(null);
    setAnswers([]);
    setElapsedMs(0);
  };

  if (screen === "running" && homework) {
    return (
      <PrototypeRunner
        homework={homework}
        onExit={restart}
        onComplete={(a, ms) => {
          setAnswers(a);
          setElapsedMs(ms);
          setScreen("results");
        }}
      />
    );
  }

  if (screen === "results" && homework) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 20px" }}>
        <PrototypeResults
          homework={homework}
          answers={answers}
          elapsedMs={elapsedMs}
          onRestart={restart}
        />
      </div>
    );
  }

  // ── Start / builder screen ──
  const recommended = topics.slice(0, 2);

  return (
    <div className="pp-page">
      <style>{START_STYLES}</style>
      <div className="pp-panel">
        <h1 className="pp-h1">Homework</h1>

        {/* Existing (demo) homework rows */}
        {demoRows.map((row) => (
          <div className="pp-row" key={row.id}>
            <div className="pp-row-left">
              <span className="pp-row-title">{row.title}</span>
              {row.level && (
                <span className="pp-mini pp-mini-amber">{row.level} ▾</span>
              )}
              {row.level && (
                <span className="pp-mini pp-mini-muted">25 activities ▾</span>
              )}
            </div>
            <div className="pp-row-right">
              <span className="pp-tagchip">{row.tag}</span>
              <button
                type="button"
                className="pp-trash"
                aria-label="Remove"
                onClick={() =>
                  setDemoRows((rows) => rows.filter((r) => r.id !== row.id))
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {/* Add AI homework */}
        <div className="pp-add">
          <div className="pp-add-title">Add AI homework</div>
          <div className="pp-add-sub">
            AI will curate questions as homework for the student
          </div>

          <div className="pp-add-row">
            <select
              className="pp-ctrl"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              aria-label="Grade"
            >
              {GRADES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>

            <select
              className="pp-ctrl pp-ctrl-grow"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loadingTopics}
              aria-label="Topic"
            >
              <option value="">
                {loadingTopics
                  ? "Loading topics…"
                  : topics.length === 0
                    ? "No topics for this grade"
                    : "Start typing and select"}
              </option>
              {topics.map((t) => (
                <option key={t.topic} value={t.topic}>
                  {t.topic}
                </option>
              ))}
            </select>

            <select
              className="pp-ctrl"
              disabled
              aria-label="Number of activities"
            >
              <option>20 activities</option>
            </select>

            <button
              type="button"
              className="pp-addbtn"
              onClick={() => generate()}
              disabled={!topic || generating}
            >
              <Plus size={16} />
              {generating ? "Adding…" : "Add"}
            </button>
          </div>

          {/* Recommended by AI */}
          {recommended.length > 0 && (
            <div className="pp-rec">
              <div className="pp-rec-head">
                <Sparkles size={15} className="pp-spark" />
                Recommended by AI
              </div>
              <div className="pp-rec-cards">
                {recommended.map((t, i) => (
                  <div className="pp-rec-card" key={t.topic}>
                    <div className="pp-rec-top">
                      <span className="pp-rec-name">{t.topic}</span>
                      <button
                        type="button"
                        className="pp-rec-add"
                        onClick={() => generate(t.topic)}
                        disabled={generating}
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>
                    <div className="pp-rec-meta">
                      <span
                        className={`pp-rec-badge pp-rec-${REC_BADGES[i % REC_BADGES.length].toLowerCase()}`}
                      >
                        {REC_BADGES[i % REC_BADGES.length]}
                      </span>
                      <span className="pp-rec-count">20 activities</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <div className="pp-error">{error}</div>}
      </div>
    </div>
  );
}

const START_STYLES = `
.pp-page { max-width: 1060px; margin: 0 auto; padding: 26px 22px 60px; font-family: 'Nunito', ui-sans-serif, system-ui, sans-serif; color: #1f2430; }
.pp-panel { background: #fff; border: 1px solid #ececf3; border-radius: 20px; padding: 26px 28px; box-shadow: 0 2px 16px rgba(20,24,58,.04); }
.pp-h1 { font-size: 1.55rem; font-weight: 900; margin: 0 0 20px; letter-spacing: -0.02em; }

.pp-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; border: 1px solid #ececf1; border-radius: 14px; padding: 16px 20px; margin-bottom: 12px; }
.pp-row-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.pp-row-title { font-size: 1rem; font-weight: 800; color: #1f2430; }
.pp-mini { font-size: 0.78rem; font-weight: 800; padding: 4px 10px; border-radius: 8px; cursor: default; }
.pp-mini-amber { color: #c98a00; background: #fff5db; }
.pp-mini-muted { color: #8a8fa3; background: #f3f4f7; }
.pp-row-right { display: flex; align-items: center; gap: 12px; }
.pp-tagchip { font-size: 0.8rem; font-weight: 700; color: #4b5168; background: #eef0f5; padding: 6px 14px; border-radius: 8px; }
.pp-trash { background: transparent; border: none; color: #9aa0b4; cursor: pointer; display: inline-flex; padding: 4px; }
.pp-trash:hover { color: #e0556b; }

.pp-add { border: 1.5px solid #d7dcf5; border-radius: 16px; padding: 22px; margin-top: 18px; background: linear-gradient(180deg, #fff 0%, #fafbff 100%); }
.pp-add-title { font-size: 1.05rem; font-weight: 900; color: #1f2430; }
.pp-add-sub { font-size: 0.84rem; color: #8a8fa3; margin: 4px 0 18px; }
.pp-add-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.pp-ctrl { height: 46px; border: 1.5px solid #e2e4ee; border-radius: 12px; padding: 0 14px; font-size: 0.9rem; background: #fff; color: #1f2430; cursor: pointer; min-width: 150px; }
.pp-ctrl-grow { flex: 1; min-width: 220px; }
.pp-ctrl:disabled { background: #f6f7fb; color: #9aa0b4; }
.pp-addbtn { height: 46px; padding: 0 20px; display: inline-flex; align-items: center; gap: 7px; background: #fff; color: #4b5bd6; border: 1.5px solid #b9c0ef; border-radius: 12px; font-size: 0.9rem; font-weight: 800; cursor: pointer; transition: all .12s; white-space: nowrap; }
.pp-addbtn:hover:not(:disabled) { background: #4b5bd6; color: #fff; border-color: #4b5bd6; }
.pp-addbtn:disabled { opacity: .55; cursor: not-allowed; }

.pp-rec { background: linear-gradient(120deg, #eafaf2 0%, #eef3ff 100%); border-radius: 14px; padding: 16px; margin-top: 18px; }
.pp-rec-head { display: inline-flex; align-items: center; gap: 7px; font-size: 0.85rem; font-weight: 800; color: #0f9d6b; margin-bottom: 12px; }
.pp-spark { color: #0f9d6b; }
.pp-rec-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
.pp-rec-card { background: #fff; border: 1px solid #e7eaf2; border-radius: 12px; padding: 14px 16px; }
.pp-rec-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.pp-rec-name { font-size: 0.92rem; font-weight: 800; color: #1f2430; }
.pp-rec-add { display: inline-flex; align-items: center; gap: 4px; background: transparent; border: none; color: #4b5bd6; font-size: 0.82rem; font-weight: 800; cursor: pointer; }
.pp-rec-add:hover { text-decoration: underline; }
.pp-rec-meta { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.pp-rec-badge { font-size: 0.72rem; font-weight: 800; padding: 3px 10px; border-radius: 999px; }
.pp-rec-easy { color: #0f9d6b; background: #d8f5e7; }
.pp-rec-hard { color: #d4537e; background: #fde2ec; }
.pp-rec-medium { color: #c98a00; background: #fff3d1; }
.pp-rec-count { font-size: 0.78rem; color: #9aa0b4; font-weight: 700; }
.pp-error { margin-top: 16px; background: #fdecec; border: 1px solid #f5c2c2; color: #a12; padding: 10px 14px; border-radius: 10px; font-size: 0.82rem; }
`;
