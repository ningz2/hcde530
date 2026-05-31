import type { AnonymizationService } from "@/domain/contracts/services";
import type { AnonymizedCode, ParsedCode } from "@/domain/entities/types";

/**
 * Real (heuristic) anonymization for the slice.
 *
 * Privacy default is ON: masking is applied whenever consent is granted and the
 * user has not explicitly opted out. Opt-out leaves text untouched but is still
 * recorded so downstream code knows raw identifiers may be present.
 *
 * Detectors here are deliberately conservative regex/heuristics (emails, phones,
 * URLs, @handles, and capitalized name-like tokens). A production system would
 * swap this for a dedicated NER/PII model behind the same interface.
 */
export class RealAnonymizationService implements AnonymizationService {
  async maskCodes(params: {
    codes: ParsedCode[];
    consentGranted: boolean;
    optOut: boolean;
  }): Promise<AnonymizedCode[]> {
    const shouldMask = params.consentGranted && !params.optOut;

    return params.codes.map((item) => {
      if (!shouldMask) {
        return {
          ...item,
          piiMasked: false,
          maskingNotes: ["Masking skipped: user opted out of anonymization."]
        };
      }

      const code = maskText(item.code);
      const quote = item.quote ? maskText(item.quote) : undefined;
      const memo = item.memo ? maskText(item.memo) : undefined;
      const notes = [...code.notes, ...(quote?.notes ?? []), ...(memo?.notes ?? [])];

      return {
        ...item,
        code: code.text,
        quote: quote?.text ?? item.quote,
        memo: memo?.text ?? item.memo,
        piiMasked: true,
        maskingNotes: notes.length > 0 ? notes : ["No identifiers detected."]
      };
    });
  }
}

const detectors: { label: string; pattern: RegExp; replacement: string }[] = [
  {
    label: "email",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: "[EMAIL]"
  },
  {
    label: "url",
    pattern: /\bhttps?:\/\/[^\s]+/g,
    replacement: "[URL]"
  },
  {
    label: "phone",
    pattern: /\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g,
    replacement: "[PHONE]"
  },
  {
    label: "handle",
    pattern: /(^|\s)@[A-Za-z0-9_]{2,}/g,
    replacement: "$1[HANDLE]"
  }
];

/** Tokens that look like names (Capitalized) but are common sentence starters / non-PII. */
const nameStopwords = new Set([
  "I",
  "The",
  "A",
  "An",
  "It",
  "We",
  "They",
  "This",
  "That",
  "My",
  "Our",
  "Their",
  "But",
  "And",
  "So",
  "When",
  "While",
  "If",
  "Because",
  "However"
]);

export function maskText(input: string): { text: string; notes: string[]; categories: string[] } {
  let text = input;
  const notes: string[] = [];
  const categories: string[] = [];

  for (const detector of detectors) {
    if (detector.pattern.test(text)) {
      notes.push(`Masked ${detector.label}.`);
      categories.push(detector.label);
    }
    detector.pattern.lastIndex = 0;
    text = text.replace(detector.pattern, detector.replacement);
  }

  const { text: nameMasked, count } = maskNames(text);
  text = nameMasked;
  if (count > 0) {
    notes.push(`Masked ${count} name-like token${count > 1 ? "s" : ""}.`);
    categories.push("name");
  }

  return { text, notes, categories };
}

function maskNames(input: string): { text: string; count: number } {
  let count = 0;
  const text = input.replace(/\b[A-Z][a-z]{1,}\b/g, (match, offset: number, full: string) => {
    if (nameStopwords.has(match)) {
      return match;
    }
    // Skip the first word of a sentence to reduce false positives.
    const preceding = full.slice(0, offset).trimEnd();
    const isSentenceStart = preceding === "" || /[.!?]$/.test(preceding);
    if (isSentenceStart) {
      return match;
    }
    count += 1;
    return "[NAME]";
  });

  return { text, count };
}
