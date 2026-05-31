import { assertRoleCan, type Action } from "@/domain/policies/access";
import type { AuthIdentity, WorkspaceRole } from "@/domain/entities/types";
import {
  getSessionContext,
  requireAuthenticated,
  requireWorkspaceRole,
  type SessionContext
} from "@/lib/auth/session";
import { ApiError } from "@/lib/errors/types";
import { repo, type WorkspaceRecord } from "@/lib/repo/store";

export type AuthorizedWorkspace = {
  session: SessionContext & { identity: AuthIdentity };
  role: WorkspaceRole;
  workspace: WorkspaceRecord;
};

/**
 * Standard guard for authenticated workspace write/read actions:
 *  - rejects anonymous/unauthenticated callers (no identity)
 *  - requires a workspace role and checks it against the action matrix
 *  - verifies the workspace exists (NOT_FOUND otherwise)
 *
 * Anonymous share access is intentionally NOT handled here; those (read-only)
 * routes validate a share token explicitly.
 */
export async function authorizeWorkspaceAction(
  workspaceId: string,
  action: Action
): Promise<AuthorizedWorkspace> {
  const session = await getSessionContext();
  requireAuthenticated(session);

  const role = requireWorkspaceRole(session);
  assertRoleCan(action, role);

  const workspace = repo.getWorkspace(workspaceId);
  if (!workspace) {
    throw new ApiError("NOT_FOUND", "Workspace not found.", 404);
  }

  return { session, role, workspace };
}
