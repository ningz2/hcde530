import { createTraceId } from "@/lib/api/trace";
import { authorizeWorkspaceAction } from "@/lib/api/guards";
import { ApiError } from "@/lib/errors/types";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { parseJsonBody } from "@/lib/validation/request";
import { themeUpdateSchema } from "@/lib/validation/workspace";
import { repo } from "@/lib/repo/store";

type RouteProps = {
  params: Promise<{ workspaceId: string; themeId: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  const traceId = createTraceId();

  try {
    const { workspaceId, themeId } = await params;
    const { session } = await authorizeWorkspaceAction(workspaceId, "board.edit");

    const theme = await repo.getTheme(themeId);
    if (!theme) {
      throw new ApiError("NOT_FOUND", "Theme not found.", 404);
    }

    const input = await parseJsonBody(request, themeUpdateSchema);

    // Capture the prior value before mutating so the per-user-session undo can revert it.
    await repo.pushSnapshot({
      workspaceId,
      userId: session.identity.userId,
      entityType: "THEME",
      entityId: themeId,
      action: "UPDATE",
      previous: { title: theme.title, description: theme.description },
      label: `Renamed theme "${theme.title}"`
    });

    const updated = await repo.updateTheme(themeId, {
      title: input.title,
      description: input.description
    });

    return ok({ theme: updated });
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
