# Homework Agent — Serving Logic Analysis (prototype → integration report)

> **Purpose:** document exactly how the homework agent's **backend serving logic** works in
> this prototype repo (`diagnostic-agent-noah`), so it can be re-implemented in the
> **codingyoung backend** with their code-quality conventions and the **same API shape as
> their diagnostic / placement APIs**.
>
> **Scope:** backend serving only (selection → serve → score → report). Frontend is referenced
> only where it defines the wire contract. Stage 2 (separate) will analyze the codingyoung repo
> + their coding rules and finalize the target design.

---

## 1. TL;DR

The prototype serves interactive (template-rendered mini-game) homework with **6 routes** over
**4 tables**, raw `pg` SQL inline in each route. The loop is:

```
POST /api/homework/assign           → build an assignment (selection engine)         → { assignmentId, questionCount }
  for index 0..n-1:
    GET  /api/homework/{id}/question/{index}   → hydrated game HTML (answer stripped) → { data: { html, ... } }
    [game runs in iframe, posts window EDUQUEST_ANSWER message with canonical output]
    POST /api/homework/{id}/answer             → server-side scoring + persist        → { received: true }
GET  /api/homework/{id}/results     → report (per-question + difficulty/subtopic plan) → { data: {...} }

GET  /api/homework?student_id=      → list active (non-completed) assignments
GET  /api/homework/topic-counts     → available question counts per topic (builder)
```

Two hard invariants worth preserving:
- **The answer/evaluation_spec is never sent to the client during serving** — scoring is
  server-side only; the serve route returns HTML with no answer key, and `/answer` returns only
  `{ received: true }`.
- **Scoring is declarative + generic** — one engine ([lib/scoring.ts](../lib/scoring.ts)) handles all
  7 interaction archetypes from `evaluation_spec` + the student's canonical `output`.

---

## 2. Architecture / data flow

```
 Builder ──POST /assign──► [select question_variations by topic+difficulty,
                            filter seen(30d), shuffle] ──► homework_assignments(question_ids[])
 Runner  ──GET /question/{i}──► [load variation+template, hydrate {{VAR}}, inject SILENT_MODE,
                                 strip answer] ──► hydrated HTML (iframe)
 Game(iframe) ──postMessage EDUQUEST_ANSWER {answer}──► Runner
 Runner  ──POST /answer {question_id, student_answer, time}──► [scoreAnswer(evaluation_spec, output)
                                 → 0-100 + isCorrect; INSERT homework_attempts; if all answered →
                                 complete + overall_performance]
 Results ──GET /results──► [latest attempt per question, mean performance, by-difficulty,
                            by-subtopic strength plan, re-hydrated review HTML]
```

DB layer: [lib/db.ts](../lib/db.ts) — a single shared `pg` Pool (`max:20`), `query(text, params)`
helper. No ORM, no repositories. Every route is `export const runtime="nodejs"; dynamic="force-dynamic";`.

---

## 3. Endpoints (detailed)

### 3.1 `POST /api/homework/assign` — selection engine
File: [assign/route.ts](../app/api/homework/assign/route.ts)

Two paths:

**(a) Combine-all** (when body has `topics: string[]`): pulls **every** non-deprecated, non-failed
variation across those topics, orders easy→medium→hard, inserts one assignment with all of them
(`difficulty_mode='adaptive'`). Used by the builder's "Compile Homework".

**(b) Single-topic adaptive** (body: `student_id, topic, activity_count, difficulty_mode, teacher_id?`):
1. **Resolve target difficulty.** If `difficulty_mode='adaptive'`: read last 10 `homework_attempts`
   for student+topic, compute mean accuracy (performance/100, fallback is_correct). `>0.80` bump up,
   `<0.50` step down, else hold — relative to the most recent attempt's difficulty. Otherwise the
   mode IS the difficulty.
2. **Freshness.** Pull `question_id`s the student saw in the last 30 days (seen set).
3. **Candidate pool.** `question_variations` for topic+difficulty, `status<>'deprecated' AND
   verifier_status<>'failed'`; if empty, fall back to all difficulties for the topic.
4. **Select.** Prefer unseen; shuffle (`Math.random()`); backfill from seen (no dup) if short;
   final shuffle; cap at `activity_count`.
5. **Persist.** INSERT `homework_assignments(question_ids[], status='assigned', ...)`.

Response: `{ success, assignmentId, questionCount }`.

> ⚠️ Selection uses `Math.random()` shuffle (non-deterministic, not seedable) and does the
> shuffle/filter in JS after pulling candidate ids. Freshness/seen logic is **homework-only** — it
> does NOT exclude questions seen in the diagnostic/placement tests (see §7).

### 3.2 `GET /api/homework/{assignmentId}/question/{index}` — serve one hydrated question
File: [question/[index]/route.ts](../app/api/homework/[assignmentId]/question/[index]/route.ts)

