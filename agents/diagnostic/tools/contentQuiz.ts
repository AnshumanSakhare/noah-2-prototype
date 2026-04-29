import "server-only"

import { access, readFile, readdir } from "node:fs/promises"
import path from "node:path"

import type {
  DemoQuizCatalog,
  DemoQuizCatalogEntry,
  DemoQuizQuestion,
} from "@/lib/demo-types"
import { DIAGNOSTIC_CONTENT_DEFAULTS } from "@/lib/diagnostic-content-defaults"
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
} from "../types/index"

type CsvRow = {
  id: string
  questionType: string
  questionText: string
  subject: string
  grade: string
  topic: string
  subtopic: string
  learningObjective: string
  bloomsLevel: string
  difficultyLevel: string
  difficultyRating: string
  summary: string
  options: string
  explanation: string
  payload: string
  generationMetadata: string
}

type RawCsvRow = Partial<CsvRow> & {
  queueId?: string
  learning_objective?: string
  bloomslevel?: string
  difficultylevel?: string
  difficultyrating?: string
  generationMetadataJson?: string
}

type TopicCatalogAccumulator = {
  subject: Subject
  classLevel: ClassLevel
  topic: string
  learningObjectives: Set<string>
  questionCount: number
}

type QuizContentStore = {
  catalog: DemoQuizCatalog
  questions: QuestionBankQuestion[]
}

const CONTENT_CSV_DIRECTORY = path.join(process.cwd(), "csv")
const DEFAULT_SUBJECT = DIAGNOSTIC_CONTENT_DEFAULTS.subject
const DEFAULT_CLASS_LEVEL = DIAGNOSTIC_CONTENT_DEFAULTS.classLevel
const DEFAULT_TOPIC = DIAGNOSTIC_CONTENT_DEFAULTS.topic
const QUESTION_TARGETS: Record<DifficultyBand, number> = {
  easy: 5,
  medium: 5,
  hard: 5,
}

const GRADE_TEST_TARGETS: Record<ClassLevel, Record<DifficultyBand, number>> = {
  classKG: { easy: 3, medium: 5, hard: 7  },
  class1:  { easy: 3, medium: 5, hard: 7  },
  class2:  { easy: 4, medium: 6, hard: 8  },
  class3:  { easy: 4, medium: 7, hard: 9  },
  class4:  { easy: 5, medium: 7, hard: 10 },
  class5:  { easy: 6, medium: 8, hard: 11 },
  class6:  { easy: 6, medium: 8, hard: 11 },
  class7:  { easy: 7, medium: 10, hard: 13 },
  class8:  { easy: 7, medium: 10, hard: 13 },
}

declare global {
  // eslint-disable-next-line no-var
  var __diagnosticQuizContentPromise__: Promise<QuizContentStore> | undefined
}

function parseCsv(raw: string): string[][] {
  const rows: string[][] = []
  let current = ""
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i]
    if (ch === '"') {
      if (inQuotes && raw[i + 1] === '"') {
        current += '"'
        i += 1
        continue
      }
      inQuotes = !inQuotes
      continue
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (current !== "" || row.length > 0) {
        row.push(current)
        rows.push(row)
        row = []
        current = ""
      }
      if (ch === "\r" && raw[i + 1] === "\n") {
        i += 1
      }
      continue
    }

    if (!inQuotes && ch === ",") {
      row.push(current)
      current = ""
      continue
    }

    current += ch
  }

  if (current !== "" || row.length > 0) {
    row.push(current)
    rows.push(row)
  }

  return rows
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

function normalizeKey(value: string): string {
  return normalizeText(value).toLowerCase()
}

function buildTopicKey(subject: string, classLevel: ClassLevel, topic: string) {
  return [normalizeKey(subject), classLevel, normalizeKey(topic)].join("::")
}

function toClassLevel(grade: number): ClassLevel {
  if (grade === 4) return "class4"
  if (grade === 5) return "class5"
  if (grade <= 6) return "class6"
  if (grade === 7) return "class7"
  return "class8"
}

