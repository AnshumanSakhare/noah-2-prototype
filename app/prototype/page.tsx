"use client";

import { Sparkles } from "lucide-react";
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

  useEffect(() => {
    loadTopics(grade);
  }, [grade, loadTopics]);

  const generate = async () => {
    if (!topic || generating) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/prototype/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, subject: "Math", topic }),
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

  // ── Start screen ──
  return (
    <div className="pp-start">
      <style>{START_STYLES}</style>
      <div className="pp-start-card">
        <div className="pp-start-head">
          <div className="pp-start-title">
            <Sparkles size={18} className="pp-spark" />
            <span>AI powered homework</span>
            <span className="pp-tag">Prototype</span>
          </div>
          <p className="pp-start-sub">
            20 questions per topic — 15 from the diagnostic pool (5 easy / 5
            medium / 5 hard) interleaved with 5 interactive activities.
          </p>
        </div>

        <div className="pp-fields">
          <div className="pp-field">
            <label htmlFor="pp-grade">Grade</label>
            <select
              id="pp-grade"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
            >
              {GRADES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pp-field">
            <label htmlFor="pp-subject">Subject</label>
            <select id="pp-subject" value="Math" disabled>
              <option value="Math">Math</option>
            </select>
          </div>

          <div className="pp-field pp-grow">
            <label htmlFor="pp-topic">Topic</label>
            <select
              id="pp-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loadingTopics}
            >
              <option value="">
                {loadingTopics
                  ? "Loading topics…"
                  : topics.length === 0
                    ? "No shared topics for this grade"
                    : "Select a topic"}
              </option>
              {topics.map((t) => (
                <option key={t.topic} value={t.topic}>
                  {t.topic}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="pp-generate"
            onClick={generate}
            disabled={!topic || generating}
          >
            <Sparkles size={15} className={generating ? "pp-spin" : ""} />
            {generating ? "Generating…" : "Generate homework"}
          </button>
        </div>

        {error && <div className="pp-error">{error}</div>}
      </div>
    </div>
  );
}

const START_STYLES = `
.pp-start { min-height: 80vh; display: grid; place-items: center; padding: 30px 20px; font-family: 'Nunito', ui-sans-serif, system-ui, sans-serif; }
.pp-start-card { width: 100%; max-width: 760px; background: #fff; border: 1px solid #ececf3; border-radius: 18px; padding: 26px; box-shadow: 0 4px 24px rgba(20,24,58,.05); }
.pp-start-title { display: flex; align-items: center; gap: 8px; font-size: 1.15rem; font-weight: 900; color: #20243A; }
.pp-spark { color: #6C5CE7; }
.pp-tag { font-size: 0.62rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: #6C5CE7; background: #efeafe; border: 1px solid #d9cffb; padding: 2px 8px; border-radius: 999px; }
.pp-start-sub { margin: 8px 0 22px; color: #6b7280; font-size: 0.86rem; line-height: 1.5; }
.pp-fields { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
.pp-field { display: flex; flex-direction: column; gap: 5px; min-width: 130px; }
.pp-field.pp-grow { flex: 1; min-width: 220px; }
.pp-field label { font-size: 0.68rem; font-weight: 800; color: #8a8fa3; text-transform: uppercase; letter-spacing: .04em; }
.pp-field select { height: 40px; border: 1.5px solid #d8dae6; border-radius: 10px; padding: 0 11px; font-size: 0.88rem; background: #fff; color: #20243A; cursor: pointer; }
.pp-field select:disabled { background: #f5f6fa; color: #9aa0b4; cursor: not-allowed; }
.pp-generate { height: 40px; padding: 0 18px; display: inline-flex; align-items: center; gap: 7px; background: #6C5CE7; color: #fff; border: none; border-radius: 10px; font-size: 0.88rem; font-weight: 800; cursor: pointer; transition: filter .15s; white-space: nowrap; }
.pp-generate:hover:not(:disabled) { filter: brightness(1.08); }
.pp-generate:disabled { background: #c7c9d6; cursor: not-allowed; }
.pp-spin { animation: pp-rot 0.9s linear infinite; }
@keyframes pp-rot { to { transform: rotate(360deg); } }
.pp-error { margin-top: 16px; background: #fdecec; border: 1px solid #f5c2c2; color: #a12; padding: 10px 14px; border-radius: 10px; font-size: 0.82rem; }
`;
