import { createHash } from "node:crypto";
import { createTraceId } from "@/lib/api/trace";
import { getSessionContext } from "@/lib/auth/session";
import { authorizeWorkspaceAction } from "@/lib/api/guards";
import { getBoardView } from "@/domain/services/boardView";
import { ApiError } from "@/lib/errors/types";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { repo } from "@/lib/repo/store";

type RouteProps = {
  params: Promise<{ workspaceId: string }>;
};

/**
 * Board read endpoint with two access paths:
 *  - authenticated workspace members (any role): full board view
 *  - anonymous share-token holders: view-only, with unmasked quotes redacted so
 *    raw identifiable data is never exposed through a link.
 */
export async function GET(_: Request, { params }: RouteProps) {
  const traceId = createTraceId();

  try {
    const { workspaceId } = await params;
    const session = await getSessionContext();

    if (session.isAnonymousShare) {
      if (!repo.getWorkspace(workspaceId)) {
        throw new ApiError("NOT_FOUND", "Workspace not found.", 404);
      }

      const tokenHash = createHash("sha256")
        .update(session.shareToken ?? "")
        .digest("hex");
      const link = repo.findActiveShareLink(workspaceId, tokenHash);

      if (!link) {
        throw new ApiError("FORBIDDEN", "Invalid or expired share link.", 403);
      }

      return ok({ view: getBoardView(workspaceId, { redactUnmasked: true }), access: "ANONYMOUS_VIEW_ONLY" });
    }

    await authorizeWorkspaceAction(workspaceId, "workspace.read");
    return ok({ view: getBoardView(workspaceId), access: "MEMBER" });
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
