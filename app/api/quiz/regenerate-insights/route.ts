import { NextResponse } from "next/server";

import { generatePlacementTopicInsights } from "@/agents/diagnostic/placementTopicInsights";
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

    const placementTopicInsights = await generatePlacementTopicInsights(
      body.report,
    );

    return NextResponse.json({ placementTopicInsights });
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
