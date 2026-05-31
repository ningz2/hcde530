import { beforeEach, describe, expect, it } from "vitest";
import { ingestAndStore } from "@/domain/services/normalization";
import { ingestSchema } from "@/lib/validation/workspace";
import { repo } from "@/lib/repo/store";

describe("ingest pipeline (normalization + privacy + raw discard)", () => {
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

  it("normalizes CSV, masks PII by default, and never retains raw source", async () => {
    const result = await ingestAndStore({
      workspaceId,
      submittedByUserId: "u1",
      sourceType: "CSV",
      payload: 'participant,quote\nP1,"Email me at jane@acme.com"\nP2,"Pricing was unclear"',
      filename: "feedback.csv",
      consentGranted: true,
      optOut: false
    });

    expect(result.quoteCount).toBe(2);
    expect(result.rawRetained).toBe(false);
    expect(result.anonymizationApplied).toBe(true);

    const quotes = repo.listQuotes(workspaceId);
    expect(quotes.every((q) => !q.content.includes("jane@acme.com"))).toBe(true);

    // Raw discard must be represented in the activity log and upload record.
    const upload = repo.listUploads(workspaceId)[0];
    expect(upload.rawRetained).toBe(false);
    expect(upload.anonymizationState).toBe("APPLIED");
    expect(repo.listActivity(workspaceId).some((a) => a.action === "raw_source_discarded")).toBe(true);
  });

  it("assigns stable participant colors across re-ingestion", async () => {
    await ingestAndStore({
      workspaceId,
      submittedByUserId: "u1",
      sourceType: "CSV",
      payload: "participant,quote\nP1,First comment",
      consentGranted: true,
      optOut: false
    });
    const firstToken = repo.listParticipants(workspaceId).find((p) => p.sourceLabel === "P1")?.colorToken;

    await ingestAndStore({
      workspaceId,
      submittedByUserId: "u1",
      sourceType: "CSV",
      payload: "participant,quote\nP1,Second comment",
      consentGranted: true,
      optOut: false
    });
    const participants = repo.listParticipants(workspaceId).filter((p) => p.sourceLabel === "P1");

    expect(participants).toHaveLength(1);
    expect(participants[0].colorToken).toBe(firstToken);
  });

  it("preserves raw identifiers when the user opts out", async () => {
    await ingestAndStore({
      workspaceId,
      submittedByUserId: "u1",
      sourceType: "PASTED_TEXT",
      payload: "Contact jane@acme.com about this",
      consentGranted: true,
      optOut: true
    });

    const quotes = repo.listQuotes(workspaceId);
    expect(quotes[0].piiMasked).toBe(false);
    expect(quotes[0].content).toContain("jane@acme.com");
  });
});

describe("ingestSchema validation", () => {
  it("applies privacy defaults (consent ON, opt-out OFF)", () => {
    const parsed = ingestSchema.parse({ sourceType: "PASTED_TEXT", content: "hi" });
    expect(parsed.consentAnonymization).toBe(true);
    expect(parsed.optOutAnonymization).toBe(false);
  });

  it("rejects an unknown source type", () => {
    expect(ingestSchema.safeParse({ sourceType: "PDF", content: "x" }).success).toBe(false);
  });
});
