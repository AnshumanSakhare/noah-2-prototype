import "server-only";

import { query } from "@/lib/db";
import type {
  DemoQuizCatalog,
  DemoQuizCatalogEntry,
  DemoQuizQuestion,
} from "@/lib/demo-types";
import { GRADE_TEST_QUESTION_COUNT } from "@/lib/quiz-counts";
import type {
  BloomLevel,
  ClassLevel,
  DifficultyBand,
  DragDropQuestionPayload,
  FitbQuestionPayload,
  MatchingQuestionPayload,
  McqQuestionPayload,
  OpenResponseQuestionPayload,
  QuestionBankQuestion,
  QuestionType,
  ShortAnswerQuestionPayload,
  Subject,
  TrueFalseQuestionPayload,
  WordProblemQuestionPayload,
} from "../types/index";

type ContentQuestionRow = {
  id: string;
  question_type: string;
  question_text: string;
  question_svg: string | null;
  subject: string;
  grade: string;
  topic: string;
  subtopic: string;
  learning_objective: string;
  blooms_level: string;
  difficulty_level: string;
  difficulty_rating: number | null;
  options: unknown;
  explanation: string;
  generation_metadata: unknown;
};

const QUESTION_TARGETS: Record<DifficultyBand, number> = {
  easy: 6,
  medium: 6,
  hard: 6,
};

const GRADE_TEST_TARGETS: Record<ClassLevel, Record<DifficultyBand, number>> = {
  classKG: { easy: 5, medium: 7, hard: 10 },
  class1: { easy: 5, medium: 7, hard: 10 },
  class2: { easy: 5, medium: 7, hard: 10 },
  class3: { easy: 5, medium: 7, hard: 10 },
  class4: { easy: 5, medium: 7, hard: 10 },
  class5: { easy: 5, medium: 7, hard: 10 },
  class6: { easy: 5, medium: 7, hard: 10 },
  class7: { easy: 5, medium: 7, hard: 10 },
  class8: { easy: 5, medium: 7, hard: 10 },
};

const INTERACTIVE_QUESTION_TYPES = ["fitb", "drag_drop"] as const;

declare global {
  // eslint-disable-next-line no-var
  var __diagnosticQuizCatalogPromise__: Promise<DemoQuizCatalog> | undefined;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeQuestionText(value: string): string {
  return normalizeText(value).replace(
    /^(Fill in the blank with the correct answer:|Drag each choice into the correct group:)\s*/i,
    "",
  );
}

function normalizeKey(value: string): string {
  return normalizeText(value).toLowerCase();
}

function toSubject(value: string): Subject {
  const normalized = normalizeKey(value);
  if (normalized === "science") return "Science";
  if (normalized === "english") return "English";
  if (normalized === "social studies") return "Social Studies";
  return "Maths";
}

function toClassLevel(value: string): ClassLevel {
  const normalized = normalizeKey(value);
  if (normalized === "kg" || normalized === "classkg") return "classKG";
  const match = normalized.match(/\d+/);
  const grade = match ? Number(match[0]) : Number(normalized);
  if (grade <= 0) return "classKG";
  if (grade === 1) return "class1";
  if (grade === 2) return "class2";
  if (grade === 3) return "class3";
  if (grade === 4) return "class4";
  if (grade === 5) return "class5";
  if (grade === 6) return "class6";
  if (grade === 7) return "class7";
  return "class8";
}

function toDbGrade(classLevel: ClassLevel) {
  return classLevel === "classKG" ? "KG" : classLevel.replace("class", "");
}

function toBloomLevel(value: string): BloomLevel {
  const normalized = normalizeKey(value);
  if (normalized === "knowing" || normalized === "remember") return "remember";
  if (normalized === "understanding" || normalized === "understand") {
    return "understand";
  }
  return "apply";
}

function toQuestionType(value: string): QuestionType {
  switch (normalizeKey(value)) {
    case "mcq":
      return "mcq";
    case "true_false":
      return "true_false";
    case "fitb":
      return "fitb";
    case "matching":
      return "matching";
    case "drag_drop":
    case "drag n drop":
    case "drag_n_drop":
    case "drag-and-drop":
      return "drag_drop";
    case "short_answer":
      return "short_answer";
    case "word_problem":
      return "word_problem";
    case "open_response":
      return "open_response";
    default:
      return "short_answer";
  }
}

function normalizeDifficultyBand(value?: string): DifficultyBand {
  const normalized = normalizeKey(value ?? "");
  if (normalized === "medium" || normalized === "hard") return normalized;
  return "easy";
}

function extractFocus(payload: Record<string, unknown>) {
  const payloadFocus =
    payload.metadata &&
    typeof payload.metadata === "object" &&
    "focus" in payload.metadata
      ? String((payload.metadata as Record<string, unknown>).focus ?? "")
      : "";

  if (payloadFocus.trim() !== "") {
    return normalizeText(payloadFocus);
  }

  const metadata =
    payload.metadata && typeof payload.metadata === "object"
      ? (payload.metadata as Record<string, unknown>)
      : undefined;
  return normalizeText(String(metadata?.focus ?? payload.focus ?? ""));
}

function buildKeywords(value: string): string[] {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9\-+.]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2),
    ),
  ).slice(0, 12);
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toSvg(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.startsWith("<svg") ? trimmed : undefined;
}

