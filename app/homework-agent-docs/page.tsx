import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronRight, Database, Repeat, Sparkles } from "lucide-react";
import { CodeBlock } from "./code-block";

export const metadata = {
  title: "Homework Agent Docs",
  description:
    "API contract for the Homework Agent — serves 15 diagnostic + 5 interactive questions per session.",
};

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

type Method = "GET" | "POST";

interface Endpoint {
  n: number;
  method: Method;
  path: string;
  title: string;
  /** When this mirrors an existing diagnostic / placement test endpoint. */
  sameAs?: string;
  /** "identical" = copy it; "similar" = same idea, small diff; "new" = no prior equivalent. */
  parity: "identical" | "similar" | "new";
  description: string;
  request?: string;
  response: string;
}

const METHOD_COLOR: Record<Method, string> = {
  GET: "var(--accent-blue)",
  POST: "var(--accent-coral)",
};

const PARITY_LABEL = {
  identical: "Same as before",
  similar: "Same idea as before",
  new: "New for homework",
} as const;

const PARITY_COLOR = {
  identical: "var(--accent-green)",
  similar: "var(--accent-yellow)",
  new: "var(--accent-purple)",
} as const;

const ENDPOINTS: Endpoint[] = [
  {
    n: 1,
    method: "POST",
    path: "/api/v1/homework/sessions",
    title: "Build the set (selection engine)",
    parity: "similar",
    sameAs:
      "Mirrors Start Session — POST /v1/test-sessions in the diagnostic & placement tests. Difference: it also runs the 15 + 5 selection blueprint and returns the full manifest.",
    description:
      "Picks 5 easy + 5 medium + 5 hard diagnostic questions and 5 interactive questions for the student/grade/topic, persists the session, returns the ordered 20-question manifest (no answers).",
    request: `{
  "student_id": "stu_01H8Z...",
  "grade": 5,
  "topic": "Fractions",
  "subtopic": "Equivalent Fractions",
  "locale": "en-IN",
  "blueprint": {                       // optional; this IS the default
    "diagnostic": { "easy": 5, "medium": 5, "hard": 5 },
    "interactive": 5
  },
  "exclude_version_ids": [49001, 49002]
}`,
    response: `{
  "success": true,
  "data": {
    "session": {
      "id": "hws_4f2a9c",
      "student_id": "stu_01H8Z...",
      "grade": 5,
      "topic": "Fractions",
      "status": "in_progress",          // in_progress | completed | abandoned
      "total_questions": 20,
      "served_count": 0,
      "answered_count": 0,
      "created_at": "2026-06-18T09:14:02.000Z"
    },
    "blueprint": {
      "diagnostic": { "easy": 5, "medium": 5, "hard": 5 },
      "interactive": 5
    },
    "questions": [                       // ordered manifest — NO answers, NO html yet
      { "index": 0,  "kind": "diagnostic",  "question_id": 8842, "version_id": 55012,
        "question_type": "mcq",  "difficulty_band": "easy",   "bloom_level": "understand",
        "topic": "Fractions", "subtopic": "Equivalent Fractions" },

      { "index": 15, "kind": "interactive", "question_id": 9001, "version_id": 71200,
        "interaction_type": "drag-drop", "difficulty_band": "medium",
        "template_id": "a3f1...-uuid", "template_slug": "fraction-bar-drag-v1" }
      /* ...20 items: 0-4 easy, 5-9 medium, 10-14 hard, 15-19 interactive */
    ]
  },
  "meta": { "requestId": "req_...", "timestamp": "2026-06-18T09:14:02.000Z" },
  "error": null
}`,
  },
  {
    n: 2,
    method: "GET",
    path: "/api/v1/homework/sessions/{sessionId}",
    title: "Session state",
    parity: "identical",
    sameAs:
      "Same as Get Session — GET /v1/test-sessions/:id. Returns the session plus per-question served/answered progress.",
    description: "Fetch the current session with per-question progress.",
    response: `{
  "success": true,
  "data": {
    "session": {
      "id": "hws_4f2a9c", "status": "in_progress",
      "total_questions": 20, "served_count": 3, "answered_count": 2
    },
    "progress": [
      { "index": 0, "kind": "diagnostic",  "served": true,  "answered": true  },
      { "index": 2, "kind": "diagnostic",  "served": true,  "answered": false },
      { "index": 3, "kind": "diagnostic",  "served": false, "answered": false }
      /* ...20 */
    ]
  },
  "meta": { "requestId": "req_...", "timestamp": "..." },
  "error": null
}`,
  },
  {
    n: 3,
    method: "GET",
    path: "/api/v1/homework/sessions/{sessionId}/questions/{index}",
    title: "Serve one question (hydrated)",
    parity: "similar",
    sameAs:
      "Same role as Next Question — POST /v1/test-sessions/:id/next. Difference: indexed GET, and interactive items return hydrated template HTML instead of prompt+options. Answer keys always stripped.",
    description:
      "Returns the fully-renderable question at index. Diagnostic → prompt + options. Interactive → template_html hydrated with payload.variation_data ({{VAR}} filled, SILENT_MODE injected).",
    response: `// kind = "diagnostic"
{
  "success": true,
  "data": {
    "index": 0, "kind": "diagnostic", "question_id": 8842, "version_id": 55012,
    "question_type": "mcq", "difficulty_band": "easy", "bloom_level": "understand",
    "prompt": "Which fraction is equivalent to 1/2?",
    "options": ["2/4", "1/3", "3/5", "2/3"],
    "time_allocated_ms": 60000
    // NO correct_answer, NO explanation
  }, "meta": { "...": "..." }, "error": null
}

// kind = "interactive"
{
  "success": true,
  "data": {
    "index": 15, "kind": "interactive", "question_id": 9001, "version_id": 71200,
    "interaction_type": "drag-drop", "difficulty_band": "medium",
    "template_slug": "fraction-bar-drag-v1",
    "prompt": "Drag the shaded bars to build three-fourths.",
    "render": {
      "mode": "html",
      "html": "<div class=\\"game\\"> ...hydrated standalone HTML... </div>",
      "silent_mode": true,
      "output_schema": { "type": "object", "properties": { "...": "..." } }
    },
    "time_allocated_ms": 90000
    // NO evaluation_spec, NO answer
  }, "meta": { "...": "..." }, "error": null
}`,
  },
  {
    n: 4,
    method: "POST",
    path: "/api/v1/homework/sessions/{sessionId}/attempts",
    title: "Submit an answer",
    parity: "identical",
    sameAs:
      "Identical to Submit Attempt — POST /v1/test-sessions/:id/attempts. Scored server-side; correctness stays hidden until results.",
    description:
      "Diagnostic → match vs correct_answer. Interactive → scoreAnswer(payload.evaluation_spec, answer). Returns an acknowledgement only.",
    request: `// diagnostic
{ "index": 0, "version_id": 55012, "answer": "2/4", "time_taken_ms": 8200 }

// interactive (answer = canonical output the game emits)
{ "index": 15, "version_id": 71200, "answer": { "selected": ["bar_1","bar_2","bar_3"] }, "time_taken_ms": 41000 }`,
    response: `{
  "success": true,
  "data": {
    "attempt_id": "att_9b3e",
    "index": 0,
    "recorded": true,
    "answered_count": 1,
    "remaining": 19
  },
  "meta": { "requestId": "req_...", "timestamp": "..." },
  "error": null
}`,
  },
  {
    n: 5,
    method: "POST",
    path: "/api/v1/homework/sessions/{sessionId}/complete",
    title: "Finalize the session",
    parity: "identical",
    sameAs:
      "Identical to Complete Session — POST /v1/test-sessions/:id/complete. Marks completed and computes the aggregate.",
    description: "Closes the session and computes overall performance.",
    response: `{
  "success": true,
  "data": {
    "session_id": "hws_4f2a9c",
    "status": "completed",
    "overall_performance": 78,        // mean 0-100
    "answered": 20,
    "correct": 15,
    "completed_at": "2026-06-18T09:31:40.000Z"
  },
  "meta": { "requestId": "req_...", "timestamp": "..." },
  "error": null
}`,
  },
  {
    n: 6,
    method: "GET",
    path: "/api/v1/homework/sessions/{sessionId}/results",
    title: "Full report",
    parity: "similar",
    sameAs:
      "Same as Get Report — GET /v1/test-sessions/:id/report. Difference: breakdown is split by difficulty band AND by kind (diagnostic vs interactive). Answers included post-completion.",
    description: "Per-question breakdown with answers, plus band/kind summaries.",
    response: `{
  "success": true,
  "data": {
    "session_id": "hws_4f2a9c",
    "status": "completed",
    "overall_performance": 78,
    "summary": {
      "total": 20, "answered": 20, "correct": 15,
      "by_band": {
        "easy":   { "correct": 5, "total": 5 },
        "medium": { "correct": 4, "total": 5 },
        "hard":   { "correct": 3, "total": 5 }
      },
      "by_kind": {
        "diagnostic":  { "correct": 12, "total": 15 },
        "interactive": { "correct": 3,  "total": 5  }
      }
    },
    "questions": [
      { "index": 0, "kind": "diagnostic", "difficulty_band": "easy",
        "is_correct": true, "performance": 100,
        "student_answer": "2/4", "correct_answer": "2/4", "time_taken_ms": 8200 },
      { "index": 15, "kind": "interactive", "interaction_type": "drag-drop",
        "is_correct": false, "performance": 40, "scoring": "partial",
        "student_answer": { "selected": ["bar_1","bar_2","bar_3"] },
        "score_breakdown": { "matched": 2, "expected": 3, "reason": "missing bar_4" },
        "time_taken_ms": 41000 }
      /* ...20 */
    ]
  },
  "meta": { "requestId": "req_...", "timestamp": "..." },
  "error": null
}`,
  },
];

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

