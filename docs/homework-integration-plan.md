# Homework Serving → codingyoung Integration Plan

> **Goal:** implement the prototype's homework **serving logic** in the codingyoung backend
> (`noah-2-be`), on the **new merged schema (staging)**, while matching the diagnostic/placement
> APIs **exactly** — same response JSON, file structure, code style, validation, error envelope —
> so the frontend integrates it the same way it integrates diagnostic/placement.
>
> Reference inputs: prototype logic [lib/prototype-homework.ts](../lib/prototype-homework.ts);
> codingyoung conventions = `apps/diagnostic-test-agent` (routes → service → repository →
> `@noah-2/contracts`, Sequelize + raw SQL, Zod, DTO-direct responses, `materialise-at-start +
> dequeue-on-next` session model).

---

## 0. The one big simplification (read this first)

In the **prototype** the two pools live in different tables (`final_content_questions_1` for
diagnostic, `question_variations ⋈ question_templates` for interactive). **In codingyoung's merged
schema they are the SAME table** — `questions` (+ `question_versions`, `question_templates`):

| Pool | Prototype source | codingyoung (merged) source |
|------|------------------|------------------------------|
| Diagnostic (15) | `final_content_questions_1` | `questions WHERE usage_type='diagnostic'` (mcq/fitb/drag_drop) |
| Interactive (5) | `question_variations ⋈ question_templates` | `questions WHERE usage_type='homework' AND question_type='interactive'` ⋈ `question_versions` (payload) ⋈ `question_templates` |

So the whole feature reads from **one unified source**, the same `questions`/`question_versions`
the diagnostic/placement materialiser already uses — we just add `usage_type` filters and an
interactive branch. This is what makes "same code style" natural rather than forced.

---

## 1. Architecture decision — mirror the test-session model

The prototype is **read-only** (builds 20 on the fly, grades on the results page). codingyoung is
**stateful** (materialise a fixed question list at session start, dequeue on `/next`, persist
attempts, complete, report). To match diagnostic/placement we adopt the **stateful** model and move
the prototype's "build 20" logic into the **materialiser step at session start**:

```
prototype buildPrototypeHomework()   →  homework materialiser (runs inside POST /start)
prototype SERVE_PLAN order            →  test_session_questions.ordinal (fixed at start)
prototype gradePrototypeAnswers()     →  POST /attempts scoring (per-question, persisted)
```

Selection stays random at materialisation (fresh slate), then the order is **frozen** in
`test_session_questions` so `/next` is a deterministic replay.

---

## 2. Endpoints — **6 core + 1 builder = 7 total**

Each mirrors its diagnostic/placement twin 1:1 (same shapes, same middleware chain
`auth → studentOnly → validate → handler`, same DTO-direct responses + error envelope):

| # | Homework endpoint | Mirrors (test-sessions) | Purpose |
|---|---|---|---|
| 1 | `POST /v1/homework-sessions` | `POST /v1/test-sessions` | **Start** — run the 15+5 materialiser, persist the ordered set, return `HomeworkSession` |
| 2 | `GET /v1/homework-sessions/:id` | `GET /v1/test-sessions/:id` | Session state (progress, totalQuestions) |
| 3 | `POST /v1/homework-sessions/:id/next` | `POST /v1/test-sessions/:id/next` | Dequeue next question (diagnostic OR interactive) |
| 4 | `POST /v1/homework-sessions/:id/attempts` | `POST /v1/test-sessions/:id/attempts` | Submit answer → score (branch by type) → persist |
| 5 | `POST /v1/homework-sessions/:id/complete` | `POST /v1/test-sessions/:id/complete` | Finalize |
| 6 | `GET /v1/homework-sessions/:id/report` | `GET /v1/test-sessions/:id/report` | Report |
| 7 | `GET /v1/homework-sessions/topics?grade=&subjectId=` | (new, like a facets/availability call) | Builder dropdown — topics available for a grade (see §6 gating) |

> Start request is simpler than test-sessions (no `testId`): `{ grade, topicId, subjectId? }`.
> Homework isn't tied to a test definition — see persistence decision §7.

---

## 3. The serving logic, mapped into the materialiser

This is the heart — port [prototype-homework.ts](../lib/prototype-homework.ts) into a
`homework-materialiser` service. Same blueprint, merged-schema queries:

