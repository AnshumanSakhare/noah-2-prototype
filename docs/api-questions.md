# Question Serving API — `/api/v1/questions`

A single, production-grade endpoint for serving questions from the question banks
with full filtering, pagination, and a **consistent JSON envelope on every
response** (success or failure).

- **Methods:** `GET` (query params) or `POST` (JSON body) — identical parameters.
- **Runtime:** Node.js. Reads only; never mutates.
- **Implementation:** route [app/api/v1/questions/route.ts](../app/api/v1/questions/route.ts) →
  service `serveQuestions()` in [contentQuiz.ts](../agents/diagnostic/tools/contentQuiz.ts) →
  envelope helpers in [lib/api-response.ts](../lib/api-response.ts).

---

## Parameters

| Param | Aliases | Values | Default | Notes |
|-------|---------|--------|---------|-------|
| `type` | `source`, `testType`, `mode` | `diagnostic`, `placement` | `diagnostic` | Picks the bank: `diagnostic` → `final_content_questions_1`, `placement` → `placement_test_questions_v2` |
| `subject` | — | `Maths`, `Science`, `English`, `Social Studies` (+ `math`, `social_studies`…) | — | Optional filter |
| `grade` | `classLevel`, `class` | `kg`, `1`–`8` (also `class5`, `grade5`) | — | Optional filter |
| `region` | — | `US`, `UK`, `UAE`, `Ontario`, `Australia` | `US` | Diagnostic only; always also includes `global`. Ignored for placement |
| `topic` | — | string | — | Exact match |
| `subtopic` | — | string | — | Exact match |
| `learningObjective` | `lo` | string | — | Exact match |
| `questionType` | `questionTypes`, `type_filter` | `mcq`, `true_false`, `fitb`, `matching`, `drag_drop`, `short_answer`, `word_problem`, `open_response` | — | CSV or repeated. Aliases: `dnd`→`drag_drop`, `gitb`→`fitb`, `tf`→`true_false` |
| `difficulty` | `difficulties` | `easy`, `medium`, `hard` | — | CSV or repeated |
| `bloom` | `blooms`, `bloomLevel` | `remember`, `understand`, `apply` | — | CSV or repeated |
| `search` | `q` | string | — | Case-insensitive substring on question text |
| `order` | — | `default`, `random`, `difficulty` | `default` | `difficulty` = easy→medium→hard |
| `limit` | — | `1`–`100` | `20` | Clamped to 100 |
| `offset` | — | `>= 0` | `0` | For pagination |
| `includeAnswers` | — | `true`/`false` | `false` | `false` strips answer keys (student-safe); `true` returns full payload |

Invalid values produce a `400 VALIDATION_ERROR` listing every offending field —
nothing is silently coerced.

---

## Response envelope

Every response — success or error — has the same top-level shape:

```jsonc
{
  "success": true,
  "data": { ... } | null,
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-06-12T10:00:00.000Z",
    ...
  },
  "error": null | { "code": "...", "message": "...", "details": [...] }
}
```

### Success — `data`

```jsonc
{
  "success": true,
  "data": {
    "questions": [ /* typed questions */ ],
    "pagination": {
      "total": 153,      // total matching the filters
      "limit": 20,
      "offset": 0,
      "returned": 20,    // count in this page
      "hasMore": true
    }
  },
  "meta": {
    "requestId": "…",
    "timestamp": "…",
    "source": "diagnostic",
    "includeAnswers": false,
    "filters": { "subject": "Maths", "grade": "class5", "region": "US",
                 "questionTypes": ["mcq","drag_drop"], "order": "default", ... }
  },
  "error": null
}
```

### Error

```jsonc
{
  "success": false,
  "data": null,
  "meta": { "requestId": "…", "timestamp": "…" },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more query parameters are invalid.",
    "details": [
      { "field": "grade", "issue": "\"12\" is not valid. Allowed: kg, 1-8." },
      { "field": "questionType", "issue": "\"essay\" is not valid. Allowed: mcq, true_false, fitb, matching, drag_drop, short_answer, word_problem, open_response." }
    ]
  }
}
```

Error codes: `VALIDATION_ERROR` (400), `INTERNAL_ERROR` (500).

---

## Examples

```bash
# Diagnostic Maths, grade 5, only MCQ + drag-and-drop, 10 per page
curl "http://localhost:3000/api/v1/questions?type=diagnostic&subject=Maths&grade=5&questionType=mcq,dnd&limit=10"

# Placement test questions for Science grade 3, hardest first
curl "http://localhost:3000/api/v1/questions?type=placement&subject=Science&grade=3&order=difficulty"

# UK region, fill-in-the-blank, page 2, with answer keys
curl "http://localhost:3000/api/v1/questions?region=UK&questionType=fitb&limit=20&offset=20&includeAnswers=true"

# POST form
curl -X POST http://localhost:3000/api/v1/questions \
  -H "Content-Type: application/json" \
  -d '{"type":"diagnostic","grade":"5","questionType":["mcq","fitb"],"difficulty":["easy","medium"],"limit":15}'
```
