"use client";

/**
 * Dev-only API client.
 *
 * Auth is still mocked via request headers until Supabase Auth is wired. This
 * helper injects a fixed dev identity + OWNER role so the UI slice is usable.
 * Replace the header injection with a real session token when auth lands.
 */
const devHeaders: Record<string, string> = {
  "content-type": "application/json",
  "x-mock-user-id": "dev-user",
  "x-mock-user-email": "dev@example.com",
  "x-mock-role": "OWNER"
};

export type ApiResult<T> = { data: T } | { error: { code: string; message: string } };

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    method: "POST",
    headers: devHeaders,
    body: JSON.stringify(body)
  });
  return (await res.json()) as ApiResult<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: devHeaders,
    body: JSON.stringify(body)
  });
  return (await res.json()) as ApiResult<T>;
}

export async function apiSend<T>(path: string, method: "POST" | "PATCH" = "POST"): Promise<ApiResult<T>> {
  const res = await fetch(path, { method, headers: devHeaders });
  return (await res.json()) as ApiResult<T>;
}

export function isError<T>(result: ApiResult<T>): result is { error: { code: string; message: string } } {
  return "error" in result;
}
