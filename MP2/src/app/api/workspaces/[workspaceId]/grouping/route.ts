import { createTraceId } from "@/lib/api/trace";
import { authorizeWorkspaceAction } from "@/lib/api/guards";
import { generateBoard } from "@/domain/services/grouping";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { parseJsonBody } from "@/lib/validation/request";
import { groupingRunSchema } from "@/lib/validation/workspace";
import { repo } from "@/lib/repo/store";

type RouteProps = {
  params: Promise<{ workspaceId: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const traceId = createTraceId();

  try {
    const { workspaceId } = await params;
    const { session } = await authorizeWorkspaceAction(workspaceId, "board.edit");

    const input = await parseJsonBody(request, groupingRunSchema);

    const result = await generateBoard({
      workspaceId,
      boardName: input.boardName,
      hierarchyMode: input.hierarchyMode,
      groupGranularity: input.groupGranularity,
      themeGranularity: input.themeGranularity
    });

    repo.logActivity({
      workspaceId,
      actorUserId: session.identity.userId,
      action: "board_generated",
      targetType: "Board",
      targetId: result.boardId
    });

    return ok({ workspaceId, board: result }, 201);
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