function isNotCorrectDropZone(value: string) {
  return normalizeKey(value).replace(/[^a-z0-9]+/g, " ") === "not correct";
}

function toMcqOptions(value: unknown): McqQuestionPayload["options"] {
  const rawOptions = Array.isArray(value)
    ? value
    : toArray(toRecord(value).options);

  return rawOptions
    .map((option) => {
      if (typeof option === "string") {
        const svg = toSvg(option);
        return {
          text: svg ? "" : normalizeText(option),
          ...(svg ? { svg } : {}),
          correct: false,
        };
      }

      const record = toRecord(option);
      const correctValue = record.correct ?? record.is_correct;
      const svg = toSvg(
        record.svg ??
          record.option_svg ??
          record.image_svg ??
          record.visual_svg ??
          record.media,
      );
      return {
        text: normalizeText(
          String(record.text ?? record.label ?? record.value ?? ""),
        ),
        ...(svg ? { svg } : {}),
        correct:
          correctValue === true ||
          String(correctValue).toLowerCase() === "true",
      };
    })
    .filter((option) => option.text.length > 0 || Boolean(option.svg));
}

function getPayload(row: ContentQuestionRow) {
  const metadata = toRecord(row.generation_metadata);
  const nestedPayload = toRecord(metadata.payload);
  return Object.keys(nestedPayload).length > 0 ? nestedPayload : metadata;
}

function buildQuestion(row: ContentQuestionRow): QuestionBankQuestion {
  const questionType = toQuestionType(row.question_type);
  const subject = toSubject(row.subject);
  const classLevel = toClassLevel(row.grade);
  const payload = getPayload(row);
  const explanationFromColumn = normalizeText(row.explanation);
  const questionSvg =
    toSvg(row.question_svg) ??
    toSvg(payload.questionSvg) ??
    toSvg(payload.question_svg);

  let options: string[] | undefined;
  let correctAnswer: string | undefined;
  let modelAnswer: string | undefined;
  let explanation = "";
  let typedPayload: QuestionBankQuestion["payload"];

  if (questionType === "mcq") {
    const mcqOptionsFromColumn = toMcqOptions(row.options);
    const mcqOptions =
      mcqOptionsFromColumn.length > 0
        ? mcqOptionsFromColumn
        : toMcqOptions(payload.options);
    options = mcqOptions.map((option) => option.text);
    const correctIndex = mcqOptions.findIndex((option) => option.correct);
    correctAnswer =
      correctIndex >= 0 ? ["A", "B", "C", "D"][correctIndex] : undefined;
    explanation = explanationFromColumn;
    typedPayload = {
      options: mcqOptions,
      explanation: row.explanation,
      ...(questionSvg ? { questionSvg } : {}),
    };
  } else if (questionType === "true_false") {
    const tfPayload = payload as unknown as TrueFalseQuestionPayload;
    options = ["True", "False"];
    explanation =
      normalizeText(tfPayload.explanation ?? "") || explanationFromColumn;
    typedPayload = { ...tfPayload, ...(questionSvg ? { questionSvg } : {}) };
  } else if (questionType === "fitb") {
    const fitbPayload = payload as unknown as FitbQuestionPayload;
    modelAnswer = normalizeText(fitbPayload.answer ?? "");
    explanation =
      normalizeText(fitbPayload.hint ?? "") || explanationFromColumn;
    typedPayload = { ...fitbPayload, ...(questionSvg ? { questionSvg } : {}) };
  } else if (questionType === "matching") {
    const matchingPayload = payload as unknown as MatchingQuestionPayload;
    explanation =
      normalizeText(matchingPayload.scoringGuidance ?? "") ||
      explanationFromColumn;
    typedPayload = {
      ...matchingPayload,
      premises: matchingPayload.premises ?? [],
      responses: matchingPayload.responses ?? [],
      answerKey: matchingPayload.answerKey ?? [],
      ...(questionSvg ? { questionSvg } : {}),
    };
  } else if (questionType === "drag_drop") {
    const dragDropPayload = payload as unknown as DragDropQuestionPayload;
    const dropZones = dragDropPayload.dropZones ?? [];
    const answerKey = dragDropPayload.answerKey ?? [];
    const visibleDropZones = dropZones.filter(
      (dropZone) => !isNotCorrectDropZone(dropZone),
    );
    const visibleAnswerKey = answerKey.filter(
      (pair) => !isNotCorrectDropZone(pair.target),
    );
    explanation =
      normalizeText(dragDropPayload.scoringGuidance ?? "") ||
      explanationFromColumn;
    typedPayload = {
      ...dragDropPayload,
      draggableItems: dragDropPayload.draggableItems ?? [],
      dropZones: visibleDropZones,
      answerKey: visibleAnswerKey,
      ...(questionSvg ? { questionSvg } : {}),
    };
  } else if (questionType === "short_answer") {
    const shortAnswerPayload = payload as unknown as ShortAnswerQuestionPayload;
    modelAnswer = normalizeText(shortAnswerPayload.modelAnswer ?? "");
    explanation =
      normalizeText(shortAnswerPayload.scoringGuidance ?? "") ||
      explanationFromColumn;
    typedPayload = {
      ...shortAnswerPayload,
      ...(questionSvg ? { questionSvg } : {}),
    };
  } else if (questionType === "open_response") {
    const openResponsePayload =
      payload as unknown as OpenResponseQuestionPayload;
    modelAnswer = normalizeText(openResponsePayload.exemplarAnswer ?? "");
    explanation =
      normalizeText(openResponsePayload.scoringGuidance ?? "") ||
      explanationFromColumn;
    typedPayload = {
      ...openResponsePayload,
      ...(questionSvg ? { questionSvg } : {}),
    };
  } else {
    const wordProblemPayload = payload as unknown as WordProblemQuestionPayload;
    modelAnswer = normalizeText(wordProblemPayload.finalAnswer ?? "");
    explanation =
      normalizeText(wordProblemPayload.scoringGuidance ?? "") ||
      explanationFromColumn;
    typedPayload = {
      ...wordProblemPayload,
      ...(questionSvg ? { questionSvg } : {}),
    };
  }

  return {
    id: normalizeText(row.id),
    subject,
    topic: normalizeText(row.topic),
    subtopic: normalizeText(row.subtopic),
    learningObjective: normalizeText(row.learning_objective),
    difficultyLevel: normalizeText(row.difficulty_level),
    difficultyRating: row.difficulty_rating ?? undefined,
    classLevel,
    bloomLevel: toBloomLevel(row.blooms_level),
    questionType,
    question: normalizeQuestionText(row.question_text),
    options,
    correctAnswer,
    modelAnswer,
    explanation,
    focus: extractFocus(payload),
    keywords: buildKeywords(
      [
        row.topic,
        row.subtopic,
        row.learning_objective,
        modelAnswer ?? "",
        explanation,
      ].join(" "),
    ),
    payload: typedPayload,
  };
}

