import { NextResponse } from "next/server";

import { openApiSpec } from "@/lib/openapi";

export const runtime = "nodejs";

/** GET /api/v1/openapi — the OpenAPI 3.0 spec as JSON. */
export function GET() {
  return NextResponse.json(openApiSpec);
}
