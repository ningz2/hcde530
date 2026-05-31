import { randomUUID } from "node:crypto";
import type {
  AnonymizationService,
  ExportService,
  GroupingAiService,
  ParserService
} from "@/domain/contracts/services";
import type { AnonymizedQuote, ParsedQuote, StrategyRequest } from "@/domain/entities/types";

export class MockParserService implements ParserService {
  async parse(params: {
    sourceType: "CSV" | "TXT" | "DOC" | "DOCX" | "PASTED_TEXT";
    payload: string;
    filename?: string;
  }): Promise<ParsedQuote[]> {
    const chunks = params.payload
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 20);

    return chunks.map((line, index) => ({
      sourceRef: params.filename ?? params.sourceType,
      participantLabel: `P-${(index % 4) + 1}`,
      text: line
    }));
  }
}

export class MockAnonymizationService implements AnonymizationService {
  async maskQuotes(params: {
    quotes: ParsedQuote[];
    consentGranted: boolean;
    optOut: boolean;
  }): Promise<AnonymizedQuote[]> {
    const shouldMask = params.consentGranted && !params.optOut;

    return params.quotes.map((quote) => ({
      ...quote,
      text: shouldMask ? quote.text.replace(/\b[A-Z][a-z]+\b/g, "[REDACTED]") : quote.text,
      piiMasked: shouldMask,
      maskingNotes: shouldMask ? ["Mock named-entity masking applied."] : ["Masking skipped by user."]
    }));
  }
}

export class MockGroupingAiService implements GroupingAiService {
  async suggestStrategy(_params: StrategyRequest): Promise<{
    strategySummary: string;
    strategyPrompt: string;
  }> {
    return {
      strategySummary:
        "Start from concrete quote signals, cluster emergent patterns, then fold into higher-level themes with one-line rationale per assignment.",
      strategyPrompt:
        "Balanced strategy: cluster anonymized quotes into practical, methodologically grounded themes with concise assignment rationale."
    };
  }

  async generateGrouping(params: {
    strategyPrompt: string;
    boardName: string;
    hierarchyDepth: number;
    quotes: AnonymizedQuote[];
  }) {
    return {
      boardName: params.boardName,
      hierarchyDepth: params.hierarchyDepth,
      assignments: params.quotes.slice(0, 10).map((quote, index) => ({
        quoteId: `mock-quote-${index + 1}`,
        themeTitle: `Theme ${(index % 3) + 1}`,
        rationale: "Quote discusses recurring user needs aligned with this theme cluster.",
        participantCount: 1
      }))
    };
  }
}

export class MockExportService implements ExportService {
  async requestExport(_params: {
    workspaceId: string;
    boardId: string;
    format: "CSV" | "PDF" | "FIGJAM";
  }): Promise<{
    status: "QUEUED";
    exportJobId: string;
  }> {
    return {
      status: "QUEUED",
      exportJobId: randomUUID()
    };
  }
}

export const mockServices = {
  parser: new MockParserService(),
  anonymizer: new MockAnonymizationService(),
  groupingAi: new MockGroupingAiService(),
  exporter: new MockExportService()
};
