/**
 * OpenAPI 3.0 specification for the public API surface.
 *
 * Kept as a plain object so it can be served as JSON ( /api/v1/openapi ),
 * rendered by Swagger UI ( /api/docs ), or imported into Postman/Insomnia.
 */
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Diagnostic Agent — Question Serving API",
    version: "1.0.0",
    description:
      "Filterable, paginated read access to the diagnostic and placement question banks. " +
      "Every response — success or error — shares the same envelope: `{ success, data, meta, error }`.",
  },
  servers: [{ url: "/", description: "Current host" }],
  tags: [{ name: "Questions", description: "Serve questions from the banks" }],
  paths: {
    "/api/v1/questions": {
      get: {
        tags: ["Questions"],
        summary: "Serve questions (query params)",
        description:
          "Returns a paginated list of questions matching the supplied filters.",
        operationId: "getQuestions",
        parameters: [
          {
            name: "type",
            in: "query",
            description:
              "Which bank to read. `diagnostic` → final_content_questions_1, `placement` → placement_test_questions_v2.",
            schema: {
              type: "string",
              enum: ["diagnostic", "placement"],
              default: "diagnostic",
            },
          },
          {
            name: "subject",
            in: "query",
            schema: {
              type: "string",
              enum: ["Maths", "Science", "English", "Social Studies"],
            },
          },
          {
            name: "grade",
            in: "query",
            description:
              "Grade level. Accepts `kg` or `1`–`8` (also `class5`).",
            schema: { type: "string", example: "5" },
          },
          {
            name: "region",
            in: "query",
            description:
              "Diagnostic only. Results always also include `global` questions. Ignored for placement.",
            schema: {
              type: "string",
              enum: ["US", "UK", "UAE", "Ontario", "Australia"],
              default: "US",
            },
          },
          { name: "topic", in: "query", schema: { type: "string" } },
          { name: "subtopic", in: "query", schema: { type: "string" } },
          {
            name: "learningObjective",
            in: "query",
            schema: { type: "string" },
          },
          {
            name: "questionType",
            in: "query",
            description:
              "Comma-separated. Aliases accepted: `dnd`→drag_drop, `gitb`→fitb, `tf`→true_false.",
            schema: {
              type: "string",
              example: "mcq,dnd",
            },
          },
          {
            name: "difficulty",
            in: "query",
            description: "Comma-separated subset of easy, medium, hard.",
            schema: { type: "string", example: "easy,medium" },
          },
          {
            name: "bloom",
            in: "query",
            description:
              "Comma-separated subset of remember, understand, apply.",
            schema: { type: "string", example: "remember,understand" },
          },
          {
            name: "search",
            in: "query",
            description: "Case-insensitive substring match on question text.",
            schema: { type: "string" },
          },
          {
            name: "order",
            in: "query",
            schema: {
              type: "string",
              enum: ["default", "random", "difficulty"],
              default: "default",
            },
          },
          {
            name: "limit",
            in: "query",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", minimum: 0, default: 0 },
          },
          {
            name: "includeAnswers",
            in: "query",
            description:
              "When false (default) answer keys are stripped (student-safe). Set true for full payloads.",
            schema: { type: "boolean", default: false },
          },
        ],
        responses: {
          "200": {
            description: "Questions matching the filters.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/QuestionListResponse" },
              },
            },
          },
          "400": {
            description: "Validation error.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
        description: "Identical parameters to GET, supplied as a JSON body.",
        operationId: "postQuestions",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/QuestionQuery" },
              example: {
                type: "diagnostic",
                subject: "Maths",
                grade: "5",
                questionType: ["mcq", "fitb", "dnd"],
                difficulty: ["easy", "medium"],
                bloom: ["remember", "understand"],
                order: "default",
                limit: 15,
                offset: 0,
                includeAnswers: false,
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Questions matching the filters.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/QuestionListResponse" },
              },
            },
          },
          "400": {
            description: "Validation error.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
        description: "Filter/pagination parameters (same set as GET query).",
        properties: {
          type: {
            type: "string",
            enum: ["diagnostic", "placement"],
            default: "diagnostic",
          },
          subject: {
            type: "string",
            enum: ["Maths", "Science", "English", "Social Studies"],
          },
          grade: { type: "string", example: "5" },
          region: {
            type: "string",
            enum: ["US", "UK", "UAE", "Ontario", "Australia"],
            default: "US",
          },
          topic: { type: "string" },
          subtopic: { type: "string" },
          learningObjective: { type: "string" },
          questionType: {
            oneOf: [
              { type: "string", example: "mcq,dnd" },
              { type: "array", items: { type: "string" } },
            ],
            description:
              "mcq, true_false, fitb, matching, drag_drop, short_answer, word_problem, open_response (aliases: dnd, gitb, tf).",
          },
          difficulty: {
            oneOf: [
              { type: "string", example: "easy,medium" },
              { type: "array", items: { type: "string" } },
            ],
          },
          bloom: {
            oneOf: [
              { type: "string", example: "remember,understand" },
              { type: "array", items: { type: "string" } },
            ],
          },
          search: { type: "string" },
          order: {
            type: "string",
            enum: ["default", "random", "difficulty"],
            default: "default",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            default: 20,
          },
          offset: { type: "integer", minimum: 0, default: 0 },
          includeAnswers: { type: "boolean", default: false },
        },
      },
      Question: {
        type: "object",
        description:
          "A typed question. Answer-bearing fields (correctAnswer, modelAnswer, payload answer keys) are present only when includeAnswers=true.",
        properties: {
          id: { type: "string", format: "uuid" },
          subject: { type: "string" },
          topic: { type: "string" },
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
          difficultyRating: { type: "number", nullable: true },
          question: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" },
            nullable: true,
          },
          correctAnswer: {
            type: "string",
            nullable: true,
            description: "Only when includeAnswers=true.",
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
              "Question-type-specific data (options, draggableItems/dropZones, premises/responses, etc.). Sanitized when includeAnswers=false.",
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
          source: { type: "string", enum: ["diagnostic", "placement"] },
          includeAnswers: { type: "boolean" },
          filters: { type: "object", additionalProperties: true },
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
