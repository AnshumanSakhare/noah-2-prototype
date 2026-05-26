import { getDiagnosticQuizCatalog } from "../agents/diagnostic/tools/contentQuiz";
import {
  type AssessmentKind,
  DiagnosticDemo,
} from "../components/diagnostic-demo";
import { DIAGNOSTIC_CONTENT_DEFAULTS } from "../lib/diagnostic-content-defaults";

const PLACEMENT_EXCLUDED_CLASS_LEVELS = new Set([
  "classKG",
  "class1",
  "class2",
]);

export async function AssessmentPage({
  assessmentKind,
}: {
  assessmentKind: AssessmentKind;
}) {
  const sourceQuizCatalog = await getDiagnosticQuizCatalog();
  const quizCatalog =
    assessmentKind === "placement"
      ? {
          entries: sourceQuizCatalog.entries.filter(
            (entry) => !PLACEMENT_EXCLUDED_CLASS_LEVELS.has(entry.classLevel),
          ),
        }
      : sourceQuizCatalog;
  const defaultTopicEntry =
    quizCatalog.entries.find(
      (entry) =>
        entry.subject === DIAGNOSTIC_CONTENT_DEFAULTS.subject &&
        entry.classLevel === DIAGNOSTIC_CONTENT_DEFAULTS.classLevel &&
        entry.topic === DIAGNOSTIC_CONTENT_DEFAULTS.topic,
    ) ??
    quizCatalog.entries.find(
      (entry) =>
        entry.subject === DIAGNOSTIC_CONTENT_DEFAULTS.subject &&
        entry.classLevel === DIAGNOSTIC_CONTENT_DEFAULTS.classLevel,
    ) ??
    quizCatalog.entries.find(
      (entry) => entry.classLevel === DIAGNOSTIC_CONTENT_DEFAULTS.classLevel,
    ) ??
    quizCatalog.entries[0] ??
    null;
  const defaultTopicLearningObjectives =
    defaultTopicEntry?.learningObjectives.slice(0, 5) ?? [];

  return (
    <DiagnosticDemo
      quizCatalog={quizCatalog}
      defaultTopicEntry={defaultTopicEntry}
      defaultTopicLearningObjectives={defaultTopicLearningObjectives}
      assessmentKind={assessmentKind}
    />
  );
}
