import { createTraceId } from "@/lib/api/trace";
import { AUTH_COOKIE } from "@/lib/auth/session";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { repo } from "@/lib/repo/store";
import { parseJsonBody } from "@/lib/validation/request";
import { signInSchema } from "@/lib/validation/workspace";

export async function POST(request: Request) {
  const traceId = createTraceId();

  try {
    const input = await parseJsonBody(request, signInSchema);
    const user = repo.upsertUser({
      email: input.email,
      displayName: input.displayName || input.email.split("@")[0],
      provider: input.provider
    });
    const session = repo.createSession(user.id);

    const response = ok({ user }, 201);
    response.cookies.set(AUTH_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/"
    });
    return response;
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
