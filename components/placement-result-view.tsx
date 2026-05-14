"use client";

import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

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
  const [overrideInsights, setOverrideInsights] = useState<
    DiagnosticReport["placementTopicInsights"] | null
  >(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  const reportForInsights = useMemo(
    () =>
      overrideInsights
        ? { ...report, placementTopicInsights: overrideInsights }
        : report,
    [overrideInsights, report],
  );
  const summary = useMemo(
    () => generatePlacementInsights(reportForInsights),
    [reportForInsights],
  );

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setRegenerateError(null);
    try {
      const response = await fetch("/api/quiz/regenerate-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      });
      const data = (await response.json()) as {
        placementTopicInsights?: DiagnosticReport["placementTopicInsights"];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to regenerate insights.");
      }
      setOverrideInsights(data.placementTopicInsights ?? []);
    } catch (error) {
      setRegenerateError(
        error instanceof Error ? error.message : "Failed to regenerate.",
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  if (summary.topics.length === 0) return null;

  return (
    <div className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-[0_2px_20px_rgba(26,26,46,0.05)] sm:p-7">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[1.1rem] font-extrabold text-[#1B4A4A] sm:text-[1.2rem]">
            What {studentFirstName} needs — topic by topic
          </div>
          <div className="mt-1 text-[0.78rem] font-medium text-[#6B7280]">
            Insights are based on how each topic's 5 questions were answered.
          </div>
          {regenerateError && (
            <div className="mt-2 text-[0.75rem] font-medium text-[#B91C1C]">
              {regenerateError}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#1B4A4A] transition-all hover:border-[#2EC4B6] hover:text-[#2EC4B6] disabled:opacity-60"
          title="Regenerate AI insights without retaking the test"
        >
          <RefreshCw
            className={`h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`}
          />
          {isRegenerating ? "Regenerating" : "Regenerate"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {summary.topics.map((topic) => {
          const styles = TONE_STYLES[topic.bandTone];
          return (
            <div
              key={topic.topic}
              className="relative flex flex-col overflow-hidden rounded-[24px] bg-white p-4 transition-all hover:-translate-y-0.5"
              style={{
                boxShadow: `0 4px 0 ${styles.accent}22, 0 2px 8px rgba(26,26,46,0.04)`,
                border: `2px solid ${styles.accent}33`,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h4
                    className="text-[16px] font-extrabold leading-tight text-[#1B4A4A]"
                    title={topic.topic}
                  >
                    {topic.topic}
                  </h4>
                  <div
                    className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    style={{
                      background: styles.chipBg,
                      color: styles.chipText,
                    }}
                  >
                    {topic.bandLabel}
                  </div>
                </div>
                <div
                  className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full ring-4 ring-white"
                  style={{ background: styles.chipBg }}
                >
                  <div
                    className="text-[18px] font-black leading-none tabular-nums"
                    style={{ color: styles.scoreColor }}
                  >
                    {topic.scoreOutOf5.toFixed(1)}
                  </div>
                  <div
                    className="text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: styles.chipText }}
                  >
                    of 5
                  </div>
                </div>
              </div>

              <div className="mt-4 flex-1">
                {topic.insights.length > 0 ? (
                  <ul className="space-y-2.5">
                    {topic.insights.map((line, idx) => (
                      <li
                        key={`${topic.topic}-insight-${idx}`}
                        className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-[#374151]"
                      >
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                          style={{ background: styles.accent }}
                        >
                          {idx + 1}
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[13px] italic text-[#9CA3AF]">
                    Personalised insights are being prepared…
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
