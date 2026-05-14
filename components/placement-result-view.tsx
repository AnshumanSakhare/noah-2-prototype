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
  const summary = useMemo(
    () => generatePlacementInsights(report),
    [report],
  );

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
                    {Math.round(topic.scoreOutOf5 * 4)}
                  </div>
                  <div
                    className="text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: styles.chipText }}
                  >
                    of 20
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
            🚀
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
              Codeyoung's expert tutors will guide {studentFirstName} 1-on-1
              through the topics that need work — building strong fundamentals
              and confidence, one concept at a time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              // TODO: wire up booking flow
            }}
            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#F5A623] px-6 py-3.5 font-bold text-[14px] text-white transition-all hover:bg-[#E0941A] sm:w-auto sm:px-7 sm:text-[15px] shadow-[0_6px_0_#C68213] hover:translate-y-0.5 hover:shadow-[0_3px_0_#C68213] active:translate-y-1 active:shadow-[0_0_0_#C68213]"
          >
            <CalendarCheck className="h-4 w-4" />
            Book a free class
          </button>
        </div>
      </div>
    </div>
  );
}
