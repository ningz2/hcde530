import { beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { applyAnonymization, extractAndStore } from "@/domain/services/normalization";
import { generateBoard } from "@/domain/services/grouping";
import { getBoardView } from "@/domain/services/boardView";
import { requestExport } from "@/domain/services/export";
import { assertAnonymousViewOnly } from "@/domain/policies/access";
import { ApiError } from "@/lib/errors/types";
import { repo } from "@/lib/repo/store";

async function seedWorkspaceWithBoard(optOut = false): Promise<string> {
  const workspaceId = repo.createWorkspace({
    name: "WS",
    defaultHierarchyDepth: 2,
    groupingDirection: "BOTTOM_UP",
    createdByUserId: "u1"
  }).id;

  await extractAndStore({
    workspaceId,
    submittedByUserId: "u1",
    sourceType: "CSV",
    payload:
      'code,quote,participant\nOnboarding,"Email jane@acme.com",P1\nPricing unclear,"Wants clearer tiers",P2'
  });

  applyAnonymization({ workspaceId, applyMasking: !optOut });
  generateBoard({ workspaceId, boardName: "Board", hierarchyDepth: 2 });
  return workspaceId;
}

describe("export scaffolds", () => {
  beforeEach(() => repo.reset());

  it("generates a synchronous CSV artifact", async () => {
    const workspaceId = await seedWorkspaceWithBoard();
    const job = requestExport({ workspaceId, requestedByUserId: "u1", format: "CSV" });
    expect(job.status).toBe("READY");
    expect(job.artifactPreview).toContain("theme,mention_count,participant,code,quote,memo,rationale");
    expect(job.artifactPreview).toContain("Pricing unclear");
  });

  it("queues PDF/FigJam without an inline artifact", async () => {
    const workspaceId = await seedWorkspaceWithBoard();
    for (const format of ["PDF", "FIGJAM"] as const) {
      const job = requestExport({ workspaceId, requestedByUserId: "u1", format });
      expect(job.status).toBe("QUEUED");
      expect(job.artifactPreview).toBeUndefined();
    }
  });

  it("rejects export when no board exists", () => {
    const workspaceId = repo.createWorkspace({
      name: "WS",
      defaultHierarchyDepth: 2,
      groupingDirection: "BOTTOM_UP",
      createdByUserId: "u1"
    }).id;
    expect(() => requestExport({ workspaceId, format: "CSV" })).toThrow(ApiError);
  });

  it("blocks anonymous view-only callers from exporting", () => {
    expect(() => assertAnonymousViewOnly()).toThrow(ApiError);
  });
});

describe("cross-mention emphasis fields", () => {
  beforeEach(() => repo.reset());

  it("populates mention count and color density on themes", async () => {
    const workspaceId = await seedWorkspaceWithBoard();
    const view = getBoardView(workspaceId);
    expect(view.themes.length).toBeGreaterThan(0);
    for (const theme of view.themes) {
      expect(theme.mentionCount).toBeGreaterThanOrEqual(1);
      expect(theme.colorDensity).toBeGreaterThan(0);
      expect(theme.colorDensity).toBeLessThanOrEqual(1);
    }
  });
});

describe("anonymous view-only redaction", () => {
  beforeEach(() => repo.reset());

  it("hides unmasked codes from anonymous viewers", async () => {
    const workspaceId = await seedWorkspaceWithBoard(true); // opted out => raw retained
    const memberView = getBoardView(workspaceId);
    const anonView = getBoardView(workspaceId, { redactUnmasked: true });

    const flatten = (view: typeof memberView) =>
      view.themes
        .flatMap((t) => t.assignments)
        .flatMap((a) => [a.code, a.quote ?? "", a.memo ?? ""])
        .join(" ");

    expect(flatten(memberView)).toContain("jane@acme.com");
    expect(flatten(anonView)).not.toContain("jane@acme.com");
    expect(flatten(anonView)).toContain("[hidden");
  });
});

describe("share link lookup", () => {
  beforeEach(() => repo.reset());

  it("matches an active link by token hash and rejects unknown tokens", () => {
    const workspaceId = repo.createWorkspace({
      name: "WS",
      defaultHierarchyDepth: 2,
      groupingDirection: "BOTTOM_UP",
      createdByUserId: "u1"
    }).id;

    const token = "secret-token";
    const tokenHash = createHash("sha256").update(token).digest("hex");
    repo.createShareLink({
      workspaceId,
      createdByUserId: "u1",
      tokenHash,
      scope: "WORKSPACE_VIEW",
      status: "ACTIVE",
      allowExport: false
    });

    expect(repo.findActiveShareLink(workspaceId, tokenHash)).toBeDefined();
    expect(repo.findActiveShareLink(workspaceId, "wrong")).toBeUndefined();
  });
});