function toBloomLevel(value: string): BloomLevel {
  const normalized = normalizeKey(value)
  if (normalized === "knowing" || normalized === "remember") return "remember"
  if (normalized === "understanding" || normalized === "understand") {
    return "understand"
  }
  return "apply"
}

function toQuestionType(value: string): QuestionType {
  switch (normalizeKey(value)) {
    case "mcq":
      return "mcq"
    case "true_false":
      return "true_false"
    case "fitb":
      return "fitb"
    case "matching":
      return "matching"
    case "drag_drop":
      return "drag_drop"
    case "short_answer":
      return "short_answer"
    case "word_problem":
      return "word_problem"
    case "open_response":
      return "open_response"
    default:
      return "short_answer"
  }
}

function normalizeDifficultyBand(value?: string): DifficultyBand {
  const normalized = normalizeKey(value ?? "")
  if (normalized === "medium" || normalized === "hard") return normalized
  return "easy"
}

function extractFocus(
  payload: Record<string, unknown>,
  generationMetadata: string,
) {
  const payloadFocus =
    payload.metadata &&
    typeof payload.metadata === "object" &&
    "focus" in payload.metadata
      ? String((payload.metadata as Record<string, unknown>).focus ?? "")
      : ""

  if (payloadFocus.trim() !== "") {
    return normalizeText(payloadFocus)
  }

  try {
    const parsed = JSON.parse(generationMetadata) as Record<string, unknown>
    const metadata =
      parsed.metadata && typeof parsed.metadata === "object"
        ? (parsed.metadata as Record<string, unknown>)
        : undefined
    return normalizeText(String(metadata?.focus ?? ""))
  } catch {
    return ""
  }
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
  ).slice(0, 12)
}

function safeParseObject(value: string): Record<string, unknown> {
  if (!value.trim()) return {}

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function safeParseArray<T>(value: string): T[] {
  if (!value.trim()) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function normalizeCsvRow(row: RawCsvRow): CsvRow {
  return {
    id: row.id ?? row.queueId ?? "",
    questionType: row.questionType ?? "",
    questionText: row.questionText ?? "",
    subject: row.subject ?? "",
    grade: row.grade ?? "",
    topic: row.topic ?? "",
    subtopic: row.subtopic ?? "",
    learningObjective: row.learningObjective ?? row.learning_objective ?? "",
    bloomsLevel: row.bloomsLevel ?? row.bloomslevel ?? "",
    difficultyLevel: row.difficultyLevel ?? row.difficultylevel ?? "",
    difficultyRating: row.difficultyRating ?? row.difficultyrating ?? "",
    summary: row.summary ?? "",
    options: row.options ?? "",
    explanation: row.explanation ?? "",
    payload: row.payload ?? "",
    generationMetadata:
      row.generationMetadata ?? row.generationMetadataJson ?? "",
  }
}

async function resolveContentCsvPaths() {
  await access(CONTENT_CSV_DIRECTORY)
  const csvPaths: string[] = []

  async function scanDir(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await scanDir(fullPath)
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".csv")) {
        csvPaths.push(fullPath)
      }
    }
  }

  await scanDir(CONTENT_CSV_DIRECTORY)
  return csvPaths.sort((a, b) => a.localeCompare(b))
}

