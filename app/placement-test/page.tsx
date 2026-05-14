import type { Metadata } from "next";

import { getDiagnosticQuizCatalog } from "../../agents/diagnostic/tools/contentQuiz";
import { PlacementDemo } from "../../components/placement-demo";

export const metadata: Metadata = {
  title: "Placement Test",
  description: "Interactive placement test to assess your skill level.",
};

export default async function PlacementTestPage() {
  const quizCatalog = await getDiagnosticQuizCatalog();
  return <PlacementDemo quizCatalog={quizCatalog} />;
}
