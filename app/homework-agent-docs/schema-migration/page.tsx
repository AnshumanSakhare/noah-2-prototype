import Link from "next/link";
import { ArrowLeft, Database, Sparkles } from "lucide-react";
import { CodeBlock } from "../code-block";

export const metadata = {
  title: "Schema Migration — Homework Agent",
  description:
    "How the homework interactive questions fit the merged DB schema (question_templates + questions + question_versions).",
};

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const TEMPLATES_SQL = `CREATE TABLE public.question_templates (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                    TEXT NOT NULL UNIQUE,        -- "position-drag-drop-v1"
  interaction_type        TEXT NOT NULL CHECK (interaction_type IN (
                            'tap-select','drag-drop','fill-slot',
                            'sequence-order','build-count','number-line','partition')),
  template_html           TEXT NOT NULL,               -- full HTML with {{VAR}} placeholders
  props_schema            JSONB NOT NULL,              -- input contract (shape of variation_data)
  output_schema           JSONB NOT NULL,              -- output contract (shape getState() emits)
  answer_key_fn           TEXT,                        -- server-side fn: answer from variation_data
  structural_fingerprint  TEXT,                        -- hash of interaction skeleton (dedup)
  version                 INTEGER NOT NULL DEFAULT 1,
  status                  TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','review','active','deprecated')),
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);`;

const PAYLOAD_JSON = `{
  "variation_data":  { "...filled numbers/words/positions..." },
  "evaluation_spec": { "...canonical answer + binary/partial flag (server-only)..." },
  "locale": "en-IN",
  "content_hash": "…",
  "verifier_notes": "…"
}`;

// [#, field, purpose]
const TEMPLATE_FIELDS: [string, string, string][] = [
  ["1", "id", "PK — referenced by questions.template_id"],
  ["2", "slug", "unique human key"],
  ["3", "interaction_type", "which of the 7 archetypes"],
  ["4", "template_html", "HTML skeleton with {{VAR}} placeholders"],
  ["5", "props_schema", "input contract for the variation data"],
  ["6", "output_schema", "canonical shape the game emits"],
  ["7", "answer_key_fn", "server-side scorer"],
  ["8", "structural_fingerprint", "skeleton hash for dedup"],
  ["9", "version", "template version"],
  ["10", "status", "template lifecycle"],
  ["11", "created_at", "—"],
  ["12", "updated_at", "—"],
];

// [#, field, textual today, interactive fit, highlight?]
const QUESTION_FIELDS: [string, string, string, string, boolean][] = [
  ["1", "id", "bigint PK", "bigint PK", false],
  ["2", "learning_objective_id", "FK → learning_objectives", "same — resolved from old template's learning_objective text", false],
  ["3", "topic_id", "FK → topics", "same — resolved from old template's topic text", false],
  ["4", "subtopic_id", "FK → subtopics", "same — resolved from old template's subtopic text", false],
  ["5", "question_type", "mcq / fitb / drag_drop…", "interactive (one new enum value)", true],
  ["6", "current_version_id", "FK → question_versions", "same — points at the default variation row", false],
  ["7", "lifecycle_status", "active / draft / …", "same — old verifier_status='verified' → active", false],
  ["8", "retired_at", "nullable ts", "same", false],
  ["9", "repeat_policy_id", "FK → repeat_policies", "same — set to never_repeat so a correct answer never re-serves", false],
  ["10", "difficulty_band", "easy / medium / hard", "same — from old template/variation difficulty", false],
  ["11", "difficulty_rating", "numeric", "optional (nullable)", false],
  ["12", "bloom_level", "enum", "same", false],
  ["13", "usage_type", "placement / diagnostic", "homework (one new enum value)", true],
  ["14", "external_id", "text", "optional (e.g. old variation uuid)", false],
  ["15", "keywords", "text[]", "optional", false],
  ["16", "created_by_admin_user_id", "int", "same", false],
  ["17", "created_at", "ts", "same", false],
  ["18", "updated_at", "ts", "same", false],
  ["19", "grade_level", "text", "same", false],
  ["20", "grade", "text", "same — from old template grade", false],
  ["21", "template_id (NEW)", "NULL", "→ question_templates.id (the only added column)", true],
];

// [#, field, textual today, interactive fit, highlight?]
const VERSION_FIELDS: [string, string, string, string, boolean][] = [
  ["1", "id", "bigint PK", "bigint PK — the dedup key logged in attempts (one row per variation)", false],
  ["2", "question_id", "FK → questions", "same", false],
  ["3", "version_number", "edit revision", "the variation index (1–9)", true],
  ["4", "prompt", "question text", "the instruction / question text", false],
  ["5", "options", "mcq choices JSON", "null", false],
  ["6", "correct_answer", "answer string", "null (answer lives in payload.evaluation_spec)", false],
  ["7", "model_answer", "model answer", "null", false],
  ["8", "explanation", "explanation", "explanation (optional)", false],
  ["9", "payload", "type-specific extras JSON", "carries everything interactive: { variation_data, evaluation_spec, locale, content_hash, verifier_notes }", true],
  ["10", "time_allocated_ms", "timer", "per-question timer", false],
  ["11", "created_at", "ts", "same", false],
  ["12", "created_by_admin_user_id", "int", "same", false],
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-2xl font-extrabold" style={{ color: "var(--heading)" }}>
      {children}
    </h2>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono" style={{ color: "var(--accent-purple)" }}>
      {children}
    </code>
  );
}