function buildQuestion(row: CsvRow): QuestionBankQuestion {
  const questionType = toQuestionType(row.questionType)
  const classLevel = toClassLevel(Number(row.grade))
  const payload = safeParseObject(row.payload)
  const rawOptions = safeParseArray<McqQuestionPayload["options"][number]>(row.options)
  const explanationFromColumn = normalizeText(row.explanation)

  let options: string[] | undefined
  let correctAnswer: string | undefined
  let modelAnswer: string | undefined
  let explanation = ""
  let typedPayload: QuestionBankQuestion["payload"]

  if (questionType === "mcq") {
    const mcqOptions = rawOptions
    options = mcqOptions.map((option) => option.text)
    const correctIndex = mcqOptions.findIndex(
      (option) => option.correct,
    )
    correctAnswer =
      correctIndex >= 0 ? ["A", "B", "C", "D"][correctIndex] : undefined
    explanation = explanationFromColumn
    typedPayload = {
      options: mcqOptions,
      explanation: row.explanation,
    }
  } else if (questionType === "true_false") {
    const tfPayload = payload as unknown as TrueFalseQuestionPayload
    options = ["True", "False"]
    explanation =
      normalizeText(tfPayload.explanation ?? "") || explanationFromColumn
    typedPayload = tfPayload
  } else if (questionType === "fitb") {
    const fitbPayload = payload as unknown as FitbQuestionPayload
    modelAnswer = normalizeText(fitbPayload.answer ?? "")
    explanation = normalizeText(fitbPayload.hint ?? "") || explanationFromColumn
    typedPayload = fitbPayload
  } else if (questionType === "matching") {
    const matchingPayload = payload as unknown as MatchingQuestionPayload
    explanation =
      normalizeText(matchingPayload.scoringGuidance ?? "") ||
      explanationFromColumn
    typedPayload = matchingPayload
  } else if (questionType === "drag_drop") {
    const dragDropPayload = payload as unknown as DragDropQuestionPayload
    explanation =
      normalizeText(dragDropPayload.scoringGuidance ?? "") ||
      explanationFromColumn
    typedPayload = dragDropPayload
  } else if (questionType === "short_answer") {
    const shortAnswerPayload = payload as unknown as ShortAnswerQuestionPayload
    modelAnswer = normalizeText(shortAnswerPayload.modelAnswer ?? "")
    explanation =
      normalizeText(shortAnswerPayload.scoringGuidance ?? "") ||
      explanationFromColumn
    typedPayload = shortAnswerPayload
  } else if (questionType === "open_response") {
    const openResponsePayload = payload as unknown as OpenResponseQuestionPayload
    modelAnswer = normalizeText(openResponsePayload.exemplarAnswer ?? "")
    explanation =
      normalizeText(openResponsePayload.scoringGuidance ?? "") ||
      explanationFromColumn
    typedPayload = openResponsePayload
  } else {
    const wordProblemPayload = payload as unknown as WordProblemQuestionPayload
    modelAnswer = normalizeText(wordProblemPayload.finalAnswer ?? "")
    explanation =
      normalizeText(wordProblemPayload.scoringGuidance ?? "") ||
      explanationFromColumn
    typedPayload = wordProblemPayload
  }

  return {
    id: normalizeText(row.id),
    topic: normalizeText(row.topic),
    subtopic: normalizeText(row.subtopic),
    learningObjective: normalizeText(row.learningObjective),
    difficultyLevel: normalizeText(row.difficultyLevel),
    difficultyRating: Number(row.difficultyRating) || undefined,
    classLevel,
    bloomLevel: toBloomLevel(row.bloomsLevel),
    questionType,
    question: normalizeText(row.questionText),
    options,
    correctAnswer,
    modelAnswer,
    explanation,
    focus: extractFocus(payload, row.generationMetadata),
    keywords: buildKeywords(
      [
        row.topic,
        row.subtopic,
        row.learningObjective,
        modelAnswer ?? "",
        explanation,
      ].join(" "),
    ),
    payload: typedPayload,
  }
}

