import type {
  AnonymizedQuote,
  GroupingResult,
  ParsedQuote,
  StrategyRequest
} from "@/domain/entities/types";

export interface ParserService {
  parse(params: {
    sourceType: "CSV" | "TXT" | "DOC" | "DOCX" | "PASTED_TEXT";
    payload: string;
    filename?: string;
  }): Promise<ParsedQuote[]>;
}

export interface AnonymizationService {
  maskQuotes(params: {
    quotes: ParsedQuote[];
    consentGranted: boolean;
    optOut: boolean;
  }): Promise<AnonymizedQuote[]>;
}

export interface GroupingAiService {
  suggestStrategy(params: StrategyRequest): Promise<{
    strategySummary: string;
    strategyPrompt: string;
  }>;

  generateGrouping(params: {
    strategyPrompt: string;
    boardName: string;
    hierarchyDepth: number;
    quotes: AnonymizedQuote[];
  }): Promise<GroupingResult>;
}

export interface ExportService {
  requestExport(params: {
    workspaceId: string;
    boardId: string;
    format: "CSV" | "PDF" | "FIGJAM";
  }): Promise<{
    status: "QUEUED";
    exportJobId: string;
  }>;
}
