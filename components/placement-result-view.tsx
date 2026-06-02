"use client";

import { CalendarCheck, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import type { DiagnosticReport } from "@/agents/diagnostic/types/index";
import { generatePlacementInsights } from "@/lib/placement-insights";

interface PlacementTopicInsightsSectionProps {
  report: DiagnosticReport;
  studentFirstName: string;
}

interface PlacementAIPlanResponse {
  planNarrative: string;
  nextSteps: string[];
}

export function PlacementTopicInsightsSection({
  report,
  studentFirstName,
}: PlacementTopicInsightsSectionProps) {
  const summary = useMemo(() => generatePlacementInsights(report), [report]);
  const placementPlan = report.placementPlanInsights;
  const [aiPlan, setAiPlan] = useState<PlacementAIPlanResponse | null>(null);
  const [aiPlanLoading, setAiPlanLoading] = useState(false);
  const [aiPlanError, setAiPlanError] = useState<string | null>(null);

  async function handleGenerateAIPlan() {
    if (!placementPlan?.consolidatedInsights || aiPlanLoading) return;
    setAiPlanLoading(true);
    setAiPlanError(null);
    try {
      const res = await fetch("/api/quiz/ai-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentFirstName,
          consolidatedInsights: placementPlan.consolidatedInsights,
          bandName: placementPlan.bandName,
          nextBandName: placementPlan.nextBandName,
          nextGoal: placementPlan.nextGoal,
          planSummary: placementPlan.planSummary,
        }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errBody?.error ?? "Failed to generate AI plan.");
      }
      const data = (await res.json()) as { plan: PlacementAIPlanResponse };
      setAiPlan(data.plan);
    } catch (error) {
      setAiPlanError(
        error instanceof Error ? error.message : "Failed to generate AI plan.",
      );
    } finally {
      setAiPlanLoading(false);
    }
  }

  if (summary.topics.length === 0) return null;

  return (
    <div className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-[0_2px_20px_rgba(26,26,46,0.05)] sm:p-7">
      {/* Consolidated AI Insights card */}
      {placementPlan?.consolidatedInsights && (
        <div className="mb-4 rounded-[18px] border border-[#DDD7FF] bg-[linear-gradient(135deg,#FFFFFF_0%,#F7F6FF_100%)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#DDD7FF]/40 pb-4">
            <div>
              <div className="text-[1.15rem] font-extrabold text-[#1B4A4A]">
                AI learning plan matrix
              </div>
              <div className="mt-1 text-[0.9rem] font-medium text-[#6B7280] text-left">
                {placementPlan?.planSummary ??
                  "Prioritised from answer patterns across the placement topics."}
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerateAIPlan}
              disabled={aiPlanLoading || !placementPlan?.consolidatedInsights}
              className="inline-flex items-center gap-2 rounded-full bg-[#F5A623] px-5 py-2.5 text-[0.82rem] font-extrabold uppercase tracking-wider text-white shadow-[0_5px_0_#C68213] transition-all hover:translate-y-0.5 hover:bg-[#E0941A] hover:shadow-[0_3px_0_#C68213] active:translate-y-1 active:shadow-[0_0_0_#C68213] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-[0_5px_0_#C68213]"
            >
              {aiPlanLoading && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {aiPlanLoading
                ? "Generating..."
                : aiPlan
                  ? "Regenerate AI plan"
                  : "Generate AI plan"}
            </button>
          </div>

          <div className="mt-4 text-left">
            <div className="text-[0.92rem] font-bold uppercase tracking-wider text-[#4338CA]">
              Consolidated AI Insights
            </div>
            <div className="mt-2 text-[0.98rem] font-medium leading-relaxed text-[#525978]">
              {placementPlan.consolidatedInsights}
            </div>
          </div>
        </div>
      )}

      {aiPlanError && (
        <div className="mb-4 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-left text-[0.9rem] font-medium text-red-700">
          {aiPlanError}
        </div>
      )}

      {/* AI Learning Plan card */}
      {aiPlan && (
        <div className="mb-4 rounded-[18px] border border-[#F5A623]/35 bg-[linear-gradient(135deg,#FFFFFF_0%,#FFF8EC_100%)] p-5">
          <div className="text-left">
            <div className="text-[0.92rem] font-bold uppercase tracking-wider text-[#B8860B]">
              AI Learning Plan
            </div>
            <div className="mt-2 text-[0.98rem] font-medium leading-relaxed text-[#525978]">
              {aiPlan.planNarrative}
            </div>
            {aiPlan.nextSteps.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {aiPlan.nextSteps.map((step, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-[0.95rem] font-medium leading-relaxed text-[#374151]"
                  >
                    <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#F5A623]" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

        {placementPlan?.nextGoal && (
          <div className="mt-4 rounded-[12px] border border-[#4338CA]/12 bg-white px-4 py-3 text-[0.95rem] font-semibold leading-relaxed text-[#374151]">
            <span className="text-[#4338CA]">Next goal:</span>{" "}
            {placementPlan.nextGoal}
          </div>
        )}

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