async function loadQuizContentStore(): Promise<QuizContentStore> {
  const csvPaths = await resolveContentCsvPaths()
  const rawRows: CsvRow[] = []
  const seenIds = new Set<string>()

  for (const csvPath of csvPaths) {
    const rawContent = await readFile(csvPath, "utf8")
    const raw = rawContent.charCodeAt(0) === 0xfeff ? rawContent.slice(1) : rawContent
    const parsedRows = parseCsv(raw)
    const headers = parsedRows[0] ?? []

    for (const row of parsedRows.slice(1)) {
      const normalized = normalizeCsvRow(
        Object.fromEntries(
          headers.map((header, index) => [header, row[index] ?? ""]),
        ) as RawCsvRow,
      )

      if (!normalized.id || !normalized.questionText || !normalized.questionType) {
        continue
      }

      const rowId = normalizeText(normalized.id)
      if (seenIds.has(rowId)) {
        continue
      }

      seenIds.add(rowId)
      rawRows.push({ ...normalized, id: rowId })
    }
  }

  const questions = rawRows.map(buildQuestion)
  const entries = new Map<string, TopicCatalogAccumulator>()

  for (const question of questions) {
    const learningObjective =
      question.learningObjective || "Untitled learning objective"
    const key = buildTopicKey(
      DEFAULT_SUBJECT,
      question.classLevel,
      question.topic,
    )
    const existing = entries.get(key)
    if (existing) {
      existing.questionCount += 1
      existing.learningObjectives.add(learningObjective)
      continue
    }

    entries.set(key, {
      subject: DEFAULT_SUBJECT,
      classLevel: question.classLevel,
      topic: question.topic,
      learningObjectives: new Set([learningObjective]),
      questionCount: 1,
    })
  }

  return {
    catalog: {
      entries: Array.from(entries.values())
        .map(
          (entry): DemoQuizCatalogEntry => ({
            subject: entry.subject,
            classLevel: entry.classLevel,
            topic: entry.topic,
            learningObjectives: Array.from(entry.learningObjectives).sort((left, right) =>
              left.localeCompare(right),
            ),
            questionCount: entry.questionCount,
          }),
        )
        .sort((left, right) => {
          const byClass = left.classLevel.localeCompare(right.classLevel)
          if (byClass !== 0) return byClass
          return left.topic.localeCompare(right.topic)
        }),
    },
    questions,
  }
}

async function getStore() {
  if (process.env.NODE_ENV !== "production") {
    return loadQuizContentStore()
  }

  globalThis.__diagnosticQuizContentPromise__ ??= loadQuizContentStore()
  return globalThis.__diagnosticQuizContentPromise__
}

function sortQuestionsForTopicQuiz(questions: QuestionBankQuestion[]) {
  return [...questions].sort((left, right) => {
    const byDifficulty =
      QUESTION_TARGETS[normalizeDifficultyBand(left.difficultyLevel)] -
      QUESTION_TARGETS[normalizeDifficultyBand(right.difficultyLevel)]
    if (byDifficulty !== 0) return byDifficulty

    const byObjective = (left.learningObjective ?? "").localeCompare(
      right.learningObjective ?? "",
    )
    if (byObjective !== 0) return byObjective

    const bloomOrder: Record<BloomLevel, number> = {
      remember: 0,
      understand: 1,
      apply: 2,
    }
    const byBloom = bloomOrder[left.bloomLevel] - bloomOrder[right.bloomLevel]
    if (byBloom !== 0) return byBloom

    return left.id.localeCompare(right.id)
  })
}

function buildBandQueues(questions: QuestionBankQuestion[]) {
  const grouped = new Map<DifficultyBand, Map<string, QuestionBankQuestion[]>>([
    ["easy", new Map()],
    ["medium", new Map()],
    ["hard", new Map()],
  ])

  for (const question of sortQuestionsForTopicQuiz(questions)) {
    const band = normalizeDifficultyBand(question.difficultyLevel)
    const objective = question.learningObjective || "Untitled learning objective"
    const objectives = grouped.get(band)
    if (!objectives) continue

    const queue = objectives.get(objective) ?? []
    queue.push(question)
    objectives.set(objective, queue)
  }

  return grouped
}

function takeRoundRobin(
  queuesByObjective: Map<string, QuestionBankQuestion[]>,
  count: number,
) {
  const selected: QuestionBankQuestion[] = []
  const objectiveOrder = Array.from(queuesByObjective.keys()).sort((left, right) =>
    left.localeCompare(right),
  )
  let cursor = 0

  while (selected.length < count && objectiveOrder.length > 0) {
    const objective = objectiveOrder[cursor % objectiveOrder.length]
    const queue = queuesByObjective.get(objective)
    if (!queue || queue.length === 0) {
      objectiveOrder.splice(cursor % objectiveOrder.length, 1)
      if (objectiveOrder.length === 0) break
      continue
    }

    const nextQuestion = queue.shift()
    if (nextQuestion) {
      selected.push(nextQuestion)
      cursor += 1
      continue
    }

    objectiveOrder.splice(cursor % objectiveOrder.length, 1)
  }

  return selected
}

