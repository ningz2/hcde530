import { createTraceId } from "@/lib/api/trace";
import { getSessionContext, requireAuthenticated } from "@/lib/auth/session";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { parseJsonBody } from "@/lib/validation/request";
import { createWorkspaceSchema } from "@/lib/validation/workspace";
import { repo } from "@/lib/repo/store";

export async function GET() {
  const traceId = createTraceId();

  try {
    const session = await getSessionContext();
    requireAuthenticated(session);

    return ok({ workspaces: repo.listWorkspacesForUser(session.identity.userId) });
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}

export async function POST(request: Request) {
  const traceId = createTraceId();

  try {
    const session = await getSessionContext();
    requireAuthenticated(session);

    const input = await parseJsonBody(request, createWorkspaceSchema);

    // Creator becomes OWNER. Membership wiring is deferred; role is mocked via headers.
    const workspace = repo.createWorkspace({
      name: input.name,
      researchQuestion: input.researchQuestion,
      researchQuestions: input.researchQuestions,
      projectGoal: input.projectGoal,
      projectContext: input.projectContext,
      defaultHierarchyDepth: input.defaultHierarchyDepth,
      groupingDirection: input.groupingDirection,
      createdByUserId: session.identity.userId
    });

    repo.logActivity({
      workspaceId: workspace.id,
      actorUserId: session.identity.userId,
      action: "workspace_created",
      targetType: "Workspace",
      targetId: workspace.id
    });

    return ok({ workspace }, 201);
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
