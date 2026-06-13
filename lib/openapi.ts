/**
 * OpenAPI 3.0 specification for the public API surface.
 *
 * Kept as a plain object so it can be served as JSON ( /api/v1/openapi ),
 * rendered by Swagger UI ( /api/docs ), or imported into Postman/Insomnia.
 */

// Reusable parameter definitions (shared between GET query and POST body docs).
const FILTER_PARAMETERS = [
  {
    name: "type",
    in: "query",
    description:
      "Which bank to read.\n- `diagnostic` → `final_content_questions_1` (region-aware, the adaptive test bank)\n- `placement` → `placement_test_questions_v2` (the fixed Q1–Q20 placement set)\n\nAliases: `diagnostic_test`, `placement_test`.",
    schema: {
      type: "string",
      enum: ["diagnostic", "placement"],
      default: "diagnostic",
    },
  },
  {
    name: "subject",
    in: "query",
    description:
      "The banks are ~100% `Maths` today (plus a rare `Geometry`). Aliases: `math`, `social_studies`.",
    schema: {
      type: "string",
      enum: ["Maths", "Geometry", "Science", "English", "Social Studies"],
    },
  },
  {
    name: "grade",
    in: "query",
    description:
      "Grade level. Accepts `kg` or `1`–`8` (also `class5`, `grade5`). In the sample placement data, grades 3–8 each hold 20 questions.",
    schema: { type: "string", example: "5" },
  },
  {
    name: "region",
    in: "query",
    description:
      "Diagnostic only. Results ALWAYS also include `global` questions; this just adds the region-specific variants. Ignored for placement.",
    schema: {
      type: "string",
      enum: ["US", "UK", "UAE", "Ontario", "Australia"],
      default: "US",
    },
  },
  {
    name: "topic",
    in: "query",
    description:
      "Exact topic match (case-insensitive). Repeat the param for several topics — e.g. `?topic=Decimals&topic=Percentages`. NOT comma-split, because topic names contain commas. (~140 distinct topics in the diagnostic bank.)",
    schema: { type: "string", example: "Percentages" },
  },
  {
    name: "subtopic",
    in: "query",
    description: "Exact subtopic match (case-insensitive). Repeatable.",
    schema: { type: "string" },
  },
  {
    name: "learningObjective",
    in: "query",
    description:
      "Exact learning-objective match (case-insensitive). Repeatable. Alias: `lo`. (For fuzzy matching, use `search` instead.)",
    schema: { type: "string" },
  },
  {
    name: "questionType",
    in: "query",
    description:
      "Comma-separated or repeated. The banks currently contain only `mcq`, `fitb`, `drag_drop`. (Other diagnostic types — true_false, matching, short_answer, word_problem, open_response — are accepted but have no rows yet.) Aliases: `dnd`→drag_drop, `gitb`→fitb, `tf`→true_false.",
    schema: { type: "string", example: "mcq,dnd" },
  },
  {
    name: "difficulty",
    in: "query",
    description: "Comma-separated subset of `easy, medium, hard`.",
    schema: { type: "string", example: "easy,medium" },
  },
  {
    name: "bloom",
    in: "query",
    description:
      "Comma-separated subset of `remember, understand, apply, analyze, evaluate, create`. The banks store `Knowing/Understanding/Applying/Analyzing/Evaluating/Creating`; these are matched for you. (Output `bloomLevel` collapses the top three to `apply`.)",
    schema: { type: "string", example: "analyze,evaluate" },
  },
  {
    name: "minRating",
    in: "query",
    description: "Minimum `difficulty_rating` (1–5).",
    schema: { type: "integer", minimum: 1, maximum: 5, example: 3 },
  },
  {
    name: "maxRating",
    in: "query",
    description: "Maximum `difficulty_rating` (1–5).",
    schema: { type: "integer", minimum: 1, maximum: 5, example: 5 },
  },
  {
    name: "ids",
    in: "query",
    description: "Restrict to specific question ids (comma-separated UUIDs).",
    schema: { type: "string" },
  },
  {
    name: "excludeIds",
    in: "query",
    description:
      "Exclude specific question ids (comma-separated UUIDs). Handy to avoid re-serving questions a student already saw. Alias: `notIds`.",
    schema: { type: "string" },
  },
  {
    name: "questionNumber",
    in: "query",
    description: "Placement only. Exact `question_number`, e.g. `Q1` (Q1–Q20).",
    schema: { type: "string", example: "Q1" },
  },
  {
    name: "search",
    in: "query",
    description:
      "Case-insensitive substring match on the question text. Alias: `q`.",
    schema: { type: "string" },
  },
] as const;

