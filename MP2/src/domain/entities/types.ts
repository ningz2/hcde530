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

export type ParsedQuote = {
  sourceRef?: string;
  participantLabel: string;
  text: string;
};

export type AnonymizedQuote = ParsedQuote & {
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
  quoteId: string;
  themeTitle: string;
  rationale: string;
  participantCount: number;
};

export type GroupingResult = {
  boardName: string;
  hierarchyDepth: number;
  assignments: GroupingAssignment[];
};
