# Diagnostic Agent — Question Serving & Schema Report

_Generated 2026-06-12. Source of truth: [`agents/diagnostic/tools/contentQuiz.ts`](../agents/diagnostic/tools/contentQuiz.ts), [`agents/diagnostic/types/index.ts`](../agents/diagnostic/types/index.ts), [`app/regional-questions/queries.ts`](../app/regional-questions/queries.ts), and `scripts/migrations/`._

## 1. How questions are served (end-to-end flow)

The whole serving path runs through **one entry endpoint** and **one service module**:

- **Endpoint:** `POST /api/quiz/section` ([app/api/quiz/section/route.ts](../app/api/quiz/section/route.ts)) → returns a quiz (list of questions) for the client.
- **Service:** [agents/diagnostic/tools/contentQuiz.ts](../agents/diagnostic/tools/contentQuiz.ts) → all DB loading + selection logic.
- **Submit:** `POST /api/quiz/submit` ([app/api/quiz/submit/route.ts](../app/api/quiz/submit/route.ts)) → grades answers, writes results.

### Test modes (branch in the route)

| Mode | Builder fn | Source table | Selection strategy |
|------|-----------|--------------|--------------------|
| `topic` | `getTopicQuizForClient()` | `final_content_questions_1` | Spread across learning objectives, enforce interactive quota, difficulty balance |
| `grade` | `getGradeQuizForClient()` | `final_content_questions_1` | Random per-topic sampling, hit difficulty targets (e.g. class5 = 6 easy / 8 med / 11 hard) |
| `placement` | `getPlacementQuizForClient()` | `placement_test_questions_v2` | All questions ordered Easy → Medium → Hard |
| `recurring` | `getRecurringTestForClient()` | `final_content_questions_1` | Re-tests previously failed topics/LOs |

### Pipeline

```
Client → POST /api/quiz/section  (testMode, subject, classLevel, topic, region)
        │
        ├─ load candidates from DB:  WHERE region IN ('global', $region)  + visual_mode filter
        ├─ getPreviouslyAnsweredQuestionIds()  ← joins student → assessments → question_results
        ├─ preferUnseenQuestions()             ← drop already-seen ids if enough remain
        ├─ select…()                           ← LO spread / difficulty targets / interactive quota
        └─ buildQuestion() per row             ← parse generation_metadata → typed payload
        ↓
Response: { quiz: { questions[], studentId, testMode … } }

Client → POST /api/quiz/submit  → evaluateQuestion() per answer → verdict
        → saveDiagnosticResult() → diagnostic_assessments + diagnostic_question_results
```

Two key filters applied at load time:

- **Region:** `region IN ('global', $region)` — every learner gets *global* questions **plus** their region's localized variants.
- **Visual-mode** (contentQuiz.ts:477): excludes SVG-only questions unless the type is `mcq`.

---

## 2. Database tables

There are **two families** of tables: the **question bank** (read-only source, pre-existing/external) and the **diagnostic results** (created by migrations in `scripts/migrations/`).

### A. `final_content_questions_1` — main region-aware question bank

The canonical SELECT is `CONTENT_QUESTION_SELECT` (contentQuiz.ts:455).

| Column | Type | Meaning |
|--------|------|---------|
| `id` | uuid | Question PK (cast to text in queries) |
| `question_type` | text | Format — see §3 |
| `question_text` | text | Prompt |
| `question_svg` | text? | Optional visual prompt |
| `subject` | text | Maths / Science / English / Social Studies |
| `grade` | text | `KG`, `1`…`8` |
| `topic`, `subtopic` | text | Categorization |
| `learning_objective` | text | LO descriptor (used to spread questions) |
| `blooms_level` | text | remember / understand / apply |
| `difficulty_level` | text | easy / medium / hard |
| `difficulty_rating` | int? | Numeric difficulty |
| `options` | jsonb | Choice array (can be overridden by `generation_metadata.payload.options`) |
| `explanation` | text? | Answer explanation |
| `generation_metadata` | jsonb | Holds the typed `payload` per question type |
| `region` | text | `global` / `US` / `UK` / `UAE` / `Ontario` / `Australia` |
| `parent_id` | uuid? | Links a regional variant → its US master |
| `visual_mode` | text? | Filter flag (`question_svg` = visual-only) |

Indexes (006_region_aware_diagnostic_questions.sql): `(region, subject, grade, topic)` and `(region, subject, grade, difficulty_level, topic)`.

> `final_content_questions` and `content_questions` are earlier/sibling tables (indexed in migrations 003 & 004), but live queries use **`final_content_questions_1`**.

### B. `placement_test_questions_v2` — placement bank

Same column shape as above (`id, question_type, question_text, subject, grade, grade_level, topic, subtopic, learning_objective, blooms_level, difficulty_level, difficulty_rating, options, explanation, generation_metadata`) plus `created_at` / `updated_at`. No `region` column — placement is region-agnostic.

### C. Diagnostic result tables (created by `001_diagnostic_results.sql`)

**`diagnostic_students`** — `id`, `display_name`, `normalized_name`, `current_class_level` (CHECK `kg,1..8`), timestamps. Unique on `(normalized_name, current_class_level)`.

**`diagnostic_assessments`** — one row per completed test:

