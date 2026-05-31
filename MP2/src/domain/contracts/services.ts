import type {
  AnonymizedCode,
  GroupingResult,
  ParsedCode,
  StrategyRequest
} from "@/domain/entities/types";

export interface ParserService {
  parse(params: {
    sourceType: "CSV" | "TXT" | "DOC" | "DOCX" | "PASTED_TEXT";
    payload: string;
    filename?: string;
  }): Promise<ParsedCode[]>;
}

export interface AnonymizationService {
  maskCodes(params: {
    codes: ParsedCode[];
    consentGranted: boolean;
    optOut: boolean;
  }): Promise<AnonymizedCode[]>;
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
    codes: AnonymizedCode[];
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