const CONTENT_QUESTION_SELECT = `
  SELECT
    id::text,
    question_type,
    question_text,
    question_svg,
    subject,
    grade,
    topic,
    subtopic,
    learning_objective,
    blooms_level,
    difficulty_level,
    difficulty_rating,
    options,
    explanation,
    generation_metadata
  FROM final_content_questions
`;

const QUESTION_VISUAL_MODE_TYPE_FILTER = `
  AND (
    visual_mode IS NULL
    OR lower(btrim(visual_mode)) <> 'question_svg'
    OR lower(btrim(question_type)) = 'mcq'
  )
`;

function toQuestions(rows: ContentQuestionRow[]) {
  return rows
    .filter((row) => row.id && row.question_text && row.question_type)
    .map(buildQuestion);
}

async function loadDiagnosticQuizCatalog(): Promise<DemoQuizCatalog> {
  const result = await query(`
    SELECT
      subject,
      grade,
      topic,
      array_agg(DISTINCT learning_objective) FILTER (
        WHERE learning_objective IS NOT NULL AND btrim(learning_objective) <> ''
      ) AS learning_objectives,
      count(*)::int AS question_count
    FROM final_content_questions
    WHERE question_text IS NOT NULL
      AND question_type IS NOT NULL
      ${QUESTION_VISUAL_MODE_TYPE_FILTER}
      AND subject IS NOT NULL
      AND grade IS NOT NULL
      AND topic IS NOT NULL
    GROUP BY subject, grade, topic
    ORDER BY subject, grade, topic
  `);

  return {
    entries: result.rows
      .map(
        (row: {
          subject: string;
          grade: string;
          topic: string;
          learning_objectives: string[] | null;
          question_count: number;
        }): DemoQuizCatalogEntry => ({
          subject: toSubject(row.subject),
          classLevel: toClassLevel(row.grade),
          topic: normalizeText(row.topic),
          learningObjectives: (row.learning_objectives ?? [])
            .map(normalizeText)
            .filter(Boolean)
            .sort((left, right) => left.localeCompare(right)),
          questionCount: row.question_count,
        }),
      )
      .sort((left, right) => {
        const byClass = left.classLevel.localeCompare(right.classLevel);
        if (byClass !== 0) return byClass;
        return left.topic.localeCompare(right.topic);
      }),
  };
}