1. Load assignment `question_ids`; bounds-check `index`.
2. If assignment `status='assigned'` → flip to `in_progress`, set `started_at`.
3. Load the variation + parent template (`variation_data, template_html, interaction_type, grade,
   topic, subtopic, learning_objective, slug`).
4. **Hydrate**: `replaceAll('{{key}}', value)` for every key in `variation_data` (objects → JSON);
   then strip any leftover `{{token}}` via regex; inject `<script>window.SILENT_MODE=true</script>`
   after `<head>`; append a fit-to-viewport shim before `</body>`.
5. Return `{ data: { id, interaction_type, grade, topic, subtopic, learning_objective, difficulty,
   template_slug, html, variation_data } }` — **no `evaluation_spec`/answer**.

### 3.3 `POST /api/homework/{assignmentId}/answer` — score + persist
File: [answer/route.ts](../app/api/homework/[assignmentId]/answer/route.ts)
Body: `{ question_id, student_answer, time_taken_ms }`.

1. Load assignment (`student_id, question_ids`).
2. Load `evaluation_spec` for the variation.
3. `scoreAnswer(evaluation_spec, student_answer)` → `{ performance, isCorrect, breakdown }`.
4. Compute next `attempt_index` (MAX+1 for this assignment+question — multi-attempt safe).
5. INSERT `homework_attempts`.
6. **Completion check:** if every `question_ids` has ≥1 attempt → compute overall = mean of the
   **latest attempt per question** (`DISTINCT ON (question_id) ... ORDER BY attempt_index DESC`),
   set assignment `status='completed', completed_at, overall_performance`.
7. Return `{ success, received: true }` — **never** correctness.

### 3.4 `GET /api/homework/{assignmentId}/results` — report
File: [results/route.ts](../app/api/homework/[assignmentId]/results/route.ts)

Joins attempts→variation→template, keeps **latest attempt per question_id**, then computes:
- `stats`: score (count correct), total, mean `performance` (0-100), avg/total time, per-difficulty means.
- `plan`: per-subtopic strength (`green ≥75 / yellow ≥50 / red <50`); falls back to topic when
  subtopic missing or `"Interactive AI"` placeholder.
- `attempts[]`: per-question detail **including `evaluation_spec`** (safe post-completion) and a
  re-hydrated **review** HTML (`SILENT_MODE` + `pointer-events:none`).

### 3.5 `GET /api/homework?student_id=` — list active
File: [route.ts](../app/api/homework/route.ts). Returns non-completed assignments for a student.

### 3.6 `GET /api/homework/topic-counts` — builder counts
File: [topic-counts/route.ts](../app/api/homework/topic-counts/route.ts). `{ topic → count }` of
servable variations. Used to populate the builder.

---

## 4. Client wire contract (for the `/answer` shape)

From [HomeworkRunner.tsx](../components/homework/HomeworkRunner.tsx):
- The hydrated HTML runs in an iframe. The game emits its canonical output via
  `window.parent.postMessage({ type: "EDUQUEST_ANSWER", answer })`.
- The runner stores that `answer` and POSTs it verbatim as `student_answer` (plus `time_taken_ms`
  measured client-side from render). **The server is the sole grader** — the client never decides
  correctness.

So `student_answer` is the canonical output object (e.g. `{ selected: "o_15" }`, `{ count: 12 }`,
`{ placements: {...} }`) matching the scoring engine's expected shape per type.

---

## 5. Scoring engine — [lib/scoring.ts](../lib/scoring.ts)

- 7 archetypes: `tap-select, drag-drop, fill-slot, sequence-order, build-count, number-line, partition`.
- Input: `EvaluationSpec { type, scoring?: "binary"|"partial", answer, min?, max? }` (number-line uses min/max).
- Output: `ScoreResult { performance: 0-100, isCorrect: performance>=70, breakdown }`.
- `PASS_THRESHOLD = 70`. Numeric-aware equality; defensive `normalizeOutput` wraps bare scalars into
  the canonical shape. **Never throws** — malformed input scores 0. Scoring math is fixed in code;
  `evaluation_spec` carries data only.

This file is **pure and portable** — it can move to the codingyoung backend almost verbatim.

---

## 6. DB schema (prototype) — [create-homework-tables.ts](../scripts/create-homework-tables.ts)

All **UUID** PKs, raw SQL, `updated_at` triggers.

- `question_templates` (fat): id, slug, grade, topic, subtopic, learning_objective, interaction_type,
  difficulty, **template_html**, props_schema, output_schema, answer_key_fn, structural_fingerprint,
  version, status('draft|review|active|deprecated').
- `question_variations`: id, template_id→templates, variation_index, **variation_data** (jsonb),
  **evaluation_spec** (jsonb, server-only), difficulty, locale, content_hash, verifier_status
  ('pending|verified|failed'), status, ...
- `homework_assignments`: id, student_id(uuid), assigned_by, teacher_id, topic, subtopic,
  activity_count, difficulty_mode('easy|medium|hard|adaptive'), **question_ids uuid[]**,
  status('assigned|in_progress|completed'), overall_performance(0-100), assigned/started/completed_at.
