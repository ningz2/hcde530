import { createTraceId } from "@/lib/api/trace";
import { AUTH_COOKIE, AUTH_COOKIE_MAX_AGE_SECONDS, createSignedSessionCookie } from "@/lib/auth/session";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { repo } from "@/lib/repo/store";
import { parseJsonBody } from "@/lib/validation/request";
import { signInSchema } from "@/lib/validation/workspace";

export async function POST(request: Request) {
  const traceId = createTraceId();

  try {
    const input = await parseJsonBody(request, signInSchema);
    const user = await repo.upsertUser({
      email: input.email,
      displayName: input.displayName || input.email.split("@")[0],
      provider: input.provider
    });

    const response = ok({ user }, 201);
    response.cookies.set(AUTH_COOKIE, createSignedSessionCookie(user), {
      httpOnly: true,
      maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production"
    });
    return response;
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
