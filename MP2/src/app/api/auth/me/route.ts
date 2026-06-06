import { createTraceId } from "@/lib/api/trace";
import { getSessionContext } from "@/lib/auth/session";
import { toErrorResponse, ok } from "@/lib/errors/http";

export async function GET() {
  const traceId = createTraceId();

  try {
    const session = await getSessionContext();
    return ok({
      user: session.identity
        ? {
            id: session.identity.userId,
            email: session.identity.email,
            displayName: session.identity.displayName,
            provider: session.identity.provider
          }
        : null
    });
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
