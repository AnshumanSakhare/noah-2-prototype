# Homework Agent API

> **Status: DOCS ONLY (design reference).** These endpoints are **not implemented yet**.
> The JSON shapes below are the contract we're agreeing on *before* wiring the DB.
> Field names follow the **merged schema** (`questions` + `question_versions` + skeleton
> `question_templates`) described in *Schema Merging* — that DB work lands later.

A homework session serves **20 questions** to a student:

| Bucket | Count | Source | What it looks like |
|--------|-------|--------|--------------------|
| Diagnostic — easy | 5 | `questions` where `usage_type='diagnostic'`, `difficulty_band='easy'` | textual (mcq / fitb / drag_drop): `prompt` + `options` |
| Diagnostic — medium | 5 | `usage_type='diagnostic'`, `difficulty_band='medium'` | textual |
| Diagnostic — hard | 5 | `usage_type='diagnostic'`, `difficulty_band='hard'` | textual |
| Interactive | 5 | `questions` where `question_type='interactive'` (`usage_type='homework'`) | gamified HTML — `question_templates.template_html` hydrated with `payload.variation_data` |

The flow is a **stateful session** (mirrors the diagnostic/placement test flow): create → serve one-by-one → submit attempts → complete → results.

Every response uses the **same envelope** as the rest of the repo: `{ success, data, meta, error }`
(see [lib/api-response.ts](../lib/api-response.ts)).

---

## Endpoints at a glance

| # | Endpoint | Returns |
|---|----------|---------|
| 1 | `POST /api/v1/homework/sessions` | **The selection engine** — builds the 20-question set, returns the manifest |
| 2 | `GET /api/v1/homework/sessions/{sessionId}` | Session state + per-question progress |
| 3 | `GET /api/v1/homework/sessions/{sessionId}/questions/{index}` | One fully-hydrated question (answer stripped) |
| 4 | `POST /api/v1/homework/sessions/{sessionId}/attempts` | Submit an answer (scored server-side, correctness hidden mid-session) |
| 5 | `POST /api/v1/homework/sessions/{sessionId}/complete` | Finalize the session, compute overall score |
| 6 | `GET /api/v1/homework/sessions/{sessionId}/results` | Full report with per-question breakdown + answers |
| 7 | `GET /api/v1/homework/availability` | Pre-check: how many questions exist before building a session |
| 8 | `GET /api/v1/homework/sessions?student_id=` | List a student's sessions |

Endpoints **1, 3, 4** are the core of the serving logic. The rest are state/reporting.

---

## Quick start (intended usage)

```bash
# 0. Can we even build a set for this grade/topic?
curl "http://localhost:3000/api/v1/homework/availability?grade=5&topic=Fractions"

# 1. Build the 20-question session (5 easy + 5 med + 5 hard diagnostic + 5 interactive)
curl -X POST http://localhost:3000/api/v1/homework/sessions \
  -H "Content-Type: application/json" \
  -d '{ "student_id":"stu_01H8Z...","grade":5,"topic":"Fractions" }'

# 2. Serve question at index 0 (hydrated, no answer)
curl "http://localhost:3000/api/v1/homework/sessions/hws_4f2a/questions/0"

# 3. Submit the answer
curl -X POST http://localhost:3000/api/v1/homework/sessions/hws_4f2a/attempts \
  -H "Content-Type: application/json" \
  -d '{ "index":0,"version_id":55012,"answer":"2/4","time_taken_ms":8200 }'

# 4. ...repeat 2-3 for indexes 1..19, then complete
curl -X POST http://localhost:3000/api/v1/homework/sessions/hws_4f2a/complete

# 5. Read the report
curl "http://localhost:3000/api/v1/homework/sessions/hws_4f2a/results"
```

---

## The two question kinds

The manifest mixes two shapes. Everything keys off `kind`:

| `kind` | from | served as | scored by |
|--------|------|-----------|-----------|
| `"diagnostic"` | `questions.question_type` ∈ `mcq` / `fitb` / `drag_drop` | `prompt` + `options[]` | compare against `question_versions.correct_answer` |
| `"interactive"` | `questions.question_type = 'interactive'` | hydrated `template_html` (HTML string) | `scoreAnswer(payload.evaluation_spec, answer)` — see [lib/scoring.ts](../lib/scoring.ts) |

