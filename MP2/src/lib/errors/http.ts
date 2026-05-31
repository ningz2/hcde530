import { NextResponse } from "next/server";
import { ApiError, type ApiErrorPayload } from "@/lib/errors/types";

const defaultMessage = "An unexpected error occurred.";

export function toErrorResponse(error: unknown, traceId?: string): NextResponse {
  if (error instanceof ApiError) {
    const payload: ApiErrorPayload = {
      code: error.code,
      message: error.message,
      details: error.details,
      traceId
    };

    return NextResponse.json({ error: payload }, { status: error.status });
  }

  console.error("[api] unhandled error", traceId, error);

  const payload: ApiErrorPayload = {
    code: "INTERNAL_ERROR",
    message: defaultMessage,
    traceId,
    details:
      process.env.NODE_ENV === "production"
        ? undefined
        : { dev: error instanceof Error ? `${error.name}: ${error.message}` : String(error) }
  };

  return NextResponse.json({ error: payload }, { status: 500 });
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}
