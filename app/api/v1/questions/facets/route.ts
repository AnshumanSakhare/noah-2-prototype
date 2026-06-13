import type { NextRequest } from "next/server";

import { getQuestionFacets } from "@/agents/diagnostic/tools/contentQuiz";
import { apiSuccess } from "@/lib/api-response";
import {
  filtersMeta,
  parseFilters,
  type RawInput,
  rawInputFromQuery,
  validationError,
  wrap,
} from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(raw: RawInput) {
  const { filters, errors } = parseFilters(raw);
  if (!filters || errors.length > 0) {
    return validationError(errors);
  }

  const facets = await getQuestionFacets(filters);

  return apiSuccess({ facets }, { meta: { filters: filtersMeta(filters) } });
}

/**
 * GET /api/v1/questions/facets — aggregated counts (by type, difficulty, bloom,
 * rating, grade, topic) for the questions matching the same filters as
 * /api/v1/questions. Use it to see what data exists before fetching rows.
 */
export function GET(request: NextRequest) {
  return wrap(() => handle(rawInputFromQuery(request)));
}

export function POST(request: NextRequest) {
  return wrap(async () => {
    let body: RawInput = {};
    try {
      const json = await request.json();
      if (json && typeof json === "object") body = json as RawInput;
    } catch {
      return validationError([
        { field: "body", issue: "Request body must be valid JSON." },
      ]);
    }
    return handle(body);
  });
}
