import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";

const LOADING_STAGES = [
  {
    label: "Collecting your answers",
    description: "Gathering response data",
  },
  {
    label: "Validating responses",
    description: "Checking answer formats",
  },
  {
    label: "Scoring each answer",
    description: "Computing points earned",
  },
  {
    label: "Analyzing patterns",
    description: "Identifying learning trends",
  },
  {
    label: "Generating insights",
    description: "Creating recommendations",
  },
  {
    label: "Preparing your report",
    description: "Finalizing results",
  },
];

interface LoadingScreenProps {
  onBack?: () => void;
}

export function MultiStageLoadingScreen({ onBack }: LoadingScreenProps) {
  const [currentStage, setCurrentStage] = useState(0);

  // Loop through stages every 2 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStage((prev) => (prev + 1) % LOADING_STAGES.length);
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const stage = LOADING_STAGES[currentStage];

  return (
    <div className="fixed inset-0 z-100 flex flex-col bg-white">
      {/* Header section with logo and back button */}
      <div className="mx-auto w-full max-w-370 px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#F5A623] bg-white text-[20px]">
              🔭
            </div>
            <span className="font-bold text-[15px] tracking-[0.02em] text-[#1B4A4A] uppercase sm:text-[18px]">
              <span className="hidden sm:inline">Diagnostic Agent</span>
              <span className="sm:hidden">Diagnostic</span>
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

      <div className="flex flex-1 flex-col items-center justify-center">
        {/* Progress line indicators */}
        <div className="mb-12 flex items-center gap-1.5">
          {LOADING_STAGES.map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  i < currentStage
                    ? "w-8 bg-[#2EC4B6]"
                    : i === currentStage
                      ? "w-12 bg-[#F5A623]"
                      : "w-2 bg-[#E2DED4]"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Stage message */}
        <div className="mb-3 text-center">
          <div className="font-bold text-[24px] text-[#1a1a1a]">
            {stage.label}
          </div>
        </div>

        {/* Stage description */}
        <div className="mb-12 text-center text-[14px] text-[#6B7280]">
          {stage.description}
        </div>

        {/* Animated pulse indicator */}
        <div className="flex h-12 w-12 items-center justify-center">
          <div className="absolute h-12 w-12 rounded-full bg-[#F5A623]/20 animate-pulse" />
          <div className="h-3 w-3 rounded-full bg-[#F5A623]" />
        </div>

        {/* Subtle text */}
        <div className="mt-8 text-[12px] text-[#9CA3AF]">
          Processing your test...
        </div>
      </div>
    </div>
  );
}
