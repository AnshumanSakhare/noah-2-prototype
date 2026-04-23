import type { ClassLevel, Subject } from "../agents/diagnostic/types"

export const DIAGNOSTIC_CONTENT_DEFAULTS = {
  subject: "Maths" as Subject,
  classLevel: "class6" as ClassLevel,
  topic: "Fraction Arithmetic",
} as const