- Identity: `student_id` (FK), `test_mode` (`topic`|`grade`), `subject`, `class_level`, `topic`, `region` (default `US`, added in migration 006)
- Scores: `readiness_score`, `attempted_readiness_score`, `overall_readiness_score`, `non_attempt_count`, `max_questions`, `total_questions_shown`, `question_bank_size`, `stopped_because`
- JSONB result blobs: `topic_results`, `learning_objective_results`, `subtopic_results`, `bloom_results`, `lesson_plan`, `distractor_insights`, `next_steps`, `engagement_gaps`, `behavioral_patterns`, `result_narrative`, `report_json`
- `ai_summary`, timestamps

**`diagnostic_question_results`** — one row per answered question:

- `assessment_id` (FK, cascade), `question_id` (**no FK** — dropped in migration 005), `question_order`
- Snapshot: `question_text`, `question_type`, `topic`, `subtopic`, `learning_objective`, `bloom_level`, `difficulty_level`
- Response: `student_answer`, `verdict` (CHECK `correct|partial|incorrect|non_attempt`), `feedback`, `why_wrong`, `time_taken_ms`, `allocated_time_ms`, `was_auto_skipped`
- JSONB: `question_snapshot`, `behavioral_signals`, `distractor_analysis`

This table is what `getPreviouslyAnsweredQuestionIds()` joins through to avoid re-serving seen questions.

### "Question version" / region mapping

There is **no separate `question_version` table**. Versioning/localization is modeled **within `final_content_questions_1`** via the **`parent_id` self-reference**:

- A **US** row is the "master".
- A **`UK` / `Ontario` / `UAE` / `Australia`** row is a localized **variant** whose `parent_id` points at the US master.
- **`global`** rows apply to all regions.

The mapping/parity logic lives in [app/regional-questions/queries.ts](../app/regional-questions/queries.ts): `getLocalizationParity()` counts US masters that have child variants in **all four** non-US regions (queries.ts:31); `getComparisonData()` groups children under their US parent by region (queries.ts:101).

---

## 3. Field value variety (enums)

All normalization functions live in contentQuiz.ts; union types in [agents/diagnostic/types/index.ts](../agents/diagnostic/types/index.ts).

### `question_type` (8 canonical types)

| Canonical | Accepted DB spellings | Payload shape (from `generation_metadata.payload`) |
|-----------|----------------------|---------------------------------------------------|
| **`mcq`** | `mcq` | `{ options:[{text, correct, svg?}], explanation? }` |
| **`true_false`** | `true_false` | `{ correctAnswer:bool, misconceptionNote? }` |
| **`fitb`** (fill-in-the-blank) | `fitb` | `{ answer, distractors?, hint? }` |
| **`matching`** | `matching` | `{ premises[], responses[], answerKey:[{prompt,match}] }` |
| **`drag_drop`** | `drag_drop`, `drag n drop`, `drag_n_drop`, `drag-and-drop` | `{ draggableItems[], dropZones[], answerKey:[{item,target}] }` |
| **`short_answer`** | `short_answer` (also fallback for unknown) | `{ modelAnswer, scoringGuidance? }` |
| **`word_problem`** | `word_problem` | `{ scenario?, solutionSteps?, finalAnswer, hints?, requiresCalculation? }` |
| **`open_response`** | `open_response` | `{ exemplarAnswer, rubric?, scoringGuidance? }` |

> Terminology mapping: **dnd** = `drag_drop`, **gitb/fitb** = `fitb`, **mcq** = `mcq`. `toQuestionType()` (contentQuiz.ts:132) canonicalizes messy spellings.
>
> **Interactive types** = `fitb` + `drag_drop`. Diagnostic quizzes enforce a minimum of **2 fitb + 1 drag_drop** (contentQuiz.ts:58).

### Other categorical fields

| Field | Allowed values | Default / fallback |
|-------|---------------|--------------------|
| `subject` | `Maths`, `Science`, `English`, `Social Studies` | `Maths` |
| `grade` / class level | `KG` + `1`–`8` (stored); typed as `classKG`,`class1`…`class8` | `classKG` |
| `blooms_level` | `remember`, `understand`, `apply` | `apply` |
| `difficulty_level` | `easy`, `medium`, `hard` | `easy` |
| `region` | `global`, `US`, `UK`, `UAE`, `Ontario`, `Australia` | `US` |
| `verdict` (results) | `correct`, `partial`, `incorrect`, `non_attempt` | — |
| `test_mode` | `topic`, `grade` (+ `placement`, `recurring` at runtime) | — |
| LO mastery status | `mastered`, `developing`, `partial`, `needs_teaching`, `likely_weak` | — |

---

## Summary

- **Serving** is centralized: `POST /api/quiz/section` → `contentQuiz.ts` builders → one of two source tables, filtered by **region** and **already-seen** questions, then balanced across **learning objectives / difficulty / interactive quota**.
- **Question bank** = `final_content_questions_1` (region-aware) + `placement_test_questions_v2`. Localization is done **in-table** via `parent_id` (US master → regional children + `global`), not a separate version table.
- **Results** are persisted to `diagnostic_students` → `diagnostic_assessments` → `diagnostic_question_results`.
- **8 question types** (mcq, true_false, fitb, matching, drag_drop, short_answer, word_problem, open_response), each with a distinct JSON payload nested in `generation_metadata.payload`.
