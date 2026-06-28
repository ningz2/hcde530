import { createTraceId } from "@/lib/api/trace";
import { authorizeWorkspaceAction } from "@/lib/api/guards";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { ApiError } from "@/lib/errors/types";
import { repo } from "@/lib/repo/store";

type RouteProps = {
  params: Promise<{ workspaceId: string }>;
};

export async function DELETE(_request: Request, { params }: RouteProps) {
  const traceId = createTraceId();

  try {
    const { workspaceId } = await params;
    // Only OWNER may delete a project (workspace.delete in the access matrix).
    await authorizeWorkspaceAction(workspaceId, "workspace.delete");

    const deleted = await repo.deleteWorkspace(workspaceId);
    if (!deleted) {
      throw new ApiError("NOT_FOUND", "Project not found.", 404);
    }

    return ok({ deleted: true, workspaceId });
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