async function getCatalog() {
  if (process.env.NODE_ENV !== "production") {
    return loadDiagnosticQuizCatalog();
  }

  globalThis.__diagnosticQuizCatalogPromise__ ??= loadDiagnosticQuizCatalog();
  return globalThis.__diagnosticQuizCatalogPromise__;
}

async function loadTopicQuestions(input: {
  subject: Subject;
  classLevel: ClassLevel;
  topic: string;
}) {
  const result = await query(
    `
      ${CONTENT_QUESTION_SELECT}
      WHERE subject = $1
        AND grade = $2
        AND topic = $3
        AND question_text IS NOT NULL
        AND question_type IS NOT NULL
        ${QUESTION_VISUAL_MODE_TYPE_FILTER}
      ORDER BY learning_objective, difficulty_level, id
    `,
    [input.subject, toDbGrade(input.classLevel), input.topic],
  );

  return toQuestions(result.rows as ContentQuestionRow[]);
}

async function loadGradeQuestions(input: {
  subject: Subject;
  classLevel: ClassLevel;
}) {
  const targets = GRADE_TEST_TARGETS[input.classLevel];
  const perTopicCandidateLimit = Math.max(
    targets.easy,
    targets.medium,
    targets.hard,
  );
  const result = await query(
    `
      WITH ranked_questions AS (
        SELECT
          id::text,
          question_type,
          question_text,
          question_svg,
          subject,
          grade,
          topic,
          subtopic,
          learning_objective,
          blooms_level,
          difficulty_level,
          difficulty_rating,
          options,
          explanation,
          generation_metadata,
          row_number() OVER (
            PARTITION BY difficulty_level, topic
            ORDER BY learning_objective, id
          ) AS topic_difficulty_rank
        FROM final_content_questions
        WHERE subject = $1
          AND grade = $2
          AND question_text IS NOT NULL
          AND question_type IS NOT NULL
          ${QUESTION_VISUAL_MODE_TYPE_FILTER}
      )
      SELECT
        id,
        question_type,
        question_text,
        question_svg,
        subject,
        grade,
        topic,
        subtopic,
        learning_objective,
        blooms_level,
        difficulty_level,
        difficulty_rating,
        options,
        explanation,
        generation_metadata
      FROM ranked_questions
      WHERE topic_difficulty_rank <= $3
      ORDER BY topic, learning_objective, difficulty_level, id
    `,
    [input.subject, toDbGrade(input.classLevel), perTopicCandidateLimit],
  );

  return toQuestions(result.rows as ContentQuestionRow[]);
}

function sortQuestionsForTopicQuiz(questions: QuestionBankQuestion[]) {
  const difficultyOrder: Record<DifficultyBand, number> = {
    easy: 0,
    medium: 1,
    hard: 2,
  };

  return [...questions].sort((left, right) => {
    const byDifficulty =
      difficultyOrder[normalizeDifficultyBand(left.difficultyLevel)] -
      difficultyOrder[normalizeDifficultyBand(right.difficultyLevel)];
    if (byDifficulty !== 0) return byDifficulty;

    const byObjective = (left.learningObjective ?? "").localeCompare(
      right.learningObjective ?? "",
    );
    if (byObjective !== 0) return byObjective;

    const bloomOrder: Record<BloomLevel, number> = {
      remember: 0,
      understand: 1,
      apply: 2,
    };
    const byBloom = bloomOrder[left.bloomLevel] - bloomOrder[right.bloomLevel];
    if (byBloom !== 0) return byBloom;

    return left.id.localeCompare(right.id);
  });
}

function buildBandQueues(questions: QuestionBankQuestion[]) {
  const grouped = new Map<DifficultyBand, Map<string, QuestionBankQuestion[]>>([
    ["easy", new Map()],
    ["medium", new Map()],
    ["hard", new Map()],
  ]);

  for (const question of sortQuestionsForTopicQuiz(questions)) {
    const band = normalizeDifficultyBand(question.difficultyLevel);
    const objective =
      question.learningObjective || "Untitled learning objective";
    const objectives = grouped.get(band);
    if (!objectives) continue;

    const queue = objectives.get(objective) ?? [];
    queue.push(question);
    objectives.set(objective, queue);
  }

  return grouped;
}

