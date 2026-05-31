import { beforeEach, describe, expect, it } from "vitest";
import { applyAnonymization, extractAndStore } from "@/domain/services/normalization";
import { ingestSchema } from "@/lib/validation/workspace";
import { repo } from "@/lib/repo/store";

describe("ingest pipeline (extract -> consent -> mask)", () => {
  let workspaceId: string;

  beforeEach(() => {
    repo.reset();
    workspaceId = repo.createWorkspace({
      name: "Test",
      defaultHierarchyDepth: 2,
      groupingDirection: "BOTTOM_UP",
      createdByUserId: "u1"
    }).id;
  });

  it("extracts and stores quotes unmasked and pending consent, never retaining raw", async () => {
    const result = await extractAndStore({
      workspaceId,
      submittedByUserId: "u1",
      sourceType: "CSV",
      payload: 'participant,quote\nP1,"Email me at jane@acme.com"\nP2,"Pricing was unclear"',
      filename: "feedback.csv"
    });

    expect(result.quoteCount).toBe(2);

    const quotes = repo.listQuotes(workspaceId);
    expect(quotes.every((q) => !q.piiMasked)).toBe(true);
    // Raw identifiers are still present until consent is applied.
    expect(quotes.some((q) => q.content.includes("jane@acme.com"))).toBe(true);

    const upload = repo.listUploads(workspaceId)[0];
    expect(upload.rawRetained).toBe(false);
    expect(upload.anonymizationState).toBe("PENDING_CONSENT");
    expect(repo.listActivity(workspaceId).some((a) => a.action === "raw_source_discarded")).toBe(true);
  });

  it("masks stored quotes when consent applies masking", async () => {
    await extractAndStore({
      workspaceId,
      submittedByUserId: "u1",
      sourceType: "PASTED_TEXT",
      payload: "Contact jane@acme.com about this"
    });

    const result = applyAnonymization({ workspaceId, applyMasking: true });
    expect(result.applied).toBe(true);
    expect(result.maskedCount).toBe(1);

    const quotes = repo.listQuotes(workspaceId);
    expect(quotes[0].piiMasked).toBe(true);
    expect(quotes[0].content).not.toContain("jane@acme.com");
    expect(repo.listUploads(workspaceId)[0].anonymizationState).toBe("APPLIED");
  });

  it("keeps raw identifiers when the user skips masking", async () => {
    await extractAndStore({
      workspaceId,
      submittedByUserId: "u1",
      sourceType: "PASTED_TEXT",
      payload: "Contact jane@acme.com about this"
    });

    const result = applyAnonymization({ workspaceId, applyMasking: false });
    expect(result.applied).toBe(false);

    const quotes = repo.listQuotes(workspaceId);
    expect(quotes[0].piiMasked).toBe(false);
    expect(quotes[0].content).toContain("jane@acme.com");
    expect(repo.listUploads(workspaceId)[0].anonymizationState).toBe("SKIPPED");
  });

  it("assigns stable participant colors across re-ingestion", async () => {
    await extractAndStore({
      workspaceId,
      submittedByUserId: "u1",
      sourceType: "CSV",
      payload: "participant,quote\nP1,First comment"
    });
    const firstToken = repo.listParticipants(workspaceId).find((p) => p.sourceLabel === "P1")?.colorToken;

    await extractAndStore({
      workspaceId,
      submittedByUserId: "u1",
      sourceType: "CSV",
      payload: "participant,quote\nP1,Second comment"
    });
    const participants = repo.listParticipants(workspaceId).filter((p) => p.sourceLabel === "P1");

    expect(participants).toHaveLength(1);
    expect(participants[0].colorToken).toBe(firstToken);
  });
});

describe("ingestSchema validation", () => {
  it("accepts a supported source type with content", () => {
    const parsed = ingestSchema.parse({ sourceType: "PASTED_TEXT", content: "hi" });
    expect(parsed.sourceType).toBe("PASTED_TEXT");
  });

  it("rejects an unknown source type", () => {
    expect(ingestSchema.safeParse({ sourceType: "PDF", content: "x" }).success).toBe(false);
  });
});
