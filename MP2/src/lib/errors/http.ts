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

  const payload: ApiErrorPayload = {
    code: "INTERNAL_ERROR",
    message: defaultMessage,
    traceId
  };

  return NextResponse.json({ error: payload }, { status: 500 });
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}
