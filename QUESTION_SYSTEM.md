# EduQuest Dynamic Homework System Architecture

This document describes the database schemas, OpenAI question generation mechanics, and the hydration model used to serve interactive, multi-modality math games to students.

---

## 1. Database Schema

The database consists of 5 core tables that manage interactive game templates, parameter configurations, student assignments, results, and generation logs. The DDL is defined in [create-homework-tables.ts](file:///d:/BuildFastWithAI/diagnostic-agent-noah/scripts/create-homework-tables.ts).

### 1.1 `question_templates`
Stores the core HTML layout, styling, scripts, and validation criteria for a game. Multiple variations can refer to a single template.

```sql
CREATE TABLE public.question_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,             -- Unique string ID (e.g. "position-drag-drop-v1")
  grade               SMALLINT NOT NULL,                -- 0=KG, 1–8
  topic               TEXT NOT NULL,                    -- Spreadsheet Topic Name (e.g. "Comparing Numbers")
  subtopic            TEXT NOT NULL,                    -- Spreadsheet Subtopic Name
  learning_objective  TEXT NOT NULL,                    -- Target concept (e.g. "Count items 0-5")
  interaction_type    TEXT NOT NULL,                    -- Catalog archetype: tap-select, drag-drop, etc.
  difficulty          TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  template_html       TEXT NOT NULL,                    -- Standalone HTML containing {{VAR_NAME}} placeholders
  props_schema        JSONB NOT NULL,                   -- JSON Schema describing the placeholders shape
  answer_key_fn       TEXT,                             -- Server-side function (optional)
  structural_fingerprint TEXT,                          -- Hash for template deduplication
  version             INTEGER NOT NULL DEFAULT 1,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','active','deprecated')),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 `question_variations`
Stores specific instances (slates) of games by defining the parameters mapped to `question_templates`.

```sql
CREATE TABLE public.question_variations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id         UUID NOT NULL REFERENCES public.question_templates(id),
  variation_index     SMALLINT NOT NULL,               -- Slate index (1-3 for Easy, 1-3 for Medium, etc.)
  variation_data      JSONB NOT NULL,                  -- Parameter values (e.g., {"numberA": 8, "numberB": 5})
  answer_key          JSONB NOT NULL,                  -- Correct answer for evaluation (never sent to client)
  difficulty          TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  locale              TEXT NOT NULL DEFAULT 'en-IN',
  content_hash        TEXT,                            -- Hash of variation_data
  verifier_status     TEXT DEFAULT 'pending' CHECK (verifier_status IN ('pending','verified','failed')),
  verifier_notes      TEXT,
  last_edited_by      TEXT,                            -- Editor email or "ai_generator"
  last_edited_at      TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','active','deprecated')),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE (template_id, variation_index)
);
```

### 1.3 `homework_assignments`
Tracks assignments generated for a student containing dynamic question references.

```sql
CREATE TABLE public.homework_assignments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID NOT NULL,
  assigned_by         TEXT NOT NULL,                   -- "teacher" | "system"
  teacher_id          UUID,
  topic               TEXT NOT NULL,
  subtopic            TEXT,
  activity_count      SMALLINT NOT NULL,
  difficulty_mode     TEXT NOT NULL CHECK (difficulty_mode IN ('easy','medium','hard','adaptive')),
  question_ids        UUID[] NOT NULL,                 -- Array of question_variations.id
  status              TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','completed')),
  assigned_at         TIMESTAMPTZ DEFAULT now(),
  due_at              TIMESTAMPTZ,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ
);
```

### 1.4 `homework_attempts`
Records the student attempts and answer evaluations for each question.

```sql
CREATE TABLE public.homework_attempts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id       UUID NOT NULL REFERENCES public.homework_assignments(id),
  question_id         UUID NOT NULL REFERENCES public.question_variations(id),
  student_id          UUID NOT NULL,
  student_answer      JSONB,                           -- Student response payload
  is_correct          BOOLEAN,                         -- True / False
  time_taken_ms       INTEGER,                         -- Per-question timer
  attempt_index       SMALLINT NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ DEFAULT now()
);
```

### 1.5 `generation_runs`
Logs AI template creations and tester edits for audit tracking.

```sql
CREATE TABLE public.generation_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type            TEXT NOT NULL CHECK (run_type IN ('ai_generate','human_edit','re_verify')),
  template_id         UUID REFERENCES public.question_templates(id),
  variation_id        UUID REFERENCES public.question_variations(id),
  triggered_by        TEXT,                            -- User email or "tester_ai_generator"
  input_params        JSONB,
  output_snapshot     JSONB,
  verifier_result     TEXT CHECK (verifier_result IN ('pass','fail',null)),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);