**Key ID note (merged schema):** `version_id` = `question_versions.id` (bigint). That's the dedup key
logged per attempt — *one row per variation*. For interactive questions the variation index is
`question_versions.version_number` (1–9) and the renderable data lives in
`question_versions.payload.variation_data`. `question_templates.id` is a UUID referenced by
`questions.template_id`.

---

## 1. `POST /api/v1/homework/sessions` — build the set

The selection engine. Picks `5 easy + 5 medium + 5 hard` diagnostic questions + `5` interactive
questions for the student/grade/topic, persists the session, and returns the ordered manifest
(**no answers**).

**Request body**

| Field | Req | Notes |
|-------|-----|-------|
| `student_id` | ✅ | who the homework is for |
| `grade` | ✅ | `KG`,`1`–`8` — filters `questions.grade` |
| `topic` | — | exact, case-insensitive; repeatable as `topics[]` |
| `subtopic` | — | optional narrowing |
| `locale` | — | default `en-IN` |
| `blueprint` | — | override the default split (below) |
| `exclude_version_ids` | — | skip questions the student has already seen |

```jsonc
{
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
}
```

**Response `201`**

```jsonc
{
  "success": true,
  "data": {
    "session": {
      "id": "hws_4f2a9c",
      "student_id": "stu_01H8Z...",
      "grade": 5,
      "topic": "Fractions",
      "subtopic": "Equivalent Fractions",
      "locale": "en-IN",
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
    "questions": [                        // ordered manifest — NO answers, NO html yet
      { "index": 0,  "kind": "diagnostic", "question_id": 8842, "version_id": 55012,
        "question_type": "mcq",        "difficulty_band": "easy",   "bloom_level": "understand",
        "topic": "Fractions", "subtopic": "Equivalent Fractions" },

      { "index": 5,  "kind": "diagnostic", "question_id": 8910, "version_id": 55190,
        "question_type": "fitb",       "difficulty_band": "medium", "bloom_level": "apply",
        "topic": "Fractions", "subtopic": "Equivalent Fractions" },

      { "index": 15, "kind": "interactive", "question_id": 9001, "version_id": 71200,
        "interaction_type": "drag-drop", "difficulty_band": "medium",
        "template_id": "a3f1...-uuid", "template_slug": "fraction-bar-drag-v1" }
      /* ...20 items total: indexes 0-4 easy, 5-9 medium, 10-14 hard, 15-19 interactive */
    ]
  },
  "meta": { "requestId": "req_...", "timestamp": "2026-06-18T09:14:02.000Z" },
  "error": null
}
```

> **Selection rules**
> - Diagnostic: `usage_type='diagnostic'`, `lifecycle_status='active'`, matching `grade` (+`topic`/`subtopic`),
>   grouped by `difficulty_band`, `ORDER BY random()`, `LIMIT 5` each band. Joins `question_versions`
>   on `current_version_id` for `prompt`/`options`.
> - Interactive: `question_type='interactive'`, `lifecycle_status='active'`, template `status='active'`;
>   pick a random verified `question_versions` row (variation) per question, `LIMIT 5`.
> - If a band is short, the response returns fewer than 20 and `meta.warnings` lists the shortfall
>   (see Availability `#7` to pre-check). The set is **never** silently padded from another band.

---

## 2. `GET /api/v1/homework/sessions/{sessionId}` — session state

```jsonc
{
  "success": true,
  "data": {
    "session": {
      "id": "hws_4f2a9c", "student_id": "stu_01H8Z...", "status": "in_progress",
      "total_questions": 20, "served_count": 3, "answered_count": 2,
      "created_at": "2026-06-18T09:14:02.000Z", "started_at": "2026-06-18T09:14:30.000Z"
    },
    "progress": [
      { "index": 0, "kind": "diagnostic",  "served": true,  "answered": true  },
      { "index": 1, "kind": "diagnostic",  "served": true,  "answered": true  },
      { "index": 2, "kind": "diagnostic",  "served": true,  "answered": false },
      { "index": 3, "kind": "diagnostic",  "served": false, "answered": false }
      /* ...20 */
    ]
  },
  "meta": { "requestId": "req_...", "timestamp": "..." },
  "error": null
}
```

---

## 3. `GET /api/v1/homework/sessions/{sessionId}/questions/{index}` — serve one question

Returns the fully-renderable question at `index`. **Answer keys are always stripped.** This also
flips the question's `served` flag in the session.

