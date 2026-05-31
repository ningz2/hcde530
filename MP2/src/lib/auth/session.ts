import { headers } from "next/headers";
import { ApiError } from "@/lib/errors/types";
import type { AuthIdentity, WorkspaceRole } from "@/domain/entities/types";

export type SessionContext = {
  identity?: AuthIdentity;
  workspaceRole?: WorkspaceRole;
  isAnonymousShare: boolean;
  shareToken?: string;
};

export async function getSessionContext(): Promise<SessionContext> {
  const requestHeaders = await headers();
  const mockUserId = requestHeaders.get("x-mock-user-id") ?? undefined;
  const mockEmail = requestHeaders.get("x-mock-user-email") ?? undefined;
  const mockRoleHeader = requestHeaders.get("x-mock-role") ?? undefined;
  const shareToken = requestHeaders.get("x-share-token") ?? undefined;

  const workspaceRole =
    mockRoleHeader === "OWNER" || mockRoleHeader === "EDITOR" || mockRoleHeader === "VIEWER"
      ? mockRoleHeader
      : undefined;

  if (shareToken) {
    return {
      isAnonymousShare: true,
      workspaceRole: "VIEWER",
      shareToken
    };
  }

  if (!mockUserId || !mockEmail) {
    return {
      isAnonymousShare: false
    };
  }

  return {
    identity: {
      userId: mockUserId,
      email: mockEmail,
      provider: "EMAIL_PASSWORD"
    },
    workspaceRole,
    isAnonymousShare: false
  };
}

export function requireAuthenticated(context: SessionContext): asserts context is SessionContext & {
  identity: AuthIdentity;
} {
  if (!context.identity) {
    throw new ApiError("UNAUTHENTICATED", "Login is required for this endpoint.", 401);
  }
}

export function requireWorkspaceRole(context: SessionContext): WorkspaceRole {
  if (!context.workspaceRole) {
    throw new ApiError("FORBIDDEN", "Workspace membership is required for this action.", 403);
  }

  return context.workspaceRole;
}
