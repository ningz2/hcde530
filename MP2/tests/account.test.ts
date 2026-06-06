import { beforeEach, describe, expect, it } from "vitest";
import { repo } from "@/lib/repo/store";

describe("account-backed project ownership", () => {
  beforeEach(() => repo.reset());

  it("creates/reuses users by email and stores sessions", () => {
    const first = repo.upsertUser({ email: "USER@example.com", provider: "EMAIL_PASSWORD", displayName: "User" });
    const second = repo.upsertUser({ email: "user@example.com", provider: "GOOGLE" });
    expect(second.id).toBe(first.id);
    expect(second.provider).toBe("GOOGLE");

    const session = repo.createSession(first.id);
    expect(repo.getSession(session.token)?.userId).toBe(first.id);
    repo.deleteSession(session.token);
    expect(repo.getSession(session.token)).toBeUndefined();
  });

  it("lists only projects created by the current account", () => {
    const alice = repo.upsertUser({ email: "alice@example.com", provider: "EMAIL_PASSWORD" });
    const bob = repo.upsertUser({ email: "bob@example.com", provider: "GOOGLE" });

    repo.createWorkspace({
      name: "Alice project",
      defaultHierarchyDepth: 2,
      groupingDirection: "BOTTOM_UP",
      createdByUserId: alice.id
    });
    repo.createWorkspace({
      name: "Bob project",
      defaultHierarchyDepth: 2,
      groupingDirection: "BOTTOM_UP",
      createdByUserId: bob.id
    });

    expect(repo.listWorkspacesForUser(alice.id).map((w) => w.name)).toEqual(["Alice project"]);
    expect(repo.listWorkspacesForUser(bob.id).map((w) => w.name)).toEqual(["Bob project"]);
  });
});
