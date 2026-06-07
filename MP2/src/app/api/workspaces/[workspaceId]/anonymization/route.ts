import { createTraceId } from "@/lib/api/trace";
import { authorizeWorkspaceAction } from "@/lib/api/guards";
import { applyAnonymization } from "@/domain/services/normalization";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { parseJsonBody } from "@/lib/validation/request";
import { anonymizationDecisionSchema } from "@/lib/validation/workspace";

type RouteProps = {
  params: Promise<{ workspaceId: string }>;
};

/**
 * Applies the user's anonymization decision to already-extracted quotes.
 * Default is masking ON; the user may explicitly skip (opt out).
 */
export async function POST(request: Request, { params }: RouteProps) {
  const traceId = createTraceId();

  try {
    const { workspaceId } = await params;
    await authorizeWorkspaceAction(workspaceId, "workspace.write");

    const input = await parseJsonBody(request, anonymizationDecisionSchema);
    const result = await applyAnonymization({ workspaceId, applyMasking: input.applyMasking });

    return ok({ workspaceId, anonymization: result });
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
