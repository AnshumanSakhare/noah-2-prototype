import { NextResponse } from "next/server";

import { generatePlacementAIInsights } from "@/agents/diagnostic/placementTopicInsights";
import type { DiagnosticReport } from "@/agents/diagnostic/types/index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { report?: DiagnosticReport };
    if (!body.report) {
      return NextResponse.json(
        { error: "Missing report in request body." },
        { status: 400 },
      );
    }

    const placementAIInsights = await generatePlacementAIInsights(body.report);

    return NextResponse.json({
      placementTopicInsights: placementAIInsights.topics,
      placementPlanInsights: placementAIInsights.placementPlanInsights,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to regenerate insights.",
      },
      { status: 400 },
    );
  }
}
