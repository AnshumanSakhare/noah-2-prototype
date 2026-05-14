import type {
  AskedQuestionRecord,
  DiagnosticReport,
} from "@/agents/diagnostic/types/index";

export type PlacementBand =
  | "strongMastery"
  | "strong"
  | "needsPractice"
  | "needsUrgent";

export interface PlacementTopicInsight {
  topic: string;
  emoji: string;
  questionsAsked: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  nonAttemptCount: number;
  scoreOutOf5: number;
  scorePercent: number;
  band: PlacementBand;
  bandLabel: string;
  bandTone: "green" | "yellow" | "orange" | "red";
  insights: string[];
}

export interface PlacementInsightSummary {
  overallScorePercent: number;
  totalCorrect: number;
  totalQuestions: number;
  topics: PlacementTopicInsight[];
}

const TOPIC_EMOJI: Array<{ match: RegExp; emoji: string }> = [
  { match: /fraction/i, emoji: "🍕" },
  { match: /decimal/i, emoji: "🔢" },
  { match: /percent/i, emoji: "💯" },
  { match: /algebra|equation|variable/i, emoji: "🔤" },
  { match: /geometry|shape|angle/i, emoji: "📐" },
  { match: /measure|length|weight|volume/i, emoji: "📏" },
  { match: /time|clock|hour/i, emoji: "⏰" },
  { match: /money|currency|rupee/i, emoji: "💰" },
  { match: /data|graph|chart|statistic/i, emoji: "📊" },
  { match: /multipl/i, emoji: "✖️" },
  { match: /divis/i, emoji: "➗" },
  { match: /add|sum/i, emoji: "➕" },
  { match: /subtract|differ/i, emoji: "➖" },
  { match: /number|integer|whole/i, emoji: "🔢" },
  { match: /word\s*problem/i, emoji: "📝" },
  { match: /reading|comprehension/i, emoji: "📖" },
  { match: /grammar|tense|noun|verb/i, emoji: "✏️" },
  { match: /vocab|word/i, emoji: "🔤" },
  { match: /science|physics|chem|bio/i, emoji: "🔬" },
];

function emojiForTopic(topic: string): string {
  for (const entry of TOPIC_EMOJI) {
    if (entry.match.test(topic)) return entry.emoji;
  }
  return "📘";
}

function bandFor(scorePercent: number): {
  band: PlacementBand;
  label: string;
  tone: PlacementTopicInsight["bandTone"];
} {
  if (scorePercent >= 90)
    return { band: "strongMastery", label: "Strong Foundation", tone: "green" };
  if (scorePercent >= 75)
    return { band: "strong", label: "On Track", tone: "green" };
  if (scorePercent >= 55)
    return { band: "needsPractice", label: "Needs Practice", tone: "yellow" };
  if (scorePercent >= 35)
    return {
      band: "needsPractice",
      label: "Needs More Practice",
      tone: "orange",
    };
  return { band: "needsUrgent", label: "Needs Urgent Help", tone: "red" };
}

function topicMetrics(records: AskedQuestionRecord[]) {
  const total = records.length;
  let correct = 0;
  let partial = 0;
  let incorrect = 0;
  let nonAttempt = 0;
  for (const record of records) {
    if (record.verdict === "correct") correct += 1;
    else if (record.verdict === "partial") partial += 1;
    else if (record.verdict === "non_attempt") nonAttempt += 1;
    else incorrect += 1;
  }
  const earned = correct + 0.5 * partial;
  const scoreOutOf5 = total > 0 ? (earned / total) * 5 : 0;
  const scorePercent = total > 0 ? (earned / total) * 100 : 0;
  return {
    total,
    correct,
    partial,
    incorrect,
    nonAttempt,
    scoreOutOf5,
    scorePercent,
  };
}

export function generatePlacementInsights(
  report: DiagnosticReport,
): PlacementInsightSummary {
  const records = report.results ?? [];
  const grouped = new Map<string, AskedQuestionRecord[]>();
  for (const record of records) {
    const topic = record.question.topic ?? "General";
    const list = grouped.get(topic) ?? [];
    list.push(record);
    grouped.set(topic, list);
  }

  const aiByTopic = new Map<string, string[]>();
  for (const item of report.placementTopicInsights ?? []) {
    aiByTopic.set(item.topic, item.insights ?? []);
  }

  const topics: PlacementTopicInsight[] = [];
  for (const [topic, topicRecords] of grouped.entries()) {
    const metrics = topicMetrics(topicRecords);
    const { band, label, tone } = bandFor(metrics.scorePercent);
    topics.push({
      topic,
      emoji: emojiForTopic(topic),
      questionsAsked: metrics.total,
      correctCount: metrics.correct,
      partialCount: metrics.partial,
      incorrectCount: metrics.incorrect,
      nonAttemptCount: metrics.nonAttempt,
      scoreOutOf5: Math.round(metrics.scoreOutOf5 * 10) / 10,
      scorePercent: Math.round(metrics.scorePercent),
      band,
      bandLabel: label,
      bandTone: tone,
      insights: aiByTopic.get(topic) ?? [],
    });
  }

  topics.sort((a, b) => a.scorePercent - b.scorePercent);

  const totalQuestions = records.length;
  const totalCorrect = records.filter((r) => r.verdict === "correct").length;
  const totalEarned = records.reduce((sum, r) => {
    if (r.verdict === "correct") return sum + 1;
    if (r.verdict === "partial") return sum + 0.5;
    return sum;
  }, 0);
  const overallScorePercent =
    totalQuestions > 0 ? Math.round((totalEarned / totalQuestions) * 100) : 0;

  return {
    overallScorePercent,
    totalCorrect,
    totalQuestions,
    topics,
  };
}
