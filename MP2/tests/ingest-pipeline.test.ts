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

  it("extracts and stores codes unmasked and pending consent, never retaining raw", async () => {
    const result = await extractAndStore({
      workspaceId,
      submittedByUserId: "u1",
      sourceType: "CSV",
      payload:
        'code,quote,participant\nOnboarding friction,"Email me at jane@acme.com",P1\nPricing,"unclear",P2',
      filename: "codes.csv"
    });

    expect(result.codeCount).toBe(2);

    const codes = repo.listCodes(workspaceId);
    expect(codes.every((c) => !c.piiMasked)).toBe(true);
    // Raw identifiers are still present (in the quote field) until consent is applied.
    expect(codes.some((c) => (c.quote ?? "").includes("jane@acme.com"))).toBe(true);
    expect(codes.some((c) => c.code === "Onboarding friction")).toBe(true);

    const upload = repo.listUploads(workspaceId)[0];
    expect(upload.rawRetained).toBe(false);
    expect(upload.anonymizationState).toBe("PENDING_CONSENT");
    expect(repo.listActivity(workspaceId).some((a) => a.action === "raw_source_discarded")).toBe(true);
  });

  it("masks code/quote/memo when consent applies masking", async () => {
    await extractAndStore({
      workspaceId,
      submittedByUserId: "u1",
      sourceType: "CSV",
      payload: 'code,quote,memo\nSupport,"Contact jane@acme.com","Spoke with Miguel"'
    });

    const result = applyAnonymization({ workspaceId, applyMasking: true });
    expect(result.applied).toBe(true);
    expect(result.maskedCount).toBe(1);
    expect(result.categories).toContain("email");

    const code = repo.listCodes(workspaceId)[0];
    expect(code.piiMasked).toBe(true);
    expect(code.quote).not.toContain("jane@acme.com");
    expect(code.memo).not.toContain("Miguel");
    expect(repo.listUploads(workspaceId)[0].anonymizationState).toBe("APPLIED");
  });

  it("parses semicolon-delimited CSV with a BOM", async () => {
    const result = await extractAndStore({
      workspaceId,
      submittedByUserId: "u1",
      sourceType: "CSV",
      payload: "\uFEFFcode;participant\nOnboarding was confusing;P1\nPricing unclear;P2",
      filename: "codes.csv"
    });

    expect(result.codeCount).toBe(2);
    const codes = repo.listCodes(workspaceId).map((c) => c.code);
    expect(codes).toContain("Onboarding was confusing");
  });

  it("treats each pasted line as a code", async () => {
    const result = await extractAndStore({
      workspaceId,
      submittedByUserId: "u1",
      sourceType: "PASTED_TEXT",
      payload: "Onboarding friction\nPricing confusion\nPerformance"
    });
    expect(result.codeCount).toBe(3);
    expect(repo.listCodes(workspaceId).map((c) => c.code)).toContain("Pricing confusion");
  });

  it("keeps raw identifiers when the user skips masking", async () => {
    await extractAndStore({
      workspaceId,
      submittedByUserId: "u1",
      sourceType: "CSV",
      payload: 'code,quote\nSupport,"Contact jane@acme.com about this"'
    });

    const result = applyAnonymization({ workspaceId, applyMasking: false });
    expect(result.applied).toBe(false);

    const code = repo.listCodes(workspaceId)[0];
    expect(code.piiMasked).toBe(false);
    expect(code.quote).toContain("jane@acme.com");
    expect(repo.listUploads(workspaceId)[0].anonymizationState).toBe("SKIPPED");
  });

  it("assigns stable participant colors across re-ingestion", async () => {
    await extractAndStore({
      workspaceId,
      submittedByUserId: "u1",
      sourceType: "CSV",
      payload: "code,participant\nFirst code,P1"
    });
    const firstToken = repo.listParticipants(workspaceId).find((p) => p.sourceLabel === "P1")?.colorToken;

    await extractAndStore({
      workspaceId,
      submittedByUserId: "u1",
      sourceType: "CSV",
      payload: "code,participant\nSecond code,P1"
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
