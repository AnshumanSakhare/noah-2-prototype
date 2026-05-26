import type {
  LessonPlanGroup,
  TopicColor,
  TopicMasteryStatus,
  TopicResult,
} from "../types/index";

export function colorForStatus(status: TopicMasteryStatus): TopicColor {
  switch (status) {
    case "mastered":
      return "green";
    case "developing":
      return "yellow";
    case "partial":
      return "orange";
    case "needs_teaching":
    case "likely_weak":
      return "red";
  }
}

export function buildLessonPlan(topicResults: TopicResult[]): LessonPlanGroup {
  return {
    teachFirst: topicResults
      .filter(
        (topic) =>
          topic.status === "needs_teaching" || topic.status === "likely_weak",
      )
      .map((topic) => topic.topic),
    reinforceSoon: topicResults
      .filter((topic) => topic.status === "partial")
      .map((topic) => topic.topic),
    reinforceDeeply: topicResults
      .filter((topic) => topic.status === "developing")
      .map((topic) => topic.topic),
    enrichOrSkip: topicResults
      .filter((topic) => topic.status === "mastered")
      .map((topic) => topic.topic),
  };
}
