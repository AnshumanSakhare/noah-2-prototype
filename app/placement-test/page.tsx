import type { Metadata } from "next";

import { AssessmentPage } from "../assessment-page";

export const metadata: Metadata = {
  title: "Placement Test",
  description: "Interactive placement test to assess your skill level.",
};

export default function PlacementTestPage() {
  return <AssessmentPage assessmentKind="placement" />;
}
