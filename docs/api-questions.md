# Question Serving API

Read the question banks with filtering + pagination. Every response uses the **same envelope** `{ success, data, meta, error }`.

| Endpoint | Returns |
|----------|---------|
| `GET\|POST /api/v1/questions` | question rows (paginated) |
| `GET\|POST /api/v1/questions/facets` | counts by type/difficulty/bloom/rating/grade/topic |
| `GET /api/docs` | interactive Swagger UI |
| `GET /api/v1/openapi` | OpenAPI spec (Postman import) |

`GET` (query params) and `POST` (JSON body) take identical parameters.

---

## Quick start

```bash
# What exists? (counts, no rows)
curl "http://localhost:3000/api/v1/questions/facets?type=diagnostic&grade=5"

# Get 10 questions
curl "http://localhost:3000/api/v1/questions?type=diagnostic&grade=5&limit=10"

# Narrow: drag-and-drop, hard, rating >= 4
curl "http://localhost:3000/api/v1/questions?grade=5&questionType=dnd&difficulty=hard&minRating=4"
```

Tip: hit `/facets` first to see what's there, then pull rows with the same filters.

---

## What's actually in the DB

Profiled live (read-only): **diagnostic bank = 123,222 rows**, **placement = 120 rows**. Filter against reality:

| Field | Real values |
|-------|-------------|
| `question_type` | **only `mcq`, `fitb`, `drag_drop`** today (mcq ≈ 76%). Other types are accepted but have 0 rows. |
| `subject` | `Maths` (≈100%), rare `Geometry` (110 rows, grade 8). |
| `grade` | `KG`, `1`–`8` (diagnostic). Placement covers grades 3–8. |
| `region` | `global` + `US`/`UK`/`UAE`/`Ontario`/`Australia` (diagnostic only; each non-global ≈ 7,243 rows). |
| `difficulty` | `easy`, `medium`, `hard`. |
| `difficulty_rating` | `1`–`5`. |
| `bloom` | six buckets: `remember`(Knowing), `understand`, `apply`, `analyze`, `evaluate`, `create`. |
| topics / subtopics / LOs | 140 / 441 / 1,063 distinct (diagnostic). |
| `question_number` | placement only, `Q1`–`Q20`. |

Notes: `grade_level` and `question_number` exist **only** on placement. SVGs are sparse (~3% of diagnostic). The diagnostic output `bloomLevel` shows only `remember/understand/apply` (analyze/evaluate/create collapse to `apply`) — but **filtering by all six works**.

---

## Parameters

**Scope:** `type` (`diagnostic`|`placement`), `subject`, `grade`, `region` (diagnostic).

**Content filters:**

| Param | Notes |
|-------|-------|
| `topic` | exact, case-insensitive, **repeatable** (`?topic=A&topic=B`) — not comma-split |
| `subtopic`, `learningObjective` (`lo`) | exact, repeatable |
| `questionType` | CSV/repeated — `mcq`, `fitb`, `drag_drop` (aliases `dnd`, `gitb`, `tf`) |
| `difficulty` | CSV of `easy, medium, hard` |
| `bloom` | CSV of `remember, understand, apply, analyze, evaluate, create` |
| `minRating` / `maxRating` | `difficulty_rating` 1–5 |
| `search` (`q`) | substring on question text (the fuzzy tool) |
| `ids` / `excludeIds` | CSV of UUIDs — fetch exactly / skip these |
| `questionNumber` | placement only, e.g. `Q1` |

**List options:** `order` (`default`, `random`, `difficulty`, `difficulty_desc`, `rating`, `rating_desc`, `newest`, `oldest`), `limit` (1–100, default 20), `offset`, `includeAnswers` (default `false` = answer keys stripped).

Invalid values → `400 VALIDATION_ERROR` listing every bad field.

---

## Response

**Rows:**

```jsonc
{ "success": true,
  "data": {
    "questions": [ /* typed questions */ ],
    "pagination": { "total": 13081, "limit": 20, "offset": 0, "returned": 20, "hasMore": true }
  },
  "meta": { "requestId": "...", "timestamp": "...", "includeAnswers": false, "order": "default",
            "filters": { /* every resolved filter, nulls where unset */ } },
  "error": null }
```

**Facets:**

```jsonc
{ "success": true,
  "data": { "facets": {
    "total": 13081,
    "byQuestionType": [ { "value": "mcq", "count": 9999 }, ... ],
    "byDifficulty":   [ ... ], "byBloom": [ ... ], "byRating": [ ... ],
    "byGrade": [ ... ], "byTopic": [ ... ]
  } },
  "meta": { ... }, "error": null }
```

**Error:**

```jsonc
{ "success": false, "data": null,
  "meta": { "requestId": "...", "timestamp": "..." },
  "error": { "code": "VALIDATION_ERROR", "message": "One or more parameters are invalid.",
             "details": [ { "field": "minRating", "issue": "Must be a number between 1 and 5." } ] } }
```

---

## Recipes

```bash
# Authoring view, full answer keys, hardest-rated MCQs first
curl "http://localhost:3000/api/v1/questions?grade=5&questionType=mcq&order=rating_desc&limit=3&includeAnswers=true"

# Higher-order thinking (analyze/evaluate)
curl "http://localhost:3000/api/v1/questions?grade=7&bloom=analyze,evaluate"

# Two topics at once (repeat the param)
curl "http://localhost:3000/api/v1/questions?grade=5&topic=Percentages&topic=Decimal%20Arithmetic"

# Random set, excluding already-seen ids (POST)
curl -X POST http://localhost:3000/api/v1/questions \
  -H "Content-Type: application/json" \
  -d '{ "grade":"4","order":"random","limit":5,"excludeIds":["<uuid1>","<uuid2>"] }'

# Placement question by number
curl "http://localhost:3000/api/v1/questions?type=placement&grade=3&questionNumber=Q1&includeAnswers=true"
```

`total: 0` usually means that `grade`/`questionType` combo has no rows — run `/facets` to confirm what's there.
