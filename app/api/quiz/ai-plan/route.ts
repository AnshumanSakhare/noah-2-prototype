import { NextResponse } from "next/server";

import {
  generatePlacementAIPlan,
  type GeneratePlacementAIPlanInput,
} from "@/agents/diagnostic/placementAIPlan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<GeneratePlacementAIPlanInput>;
    if (!body.consolidatedInsights || !body.studentFirstName) {
      return NextResponse.json(
        { error: "Missing consolidatedInsights or studentFirstName." },
        { status: 400 },
      );
    }

    const plan = await generatePlacementAIPlan({
      studentFirstName: body.studentFirstName,
      consolidatedInsights: body.consolidatedInsights,
      bandName: body.bandName,
      nextBandName: body.nextBandName,
      nextGoal: body.nextGoal,
      planSummary: body.planSummary,
    });

    return NextResponse.json({ plan });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to generate AI plan.",
      },
      { status: 400 },
    );
  }
}
