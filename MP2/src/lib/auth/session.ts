import { headers } from "next/headers";
import { ApiError } from "@/lib/errors/types";
import type { AuthIdentity, WorkspaceRole } from "@/domain/entities/types";
import { repo } from "@/lib/repo/store";

export const AUTH_COOKIE = "affinityflow_session";

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
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const sessionToken = readCookie(cookieHeader, AUTH_COOKIE);

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

  if (sessionToken) {
    const session = repo.getSession(sessionToken);
    const user = session ? repo.getUser(session.userId) : undefined;
    if (session && user) {
      return {
        identity: {
          userId: user.id,
          email: user.email,
          displayName: user.displayName,
          provider: user.provider === "GOOGLE" ? "GOOGLE" : "EMAIL_PASSWORD"
        },
        workspaceRole: "OWNER",
        isAnonymousShare: false
      };
    }
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

function readCookie(cookieHeader: string, name: string): string | undefined {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
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
