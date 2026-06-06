import { createTraceId } from "@/lib/api/trace";
import { AUTH_COOKIE } from "@/lib/auth/session";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { repo } from "@/lib/repo/store";

export async function POST(request: Request) {
  const traceId = createTraceId();

  try {
    const token = request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${AUTH_COOKIE}=`))
      ?.slice(AUTH_COOKIE.length + 1);

    if (token) {
      repo.deleteSession(token);
    }

    const response = ok({ loggedOut: true });
    response.cookies.set(AUTH_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0
    });
    return response;
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