const LIST_ONLY_PARAMETERS = [
  {
    name: "order",
    in: "query",
    description:
      "Sort order:\n- `default` — stable, grouped by subject/topic/LO/difficulty\n- `random` — random sample\n- `difficulty` / `difficulty_desc` — easy→hard / hard→easy\n- `rating` / `rating_desc` — by difficulty_rating\n- `newest` / `oldest` — by created_at",
    schema: {
      type: "string",
      enum: [
        "default",
        "random",
        "difficulty",
        "difficulty_desc",
        "rating",
        "rating_desc",
        "newest",
        "oldest",
      ],
      default: "default",
    },
  },
  {
    name: "limit",
    in: "query",
    description: "Page size (clamped to 100).",
    schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
  },
  {
    name: "offset",
    in: "query",
    description: "Rows to skip (pagination).",
    schema: { type: "integer", minimum: 0, default: 0 },
  },
  {
    name: "includeAnswers",
    in: "query",
    description:
      "When `false` (default) answer keys are stripped (student-safe): `correctAnswer`, `modelAnswer`, and payload answer keys are removed. Set `true` for full payloads (authoring/grading).",
    schema: { type: "boolean", default: false },
  },
] as const;

const QUERY_BODY_EXAMPLE = {
  type: "diagnostic",
  subject: "Maths",
  grade: "5",
  topic: ["Percentages"],
  questionType: ["mcq", "dnd"],
  difficulty: ["easy", "medium"],
  bloom: ["apply", "analyze"],
  minRating: 2,
  maxRating: 4,
  excludeIds: [],
  order: "difficulty",
  limit: 15,
  offset: 0,
  includeAnswers: false,
};

// Realistic response bodies so Swagger UI's "Example Value" is self-explanatory.
const QUESTION_LIST_EXAMPLE = {
  success: true,
  data: {
    questions: [
      {
        id: "8f1c2a3b-4d5e-6f70-8a9b-0c1d2e3f4a5b",
        subject: "Maths",
        topic: "Percentages",
        subtopic: "Finding a percentage of an amount",
        learningObjective: "Students can find a percentage of a quantity.",
        classLevel: "class5",
        bloomLevel: "apply",
        questionType: "mcq",
        difficultyLevel: "medium",
        difficultyRating: 3,
        question: "What is 25% of 80?",
        options: ["15", "20", "25", "40"],
        explanation: "25% is one quarter, and 80 ÷ 4 = 20.",
        keywords: ["percentages", "quarter", "of"],
        region: "global",
        payload: {},
      },
    ],
    pagination: {
      total: 1689,
      limit: 20,
      offset: 0,
      returned: 1,
      hasMore: true,
    },
  },
  meta: {
    requestId: "7be7359d-faa5-4f6b-b2e7-46c0c79ada2b",
    timestamp: "2026-06-12T08:57:22.377Z",
    includeAnswers: false,
    order: "default",
    filters: {
      source: "diagnostic",
      subject: "Maths",
      grade: "class5",
      region: "US",
      topics: ["Percentages"],
      questionTypes: ["mcq"],
    },
  },
  error: null,
};

