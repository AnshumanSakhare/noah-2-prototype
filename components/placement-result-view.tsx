"use client";

import { useMemo } from "react";

import type { DiagnosticReport } from "@/agents/diagnostic/types/index";
import {
  generatePlacementInsights,
  type PlacementTopicInsight,
} from "@/lib/placement-insights";

interface PlacementTopicInsightsSectionProps {
  report: DiagnosticReport;
  studentFirstName: string;
}

const TONE_STYLES: Record<
  PlacementTopicInsight["bandTone"],
  {
    accent: string;
    chipBg: string;
    chipText: string;
    scoreColor: string;
    barColor: string;
  }
> = {
  green: {
    accent: "#22C55E",
    chipBg: "rgba(34,197,94,0.12)",
    chipText: "#15803D",
    scoreColor: "#15803D",
    barColor: "#22C55E",
  },
  yellow: {
    accent: "#F5A623",
    chipBg: "rgba(245,166,35,0.14)",
    chipText: "#92590A",
    scoreColor: "#B8860B",
    barColor: "#F5A623",
  },
  orange: {
    accent: "#F97316",
    chipBg: "rgba(249,115,22,0.14)",
    chipText: "#B4470F",
    scoreColor: "#C2410C",
    barColor: "#F97316",
  },
  red: {
    accent: "#EF4444",
    chipBg: "rgba(239,68,68,0.12)",
    chipText: "#B91C1C",
    scoreColor: "#B91C1C",
    barColor: "#EF4444",
  },
};

export function PlacementTopicInsightsSection({
  report,
  studentFirstName,
}: PlacementTopicInsightsSectionProps) {
  const summary = useMemo(() => generatePlacementInsights(report), [report]);

  if (summary.topics.length === 0) return null;

  return (
    <div className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-[0_2px_20px_rgba(26,26,46,0.05)] sm:p-7">
      <div className="mb-4">
        <div className="text-[1.1rem] font-extrabold text-[#1B4A4A] sm:text-[1.2rem]">
          What {studentFirstName} needs — topic by topic
        </div>
        <div className="mt-1 text-[0.78rem] font-medium text-[#6B7280]">
          Insights are based on how each topic's 5 questions were answered.
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {summary.topics.map((topic) => {
          const styles = TONE_STYLES[topic.bandTone];
          return (
            <div
              key={topic.topic}
              className="overflow-hidden rounded-[14px] border border-gray-100 bg-[#FAFAF7]"
              style={{ borderLeft: `5px solid ${styles.accent}` }}
            >
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="text-[20px] leading-none">
                      {topic.emoji}
                    </span>
                    <h4 className="text-[16px] font-extrabold text-[#1B4A4A]">
                      {topic.topic}
                    </h4>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide"
                      style={{
                        background: styles.chipBg,
                        color: styles.chipText,
                      }}
                    >
                      {topic.bandLabel}
                    </span>
                  </div>

                  {topic.insights.length > 0 ? (
                    <ul className="mt-2.5 space-y-1.5">
                      {topic.insights.map((line, idx) => (
                        <li
                          key={`${topic.topic}-insight-${idx}`}
                          className="text-[13px] leading-relaxed text-[#374151]"
                        >
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-2.5 text-[12px] italic text-[#9CA3AF]">
                      Personalised insights are being prepared…
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10.5px] uppercase tracking-wider text-[#9CA3AF]">
                    <span>
                      <span style={{ color: "#22C55E" }}>●</span>{" "}
                      {topic.correctCount} correct
                    </span>
                    {topic.partialCount > 0 && (
                      <span>
                        <span style={{ color: "#F5A623" }}>●</span>{" "}
                        {topic.partialCount} partial
                      </span>
                    )}
                    {topic.incorrectCount > 0 && (
                      <span>
                        <span style={{ color: "#EF4444" }}>●</span>{" "}
                        {topic.incorrectCount} wrong
                      </span>
                    )}
                    {topic.nonAttemptCount > 0 && (
                      <span>
                        <span style={{ color: "#9CA3AF" }}>●</span>{" "}
                        {topic.nonAttemptCount} skipped
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end">
                  <div
                    className="rounded-xl px-3 py-1.5 text-[14px] font-extrabold"
                    style={{
                      background: styles.chipBg,
                      color: styles.scoreColor,
                    }}
                  >
                    {topic.scoreOutOf5.toFixed(1)} / 5
                  </div>
                  <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-[#F1F1EE]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${topic.scorePercent}%`,
                        background: styles.barColor,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
