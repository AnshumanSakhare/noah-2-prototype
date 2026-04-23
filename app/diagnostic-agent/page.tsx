import { DiagnosticDemo } from "../../components/diagnostic-demo";
import { getDiagnosticQuizCatalog } from "../../agents/diagnostic/tools/contentQuiz";
import { DIAGNOSTIC_CONTENT_DEFAULTS } from "../../lib/diagnostic-content-defaults";

export default async function Home() {
  const quizCatalog = await getDiagnosticQuizCatalog();
  const defaultTopicEntry =
    quizCatalog.entries.find(
      (entry) =>
        entry.subject === DIAGNOSTIC_CONTENT_DEFAULTS.subject &&
        entry.classLevel === DIAGNOSTIC_CONTENT_DEFAULTS.classLevel &&
        entry.topic === DIAGNOSTIC_CONTENT_DEFAULTS.topic,
    ) ?? quizCatalog.entries[0] ?? null;

  return (
    <DiagnosticDemo
      quizCatalog={quizCatalog}
      defaultTopicEntry={defaultTopicEntry}
    />
  );
}
