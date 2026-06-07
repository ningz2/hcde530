import { createTraceId } from "@/lib/api/trace";
import { AUTH_COOKIE } from "@/lib/auth/session";
import { toErrorResponse, ok } from "@/lib/errors/http";

export async function POST() {
  const traceId = createTraceId();

  try {
    const response = ok({ loggedOut: true });
    response.cookies.set(AUTH_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      secure: process.env.NODE_ENV === "production"
    });
    return response;
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