function MethodPill({ method }: { method: Method }) {
  return (
    <span
      className="rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide text-white"
      style={{ backgroundColor: METHOD_COLOR[method] }}
    >
      {method}
    </span>
  );
}

function ParityBadge({ parity }: { parity: Endpoint["parity"] }) {
  const color = PARITY_COLOR[parity];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
        color,
      }}
    >
      <Repeat className="h-3 w-3" strokeWidth={2.5} />
      {PARITY_LABEL[parity]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function HomeworkAgentDocsPage() {
  return (
    <main
      className="min-h-screen px-6 py-12"
      style={{ background: "var(--bg-warm)" }}
    >
      {/* Native <details> styling: hide default marker, rotate chevron when open */}
      <style>{`
        details[data-ep] > summary { list-style: none; }
        details[data-ep] > summary::-webkit-details-marker { display: none; }
        details[data-ep] > summary .chevron { transition: transform .2s ease; }
        details[data-ep][open] > summary .chevron { transform: rotate(90deg); }
        details[data-ep] > summary:hover { background: var(--surface-2); }
      `}</style>

      <div className="mx-auto w-full max-w-4xl">
        {/* Back */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold"
          style={{ color: "var(--text-dim)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl ring-4 ring-white"
              style={{
                backgroundColor: "color-mix(in oklab, var(--accent-coral) 12%, transparent)",
                color: "var(--accent-coral)",
              }}
            >
              <BookOpen className="h-7 w-7" strokeWidth={2.2} />
            </div>
            <div>
              <h1
                className="text-4xl font-extrabold tracking-tight"
                style={{ color: "var(--heading)" }}
              >
                Homework Agent Docs
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
                API contract — 15 diagnostic + 5 interactive questions per session.
              </p>
            </div>
          </div>

          {/* Status banner */}
          <div
            className="flex items-start gap-3 rounded-2xl p-4"
            style={{
              background: "color-mix(in oklab, var(--accent-yellow) 12%, transparent)",
              border: "1px solid color-mix(in oklab, var(--accent-yellow) 45%, transparent)",
            }}
          >
            <Sparkles
              className="mt-0.5 h-5 w-5 shrink-0"
              style={{ color: "var(--accent-yellow)" }}
              strokeWidth={2.2}
            />
            <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
              <strong>Docs only — not wired yet.</strong> The JSON below is the agreed
              contract before the DB work. Field names follow the merged schema
              (<code className="font-mono">questions</code> +{" "}
              <code className="font-mono">question_versions</code> + skeleton{" "}
              <code className="font-mono">question_templates</code>) from <em>Schema Merging</em>.
              The full markdown version lives at{" "}
              <code className="font-mono">docs/homework-agent-api.md</code>.
            </p>
          </div>

          {/* Schema button */}
          <Link
            href="/homework-agent-docs/schema-migration"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            style={{
              backgroundColor: "var(--accent-purple)",
              boxShadow: "0 4px 0 color-mix(in oklab, var(--accent-purple) 60%, black)",
            }}
          >
            <Database className="h-4 w-4" strokeWidth={2.4} />
            View schema migration
          </Link>
        </div>

        {/* Composition */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold" style={{ color: "var(--heading)" }}>
            What a session serves (20 questions)
          </h2>
          <div
            className="overflow-hidden rounded-2xl"
            style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface-2)", color: "var(--text-dim)" }}>
                  <th className="px-4 py-3 text-left font-semibold">Bucket</th>
                  <th className="px-4 py-3 text-left font-semibold">Count</th>
                  <th className="px-4 py-3 text-left font-semibold">DB filter</th>
                  <th className="px-4 py-3 text-left font-semibold">Served as</th>
                </tr>
              </thead>
              <tbody style={{ color: "var(--text)" }}>
                {[
                  ["Diagnostic — easy", "5", "usage_type='diagnostic', difficulty_band='easy'", "prompt + options"],
                  ["Diagnostic — medium", "5", "usage_type='diagnostic', difficulty_band='medium'", "prompt + options"],
                  ["Diagnostic — hard", "5", "usage_type='diagnostic', difficulty_band='hard'", "prompt + options"],
                  ["Interactive", "5", "usage_type='homework', question_type='interactive'", "hydrated template HTML"],
                ].map((row) => (
                  <tr key={row[0]} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-4 py-3 font-semibold">{row[0]}</td>
                    <td className="px-4 py-3">{row[1]}</td>
                    <td className="px-4 py-3 font-mono text-[12px]" style={{ color: "var(--text-dim)" }}>
                      {row[2]}
                    </td>
                    <td className="px-4 py-3">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--text-dim)" }}>
            Stateful flow (same shape as the diagnostic / placement test):{" "}
            <strong>create → serve one-by-one → submit attempts → complete → results.</strong>{" "}
            Every response uses the repo envelope{" "}
            <code className="font-mono">{"{ success, data, meta, error }"}</code>.
          </p>
        </section>

        {/* Endpoint index */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold" style={{ color: "var(--heading)" }}>
            Endpoints
          </h2>
          <div
            className="overflow-hidden rounded-2xl"
            style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
          >
            {ENDPOINTS.map((e) => (
              <a
                key={e.n}
                href={`#ep-${e.n}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
                style={{ borderTop: e.n === 1 ? "none" : "1px solid var(--border)" }}
              >
                <MethodPill method={e.method} />
                <code className="font-mono text-[13px]" style={{ color: "var(--text)" }}>
                  {e.path}
                </code>
              </a>
            ))}
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--text-dim)" }}>
            The <strong>Same as before</strong> tags map each endpoint to its diagnostic /
            placement test counterpart so the parallels are obvious.
          </p>
        </section>

        {/* Endpoint detail cards — collapsible */}
        <div className="space-y-4">
          {ENDPOINTS.map((e) => (
            <details
              key={e.n}
              id={`ep-${e.n}`}
              data-ep
              open={e.n === 1}
              className="scroll-mt-6 overflow-hidden rounded-3xl"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "0 4px 14px rgba(26,26,46,0.05)",
              }}
            >
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-5">
                <ChevronRight
                  className="chevron h-5 w-5 shrink-0"
                  style={{ color: "var(--text-dim)" }}
                  strokeWidth={2.5}
                />
                <MethodPill method={e.method} />
                <code className="font-mono text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>
                  {e.path}
                </code>
                <ParityBadge parity={e.parity} />
                <span
                  className="ml-auto hidden text-sm font-semibold sm:block"
                  style={{ color: "var(--text-dim)" }}
                >
                  {e.n}. {e.title}
                </span>
              </summary>

              <div className="px-5 pb-6">
                <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                  {e.description}
                </p>

                {e.sameAs && (
                  <div
                    className="mt-4 rounded-2xl p-3 text-[13px] leading-relaxed"
                    style={{
                      background: "var(--surface-2)",
                      borderLeft: `3px solid ${PARITY_COLOR[e.parity]}`,
                      color: "var(--text-dim)",
                    }}
                  >
                    <strong style={{ color: "var(--text)" }}>Vs previous tests: </strong>
                    {e.sameAs}
                  </div>
                )}

                {e.request && <CodeBlock label="Request" code={e.request} />}
                <CodeBlock label="Response" code={e.response} />
              </div>
            </details>
          ))}
        </div>

        {/* Errors */}
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold" style={{ color: "var(--heading)" }}>
            Errors
          </h2>
          <div
            className="overflow-hidden rounded-2xl"
            style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface-2)", color: "var(--text-dim)" }}>
                  <th className="px-4 py-3 text-left font-semibold">HTTP</th>
                  <th className="px-4 py-3 text-left font-semibold">error.code</th>
                  <th className="px-4 py-3 text-left font-semibold">When</th>
                </tr>
              </thead>
              <tbody style={{ color: "var(--text)" }}>
                {[
                  ["400", "VALIDATION_ERROR", "bad/missing params (lists every bad field)"],
                  ["404", "NOT_FOUND", "unknown sessionId or index out of range"],
                  ["409", "SESSION_COMPLETED", "submitting an attempt to a completed session"],
                  ["422", "INSUFFICIENT_QUESTIONS", "DB can't fill the blueprint (shortfalls in details)"],
                  ["500", "INTERNAL_ERROR", "unexpected server failure"],
                ].map((row) => (
                  <tr key={row[1]} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-4 py-3 font-mono">{row[0]}</td>
                    <td className="px-4 py-3 font-mono text-[12px]" style={{ color: "var(--accent-coral)" }}>
                      {row[1]}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-dim)" }}>
                      {row[2]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
