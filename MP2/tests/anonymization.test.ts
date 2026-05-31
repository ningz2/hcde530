import { describe, expect, it } from "vitest";
import { RealAnonymizationService, maskText } from "@/domain/services/anonymization";

const service = new RealAnonymizationService();

describe("maskText", () => {
  it("masks emails, phones, and urls", () => {
    const { text } = maskText("Reach me at jane@acme.com or 415-555-1212 via https://acme.com");
    expect(text).not.toContain("jane@acme.com");
    expect(text).not.toContain("415-555-1212");
    expect(text).not.toContain("https://acme.com");
    expect(text).toContain("[EMAIL]");
    expect(text).toContain("[PHONE]");
    expect(text).toContain("[URL]");
  });

  it("masks mid-sentence name-like tokens but keeps sentence starters", () => {
    const { text } = maskText("The onboarding confused Sarah and Miguel.");
    expect(text.startsWith("The")).toBe(true);
    expect(text).toContain("[NAME]");
    expect(text).not.toContain("Sarah");
    expect(text).not.toContain("Miguel");
  });
});

describe("RealAnonymizationService (privacy default ON)", () => {
  const quotes = [{ participantLabel: "P1", text: "Contact me at jane@acme.com" }];

  it("masks by default when consent granted and not opted out", async () => {
    const [result] = await service.maskQuotes({ quotes, consentGranted: true, optOut: false });
    expect(result.piiMasked).toBe(true);
    expect(result.text).toContain("[EMAIL]");
  });

  it("leaves raw text untouched when the user opts out", async () => {
    const [result] = await service.maskQuotes({ quotes, consentGranted: true, optOut: true });
    expect(result.piiMasked).toBe(false);
    expect(result.text).toContain("jane@acme.com");
    expect(result.maskingNotes.join(" ")).toMatch(/opted out/i);
  });
});