function countRemainingQuestions(
  grouped: Map<DifficultyBand, Map<string, QuestionBankQuestion[]>>,
  band: DifficultyBand,
) {
  return Array.from(grouped.get(band)?.values() ?? []).reduce(
    (sum, queue) => sum + queue.length,
    0,
  )
}

function selectQuestionsAcrossLearningObjectives(
  questions: QuestionBankQuestion[],
  maxQuestions: number,
) {
  const grouped = buildBandQueues(questions)
  const selected: QuestionBankQuestion[] = []
  const warnings: string[] = []
  const requestedTotal = Math.min(maxQuestions, questions.length)

  for (const band of ["easy", "medium", "hard"] as const) {
    const requested = Math.min(QUESTION_TARGETS[band], requestedTotal - selected.length)
    if (requested <= 0) continue

    const picked = takeRoundRobin(grouped.get(band) ?? new Map(), requested)
    selected.push(...picked)

    if (picked.length < requested) {
      warnings.push(
        `Requested ${requested} ${band} questions for this topic but only found ${picked.length}.`,
      )
    }
  }

  while (selected.length < requestedTotal) {
    const donorBand = (["easy", "medium", "hard"] as const)
      .map((band) => ({
        band,
        remaining: countRemainingQuestions(grouped, band),
      }))
      .sort((left, right) => right.remaining - left.remaining)[0]

    if (!donorBand || donorBand.remaining === 0) {
      break
    }

    const fallbackPick = takeRoundRobin(grouped.get(donorBand.band) ?? new Map(), 1)
    if (fallbackPick.length === 0) {
      break
    }

    selected.push(...fallbackPick)
  }

  if (selected.length < requestedTotal) {
    warnings.push(
      `Only ${selected.length} questions were available for the topic after balancing difficulty and learning objective coverage.`,
    )
  }

  return {
    questions: selected,
    coverageWarnings: warnings.length > 0 ? warnings : undefined,
  }
}

function buildBandQueuesByTopic(questions: QuestionBankQuestion[]) {
  const grouped = new Map<DifficultyBand, Map<string, QuestionBankQuestion[]>>([
    ["easy", new Map()],
    ["medium", new Map()],
    ["hard", new Map()],
  ])

  const sorted = [...questions].sort(
    (a, b) =>
      a.topic.localeCompare(b.topic) ||
      (a.learningObjective ?? "").localeCompare(b.learningObjective ?? ""),
  )

  for (const q of sorted) {
    const band = normalizeDifficultyBand(q.difficultyLevel)
    const topic = q.topic || "Untitled"
    const topicMap = grouped.get(band)!
    topicMap.set(topic, [...(topicMap.get(topic) ?? []), q])
  }

  return grouped
}

function selectQuestionsForGradeTest(
  questions: QuestionBankQuestion[],
  classLevel: ClassLevel,
) {
  const targets = GRADE_TEST_TARGETS[classLevel]
  const grouped = buildBandQueuesByTopic(questions)
  const selected: QuestionBankQuestion[] = []
  const warnings: string[] = []

  for (const band of ["easy", "medium", "hard"] as const) {
    const picked = takeRoundRobin(grouped.get(band) ?? new Map(), targets[band])
    selected.push(...picked)
    if (picked.length < targets[band]) {
      warnings.push(
        `Requested ${targets[band]} ${band} questions but only found ${picked.length}.`,
      )
    }
  }

  const total = targets.easy + targets.medium + targets.hard
  while (selected.length < total) {
    const donor = (["easy", "medium", "hard"] as const)
      .map((b) => ({ b, n: countRemainingQuestions(grouped, b) }))
      .sort((a, z) => z.n - a.n)[0]
    if (!donor || donor.n === 0) break
    const extra = takeRoundRobin(grouped.get(donor.b) ?? new Map(), 1)
    if (!extra.length) break
    selected.push(...extra)
  }

  if (selected.length < total) {
    warnings.push(`Only ${selected.length} of ${total} grade test questions available.`)
  }

  return { questions: selected, coverageWarnings: warnings.length ? warnings : undefined }
}