**Diagnostic (textual) response**

```jsonc
{
  "success": true,
  "data": {
    "index": 0,
    "kind": "diagnostic",
    "question_id": 8842,
    "version_id": 55012,
    "question_type": "mcq",
    "difficulty_band": "easy",
    "bloom_level": "understand",
    "topic": "Fractions",
    "subtopic": "Equivalent Fractions",
    "prompt": "Which fraction is equivalent to 1/2?",
    "options": ["2/4", "1/3", "3/5", "2/3"],
    "time_allocated_ms": 60000
    // NO correct_answer, NO model_answer, NO explanation
  },
  "meta": { "requestId": "req_...", "timestamp": "..." },
  "error": null
}
```

**Interactive response** — `template_html` hydrated with `payload.variation_data` (every `{{VAR}}`
replaced, leftover tokens stripped, `window.SILENT_MODE = true` injected, fit-to-viewport shim added —
same hydration the existing `/api/homework/[id]/question/[index]` route does):

```jsonc
{
  "success": true,
  "data": {
    "index": 15,
    "kind": "interactive",
    "question_id": 9001,
    "version_id": 71200,
    "interaction_type": "drag-drop",
    "difficulty_band": "medium",
    "template_slug": "fraction-bar-drag-v1",
    "prompt": "Drag the shaded bars to build three-fourths.",
    "render": {
      "mode": "html",
      "html": "<div class=\"game\"> ...fully hydrated standalone HTML... </div>",
      "silent_mode": true,
      "output_schema": {            // canonical shape the game will emit (from question_templates)
        "type": "object",
        "properties": { "selected": { "type": "array", "items": { "type": "string" } } }
      }
    },
    "time_allocated_ms": 90000
    // NO evaluation_spec, NO answer
  },
  "meta": { "requestId": "req_...", "timestamp": "..." },
  "error": null
}
```

---

## 4. `POST /api/v1/homework/sessions/{sessionId}/attempts` — submit an answer

Scored **server-side**. By design (matching the existing homework flow) correctness is **not**
returned mid-session — the student only sees results at the end.

**Request — diagnostic**

```jsonc
{ "index": 0, "version_id": 55012, "answer": "2/4", "time_taken_ms": 8200 }
```

**Request — interactive** (`answer` is the canonical output object the game emits)

```jsonc
{ "index": 15, "version_id": 71200, "answer": { "selected": ["bar_1", "bar_2", "bar_3"] }, "time_taken_ms": 41000 }
```

**Response `201`** (acknowledgement only)

```jsonc
{
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
}
```

> Scoring is persisted but hidden: diagnostic → exact/normalized match vs `correct_answer`;
> interactive → `scoreAnswer(payload.evaluation_spec, answer)` returning `{ performance 0-100,
> isCorrect (>=70), breakdown }`. Re-submitting the same index creates a new attempt with an
> incremented `attempt_index`.

---

## 5. `POST /api/v1/homework/sessions/{sessionId}/complete` — finalize

Marks the session `completed` and computes the aggregate. Body optional: `{ "reason": "completed" }`.

```jsonc
{
  "success": true,
  "data": {
    "session_id": "hws_4f2a9c",
    "status": "completed",
    "overall_performance": 78,        // mean performance 0-100
    "answered": 20,
    "correct": 15,
    "completed_at": "2026-06-18T09:31:40.000Z"
  },
  "meta": { "requestId": "req_...", "timestamp": "..." },
  "error": null
}
```

---

## 6. `GET /api/v1/homework/sessions/{sessionId}/results` — full report

Now answers and breakdowns ARE included (post-completion).

```jsonc
{
  "success": true,
  "data": {
    "session_id": "hws_4f2a9c",
    "student_id": "stu_01H8Z...",
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
      {
        "index": 0, "kind": "diagnostic", "question_id": 8842, "version_id": 55012,
        "difficulty_band": "easy", "question_type": "mcq",
        "is_correct": true, "performance": 100,
        "student_answer": "2/4", "correct_answer": "2/4",
        "explanation": "1/2 = 2/4 because both numerator and denominator are doubled.",
        "time_taken_ms": 8200
      },
      {
        "index": 15, "kind": "interactive", "question_id": 9001, "version_id": 71200,
        "interaction_type": "drag-drop", "difficulty_band": "medium",
        "is_correct": false, "performance": 40, "scoring": "partial",
        "student_answer": { "selected": ["bar_1", "bar_2", "bar_3"] },
        "score_breakdown": { "matched": 2, "expected": 3, "reason": "missing bar_4" },
        "time_taken_ms": 41000
      }
      /* ...20 */
    ]
  },
  "meta": { "requestId": "req_...", "timestamp": "..." },
  "error": null
}
```