function takeRoundRobin(
  queuesByObjective: Map<string, QuestionBankQuestion[]>,
  count: number,
) {
  const selected: QuestionBankQuestion[] = [];
  const objectiveOrder = Array.from(queuesByObjective.keys()).sort(
    (left, right) => left.localeCompare(right),
  );
  let cursor = 0;

  while (selected.length < count && objectiveOrder.length > 0) {
    const objective = objectiveOrder[cursor % objectiveOrder.length];
    const queue = queuesByObjective.get(objective);
    if (!queue || queue.length === 0) {
      objectiveOrder.splice(cursor % objectiveOrder.length, 1);
      if (objectiveOrder.length === 0) break;
      continue;
    }

    const nextQuestion = queue.shift();
    if (nextQuestion) {
      selected.push(nextQuestion);
      cursor += 1;
      continue;
    }

    objectiveOrder.splice(cursor % objectiveOrder.length, 1);
  }

  return selected;
}

function countRemainingQuestions(
  grouped: Map<DifficultyBand, Map<string, QuestionBankQuestion[]>>,
  band: DifficultyBand,
) {
  return Array.from(grouped.get(band)?.values() ?? []).reduce(
    (sum, queue) => sum + queue.length,
    0,
  );
}

function countSelectedQuestionsByBand(
  questions: QuestionBankQuestion[],
  band: DifficultyBand,
) {
  return questions.filter(
    (question) => normalizeDifficultyBand(question.difficultyLevel) === band,
  ).length;
}

function getInteractiveQuestionTarget(totalQuestions: number) {
  return Math.floor(totalQuestions / 3);
}

function isInteractiveQuestion(question: QuestionBankQuestion) {
  return INTERACTIVE_QUESTION_TYPES.includes(
    question.questionType as (typeof INTERACTIVE_QUESTION_TYPES)[number],
  );
}

function buildInteractiveQueues(
  questions: QuestionBankQuestion[],
  groupKey: (question: QuestionBankQuestion) => string,
) {
  const queues = new Map<
    (typeof INTERACTIVE_QUESTION_TYPES)[number],
    Map<string, QuestionBankQuestion[]>
  >(
    INTERACTIVE_QUESTION_TYPES.map((questionType) => [
      questionType,
      new Map<string, QuestionBankQuestion[]>(),
    ]),
  );

  for (const question of sortQuestionsForTopicQuiz(questions)) {
    if (!isInteractiveQuestion(question)) continue;

    const questionType =
      question.questionType as (typeof INTERACTIVE_QUESTION_TYPES)[number];
    const grouped = queues.get(questionType);
    if (!grouped) continue;

    const key = groupKey(question);
    grouped.set(key, [...(grouped.get(key) ?? []), question]);
  }

  return queues;
}

function countQueuedQuestions(
  grouped: Map<string, QuestionBankQuestion[]> | undefined,
) {
  return Array.from(grouped?.values() ?? []).reduce(
    (sum, queue) => sum + queue.length,
    0,
  );
}

function takeInteractiveQuestions(
  questions: QuestionBankQuestion[],
  requestedCount: number,
  groupKey: (question: QuestionBankQuestion) => string,
) {
  const selected: QuestionBankQuestion[] = [];
  const queues = buildInteractiveQueues(questions, groupKey);
  let cursor = 0;

  while (selected.length < requestedCount) {
    const availableTypes = INTERACTIVE_QUESTION_TYPES.filter(
      (questionType) => countQueuedQuestions(queues.get(questionType)) > 0,
    );
    if (availableTypes.length === 0) break;

    const questionType = availableTypes[cursor % availableTypes.length];
    const picked = takeRoundRobin(queues.get(questionType) ?? new Map(), 1);
    if (picked.length > 0) {
      selected.push(...picked);
      cursor += 1;
      continue;
    }

    cursor += 1;
  }

  return selected;
}

