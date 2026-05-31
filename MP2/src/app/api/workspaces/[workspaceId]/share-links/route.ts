import { createHash, randomUUID } from "node:crypto";
import { createTraceId } from "@/lib/api/trace";
import { authorizeWorkspaceAction } from "@/lib/api/guards";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { parseJsonBody } from "@/lib/validation/request";
import { shareLinkCreateSchema } from "@/lib/validation/workspace";
import { repo } from "@/lib/repo/store";

type RouteProps = {
  params: Promise<{ workspaceId: string }>;
};

export async function GET(_: Request, { params }: RouteProps) {
  const traceId = createTraceId();

  try {
    const { workspaceId } = await params;
    await authorizeWorkspaceAction(workspaceId, "share.manage");

    // Never return token hashes; only safe metadata.
    const links = repo.listShareLinks(workspaceId).map((l) => ({
      id: l.id,
      scope: l.scope,
      status: l.status,
      allowExport: l.allowExport,
      expiresAt: l.expiresAt,
      createdAt: l.createdAt
    }));

    return ok({ workspaceId, shareLinks: links });
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}

export async function POST(request: Request, { params }: RouteProps) {
  const traceId = createTraceId();

  try {
    const { workspaceId } = await params;
    const { session } = await authorizeWorkspaceAction(workspaceId, "share.manage");

    const input = await parseJsonBody(request, shareLinkCreateSchema);

    // The raw token is shown once; only its hash is persisted.
    const rawToken = randomUUID();
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    const link = repo.createShareLink({
      workspaceId,
      boardId: input.boardId,
      createdByUserId: session.identity.userId,
      tokenHash,
      scope: input.scope,
      status: "ACTIVE",
      expiresAt: input.expiresAtIso,
      allowExport: input.allowExport
    });

    repo.logActivity({
      workspaceId,
      actorUserId: session.identity.userId,
      action: "share_link_created",
      targetType: "ShareLink",
      targetId: link.id
    });

    return ok(
      {
        shareLink: {
          id: link.id,
          workspaceId,
          scope: link.scope,
          boardId: link.boardId,
          allowExport: link.allowExport,
          expiresAt: link.expiresAt,
          mode: "ANONYMOUS_VIEW_ONLY"
        },
        // Returned once for the caller to copy; not retrievable later.
        token: rawToken
      },
      201
    );
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