const FACETS_EXAMPLE = {
  success: true,
  data: {
    facets: {
      total: 13081,
      byQuestionType: [
        { value: "mcq", count: 9999 },
        { value: "fitb", count: 1700 },
        { value: "drag_drop", count: 1382 },
      ],
      byDifficulty: [
        { value: "easy", count: 5200 },
        { value: "medium", count: 5100 },
        { value: "hard", count: 2781 },
      ],
      byBloom: [
        { value: "Applying", count: 6000 },
        { value: "Analyzing", count: 3500 },
        { value: "Understanding", count: 2200 },
      ],
      byRating: [
        { value: "1", count: 4500 },
        { value: "3", count: 4000 },
      ],
      byGrade: [{ value: "5", count: 13081 }],
      byTopic: [
        { value: "Percentages", count: 1689 },
        { value: "Decimal Arithmetic", count: 1457 },
      ],
    },
  },
  meta: {
    requestId: "1a2b3c4d-5e6f-7081-9a0b-1c2d3e4f5061",
    timestamp: "2026-06-12T08:57:22.377Z",
    filters: { source: "diagnostic", grade: "class5" },
  },
  error: null,
};

const VALIDATION_ERROR_EXAMPLE = {
  success: false,
  data: null,
  meta: {
    requestId: "9f8e7d6c-5b4a-3210-fedc-ba9876543210",
    timestamp: "2026-06-12T08:57:22.377Z",
  },
  error: {
    code: "VALIDATION_ERROR",
    message: "One or more parameters are invalid.",
    details: [
      { field: "grade", issue: '"12" is not valid. Allowed: kg, 1-8.' },
      {
        field: "bloom",
        issue:
          '"foo" is not valid. Allowed: remember, understand, apply, analyze, evaluate, create.',
      },
    ],
  },
};

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Diagnostic Agent — Question Serving API",
    version: "1.1.0",
    description: [
      "Filterable, paginated read access to the **diagnostic** and **placement** question banks.",
      "",
      "**Consistent envelope.** Every response — success or error — has the same top-level shape:",
      "`{ success, data, meta, error }`. On success `error` is `null`; on failure `data` is `null`.",
      "",
      "**Two endpoints:**",
      "- `GET|POST /api/v1/questions` — the rows (paginated).",
      "- `GET|POST /api/v1/questions/facets` — aggregated counts for the same filters (what data exists).",
      "",
      "**Answer safety.** By default answer keys are stripped (`includeAnswers=false`). Set `includeAnswers=true` to author or grade.",
    ].join("\n"),
  },
  servers: [{ url: "/", description: "Current host" }],
  tags: [
    { name: "Questions", description: "Serve questions from the banks" },
    { name: "Facets", description: "Aggregated counts" },
  ],
  paths: {
    "/api/v1/questions": {
      get: {
        tags: ["Questions"],
        summary: "Serve questions (query params)",
        description: [
          "Returns a paginated list of questions matching the supplied filters.",
          "",
          "**Try these:**",
          "- `?type=diagnostic&grade=5&limit=10`",
          "- `?grade=5&questionType=mcq,dnd&difficulty=hard&minRating=4`",
          "- `?grade=7&bloom=analyze,evaluate&includeAnswers=true`",
          "- `?type=placement&grade=3&questionNumber=Q1&includeAnswers=true`",
        ].join("\n"),
        operationId: "getQuestions",
        parameters: [...FILTER_PARAMETERS, ...LIST_ONLY_PARAMETERS],
        responses: {
          "200": {
            description: "Questions matching the filters.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/QuestionListResponse" },
                example: QUESTION_LIST_EXAMPLE,
              },
            },
          },
          "400": {
            description: "Validation error.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: VALIDATION_ERROR_EXAMPLE,
              },
            },
          },
          "500": {
            description: "Internal error.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Questions"],
        summary: "Serve questions (JSON body)",
        description:
          "Identical parameters to GET, supplied as a JSON body. Array params (topic, questionType, ids…) can be real JSON arrays.",
        operationId: "postQuestions",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/QuestionQuery" },
              example: QUERY_BODY_EXAMPLE,
            },
          },
        },
        responses: {
          "200": {
            description: "Questions matching the filters.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/QuestionListResponse" },
                example: QUESTION_LIST_EXAMPLE,
              },
            },
          },
          "400": {
            description: "Validation error.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: VALIDATION_ERROR_EXAMPLE,
              },
            },
          },
        },
      },
    },
    "/api/v1/questions/facets": {
      get: {
        tags: ["Facets"],
        summary: "Aggregated counts (query params)",
        description: [
          "Counts grouped by question type, difficulty, bloom, rating, grade, and topic for the questions matching the SAME filters as `/api/v1/questions` (pagination/order/includeAnswers are ignored here).",
          "",
          "Use it to see what data exists before fetching rows — e.g. `?type=diagnostic&grade=5`.",
        ].join("\n"),
        operationId: "getQuestionFacets",
        parameters: [...FILTER_PARAMETERS],
        responses: {
          "200": {
            description: "Facet counts.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FacetsResponse" },
                example: FACETS_EXAMPLE,
              },
            },
          },
          "400": {
            description: "Validation error.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: VALIDATION_ERROR_EXAMPLE,
              },
            },
          },
        },
      },
      post: {
        tags: ["Facets"],
        summary: "Aggregated counts (JSON body)",
        operationId: "postQuestionFacets",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/QuestionQuery" },
            },
          },
        },
        responses: {
          "200": {
            description: "Facet counts.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FacetsResponse" },
                example: FACETS_EXAMPLE,
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      QuestionQuery: {
        type: "object",
        description:
          "Filter + pagination parameters (same set as the GET query).",
        properties: {
          type: {
            type: "string",
            enum: ["diagnostic", "placement"],
            default: "diagnostic",
          },
          subject: {
            type: "string",
            enum: ["Maths", "Geometry", "Science", "English", "Social Studies"],
          },
          grade: { type: "string", example: "5" },
          region: {
            type: "string",
            enum: ["US", "UK", "UAE", "Ontario", "Australia"],
            default: "US",
          },
          topic: {
            oneOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } },
            ],
            description: "Exact topic(s), case-insensitive.",
          },
          subtopic: {
            oneOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } },
            ],
          },
          learningObjective: {
            oneOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } },
            ],
          },
          questionType: {
            oneOf: [
              { type: "string", example: "mcq,dnd" },
              { type: "array", items: { type: "string" } },
            ],
          },
          difficulty: {
            oneOf: [
              { type: "string", example: "easy,medium" },
              { type: "array", items: { type: "string" } },
            ],
          },
          bloom: {
            oneOf: [
              { type: "string", example: "analyze,evaluate" },
              { type: "array", items: { type: "string" } },
            ],
          },
          minRating: { type: "integer", minimum: 1, maximum: 5 },
          maxRating: { type: "integer", minimum: 1, maximum: 5 },
          ids: {
            oneOf: [
              { type: "string" },
              { type: "array", items: { type: "string", format: "uuid" } },
            ],
          },
          excludeIds: {
            oneOf: [
              { type: "string" },
              { type: "array", items: { type: "string", format: "uuid" } },
            ],
          },
          questionNumber: { type: "string", example: "Q1" },
          search: { type: "string" },
          order: {
            type: "string",
            enum: [
              "default",
              "random",
              "difficulty",
              "difficulty_desc",
              "rating",
              "rating_desc",
              "newest",
              "oldest",
            ],
            default: "default",
          },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          offset: { type: "integer", minimum: 0, default: 0 },
          includeAnswers: { type: "boolean", default: false },
        },
      },
      Question: {
        type: "object",
        description:
          "A typed question. Answer-bearing fields (correctAnswer, modelAnswer, payload answer keys) appear only when includeAnswers=true.",
        properties: {
          id: { type: "string", format: "uuid" },
          subject: { type: "string", example: "Maths" },
          topic: { type: "string", example: "Numbers up to 1,000" },
          subtopic: { type: "string" },
          learningObjective: { type: "string" },
          classLevel: { type: "string", example: "class5" },
          bloomLevel: {
            type: "string",
            enum: ["remember", "understand", "apply"],
          },
          questionType: {
            type: "string",
            enum: [
              "mcq",
              "true_false",
              "fitb",
              "matching",
              "drag_drop",
              "short_answer",
              "word_problem",
              "open_response",
            ],
          },
          difficultyLevel: { type: "string", example: "medium" },
          difficultyRating: { type: "number", nullable: true, example: 3 },
          question: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" },
            nullable: true,
          },
          correctAnswer: {
            type: "string",
            nullable: true,
            description: "MCQ letter (A–D). Only when includeAnswers=true.",
          },
          modelAnswer: {
            type: "string",
            nullable: true,
            description: "Only when includeAnswers=true.",
          },
          explanation: { type: "string" },
          keywords: { type: "array", items: { type: "string" } },
          region: { type: "string", nullable: true },
          parentId: { type: "string", nullable: true },
          payload: {
            type: "object",
            description:
              "Type-specific data: mcq→options; fitb→answer/distractors; drag_drop→draggableItems/dropZones/answerKey; matching→premises/responses/answerKey. Sanitized when includeAnswers=false.",
            additionalProperties: true,
          },
        },
        additionalProperties: true,
      },
      Pagination: {
        type: "object",
        properties: {
          total: {
            type: "integer",
            description: "Total rows matching filters.",
          },
          limit: { type: "integer" },
          offset: { type: "integer" },
          returned: { type: "integer", description: "Count in this page." },
          hasMore: { type: "boolean" },
        },
      },
      Meta: {
        type: "object",
        properties: {
          requestId: { type: "string", format: "uuid" },
          timestamp: { type: "string", format: "date-time" },
          includeAnswers: { type: "boolean" },
          order: { type: "string" },
          filters: {
            type: "object",
            additionalProperties: true,
            description: "Echo of every resolved filter (nulls where unset).",
          },
        },
      },
      QuestionListResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: { $ref: "#/components/schemas/Question" },
              },
              pagination: { $ref: "#/components/schemas/Pagination" },
            },
          },
          meta: { $ref: "#/components/schemas/Meta" },
          error: { type: "object", nullable: true, example: null },
        },
      },
      FacetBucket: {
        type: "object",
        properties: {
          value: { type: "string", example: "mcq" },
          count: { type: "integer", example: 60 },
        },
      },
      FacetsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              facets: {
                type: "object",
                properties: {
                  total: { type: "integer", example: 120 },
                  byQuestionType: {
                    type: "array",
                    items: { $ref: "#/components/schemas/FacetBucket" },
                  },
                  byDifficulty: {
                    type: "array",
                    items: { $ref: "#/components/schemas/FacetBucket" },
                  },
                  byBloom: {
                    type: "array",
                    items: { $ref: "#/components/schemas/FacetBucket" },
                  },
                  byRating: {
                    type: "array",
                    items: { $ref: "#/components/schemas/FacetBucket" },
                  },
                  byGrade: {
                    type: "array",
                    items: { $ref: "#/components/schemas/FacetBucket" },
                  },
                  byTopic: {
                    type: "array",
                    items: { $ref: "#/components/schemas/FacetBucket" },
                  },
                },
              },
            },
          },
          meta: { $ref: "#/components/schemas/Meta" },
          error: { type: "object", nullable: true, example: null },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          data: { type: "object", nullable: true, example: null },
          meta: {
            type: "object",
            properties: {
              requestId: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
            },
          },
          error: {
            type: "object",
            properties: {
              code: {
                type: "string",
                enum: ["VALIDATION_ERROR", "INTERNAL_ERROR"],
              },
              message: { type: "string" },
              details: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field: { type: "string" },
                    issue: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
