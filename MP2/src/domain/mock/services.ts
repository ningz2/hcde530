import { randomUUID } from "node:crypto";
import type {
  AnonymizationService,
  ExportService,
  GroupingAiService,
  ParserService
} from "@/domain/contracts/services";
import type { AnonymizedCode, ParsedCode, StrategyRequest } from "@/domain/entities/types";

export class MockParserService implements ParserService {
  async parse(params: {
    sourceType: "CSV" | "TXT" | "DOC" | "DOCX" | "PASTED_TEXT";
    payload: string;
    filename?: string;
  }): Promise<ParsedCode[]> {
    const chunks = params.payload
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 20);

    return chunks.map((line, index) => ({
      sourceRef: params.filename ?? params.sourceType,
      participantLabel: `P-${(index % 4) + 1}`,
      code: line
    }));
  }
}

export class MockAnonymizationService implements AnonymizationService {
  async maskCodes(params: {
    codes: ParsedCode[];
    consentGranted: boolean;
    optOut: boolean;
  }): Promise<AnonymizedCode[]> {
    const shouldMask = params.consentGranted && !params.optOut;

    return params.codes.map((item) => ({
      ...item,
      code: shouldMask ? item.code.replace(/\b[A-Z][a-z]+\b/g, "[REDACTED]") : item.code,
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
    codes: AnonymizedCode[];
  }) {
    return {
      boardName: params.boardName,
      hierarchyDepth: params.hierarchyDepth,
      assignments: params.codes.slice(0, 10).map((_code, index) => ({
        codeId: `mock-code-${index + 1}`,
        themeTitle: `Theme ${(index % 3) + 1}`,
        rationale: "Code reflects recurring user needs aligned with this theme cluster.",
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
