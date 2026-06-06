import { createTraceId } from "@/lib/api/trace";
import { getSessionContext } from "@/lib/auth/session";
import { assertAnonymousViewOnly } from "@/domain/policies/access";
import { authorizeWorkspaceAction } from "@/lib/api/guards";
import { requestExport } from "@/domain/services/export";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { parseJsonBody } from "@/lib/validation/request";
import { exportCreateSchema } from "@/lib/validation/workspace";
import { repo } from "@/lib/repo/store";

type RouteProps = {
  params: Promise<{ workspaceId: string }>;
};

export async function GET(_: Request, { params }: RouteProps) {
  const traceId = createTraceId();

  try {
    const { workspaceId } = await params;
    await authorizeWorkspaceAction(workspaceId, "workspace.read");
    return ok({ workspaceId, exportJobs: repo.listExportJobs(workspaceId) });
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}

export async function POST(request: Request, { params }: RouteProps) {
  const traceId = createTraceId();

  try {
    const { workspaceId } = await params;

    // Anonymous view-only links may never trigger exports.
    const session = await getSessionContext();
    if (session.isAnonymousShare) {
      assertAnonymousViewOnly();
    }

    // Exports are available to all named roles (owner/editor/viewer).
    const { session: authed } = await authorizeWorkspaceAction(workspaceId, "export.create");

    const input = await parseJsonBody(request, exportCreateSchema);

    const job = requestExport({
      workspaceId,
      requestedByUserId: authed.identity.userId,
      format: input.format
    });

    return ok(
      {
        workspaceId,
        exportJob: {
          id: job.id,
          format: job.format,
          status: job.status,
          artifactPreview: job.artifactPreview,
          artifactMimeType: job.artifactMimeType,
          artifactFilename: job.artifactFilename
        }
      },
      201
    );
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
