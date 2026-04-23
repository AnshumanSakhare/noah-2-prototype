import type {
  ClassLevel,
  DiagnosticReport,
  QuestionBankQuestion,
  Subject,
} from "../agents/diagnostic/types/index"

export interface DemoQuizCatalogEntry {
  subject: Subject
  classLevel: ClassLevel
  topic: string
  learningObjectives: string[]
  questionCount: number
}

export interface DemoQuizCatalog {
  entries: DemoQuizCatalogEntry[]
}

export interface CreateSessionInput {
  studentId: string
  subject: Subject
  classLevel: ClassLevel
  topic: string
  maxQuestions: number
}

export type DemoQuizQuestion = Omit<
  QuestionBankQuestion,
  | "correctAnswer"
  | "modelAnswer"
  | "minimumCorrect"
  | "expectedUnit"
  | "wordProblemStyle"
  | "payload"
> & {
  payload?: Record<string, unknown>
}

export interface DemoLoadedQuiz {
  studentId: string
  subject: Subject
  classLevel: ClassLevel
  topic: string
  expectedLearningObjectives: string[]
  maxQuestions: number
  questions: DemoQuizQuestion[]
}

export interface DemoQuizAnswerSubmission {
  questionId: string
  answer: string
}

export interface DemoQuizLoadResponse {
  quiz: DemoLoadedQuiz
}

export interface DemoQuizSubmitResponse {
  report: DiagnosticReport
}
