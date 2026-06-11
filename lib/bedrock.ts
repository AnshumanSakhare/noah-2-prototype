// ─────────────────────────────────────────────────────────────────────────────
// Claude on Amazon Bedrock — bearer-token client
//
// The Anthropic Bedrock SDK (@anthropic-ai/bedrock-sdk) only supports AWS SigV4,
// NOT the Bedrock API key (bearer token). So we call the Bedrock `InvokeModel`
// HTTP endpoint directly with `Authorization: Bearer <AWS_BEARER_TOKEN_BEDROCK>`.
// The request/response bodies are the native Anthropic Messages API shape.
//
// Required env (set in .env.local):
//   AWS_BEARER_TOKEN_BEDROCK   — the Bedrock API key (treat like a password)
//   AWS_REGION                 — e.g. "us-east-1" (us-east-1 / us-west-2 recommended)
//   BEDROCK_MODEL_ID           — optional; defaults to Sonnet 4.6 global routing
// ─────────────────────────────────────────────────────────────────────────────

// Global CRIS profile for Claude Sonnet 4.6 — AWS's recommended id (matches the
// official model card / sample). Works from any source region (we use AWS_REGION).
// Override via BEDROCK_MODEL_ID for a regional profile (e.g. us.anthropic...).
export const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID || "global.anthropic.claude-sonnet-4-6";

// Sanitize: keep only valid region characters so a stray char in .env can't
// produce a malformed hostname (e.g. "us-east-1=" → ENOTFOUND).
const AWS_REGION = (process.env.AWS_REGION || "us-east-1").trim().replace(/[^a-z0-9-]/gi, "");

export interface BedrockMessage {
  role: "user" | "assistant";
  content: any;
}

export interface BedrockUsage {
  input_tokens?: number;
  output_tokens?: number;
}

interface InvokeBody {
  max_tokens: number;
  system?: string;
  messages: BedrockMessage[];
  tools?: any[];
  tool_choice?: any;
}

/**
 * Low-level call to Bedrock InvokeModel. Returns the raw Anthropic message JSON.
 * Throws on missing token or non-2xx responses.
 */
export async function bedrockInvoke(body: InvokeBody): Promise<any> {
  const token = process.env.AWS_BEARER_TOKEN_BEDROCK;
  if (!token) {
    throw new Error("AWS_BEARER_TOKEN_BEDROCK is not configured");
  }

  const url = `https://bedrock-runtime.${AWS_REGION}.amazonaws.com/model/${encodeURIComponent(
    BEDROCK_MODEL_ID
  )}/invoke`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      ...body,
    }),
  });

  // Log routing/observability info. Bedrock doesn't return the served region in
  // the body, but the response headers (request id, any x-amzn-* routing hints)
  // help correlate with CloudTrail / model-invocation logs.
  const headerObj: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headerObj[key] = value;
  });
  console.log(
    `[BEDROCK] model=${BEDROCK_MODEL_ID} region=${AWS_REGION} status=${res.status} ` +
      `requestId=${res.headers.get("x-amzn-requestid") || res.headers.get("x-amzn-RequestId") || "?"} ` +
      `headers=${JSON.stringify(headerObj)}`
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bedrock InvokeModel ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Structured-output helper: forces Claude to call a single tool whose
 * `input_schema` is the desired JSON shape, then returns the tool input.
 * This is the robust replacement for OpenAI's `responses.parse` + zodTextFormat
 * on Bedrock (forced tool_choice is supported; `output_config.format` is not
 * uniformly available via InvokeModel).
 */
export async function bedrockStructured<T = any>(opts: {
  system: string;
  user: string;
  schema: Record<string, any>;
  toolName: string;
  toolDescription?: string;
  maxTokens?: number;
}): Promise<{ data: T; usage: BedrockUsage }> {
  const { system, user, schema, toolName, toolDescription, maxTokens } = opts;

  const result = await bedrockInvoke({
    max_tokens: maxTokens ?? 8000,
    system,
    messages: [{ role: "user", content: user }],
    tools: [
      {
        name: toolName,
        description: toolDescription || "Emit the structured result.",
        input_schema: schema,
      },
    ],
    // Force the model to return exactly this tool's input — guarantees JSON shape.
    tool_choice: { type: "tool", name: toolName },
  });

  const block = (result?.content || []).find((b: any) => b?.type === "tool_use");
  if (!block) {
    throw new Error(
      `Bedrock response contained no tool_use block (stop_reason: ${result?.stop_reason})`
    );
  }

  return { data: block.input as T, usage: (result?.usage || {}) as BedrockUsage };
}
