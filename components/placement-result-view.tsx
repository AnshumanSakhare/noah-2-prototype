"use client";

import { CalendarCheck, Sparkles } from "lucide-react";
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
  }
> = {
  green: {
    accent: "#22C55E",
    chipBg: "rgba(34,197,94,0.12)",
    chipText: "#15803D",
    scoreColor: "#15803D",
  },
  yellow: {
    accent: "#F5A623",
    chipBg: "rgba(245,166,35,0.14)",
    chipText: "#92590A",
    scoreColor: "#B8860B",
  },
  orange: {
    accent: "#F97316",
    chipBg: "rgba(249,115,22,0.14)",
    chipText: "#B4470F",
    scoreColor: "#C2410C",
  },
  red: {
    accent: "#EF4444",
    chipBg: "rgba(239,68,68,0.12)",
    chipText: "#B91C1C",
    scoreColor: "#B91C1C",
  },
};

export function PlacementTopicInsightsSection({
  report,
  studentFirstName,
}: PlacementTopicInsightsSectionProps) {
  const summary = useMemo(() => generatePlacementInsights(report), [report]);
  const placementPlan = report.placementPlanInsights;

  if (summary.topics.length === 0) return null;

  return (
    <div className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-[0_2px_20px_rgba(26,26,46,0.05)] sm:p-7">
      <div className="mb-6 rounded-[18px] border border-[#DDD7FF] bg-[linear-gradient(135deg,#FFFFFF_0%,#F7F6FF_100%)] p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[1rem] font-extrabold text-[#1B4A4A]">
              AI learning plan matrix
            </div>
            <div className="mt-1 text-[0.76rem] font-medium text-[#6B7280]">
              {placementPlan?.planSummary ??
                "Prioritised from answer patterns across the placement topics."}
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-wider text-[#4338CA] ring-1 ring-[#4338CA]/15">
            <Sparkles className="h-3.5 w-3.5" />
            AI plan
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {summary.topics.map((topic) => {
            const styles = TONE_STYLES[topic.bandTone];
            const topicMessage =
              topic.insights.length > 0
                ? topic.insights.join(" ")
                : `${topic.topic} should be reviewed with guided examples and short practice sets.`;

            return (
              <div
                key={`plan-${topic.topic}`}
                className="rounded-[14px] border border-white bg-white/85 p-4 shadow-[0_1px_8px_rgba(26,26,46,0.035)]"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[0.9rem] font-extrabold text-[#1B4A4A]">
                    {topic.topic}
                  </div>
                  <div
                    className="rounded-full px-2.5 py-1 font-mono text-[0.72rem] font-black"
                    style={{
                      background: styles.chipBg,
                      color: styles.scoreColor,
                    }}
                  >
                    {topic.scorePercent}/100
                  </div>
                </div>

                <div className="rounded-[10px] bg-[#F8FAFC] p-3">
                  <div className="text-[0.78rem] font-semibold leading-relaxed text-[#374151]">
                    {topicMessage}
                  </div>
                  <div
                    className="mt-3 inline-flex rounded-md px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-wider ring-1"
                    style={{
                      background: styles.chipBg,
                      color: styles.chipText,
                      boxShadow: `inset 0 0 0 1px ${styles.accent}22`,
                    }}
                  >
                    {topic.bandLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {placementPlan?.nextGoal && (
          <div className="mt-4 rounded-[12px] border border-[#4338CA]/12 bg-white px-4 py-3 text-[0.82rem] font-semibold leading-relaxed text-[#374151]">
            <span className="text-[#4338CA]">Next goal:</span>{" "}
            {placementPlan.nextGoal}
          </div>
        )}
      </div>

      <div
        className="mt-6 overflow-hidden rounded-[20px] p-5 sm:mt-8 sm:p-7"
        style={{
          background:
            "linear-gradient(135deg, rgba(46,196,182,0.08), rgba(245,166,35,0.08))",
          border: "2px solid rgba(46,196,182,0.20)",
        }}
      >
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[28px] shadow-sm ring-2 ring-[#2EC4B6]/20">
            {"\uD83D\uDE80"}
          </div>
          <div className="flex-1">
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#1B4A4A] ring-1 ring-[#2EC4B6]/30">
              <Sparkles className="h-3 w-3 text-[#F5A623]" />
              Codeyoung can help
            </div>
            <h3 className="text-[17px] font-extrabold leading-tight text-[#1B4A4A] sm:text-[19px]">
              Ready to help {studentFirstName} grow?
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#6B7280]">
              Codeyoung&apos;s expert tutors will guide {studentFirstName}{" "}
              1-on-1 through the topics that need work, building strong
              fundamentals and confidence one concept at a time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              // TODO: wire up booking flow
            }}
            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#F5A623] px-6 py-3.5 text-[14px] font-bold text-white shadow-[0_6px_0_#C68213] transition-all hover:translate-y-0.5 hover:bg-[#E0941A] hover:shadow-[0_3px_0_#C68213] active:translate-y-1 active:shadow-[0_0_0_#C68213] sm:w-auto sm:px-7 sm:text-[15px]"
          >
            <CalendarCheck className="h-4 w-4" />
            Book a free class
          </button>
        </div>
      </div>
    </div>
  );
}
