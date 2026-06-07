import { beforeEach, describe, expect, it } from "vitest";
import { repo } from "@/lib/repo/store";

describe("account-backed project ownership", () => {
  beforeEach(async () => {
    await repo.reset();
  });

  it("creates/reuses users by email and stores sessions", async () => {
    const first = await repo.upsertUser({
      email: "USER@example.com",
      provider: "EMAIL_PASSWORD",
      displayName: "User"
    });
    const second = await repo.upsertUser({ email: "user@example.com", provider: "GOOGLE" });
    expect(second.id).toBe(first.id);
    expect(second.provider).toBe("GOOGLE");

    const session = await repo.createSession(first.id);
    expect((await repo.getSession(session.token))?.userId).toBe(first.id);
    await repo.deleteSession(session.token);
    expect(await repo.getSession(session.token)).toBeUndefined();
  });

  it("lists only projects created by the current account", async () => {
    const alice = await repo.upsertUser({ email: "alice@example.com", provider: "EMAIL_PASSWORD" });
    const bob = await repo.upsertUser({ email: "bob@example.com", provider: "GOOGLE" });

    await repo.createWorkspace({
      name: "Alice project",
      defaultHierarchyDepth: 2,
      groupingDirection: "BOTTOM_UP",
      createdByUserId: alice.id
    });
    await repo.createWorkspace({
      name: "Bob project",
      defaultHierarchyDepth: 2,
      groupingDirection: "BOTTOM_UP",
      createdByUserId: bob.id
    });

    expect((await repo.listWorkspacesForUser(alice.id)).map((w) => w.name)).toEqual(["Alice project"]);
    expect((await repo.listWorkspacesForUser(bob.id)).map((w) => w.name)).toEqual(["Bob project"]);
  });
});
