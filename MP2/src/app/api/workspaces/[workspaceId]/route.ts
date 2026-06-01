import { createTraceId } from "@/lib/api/trace";
import { authorizeWorkspaceAction } from "@/lib/api/guards";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { repo } from "@/lib/repo/store";

type RouteProps = {
  params: Promise<{ workspaceId: string }>;
};

export async function DELETE(_request: Request, { params }: RouteProps) {
  const traceId = createTraceId();

  try {
    const { workspaceId } = await params;
    // Only OWNER may delete a project (workspace.delete in the access matrix).
    const { session } = await authorizeWorkspaceAction(workspaceId, "workspace.delete");

    repo.deleteWorkspace(workspaceId);

    repo.logActivity({
      workspaceId,
      actorUserId: session.identity.userId,
      action: "workspace_deleted",
      targetType: "Workspace",
      targetId: workspaceId
    });

    return ok({ deleted: true, workspaceId });
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
