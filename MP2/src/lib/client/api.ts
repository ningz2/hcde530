"use client";

export type ApiResult<T> = { data: T } | { error: { code: string; message: string } };

const jsonHeaders: Record<string, string> = { "content-type": "application/json" };

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "same-origin",
    body: JSON.stringify(body)
  });
  return (await res.json()) as ApiResult<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: jsonHeaders,
    credentials: "same-origin",
    body: JSON.stringify(body)
  });
  return (await res.json()) as ApiResult<T>;
}

export async function apiSend<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE" = "POST"
): Promise<ApiResult<T>> {
  const res = await fetch(path, { method, headers: jsonHeaders, credentials: "same-origin" });
  return (await res.json()) as ApiResult<T>;
}

export function isError<T>(result: ApiResult<T>): result is { error: { code: string; message: string } } {
  return "error" in result;
}