**Blueprint (unchanged from prototype):**
- Diagnostic split **5 / 5 / 5** (easy/med/hard); Interactive **2 / 2 / 1**; combined **7 / 7 / 6 = 20**.
- Serve order = the prototype `SERVE_PLAN` (D D D I D D I · D D D I D D I · D D D D D I).
- Diagnostic per band: **type variety round-robin** (mcq → drag_drop → fitb), random order, take 5.
- Interactive per band: random, take 2/2/1.
- **Nearest-band fallback** for both pools when a band is short.

**Queries (new schema):**
- Diagnostic candidates per band → extend the existing `findCandidatesForBandPerTopic` repo method
  with `usage_type='diagnostic'` + `question_type IN ('mcq','fitb','drag_drop')`,
  `lifecycle_status='active'`, `ORDER BY random()`.
- Interactive candidates → `questions q JOIN question_versions v ON v.id=q.current_version_id
  JOIN question_templates t ON t.id=q.template_id WHERE q.usage_type='homework' AND
  q.question_type='interactive' AND q.lifecycle_status='active' AND q.topic_id=$1 ORDER BY random()`,
  grouped by `difficulty_band`.

**Output:** insert `test_session_questions` rows with `ordinal` = slot, `status='pending'`, carrying
`question_id`, `question_version_id`, `difficulty_band`, `topic_id`, etc. — exactly like
`insertMaterialisedQuestions`.

---

## 4. ⭐ Fallback requirement — skip interactive gracefully

Interactive questions are sparse (and currently all **`draft`** on staging → an `active`-only filter
returns **zero** until they're promoted). The prototype already handles this:

```ts
for (const step of SERVE_PLAN) {
  const item = step.src === "d" ? dq[step.band].shift() : iq[step.band].shift();
  if (!item) continue;          // ← not enough data for this slot — skip gracefully
  questions.push({ ...item, slot });
}
```

Port this verbatim into the materialiser:
- If an interactive slot can't be filled → **drop the slot** (don't fail, don't backfill with
  diagnostic). The session simply has **fewer than 20** questions.
- `totalQuestions` = the **actual** materialised count (so the FE progress bar reads "Q n of 15"
  correctly).
- **Net effect today:** until the 30 interactive are promoted to `active`, homework sessions serve
  **15 diagnostic only** — and that's fine.

---

## 5. Served-question contract (interactive needs an extension)

Diagnostic/placement `ServedQuestion` returns `version { prompt, options, correctAnswer, payload, … }`.
Interactive questions render as **HTML**, so extend the served shape with a discriminator:

```
NextQuestionResponse =
  | { kind: "question", question: ServedHomeworkQuestion }
  | { kind: "session_complete", reason }

ServedHomeworkQuestion =
  | { source: "diagnostic",  ...ServedQuestion (version prompt/options/payload; answer server-side) }
  | { source: "interactive", testSessionQuestionId, ordinal, questionId, difficultyBand,
      interactionType, html /* hydrated template */, learningObjectiveId, ... }
```

- **Answer stays server-side** in both branches (diagnostic: `correctAnswer`/`payload.answerKey`;
  interactive: `payload.evaluation_spec` — never serialized to client).
- **Hydration:** port the prototype `hydrate()` (replace `{{VAR}}` from `payload.variation_data`,
  strip leftovers, inject `SILENT_MODE`, append fit-shim). **Decision (§9):** server-side hydrate →
  return ready `html` (simplest for FE, matches prototype). Alternatively return
  `{ templateHtml, variationData }` and let FE hydrate.

---

## 6. Topic gating (relax for fallback)

