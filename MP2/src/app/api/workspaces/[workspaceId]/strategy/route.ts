import { createTraceId } from "@/lib/api/trace";
import { authorizeWorkspaceAction } from "@/lib/api/guards";
import { mockServices } from "@/domain/mock/services";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { parseJsonBody } from "@/lib/validation/request";
import { strategyCreateSchema } from "@/lib/validation/workspace";

type RouteProps = {
  params: Promise<{ workspaceId: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const traceId = createTraceId();

  try {
    const { workspaceId } = await params;
    await authorizeWorkspaceAction(workspaceId, "workspace.write");

    const input = await parseJsonBody(request, strategyCreateSchema);
    const suggested = await mockServices.groupingAi.suggestStrategy(input);

    return ok(
      {
        workspaceId,
        strategy: {
          id: "mock-strategy-id",
          ...input,
          ...suggested
        }
      },
      201
    );
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