function sanitizePayload(
  question: QuestionBankQuestion,
): DemoQuizQuestion["payload"] {
  if (question.questionType === "matching") {
    const payload = question.payload as MatchingQuestionPayload | undefined
    return payload
      ? {
          premises: payload.premises,
          responses: payload.responses,
        }
      : undefined
  }

  if (question.questionType === "drag_drop") {
    const payload = question.payload as DragDropQuestionPayload | undefined
    return payload
      ? {
          draggableItems: payload.draggableItems,
          dropZones: payload.dropZones,
        }
      : undefined
  }

  if (question.questionType === "word_problem") {
    const payload = question.payload as WordProblemQuestionPayload | undefined
    return payload
      ? {
          scenario: payload.scenario,
          hints: payload.hints,
          requiresCalculation: payload.requiresCalculation,
        }
      : undefined
  }

  if (question.questionType === "fitb") {
    const payload = question.payload as FitbQuestionPayload | undefined
    return payload
      ? {
          hint: payload.hint,
        }
      : undefined
  }

  return undefined
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
  } = question

  return {
    ...rest,
    payload: sanitizePayload(question),
  }
}

export async function getDiagnosticQuizCatalog(): Promise<DemoQuizCatalog> {
  const store = await getStore()
  return store.catalog
}

export async function getTopicQuizQuestions(input: {
  subject: Subject
  classLevel: ClassLevel
  topic: string
  maxQuestions: number
}) {
  const store = await getStore()
  const topicKey = buildTopicKey(input.subject, input.classLevel, input.topic)
  const matchingQuestions = store.questions.filter(
    (question) =>
      buildTopicKey(DEFAULT_SUBJECT, question.classLevel, question.topic) ===
      topicKey,
  )

  const { questions, coverageWarnings } = selectQuestionsAcrossLearningObjectives(
    matchingQuestions,
    input.maxQuestions,
  )
  const expectedLearningObjectives = Array.from(
    new Set(matchingQuestions.map((question) => question.learningObjective).filter(Boolean)),
  ) as string[]

  if (coverageWarnings && coverageWarnings.length > 0) {
    console.warn(
      `[diagnostic] Topic coverage warnings for "${normalizeText(input.topic)}": ${coverageWarnings.join(
        " ",
      )}`,
    )
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
  }
}

export async function getTopicQuizForClient(input: {
  studentId: string
  subject: Subject
  classLevel: ClassLevel
  topic: string
  maxQuestions: number
}) {
  const quiz = await getTopicQuizQuestions(input)

  return {
    studentId: input.studentId,
    testMode: "topic" as const,
    subject: quiz.subject,
    classLevel: quiz.classLevel,
    topic: quiz.topic,
    expectedLearningObjectives: quiz.expectedLearningObjectives,
    maxQuestions: quiz.questions.length,
    questions: quiz.questions.map(toClientQuizQuestion),
  }
}

export async function getGradeQuizForClient(input: {
  studentId: string
  subject: Subject
  classLevel: ClassLevel
}) {
  const store = await getStore()
  const gradeQuestions = store.questions.filter((q) => q.classLevel === input.classLevel)
  const { questions, coverageWarnings } = selectQuestionsForGradeTest(gradeQuestions, input.classLevel)

  if (coverageWarnings?.length) {
    console.warn(
      `[diagnostic] Grade test coverage for ${input.classLevel}: ${coverageWarnings.join(" ")}`,
    )
  }

  const targets = GRADE_TEST_TARGETS[input.classLevel]
  const topicsInGrade = Array.from(new Set(gradeQuestions.map((q) => q.topic).filter(Boolean))).sort()

  return {
    studentId: input.studentId,
    testMode: "grade" as const,
    subject: input.subject,
    classLevel: input.classLevel,
    topic: null,
    expectedLearningObjectives: [] as string[],
    topicsInGrade,
    maxQuestions: questions.length,
    gradeTargets: targets,
    questions: questions.map(toClientQuizQuestion),
    coverageWarnings,
  }
}