function TableShell({
  headers,
  rows,
}: {
  headers: string[];
  rows: { cells: string[]; highlight?: boolean }[];
}) {
  return (
    <div
      className="overflow-x-auto rounded-2xl"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ background: "var(--surface-2)", color: "var(--text-dim)" }}>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ color: "var(--text)" }}>
          {rows.map((row) => (
            <tr
              key={row.cells[1] ?? row.cells[0]}
              style={{
                borderTop: "1px solid var(--border)",
                background: row.highlight
                  ? "color-mix(in oklab, var(--accent-purple) 8%, transparent)"
                  : undefined,
              }}
            >
              {row.cells.map((cell, ci) => (
                <td
                  key={`${row.cells[0]}-${ci}`}
                  className={ci === 0 ? "px-4 py-3 text-center" : "px-4 py-3"}
                  style={
                    ci === 1
                      ? { fontFamily: "var(--font-mono)", color: "var(--text)", whiteSpace: "nowrap" }
                      : ci === 0
                        ? { color: "var(--text-dim)" }
                        : undefined
                  }
                >
                  {ci === 3 && row.highlight ? (
                    <strong style={{ color: "var(--accent-purple)" }}>{cell}</strong>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function SchemaMigrationPage() {
  return (
    <main className="min-h-screen px-6 py-12" style={{ background: "var(--bg-warm)" }}>
      <div className="mx-auto w-full max-w-4xl">
        {/* Back */}
        <Link
          href="/homework-agent-docs"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold"
          style={{ color: "var(--text-dim)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Homework Agent Docs
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl ring-4 ring-white"
              style={{
                backgroundColor: "color-mix(in oklab, var(--accent-purple) 14%, transparent)",
                color: "var(--accent-purple)",
              }}
            >
              <Database className="h-7 w-7" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: "var(--heading)" }}>
                Schema Migration
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
                How homework interactive questions fit the merged DB schema.
              </p>
            </div>
          </div>

          <div
            className="flex items-start gap-3 rounded-2xl p-4"
            style={{
              background: "color-mix(in oklab, var(--accent-purple) 10%, transparent)",
              border: "1px solid color-mix(in oklab, var(--accent-purple) 40%, transparent)",
            }}
          >
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--accent-purple)" }} strokeWidth={2.2} />
            <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
              <strong>Net:</strong> only <Mono>question_templates</Mono> is new/rewritten.{" "}
              <Mono>questions</Mono> keeps all 20 fields + 1 added <Mono>template_id</Mono>.{" "}
              <Mono>question_versions</Mono> keeps all 12 fields unchanged — interactive variation
              data rides inside the existing <Mono>payload</Mono> JSONB. Two new enum values:{" "}
              <Mono>question_type='interactive'</Mono>, <Mono>usage_type='homework'</Mono>.
            </p>
          </div>
        </div>

        {/* 1. question_templates */}
        <section className="mb-12">
          <SectionTitle>
            1. <Mono>question_templates</Mono> — NEW schema (the only extra table)
          </SectionTitle>
          <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
            The skeleton-only table. All the duplicated fields (grade/topic/subtopic/LO/difficulty/status)
            are removed because they now live on <Mono>questions</Mono>.
          </p>
          <CodeBlock label="SQL" code={TEMPLATES_SQL} lang="sql" />
          <div className="mt-4">
            <TableShell
              headers={["#", "Field", "Purpose"]}
              rows={TEMPLATE_FIELDS.map((r) => ({ cells: r }))}
            />
          </div>
        </section>

        {/* 2. questions */}
        <section className="mb-12">
          <SectionTitle>
            2. <Mono>questions</Mono> — schema UNCHANGED (only adds <Mono>template_id</Mono>)
          </SectionTitle>
          <TableShell
            headers={["#", "Field", "Textual question (today)", "Interactive question (how it fits)"]}
            rows={QUESTION_FIELDS.map((r) => ({
              cells: [r[0], r[1], r[2], r[3]],
              highlight: r[4],
            }))}
          />
        </section>

        {/* 3. question_versions */}
        <section className="mb-12">
          <SectionTitle>
            3. <Mono>question_versions</Mono> — schema UNCHANGED. How interactive variation data fits
          </SectionTitle>
          <TableShell
            headers={["#", "Field", "Textual version (today)", "Interactive variation (how it fits)"]}
            rows={VERSION_FIELDS.map((r) => ({
              cells: [r[0], r[1], r[2], r[3]],
              highlight: r[4],
            }))}
          />
          <p className="mt-5 mb-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
            <Mono>payload</Mono> for an interactive row looks like:
          </p>
          <CodeBlock code={PAYLOAD_JSON} lang="json" />
        </section>
      </div>
    </main>
  );
}
