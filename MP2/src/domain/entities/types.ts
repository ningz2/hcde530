export type WorkspaceRole = "OWNER" | "EDITOR" | "VIEWER";

export type AuthIdentity = {
  userId: string;
  email: string;
  displayName?: string;
  provider: "EMAIL_PASSWORD" | "GOOGLE" | "MICROSOFT";
};

export type WorkspaceMembership = {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
};

export type AnonymousShareContext = {
  workspaceId: string;
  boardId?: string;
  allowExport: boolean;
};

/**
 * The unit of analysis is a CODE. Each code optionally carries a supporting
 * quote and/or memo to help interpret it. Codes may be associated with a
 * participant (optional), which drives participant-aware colors/emphasis.
 */
export type ParsedCode = {
  sourceRef?: string;
  participantLabel: string;
  code: string;
  quote?: string;
  memo?: string;
};

export type AnonymizedCode = ParsedCode & {
  piiMasked: boolean;
  maskingNotes: string[];
};

export type StrategyRequest = {
  researchQuestion: string;
  projectGoal: string;
  projectContext?: string;
  direction: "BOTTOM_UP" | "TOP_DOWN";
  hierarchyDepth: number;
  tone: "BALANCED";
};

export type GroupingAssignment = {
  codeId: string;
  themeTitle: string;
  rationale: string;
  participantCount: number;
};

export type GroupingResult = {
  boardName: string;
  hierarchyDepth: number;
  assignments: GroupingAssignment[];
};