---

## 7. `GET /api/v1/homework/availability` — pre-check counts

Run before `POST /sessions` to confirm a 20-question set can be built. Params: `grade` (req),
`topic`, `subtopic`.

```jsonc
{
  "success": true,
  "data": {
    "grade": 5,
    "topic": "Fractions",
    "diagnostic": { "easy": 42, "medium": 38, "hard": 25 },
    "interactive": 12,
    "blueprint_needs": { "diagnostic": { "easy": 5, "medium": 5, "hard": 5 }, "interactive": 5 },
    "can_build_session": true,
    "shortfalls": []                  // e.g. [{ "bucket": "diagnostic.hard", "have": 3, "need": 5 }]
  },
  "meta": { "requestId": "req_...", "timestamp": "..." },
  "error": null
}
```

---

## 8. `GET /api/v1/homework/sessions?student_id=` — list sessions

```jsonc
{
  "success": true,
  "data": {
    "sessions": [
      { "id": "hws_4f2a9c", "topic": "Fractions", "status": "completed",
        "overall_performance": 78, "created_at": "2026-06-18T09:14:02.000Z" },
      { "id": "hws_1aa2bd", "topic": "Decimals", "status": "in_progress",
        "overall_performance": null, "created_at": "2026-06-17T11:02:10.000Z" }
    ],
    "pagination": { "total": 2, "limit": 20, "offset": 0, "returned": 2, "hasMore": false }
  },
  "meta": { "requestId": "req_...", "timestamp": "..." },
  "error": null
}
```

---

## Errors

Standard envelope, same codes as the rest of the API.

```jsonc
{
  "success": false,
  "data": null,
  "meta": { "requestId": "req_...", "timestamp": "..." },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more parameters are invalid.",
    "details": [ { "field": "grade", "issue": "Must be one of KG, 1-8." } ]
  }
}
```

| HTTP | `error.code` | When |
|------|--------------|------|
| 400 | `VALIDATION_ERROR` | bad/missing params (lists every bad field) |
| 404 | `NOT_FOUND` | unknown `sessionId` or `index` out of range |
| 409 | `SESSION_COMPLETED` | submitting an attempt to a completed session |
| 422 | `INSUFFICIENT_QUESTIONS` | DB can't fill the blueprint (see `details` for shortfalls) |
| 500 | `INTERNAL_ERROR` | unexpected server failure |

---

## Schema mapping (reference — *Schema Merging*)

What each served field comes from in the merged DB:

| API field | Source |
|-----------|--------|
| `question_id` | `questions.id` (bigint) |
| `version_id` | `question_versions.id` (bigint, the dedup key in attempts) |
| `question_type` | `questions.question_type` (`mcq`/`fitb`/`drag_drop`/`interactive`) |
| `usage_type` (filter) | `questions.usage_type` (`diagnostic` for the 15, `homework` for interactive) |
| `difficulty_band` | `questions.difficulty_band` |
| `bloom_level` | `questions.bloom_level` |
| `prompt` | `question_versions.prompt` |
| `options` | `question_versions.options` (null for interactive) |
| `correct_answer` (results only) | `question_versions.correct_answer` (null for interactive) |
| `time_allocated_ms` | `question_versions.time_allocated_ms` |
| `template_id` / `template_slug` | `questions.template_id` → `question_templates.id` / `.slug` |
| `interaction_type` | `question_templates.interaction_type` (one of the 7 archetypes) |
| `render.html` | `question_templates.template_html` hydrated with `question_versions.payload.variation_data` |
| `render.output_schema` | `question_templates.output_schema` |
| evaluation (server-only) | `question_versions.payload.evaluation_spec` (never sent to client) |

> **Persistence (planned):** sessions/attempts will live in `homework_sessions` /
> `homework_session_attempts` (or extend the existing `homework_assignments` / `homework_attempts`).
> Not decided here — this doc only fixes the **HTTP contract**.
