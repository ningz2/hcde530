import { describe, expect, it } from "vitest";
import { assertRoleCan } from "@/domain/policies/access";
import { ApiError } from "@/lib/errors/types";

describe("assertRoleCan (server-side authz matrix)", () => {
  it("allows owner/editor to write, blocks viewer", () => {
    expect(() => assertRoleCan("workspace.write", "OWNER")).not.toThrow();
    expect(() => assertRoleCan("workspace.write", "EDITOR")).not.toThrow();
    expect(() => assertRoleCan("workspace.write", "VIEWER")).toThrow(ApiError);
  });

  it("only owner can manage members", () => {
    expect(() => assertRoleCan("admin.manage_members", "OWNER")).not.toThrow();
    expect(() => assertRoleCan("admin.manage_members", "EDITOR")).toThrow(ApiError);
  });

  it("allows all roles to export", () => {
    for (const role of ["OWNER", "EDITOR", "VIEWER"] as const) {
      expect(() => assertRoleCan("export.create", role)).not.toThrow();
    }
  });

  it("throws a 403 ApiError with details", () => {
    try {
      assertRoleCan("board.edit", "VIEWER");
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(403);
      expect((error as ApiError).code).toBe("FORBIDDEN");
    }
  });
});