function getFillQuestionsAfterInteractiveQuota(
  questions: QuestionBankQuestion[],
  selectedIds: Set<string>,
  remainingSlots: number,
) {
  const remaining = questions.filter(
    (question) => !selectedIds.has(question.id),
  );
  const nonInteractive = remaining.filter(
    (question) => !isInteractiveQuestion(question),
  );

  return nonInteractive.length >= remainingSlots ? nonInteractive : remaining;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function mixQuestionTypes(questions: QuestionBankQuestion[]) {
  const seed = questions
    .map((question) => question.id)
    .sort((left, right) => left.localeCompare(right))
    .join("|");
  const buckets = new Map<QuestionType, QuestionBankQuestion[]>();

  for (const question of questions) {
    const bucket = buckets.get(question.questionType) ?? [];
    bucket.push(question);
    buckets.set(question.questionType, bucket);
  }

  for (const [questionType, bucket] of buckets) {
    buckets.set(
      questionType,
      [...bucket].sort(
        (left, right) =>
          hashString(`${seed}:${questionType}:${left.id}`) -
          hashString(`${seed}:${questionType}:${right.id}`),
      ),
    );
  }

  const mixed: QuestionBankQuestion[] = [];
  let lastType: QuestionType | null = null;

  while (mixed.length < questions.length) {
    const availableTypes = Array.from(buckets.entries())
      .filter(([, bucket]) => bucket.length > 0)
      .map(([questionType, bucket]) => ({
        questionType,
        remaining: bucket.length,
      }));
    if (availableTypes.length === 0) break;

    const candidates =
      availableTypes.length > 1
        ? availableTypes.filter((item) => item.questionType !== lastType)
        : availableTypes;
    const nextType = candidates.sort((left, right) => {
      const byRemaining = right.remaining - left.remaining;
      if (byRemaining !== 0) return byRemaining;
      return (
        hashString(`${seed}:${mixed.length}:${left.questionType}`) -
        hashString(`${seed}:${mixed.length}:${right.questionType}`)
      );
    })[0]?.questionType;
    if (!nextType) break;

    const nextQuestion = buckets.get(nextType)?.shift();
    if (!nextQuestion) break;

    mixed.push(nextQuestion);
    lastType = nextType;
  }

  return mixed;
}

function seedQuestionsAcrossObjectives(
  questions: QuestionBankQuestion[],
  count: number,
) {
  const selected: QuestionBankQuestion[] = [];
  const queuesByObjective = new Map<string, QuestionBankQuestion[]>();

  for (const question of sortQuestionsForTopicQuiz(questions)) {
    const objective =
      question.learningObjective || "Untitled learning objective";
    const queue = queuesByObjective.get(objective) ?? [];
    queue.push(question);
    queuesByObjective.set(objective, queue);
  }

  for (const objective of Array.from(queuesByObjective.keys()).sort((a, b) =>
    a.localeCompare(b),
  )) {
    if (selected.length >= count) break;
    const nextQuestion = queuesByObjective.get(objective)?.shift();
    if (nextQuestion) selected.push(nextQuestion);
  }

  return selected;
}

function selectQuestionsAcrossLearningObjectives(
  questions: QuestionBankQuestion[],
  maxQuestions: number,
) {
  const selected: QuestionBankQuestion[] = [];
  const warnings: string[] = [];
  const requestedTotal = Math.min(maxQuestions, questions.length);
  const interactiveTarget = Math.min(
    getInteractiveQuestionTarget(requestedTotal),
    questions.filter(isInteractiveQuestion).length,
  );
  selected.push(
    ...takeInteractiveQuestions(
      questions,
      interactiveTarget,
      (question) => question.learningObjective || "Untitled learning objective",
    ),
  );

  if (selected.length < getInteractiveQuestionTarget(requestedTotal)) {
    warnings.push(
      `Requested ${getInteractiveQuestionTarget(requestedTotal)} fitb/drag_drop questions but only found ${selected.length}.`,
    );
  }

  const selectedIds = new Set(selected.map((question) => question.id));
  const fillQuestions = getFillQuestionsAfterInteractiveQuota(
    questions,
    selectedIds,
    requestedTotal - selected.length,
  );
  const grouped = buildBandQueues(fillQuestions);

  for (const band of ["easy", "medium", "hard"] as const) {
    const requested = Math.min(
      Math.max(
        0,
        QUESTION_TARGETS[band] - countSelectedQuestionsByBand(selected, band),
      ),
      requestedTotal - selected.length,
    );
    if (requested <= 0) continue;

    const picked = takeRoundRobin(grouped.get(band) ?? new Map(), requested);
    selected.push(...picked);

    if (picked.length < requested) {
      warnings.push(
        `Requested ${requested} ${band} questions for this topic but only found ${picked.length}.`,
      );
    }
  }

  while (selected.length < requestedTotal) {
    const donorBand = (["easy", "medium", "hard"] as const)
      .map((band) => ({
        band,
        remaining: countRemainingQuestions(grouped, band),
      }))
      .sort((left, right) => right.remaining - left.remaining)[0];

    if (!donorBand || donorBand.remaining === 0) {
      break;
    }

    const fallbackPick = takeRoundRobin(
      grouped.get(donorBand.band) ?? new Map(),
      1,
    );
    if (fallbackPick.length === 0) {
      break;
    }

    selected.push(...fallbackPick);
  }

  if (selected.length < requestedTotal) {
    const usedIds = new Set(selected.map((question) => question.id));
    const coverageFill = questions.filter(
      (question) => !usedIds.has(question.id),
    );
    selected.push(
      ...seedQuestionsAcrossObjectives(
        coverageFill,
        requestedTotal - selected.length,
      ),
    );
  }

  if (selected.length < requestedTotal) {
    warnings.push(
      `Only ${selected.length} questions were available for the topic after balancing difficulty and learning objective coverage.`,
    );
  }

  return {
    questions: mixQuestionTypes(selected),
    coverageWarnings: warnings.length > 0 ? warnings : undefined,
  };
}

function buildBandQueuesByTopic(questions: QuestionBankQuestion[]) {
  const grouped = new Map<DifficultyBand, Map<string, QuestionBankQuestion[]>>([
    ["easy", new Map()],
    ["medium", new Map()],
    ["hard", new Map()],
  ]);

  const sorted = [...questions].sort(
    (a, b) =>
      a.topic.localeCompare(b.topic) ||
      (a.learningObjective ?? "").localeCompare(b.learningObjective ?? ""),
  );

  for (const q of sorted) {
    const band = normalizeDifficultyBand(q.difficultyLevel);
    const topic = q.topic || "Untitled";
    const topicMap = grouped.get(band);
    if (!topicMap) continue;
    topicMap.set(topic, [...(topicMap.get(topic) ?? []), q]);
  }

  return grouped;
}

function selectQuestionsForGradeTest(
  questions: QuestionBankQuestion[],
  classLevel: ClassLevel,
) {
  const targets = GRADE_TEST_TARGETS[classLevel];
  const selected: QuestionBankQuestion[] = [];
  const warnings: string[] = [];
  const total = Math.min(GRADE_TEST_QUESTION_COUNT, questions.length);
  const interactiveTarget = Math.min(
    getInteractiveQuestionTarget(total),
    questions.filter(isInteractiveQuestion).length,
  );
  selected.push(
    ...takeInteractiveQuestions(
      questions,
      interactiveTarget,
      (question) => question.topic || "Untitled",
    ),
  );

  if (selected.length < getInteractiveQuestionTarget(total)) {
    warnings.push(
      `Requested ${getInteractiveQuestionTarget(total)} fitb/drag_drop questions but only found ${selected.length}.`,
    );
  }

  const selectedIds = new Set(selected.map((question) => question.id));
  const fillQuestions = getFillQuestionsAfterInteractiveQuota(
    questions,
    selectedIds,
    total - selected.length,
  );
  const grouped = buildBandQueuesByTopic(fillQuestions);

  for (const band of ["easy", "medium", "hard"] as const) {
    const requested = Math.min(
      Math.max(0, targets[band] - countSelectedQuestionsByBand(selected, band)),
      total - selected.length,
    );
    if (requested <= 0) continue;

    const picked = takeRoundRobin(grouped.get(band) ?? new Map(), requested);
    selected.push(...picked);
    if (picked.length < requested) {
      warnings.push(
        `Requested ${requested} ${band} questions but only found ${picked.length}.`,
      );
    }
  }

  while (selected.length < total) {
    const donor = (["easy", "medium", "hard"] as const)
      .map((b) => ({ b, n: countRemainingQuestions(grouped, b) }))
      .sort((a, z) => z.n - a.n)[0];
    if (!donor || donor.n === 0) break;
    const extra = takeRoundRobin(grouped.get(donor.b) ?? new Map(), 1);
    if (!extra.length) break;
    selected.push(...extra);
  }

  if (selected.length < total) {
    warnings.push(
      `Only ${selected.length} of ${total} grade test questions available.`,
    );
  }

  return {
    questions: mixQuestionTypes(selected),
    coverageWarnings: warnings.length ? warnings : undefined,
  };
}

function sanitizePayload(
  question: QuestionBankQuestion,
): DemoQuizQuestion["payload"] {
  const questionSvg = toSvg(
    (question.payload as { questionSvg?: unknown } | undefined)?.questionSvg,
  );
  const visualPayload: Record<string, string> = questionSvg
    ? { questionSvg }
    : {};

  if (question.questionType === "mcq") {
    const payload = question.payload as McqQuestionPayload | undefined;
    const options =
      payload?.options?.map((option) => ({
        ...(option.svg ? { svg: option.svg } : {}),
      })) ?? [];
    const hasOptionSvg = options.some((option) => Boolean(option.svg));
    const hasQuestionSvg = Boolean(visualPayload.questionSvg);

    return hasOptionSvg || hasQuestionSvg
      ? {
          ...visualPayload,
          ...(hasOptionSvg ? { options } : {}),
        }
      : undefined;
  }

  if (question.questionType === "matching") {
    const payload = question.payload as MatchingQuestionPayload | undefined;
    return payload
      ? {
          ...visualPayload,
          premises: payload.premises,
          responses: payload.responses,
        }
      : Object.keys(visualPayload).length > 0
        ? visualPayload
        : undefined;
  }

  if (question.questionType === "drag_drop") {
    const payload = question.payload as DragDropQuestionPayload | undefined;
    return payload
      ? {
          ...visualPayload,
          draggableItems: payload.draggableItems,
          dropZones: payload.dropZones,
        }
      : Object.keys(visualPayload).length > 0
        ? visualPayload
        : undefined;
  }

  if (question.questionType === "word_problem") {
    const payload = question.payload as WordProblemQuestionPayload | undefined;
    return payload
      ? {
          ...visualPayload,
          scenario: payload.scenario,
          hints: payload.hints,
          requiresCalculation: payload.requiresCalculation,
        }
      : Object.keys(visualPayload).length > 0
        ? visualPayload
        : undefined;
  }

  if (question.questionType === "fitb") {
    const payload = question.payload as FitbQuestionPayload | undefined;
    return payload
      ? {
          ...visualPayload,
          hint: payload.hint,
        }
      : Object.keys(visualPayload).length > 0
        ? visualPayload
        : undefined;
  }

  return Object.keys(visualPayload).length > 0 ? visualPayload : undefined;
}

export function toClientQuizQuestion(
  question: QuestionBankQuestion,
): DemoQuizQuestion {
  const {
    correctAnswer: _correctAnswer,
    modelAnswer: _modelAnswer,
    minimumCorrect: _minimumCorrect,
    expectedUnit: _expectedUnit,
    wordProblemStyle: _wordProblemStyle,
    ...rest
  } = question;

  return {
    ...rest,
    payload: sanitizePayload(question),
  };
}

export async function getDiagnosticQuizCatalog(): Promise<DemoQuizCatalog> {
  return getCatalog();
}

export async function getTopicQuizQuestions(input: {
  subject: Subject;
  classLevel: ClassLevel;
  topic: string;
  maxQuestions: number;
}) {
  const matchingQuestions = await loadTopicQuestions(input);

  const { questions, coverageWarnings } =
    selectQuestionsAcrossLearningObjectives(
      matchingQuestions,
      input.maxQuestions,
    );
  const expectedLearningObjectives = Array.from(
    new Set(
      matchingQuestions
        .map((question) => question.learningObjective)
        .filter(Boolean),
    ),
  ) as string[];

  if (coverageWarnings && coverageWarnings.length > 0) {
    console.warn(
      `[diagnostic] Topic coverage warnings for "${normalizeText(input.topic)}": ${coverageWarnings.join(
        " ",
      )}`,
    );
  }

  return {
    subject: input.subject,
    classLevel: input.classLevel,
    topic: normalizeText(input.topic),
    expectedLearningObjectives,
    questions,
    coverageWarnings:
      matchingQuestions.length === 0
        ? [`No questions were found for ${input.topic}.`]
        : coverageWarnings,
  };
}

export async function getGradeQuizQuestions(input: {
  subject: Subject;
  classLevel: ClassLevel;
}) {
  const gradeQuestions = await loadGradeQuestions(input);
  const { questions, coverageWarnings } = selectQuestionsForGradeTest(
    gradeQuestions,
    input.classLevel,
  );

  if (coverageWarnings?.length) {
    console.warn(
      `[diagnostic] Grade test coverage for ${input.classLevel}: ${coverageWarnings.join(" ")}`,
    );
  }

  return {
    subject: input.subject,
    classLevel: input.classLevel,
    topic: null,
    expectedLearningObjectives: [] as string[],
    questions,
    coverageWarnings:
      gradeQuestions.length === 0
        ? [`No questions were found for ${input.classLevel}.`]
        : coverageWarnings,
  };
}

export async function getTopicQuizForClient(input: {
  studentId: string;
  subject: Subject;
  classLevel: ClassLevel;
  topic: string;
  maxQuestions: number;
}) {
  const quiz = await getTopicQuizQuestions(input);

  return {
    studentId: input.studentId,
    testMode: "topic" as const,
    subject: quiz.subject,
    classLevel: quiz.classLevel,
    topic: quiz.topic,
    expectedLearningObjectives: quiz.expectedLearningObjectives,
    maxQuestions: quiz.questions.length,
    questions: quiz.questions.map(toClientQuizQuestion),
  };
}

export async function getGradeQuizForClient(input: {
  studentId: string;
  subject: Subject;
  classLevel: ClassLevel;
}) {
  const quiz = await getGradeQuizQuestions(input);
  const targets = GRADE_TEST_TARGETS[input.classLevel];
  const topicsInGrade = Array.from(
    new Set(quiz.questions.map((q) => q.topic).filter(Boolean)),
  ).sort();

  return {
    studentId: input.studentId,
    testMode: "grade" as const,
    subject: input.subject,
    classLevel: input.classLevel,
    topic: null,
    expectedLearningObjectives: [] as string[],
    topicsInGrade,
    maxQuestions: quiz.questions.length,
    gradeTargets: targets,
    questions: quiz.questions.map(toClientQuizQuestion),
    coverageWarnings: quiz.coverageWarnings,
  };
}
