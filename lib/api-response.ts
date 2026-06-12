import { NextResponse } from "next/server";

/**
 * Standard API response envelope.
 *
 * Every endpoint that adopts this contract returns the SAME top-level shape on
 * both success and failure, so clients can branch on a single `success` flag
 * and always find `data`, `meta`, and `error` in predictable places.
 */
export interface ApiMeta {
  /** Correlation id — echo this back when reporting issues. */
  requestId: string;
  /** ISO-8601 timestamp the response was generated. */
  timestamp: string;
  /** Endpoint-specific extras (resolved filters, pagination context, …). */
  [key: string]: unknown;
}

export interface ApiError {
  /** Stable, machine-readable error code (e.g. "VALIDATION_ERROR"). */
  code: string;
  /** Human-readable explanation. */
  message: string;
  /** Optional field-level breakdown for validation failures. */
  details?: Array<{ field: string; issue: string }>;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: ApiMeta;
  error: null;
}

export interface ApiFailure {
  success: false;
  data: null;
  meta: ApiMeta;
  error: ApiError;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Stable error codes used across the API surface. */
export const API_ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

function buildMeta(extra?: Record<string, unknown>): ApiMeta {
  return {
    requestId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `req_${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

/** Build a 2xx success envelope. */
export function apiSuccess<T>(
  data: T,
  options?: { meta?: Record<string, unknown>; status?: number },
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
      meta: buildMeta(options?.meta),
      error: null,
    },
    { status: options?.status ?? 200 },
  );
}

/** Build a non-2xx failure envelope with the same top-level shape. */
export function apiError(
  code: ApiErrorCode | string,
  message: string,
  options?: {
    status?: number;
    details?: ApiError["details"];
    meta?: Record<string, unknown>;
  },
): NextResponse<ApiFailure> {
  return NextResponse.json(
    {
      success: false as const,
      data: null,
      meta: buildMeta(options?.meta),
      error: {
        code,
        message,
        ...(options?.details ? { details: options.details } : {}),
      },
    },
    { status: options?.status ?? 400 },
  );
}
