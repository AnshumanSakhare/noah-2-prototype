import {
  ChevronLeft,
  ClipboardCheck,
  FileCheck2,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { useEffect, useState } from "react";

const LOADING_STAGES = [
  {
    label: "Collecting answers",
    description: "Gathering response data from the test.",
    Icon: ClipboardCheck,
  },
  {
    label: "Validating responses",
    description: "Checking answer formats and consistency.",
    Icon: FileCheck2,
  },
  {
    label: "Scoring each answer",
    description: "Computing points earned per question.",
    Icon: Target,
  },
  {
    label: "Analyzing patterns",
    description: "Spotting strengths and learning trends.",
    Icon: TrendingUp,
  },
  {
    label: "Generating insights",
    description: "Turning results into recommendations.",
    Icon: Sparkles,
  },
  {
    label: "Preparing your report",
    description: "Polishing the final summary.",
    Icon: Wand2,
  },
];

const STAGE_DURATION_MS = 2200;

interface LoadingScreenProps {
  onBack?: () => void;
  studentName?: string;
  assessmentKind?: "diagnostic" | "placement";
}

export function MultiStageLoadingScreen({
  onBack,
  studentName,
  assessmentKind = "diagnostic",
}: LoadingScreenProps) {
  const isPlacement = assessmentKind === "placement";
  const brandFull = isPlacement ? "Placement Test" : "Diagnostic Agent";
  const brandShort = isPlacement ? "Placement" : "Diagnostic";
  const brandEmoji = isPlacement ? "🎯" : "🔭";
  const [currentStage, setCurrentStage] = useState(0);
  const firstName = studentName?.trim().split(/\s+/)[0] ?? "";
  const totalStages = LOADING_STAGES.length;
  const isLastStage = currentStage === totalStages - 1;

  // Advance through stages, then stop on the last one (don't loop).
  useEffect(() => {
    if (isLastStage) return;
    const timer = setTimeout(() => {
      setCurrentStage((prev) => Math.min(prev + 1, totalStages - 1));
    }, STAGE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [currentStage, isLastStage, totalStages]);

  const stage = LOADING_STAGES[currentStage];
  const StageIcon = stage.Icon;
  const progressPct = Math.round(((currentStage + 1) / totalStages) * 100);

  return (
    <div className="fixed inset-0 z-100 flex flex-col bg-gradient-to-b from-[#FFFCF6] via-white to-[#F4FBFA]">
      {/* Header section with logo and back button */}
      <div className="mx-auto w-full max-w-370 px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[#F5A623] bg-white text-[20px] ${
                isPlacement ? "rounded-[10px]" : "rounded-full"
              }`}
            >
              {brandEmoji}
            </div>
            <span className="font-bold text-[15px] tracking-[0.02em] text-[#1B4A4A] uppercase sm:text-[18px]">
              <span className="hidden sm:inline">{brandFull}</span>
              <span className="sm:hidden">{brandShort}</span>
            </span>
          </div>

          <button
            onClick={onBack}
            className="flex items-center gap-1 text-[14px] text-[#6B7280] transition-colors hover:text-[#1a1a1a]"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Headline */}
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#F5A623]/30 bg-[#F5A623]/10 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-[#B8761A] uppercase">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F5A623] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F5A623]" />
              </span>
              {isLastStage ? "Almost ready" : "Working on it"}
            </div>
            <h1 className="font-bold text-[28px] leading-tight text-[#1a1a1a] sm:text-[32px]">
              {firstName
                ? `Crafting ${firstName}'s report`
                : "Crafting your report"}
            </h1>
            <p className="mt-2 text-[14px] text-[#6B7280]">
              {firstName
                ? `Hang tight, ${firstName} — this only takes a moment.`
                : "Hang tight — this only takes a moment."}
            </p>
          </div>

          {/* Featured stage card */}
          <div className="relative overflow-hidden rounded-3xl border border-[#E2DED4] bg-white p-6 shadow-[0_8px_30px_rgba(27,74,74,0.06)] sm:p-8">
            {/* Soft accent glow */}
            <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[#F5A623]/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-[#2EC4B6]/15 blur-3xl" />

            <div className="relative flex flex-col items-center text-center">
              {/* Animated icon */}
              <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-[#F5A623]/15" />
                <span className="absolute inset-0 animate-ping rounded-full bg-[#F5A623]/20" />
                <span className="absolute inset-2 rounded-full bg-gradient-to-br from-[#F5A623] to-[#E58E0F] shadow-lg shadow-[#F5A623]/30" />
                <StageIcon
                  key={currentStage}
                  className="relative h-8 w-8 text-white animate-[fadeIn_0.4s_ease-out]"
                  strokeWidth={2.2}
                />
              </div>

              {/* Stage text — re-mounts on stage change for a subtle fade */}
              <div
                key={currentStage}
                className="animate-[fadeIn_0.4s_ease-out]"
              >
                <div className="mb-1 text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
                  Step {currentStage + 1} of {totalStages}
                </div>
                <div className="font-bold text-[22px] leading-tight text-[#1a1a1a]">
                  {stage.label}
                </div>
                <div className="mt-1.5 text-[13px] text-[#6B7280]">
                  {stage.description}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-6 w-full">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F1EEE6]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2EC4B6] via-[#7AC79A] to-[#F5A623] transition-all duration-700 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Step dots */}
                <div className="mt-4 flex items-center justify-between">
                  {LOADING_STAGES.map((_, i) => {
                    const isDone = i < currentStage;
                    const isActive = i === currentStage;
                    return (
                      <div
                        key={i}
                        className="flex flex-1 items-center justify-center"
                      >
                        <span
                          className={`block rounded-full transition-all duration-300 ${
                            isActive
                              ? "h-2.5 w-2.5 bg-[#F5A623] ring-4 ring-[#F5A623]/20"
                              : isDone
                                ? "h-2 w-2 bg-[#2EC4B6]"
                                : "h-2 w-2 bg-[#E2DED4]"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
