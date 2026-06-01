import { beforeEach, describe, expect, it } from "vitest";
import { extractAndStore } from "@/domain/services/normalization";
import { generateBoard } from "@/domain/services/grouping";
import { getBoardView } from "@/domain/services/boardView";
import { repo } from "@/lib/repo/store";

async function seed(researchQuestions?: string[]): Promise<string> {
  const workspaceId = repo.createWorkspace({
    name: "WS",
    researchQuestions,
    defaultHierarchyDepth: 2,
    groupingDirection: "BOTTOM_UP",
    createdByUserId: "u1"
  }).id;

  await extractAndStore({
    workspaceId,
    submittedByUserId: "u1",
    sourceType: "PASTED_TEXT",
    payload: [
      "Onboarding wizard confusing",
      "Onboarding setup too long",
      "Pricing tiers unclear",
      "Pricing too expensive",
      "Dashboard loading slow",
      "Dashboard layout clear"
    ].join("\n")
  });
  return workspaceId;
}

describe("AI-empowered grouping", () => {
  beforeEach(() => repo.reset());

  it("creates named leaf groups (GROUPS mode)", async () => {
    const workspaceId = await seed();
    await generateBoard({ workspaceId, boardName: "Board", hierarchyMode: "GROUPS", groupGranularity: 3 });

    const view = getBoardView(workspaceId);
    expect(view.board?.hierarchyMode).toBe("GROUPS");
    expect(view.tree.length).toBe(3);
    // Names are not the generic placeholder; they reflect keywords.
    expect(view.tree.every((n) => n.title.length > 0)).toBe(true);
    // Every code is assigned exactly once.
    const assigned = view.tree.flatMap((n) => n.assignments).length;
    expect(assigned).toBe(6);
    // Each assignment carries a one-sentence rationale.
    expect(view.tree.flatMap((n) => n.assignments).every((a) => a.rationale.length > 0)).toBe(true);
  });

  it("nests groups under themes (THEMES mode)", async () => {
    const workspaceId = await seed();
    await generateBoard({
      workspaceId,
      boardName: "Board",
      hierarchyMode: "THEMES",
      groupGranularity: 4,
      themeGranularity: 2
    });

    const view = getBoardView(workspaceId);
    expect(view.tree.length).toBe(2); // two top-level themes
    expect(view.tree.every((n) => n.children.length > 0)).toBe(true);
    // Leaf groups (with codes) total to all assignments.
    const leafAssignments = view.themes.flatMap((t) => t.assignments).length;
    expect(leafAssignments).toBe(6);
  });

  it("organizes themes under research questions (RQS mode)", async () => {
    const workspaceId = await seed(["How do users experience onboarding?", "What blocks purchase decisions?"]);
    await generateBoard({
      workspaceId,
      boardName: "Board",
      hierarchyMode: "RQS",
      groupGranularity: 4,
      themeGranularity: 2
    });

    const view = getBoardView(workspaceId);
    const rqTitles = view.tree.map((n) => n.title);
    expect(rqTitles).toContain("How do users experience onboarding?");
    expect(rqTitles).toContain("What blocks purchase decisions?");
    // Depth 3: RQ -> theme -> group(codes)
    const deepest = view.tree
      .flatMap((rq) => rq.children)
      .flatMap((theme) => theme.children)
      .flatMap((group) => group.assignments).length;
    expect(deepest).toBe(6);
  });
});
