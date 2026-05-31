import { createTraceId } from "@/lib/api/trace";
import { authorizeWorkspaceAction } from "@/lib/api/guards";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { repo } from "@/lib/repo/store";

type RouteProps = {
  params: Promise<{ workspaceId: string }>;
};

export async function GET(_: Request, { params }: RouteProps) {
  const traceId = createTraceId();

  try {
    const { workspaceId } = await params;
    const { session } = await authorizeWorkspaceAction(workspaceId, "workspace.read");

    const snapshots = repo.listSnapshots(workspaceId, session.identity.userId);

    return ok({
      workspaceId,
      sessionScoped: true,
      undoAvailable: snapshots.length > 0,
      snapshots: snapshots.map((s) => ({
        id: s.id,
        entityType: s.entityType,
        action: s.action,
        label: s.label,
        createdAt: s.createdAt
      }))
    });
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
