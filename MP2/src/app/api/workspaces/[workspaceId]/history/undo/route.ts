import { createTraceId } from "@/lib/api/trace";
import { authorizeWorkspaceAction } from "@/lib/api/guards";
import { ApiError } from "@/lib/errors/types";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { repo } from "@/lib/repo/store";

type RouteProps = {
  params: Promise<{ workspaceId: string }>;
};

/**
 * Per-user-session undo: pops the most recent snapshot for this user in this
 * workspace and reverts the captured entity to its previous value.
 */
export async function POST(_: Request, { params }: RouteProps) {
  const traceId = createTraceId();

  try {
    const { workspaceId } = await params;
    const { session } = await authorizeWorkspaceAction(workspaceId, "board.edit");

    const snapshot = await repo.popSnapshot(workspaceId, session.identity.userId);
    if (!snapshot) {
      throw new ApiError("NOT_FOUND", "Nothing to undo in this session.", 404);
    }

    if (snapshot.entityType === "THEME" && snapshot.action === "UPDATE") {
      await repo.updateTheme(snapshot.entityId, {
        title: snapshot.previous.title as string,
        description: snapshot.previous.description as string | undefined
      });
    }

    return ok({ undone: { id: snapshot.id, label: snapshot.label } });
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