Prototype gated the topic dropdown to the **intersection** (topics present in *both* pools) to
guarantee a full 20. With the skip-fallback we **relax** that:
- Builder endpoint (#7) lists topics with **diagnostic** questions for the grade (required), and
  annotates whether interactive exists (`hasInteractive: boolean`, `interactiveCount`).
- A topic with no interactive is still valid → yields a 15-question (diagnostic-only) session.

---

## 7. Scoring (attempts) — branch by type

`POST /attempts` scores per question, persisted (unlike the prototype's results-only grading):
- **Diagnostic (textual):** reuse codingyoung's existing `classifyVerdict` + `computePointsAwarded`
  (mcq letter match, fitb normalized/acceptable, drag_drop answerKey) — already in their service.
- **Interactive:** **port `lib/scoring.ts`** (the generic 7-archetype engine) into a
  `homework-scoring` module; read `evaluation_spec` from `question_versions.payload.evaluation_spec`;
  map its 0–100 `performance`/`isCorrect` onto their `verdict` + `pointsAwarded` model.

Branch on `question.question_type === 'interactive'`.

---

## 8. Persistence — one decision to confirm with their rules

Homework needs a session that produces `test_session_questions` + `attempts`, but it is **not tied
to a `test` definition** (diagnostic/placement sessions carry `testId`). Two options:

- **A (recommended): new `homework_sessions` table** mirroring `test_sessions` (studentId, grade,
  topicId, startedAt, completedAt, totalQuestions), reusing `test_session_questions` + `attempts`
  (add a nullable `homework_session_id` or a polymorphic owner). Cleanest separation.
- **B: extend `test_sessions`** with `mode='homework'` + nullable `testId`. Less new surface, but
  pollutes the test-session model and its FKs.

Recommend **A**. Confirm against the codingyoung migration/Sequelize conventions in Stage 2.
(The unified `attempts` table already exists on staging and fits either option.)

---

## 9. What we reuse vs. build new (your "existing components" question)

**Reuse as-is (codingyoung):**
- Middleware chain: `cySso` (auth), `requireRole`/`studentOnly`, `validate(schema)`, error envelope.
- Response style: return DTO directly; let exceptions hit the global error middleware.
- Session infra patterns: materialise-at-start, atomic `dequeueNextPending` (`FOR UPDATE SKIP
  LOCKED`), attempt-in-transaction with progress rollups.
- Repo query patterns (`findCandidatesForBandPerTopic`, `findVersions`) — extend with `usage_type`.
- Textual scoring (`classifyVerdict`, `computePointsAwarded`).
- `attempts` + `test_session_questions` tables.

**Port from prototype:**
- The blueprint: 15+5 split, `SERVE_PLAN` order, type-variety round-robin, nearest-band fallback,
  **graceful skip** → into `homework-materialiser`.
- `hydrate()` (template_html + variation_data + SILENT_MODE + fit-shim).
- `scoreAnswer()` (interactive 7-archetype engine) → `homework-scoring`.
- Topic-availability query (adapted to merged `questions`).

**Build new:**
- `@noah-2/contracts` schemas: `homework-sessions.ts` (Start/Session/ServedHomeworkQuestion/
  NextQuestionResponse/SubmitAttempt/Report) + types.
- Routes `homework-sessions.ts`, service `homework-sessions.service.ts`, `homework.repository.ts`.
- `homework_sessions` migration (option A).

---

## 10. File/module layout (mirror their structure)

```
packages/contracts/src/schemas/homework-sessions.ts     # Zod schemas (+ types in types/index.ts)
packages/db/src/postgres/models/HomeworkSession.ts      # (option A) Sequelize model + migration
apps/diagnostic-test-agent/src/
  routes/homework-sessions.ts                            # mirror routes/test-sessions.ts
  services/homework-sessions.service.ts                  # lifecycle (start/next/attempt/complete/report)
  services/homework-materialiser.ts                      # the 15+5 blueprint + fallback
  services/homework-scoring.ts                           # ported scoreAnswer() (interactive)
  services/homework-hydrate.ts                           # ported hydrate()
  repositories/homework.repository.ts                    # candidate queries + session/TSQ/attempt writes
```

---

## 11. Build order (phased)

1. **Contracts** — define all homework Zod schemas/types (FE can start against the shapes immediately).
2. **Migration + repo** — `homework_sessions`; candidate-selection queries (diagnostic + interactive).
3. **Materialiser** — port blueprint + fallback; unit-test the 15+5 / skip behavior.
4. **Routes + service** — start/next/state, mirroring test-sessions.
5. **Scoring + attempts** — port `scoreAnswer`, branch textual/interactive; persist.
6. **Complete + report** — aggregate (by-difficulty, by-subtopic strength plan from prototype results).
7. **Builder topics endpoint** + integration tests.

---

## 12. Open questions to lock in Stage 2 (with their coding rules)

1. **Persistence:** option A (`homework_sessions`) vs B (`test_sessions.mode`)? — recommend A.
2. **Hydration site:** server returns hydrated `html` (recommended) vs `{ templateHtml, variationData }` for FE.
3. **Promotion:** who flips the 30 interactive `draft → active`? (Until then, sessions are diagnostic-only by the §4 fallback — acceptable.)
4. **App placement:** homework inside `apps/diagnostic-test-agent` vs its own app.
5. **Student identity / region:** prototype hardcodes `region: "US"` and `subject: "Math"` — confirm the real source in codingyoung.
6. **Diagnostic in merged schema:** confirm the 122k diagnostic questions carry the `payload`
   fields the prototype grading expects (`options`, `acceptableAnswers`, `answerKey`, visual SVGs).
```
