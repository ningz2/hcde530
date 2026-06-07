import { createHmac, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { ApiError } from "@/lib/errors/types";
import type { AuthIdentity, WorkspaceRole } from "@/domain/entities/types";
import { repo } from "@/lib/repo/store";
import type { UserRecord } from "@/lib/repo/store";

export const AUTH_COOKIE = "affinityflow_session";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SignedSessionPayload = {
  userId: string;
  email: string;
  displayName?: string;
  provider: AuthIdentity["provider"];
  exp: number;
};

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
    const signedIdentity = readSignedSession(sessionToken);
    if (signedIdentity) {
      return {
        identity: signedIdentity,
        workspaceRole: "OWNER",
        isAnonymousShare: false
      };
    }

    const session = await repo.getSession(sessionToken);
    const user = session ? await repo.getUser(session.userId) : undefined;
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

export function createSignedSessionCookie(user: UserRecord): string {
  const payload: SignedSessionPayload = {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    provider: user.provider === "GOOGLE" ? "GOOGLE" : "EMAIL_PASSWORD",
    exp: Math.floor(Date.now() / 1000) + AUTH_COOKIE_MAX_AGE_SECONDS
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function readSignedSession(cookieValue: string): AuthIdentity | undefined {
  const [encodedPayload, signature] = cookieValue.split(".");
  if (!encodedPayload || !signature || !verifySignature(encodedPayload, signature)) {
    return undefined;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<SignedSessionPayload>;
    if (
      !payload.userId ||
      !payload.email ||
      (payload.provider !== "EMAIL_PASSWORD" && payload.provider !== "GOOGLE") ||
      !payload.exp ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return undefined;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      displayName: payload.displayName,
      provider: payload.provider
    };
  } catch {
    return undefined;
  }
}

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function verifySignature(value: string, signature: string): boolean {
  const expected = sign(value);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function getSessionSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "affinityflow-local-demo-session-secret";
}

export function requireWorkspaceRole(context: SessionContext): WorkspaceRole {
  if (!context.workspaceRole) {
    throw new ApiError("FORBIDDEN", "Workspace membership is required for this action.", 403);
  }

  return context.workspaceRole;
}