- `homework_attempts`: id, assignment_id, question_id, student_id, **student_answer**(jsonb),
  performance(0-100), is_correct, score_breakdown(jsonb), time_taken_ms, attempt_index.

---

## 7. ⚠️ The big gap: prototype schema ≠ codingyoung (staging) schema

This is the most important thing for integration. The prototype serves from
`question_variations` + (fat) `question_templates` on the **experimental** DB. But the codingyoung
**staging** DB stores interactive homework in the **merged schema** (verified earlier this session):

| Prototype (experimental) | codingyoung (staging, merged) |
|---|---|
| `question_variations.id` (uuid) | `questions.id` (bigint), `external_id` = old uuid |
| `question_variations.variation_data` | `question_versions.payload.variation_data` |
| `question_variations.evaluation_spec` | `question_versions.payload.evaluation_spec` (answer in `.answer`) |
| (fat) `question_templates.template_html` | (skeleton) `question_templates.template_html`, bigint PK + `template_uuid` |
| `question_templates.topic/subtopic/LO` (text) | `questions.topic_id/subtopic_id/learning_objective_id` (bigint FKs) |
| `homework_assignments` / `homework_attempts` | likely the unified `attempts` table (+ a session table) |
| servable filter: `status<>'deprecated' AND verifier_status<>'failed'` | `lifecycle_status='active'` (the 30 are currently **draft** → not servable yet) |

**Implication:** the SQL in every prototype route must be **rewritten** against
`questions ⋈ question_versions ⋈ question_templates`. The *algorithm* (select → hydrate → score →
report) ports directly; the *queries and field paths* do not. The hydration reads
`payload.variation_data` (not a top-level column), and scoring reads `payload.evaluation_spec`.

---

## 8. Code-quality gaps to fix in the port (to match codingyoung ethics)

The prototype is a working spike; expect to harden these when porting:

1. **Response envelope** — routes return ad-hoc `{ success, error }`. codingyoung diagnostic/placement
   use a consistent envelope (and the formal `ApiResponse` exists here in [lib/api-response.ts](../lib/api-response.ts)).
   Match theirs.
2. **No input validation** — bodies/params are destructured raw. Add schema validation (zod / their
   contracts package) like the diagnostic/placement endpoints.
3. **Inline raw SQL in routes** — move to a repository/service layer (codingyoung uses
   repositories + a contracts package).
4. **Non-deterministic selection** — `Math.random()` shuffle; consider a seeded/ordered selection so
   sets are reproducible and testable.
5. **No auth / no student-identity validation** — routes trust `student_id` from the body.
6. **Session model mismatch** — prototype uses `assign` + index addressing. codingyoung
   diagnostic/placement use a **test-session** flow (`start → next → attempt → complete → report`).
   The homework serve should be reshaped to that pattern (see §9) for "exact format" parity.
7. **Cross-test de-dup not handled** — homework freshness only excludes prior **homework**; it does
   not exclude questions the student already saw in diagnostic/placement. (Separate concern, already
   raised — the merged schema's `repeat_policy` + unified `attempts` is the proper fix.)

What's already good and should be kept: server-only grading, answer never leaked during serve, the
generic declarative scoring engine, the hydrate + SILENT_MODE pattern, latest-attempt-per-question
aggregation, completion detection.

---

## 9. Suggested target shape (to confirm against codingyoung in Stage 2)

To match their diagnostic/placement **session** APIs, the homework serve likely maps to:

| Prototype | Likely codingyoung equivalent |
|---|---|
| `POST /assign` | `POST /v1/homework-sessions` (start: build the set) |
| `GET /question/{index}` | `POST /v1/homework-sessions/:id/next` (or `GET .../questions/:index`) |
| `POST /answer` | `POST /v1/homework-sessions/:id/attempts` |
| (implicit on last answer) | `POST /v1/homework-sessions/:id/complete` |
| `GET /results` | `GET /v1/homework-sessions/:id/report` |
| `GET /topic-counts` | a counts/availability endpoint |

This mirrors the docs already drafted in [homework-agent-api.md](./homework-agent-api.md). Final naming
+ envelope to be locked once we read the codingyoung diagnostic/placement routes.

---

## 10. Open questions for Stage 2 (codingyoung repo)

1. What is the exact diagnostic/placement **route + envelope** format we must mirror (Express routes,
   contracts package, response shape)?
2. Where do homework **sessions + attempts** persist — reuse the unified `attempts` table + a new
   session table, or a homework-specific pair?
3. Promotion: who flips the 30 `draft` questions → `active`, and does the serve filter strictly on
   `lifecycle_status='active'`?
4. Student identity: the stable `student_id` used across diagnostic/placement/homework (for both
   selection and cross-test de-dup)?
5. Selection policy in the merged world: difficulty/topic resolution via FK ids, and the blueprint
   (e.g. 15 diagnostic + 5 interactive, or pure interactive sets)?
```
