import { createTraceId } from "@/lib/api/trace";
import { authorizeWorkspaceAction } from "@/lib/api/guards";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { parseJsonBody } from "@/lib/validation/request";
import { memberInviteSchema } from "@/lib/validation/workspace";
import { repo } from "@/lib/repo/store";

type RouteProps = {
  params: Promise<{ workspaceId: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const traceId = createTraceId();

  try {
    const { workspaceId } = await params;
    const { session } = await authorizeWorkspaceAction(workspaceId, "admin.manage_members");

    const input = await parseJsonBody(request, memberInviteSchema);

    await repo.logActivity({
      workspaceId,
      actorUserId: session.identity.userId,
      action: "member_invited",
      targetType: "Membership"
    });

    return ok(
      {
        invitation: {
          workspaceId,
          email: input.email,
          role: input.role,
          status: "INVITED"
        }
      },
      201
    );
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