```

---

## 2. OpenAI Generation Engine

The AI Generation engine runs inside [generate/route.ts](file:///d:/BuildFastWithAI/diagnostic-agent-noah/app/api/admin/generator/generate/route.ts). It reads HTML skeletons, CSS tokens, and interaction constraints from [.claude/htmlGenerate.md](file:///d:/BuildFastWithAI/diagnostic-agent-noah/.claude/htmlGenerate.md) and instructs the reasoning model (`gpt-5.4-mini` alias) to construct a self-contained game template and parameterized configuration.

### 2.1 API Input Parameters
```json
{
  "action": "create" | "regenerate",
  "grade": 0,                     // 0 for KG, 1-8 for Grade 1-8
  "topic": "2D Shapes",           // Exact spreadsheet topic name
  "difficulty": "easy",           // "easy" | "medium" | "hard"
  "variationIndex": 1,            // Target index (1, 2, 3)
  "interactionArchetype": "mcq",  // Best matching visual archetype
  "customPrompt": "optional hint",// Specific design instructions (revision notes)
  "variationId": "uuid"           // Required for action: "regenerate"
}
```

### 2.2 Excel Curriculum Context Parsing
To ensure the AI produces games that are mathematically and pedagogically aligned with the syllabus, the backend dynamically queries [Question Bank Plan - 13 ap.xlsx](file:///d:/BuildFastWithAI/diagnostic-agent-noah/Question%20Bank%20Plan%20-%2013%20ap.xlsx) upon receiving a generation request:
1. **Grade Alignment**: Grade values `0` translate to `"KG"`, while numeric grades `1-8` map to `"G1"` through `"G8"`.
2. **Topic Alignment**: Matches rows corresponding to the exact spreadsheet topic name.
3. **Information Extraction**: Extracts and dedupes three primary curriculum aspects from matching rows:
   - **Subtopics list** (`Subtopic` column)
   - **Learning Objectives (LO)** (`Learning Objective` column)
   - **Example Questions** (`Example Question` column)
4. **Context Injection**: These fields are structured into a text block (`xlsxPromptContext`) and appended to the AI's system prompt instructions to supply precise learning targets.

### 2.3 Output Zod Schema (Structured Outputs)
To comply with OpenAI constraints, nested custom objects are requested as JSON-serialized strings:
```typescript
const GenerateResponseSchema = z.object({
  learningObjective: z.string(),  // AI-generated learning objective
  interactionType: z.string(),    // tap-select, drag-drop, fill-slot, number-line etc.
  templateHtml: z.string(),       // Standalone HTML template containing double curly brace placeholders {{key}}
  propsSchemaJson: z.string(),    // JSON-encoded string describing variable schema types
  variationDataJson: z.string(),  // JSON-encoded string containing default variable values
  answerKeyJson: z.string()       // JSON-encoded string containing correct answer matching getState() output
});
```

### 2.4 System Prompt Core Logic
1. **Design Tokens**: Forces the model to use HSL variables (`--c-grape`, `--c-sky`, etc.) for backgrounds and interactive elements, preventing raw color declarations.
2. **Fixed Stage**: Elements must fit exactly inside a `760px × 520px` stage (`.game__stage`).
3. **JS Contract**: The generated page must expose standard JS functions:
   - `getState()`: Returns student's selected answer object.
   - `checkAnswer()`: Evaluates answer, highlights visual cards, writes feedback.
   - `resetGame()`: Resets visual chips and feedback text.
4. **Serialization**: Instructs the model to output JSON structures stringified to bypass validation rules.
5. **Absolute Custom Prompt Priority**: If a tester provides a custom guideline or change prompt (`customPrompt`), it overrides all default guidelines, template skeleton conventions, and parsed Excel curriculum contexts. A strict directive is appended at the very end of the system instructions, and warning override markers are embedded inside the user prompts to enforce absolute priority.

---

## 3. Hydration & Question Serving

A core design feature is separating the template (HTML skeleton) from the variation parameters (variables). This makes it easy to change numbers, text, or labels later simply by modifying JSON.

### 3.1 Template Placeholders
The template HTML generated by OpenAI contains placeholders wrapped in double curly brackets, e.g.:
```html
<p class="question__text">{{question_text}}</p>
<button class="token" onclick="selectSide('A')">{{numberA}}</button>
```

The Javascript code also parameterizes the correct answer checks:
```javascript
const CORRECT = "{{correctAnswer}}";
```

### 3.2 Dynamic Hydration
When a student loads a homework question, the server retrieves `template_html` and `variation_data` (JSONB).
The hydration helper recursively replaces placeholders:

```typescript
const hydrateTemplate = (html: string, data: any) => {
  if (!html) return "";
  let output = html;
  for (const key in data) {
    const val = data[key];
    const stringVal = typeof val === "object" ? JSON.stringify(val) : String(val);
    output = output.replaceAll(`{{${key}}}`, stringVal);
  }
  return output;
};
```

#### Example Hydration:
- **`variation_data` JSON**:
  ```json
  {
    "question_text": "Which side is larger?",
    "numberA": 8,
    "numberB": 5,
    "correctAnswer": "A"
  }
  ```
- **Resulting HTML served inside sandboxed `<iframe>`**:
  ```html
  <p class="question__text">Which side is larger?</p>
  <button class="token" onclick="selectSide('A')">8</button>
  const CORRECT = "A";
  ```

---

## 4. Editing and Regenerating
Because of this separation:
1. **Changing Values Directly**: Testers can edit fields (like `numberA` or `question_text`) directly in the QA panel. The client-side form updates the JSON parameters in `variation_data`, automatically triggering `hydrateTemplate` and refreshing the `<iframe>` sandbox in 400ms without changing the underlying template HTML.
2. **AI Revision / Edit**: When a tester writes a prompt (e.g. *"change the layout colors to sky-blue and use animal names instead of numbers"*), the current HTML template and JSON data are sent back to the AI. The model modifies the template, expands `propsSchemaJson` with new variables (e.g. `animalA`), and updates the default parameters in `variationDataJson`.

---

## 5. Silent Mode & Homework Evaluation Contract

For homework and formal assignments, the user flow dictates a **silent testing environment** where correctness is evaluated entirely server-side, and no instant correct/incorrect feedback (green/red overlays, checks/crosses) is presented to the student during the session.

### 5.1 Silent Mode Injection
When a question is requested for a homework assignment, the serving route ([question/[index]/route.ts](file:///d:/BuildFastWithAI/diagnostic-agent-noah/app/api/homework/%5BassignmentId%5D/question/%5Bindex%5D/route.ts)) injects a silent mode indicator script into the hydrated HTML header:

```html
<head>
<script>window.SILENT_MODE = true;</script>
...
</head>
```

This ensures the `window.SILENT_MODE` variable is globally set to `true` before any game scripts run.

### 5.2 Game Component Contract
All generated game templates must respect `window.SILENT_MODE` inside the `checkAnswer(el)` hook:
1. **Feedback Suppression**: Do not show visual overlays representing correct (green) or incorrect (red) states.
2. **Neutral Styling**: Apply a neutral selection style (e.g., a Grape-colored border/outline `3px solid var(--c-grape)`) to the tapped or selected option, indicating selection rather than validation.
3. **Parent Notification**: Immediately post a message containing the selection state to the parent iframe using:
   ```javascript
   window.parent.postMessage({ type: 'EDUQUEST_ANSWER', answer: getState() }, '*');
   ```
4. **Execution Flow**: The `checkAnswer()` function must still complete execution (to set the current answer state) but without writing success/fail text or playing sounds/emojis.

### 5.3 Server-Side Grading Flow
1. The student interacts with the game iframe.
2. Upon action completion, the game posts the `EDUQUEST_ANSWER` event with the state representation (`getState()`).
3. The parent runner component ([HomeworkRunner.tsx](file:///d:/BuildFastWithAI/diagnostic-agent-noah/components/homework/HomeworkRunner.tsx)) intercepts the event, measures the elapsed time for the question via `renderTimeRef`, and sends the response payload to the backend:
   ```http
   POST /api/homework/[assignmentId]/answer
   Content-Type: application/json

   {
     "question_id": "uuid",
     "student_answer": "...",
     "time_taken_ms": 4500
   }
   ```
4. The backend evaluation engine ([answer/route.ts](file:///d:/BuildFastWithAI/diagnostic-agent-noah/app/api/homework/%5BassignmentId%5D/answer/route.ts)) fetches the `answer_key` for the variation, grades it, writes a new `homework_attempts` record, and returns a silent acknowledgement:
   ```json
   { "success": true, "received": true }
   ```
5. No feedback is given to the student until they reach the `SuccessScreen`, where the overall score, subtopic accuracy breakdowns, and a review of correct/incorrect questions are computed and revealed.
