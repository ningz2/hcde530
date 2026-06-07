import { randomUUID } from "node:crypto";

/**
 * In-memory persistence for the Phase 2 vertical slice.
 *
 * This intentionally mirrors the Prisma schema shapes so it can be swapped for a
 * real PrismaClient-backed repository later without changing call sites. State is
 * held on a process-global singleton so API route handlers and server components
 * share the same data within a running dev server. It resets on restart.
 */

export type GroupingDirection = "BOTTOM_UP" | "TOP_DOWN";
export type UploadInputType = "CSV" | "TXT" | "DOC" | "DOCX" | "PASTED_TEXT";
export type AnonymizationState = "PENDING_CONSENT" | "APPLIED" | "SKIPPED";
export type EntityState = "ACTIVE" | "SOFT_DELETED";
export type SnapshotAction = "CREATE" | "UPDATE" | "DELETE" | "RESTORE" | "MOVE";
export type SnapshotEntityType = "CODE" | "THEME" | "BOARD";

export type HierarchyMode = "GROUPS" | "THEMES" | "RQS";

export type UserProvider = "EMAIL_PASSWORD" | "GOOGLE";

export type UserRecord = {
  id: string;
  email: string;
  displayName?: string;
  provider: UserProvider;
  createdAt: string;
};

export type SessionRecord = {
  token: string;
  userId: string;
  createdAt: string;
};

export type WorkspaceRecord = {
  id: string;
  name: string;
  researchQuestion?: string;
  /** Research questions collected at the add-data step; drives the "by RQ" hierarchy. */
  researchQuestions?: string[];
  projectGoal?: string;
  projectContext?: string;
  defaultHierarchyDepth: number;
  groupingDirection: GroupingDirection;
  createdByUserId: string;
  createdAt: string;
};

export type UploadRecord = {
  id: string;
  workspaceId: string;
  submittedByUserId: string;
  sourceType: UploadInputType;
  originalFilename?: string;
  anonymizationState: AnonymizationState;
  anonymizationOptOut: boolean;
  rawRetained: boolean;
  createdAt: string;
};

export type ParticipantRecord = {
  id: string;
  workspaceId: string;
  sourceLabel: string;
  anonymizedLabel: string;
  colorToken: string;
  createdAt: string;
};

/**
 * A code is the unit grouped into themes. `quote` and `memo` are optional
 * supporting context. All three text fields are subject to anonymization.
 */
export type CodeRecord = {
  id: string;
  workspaceId: string;
  uploadId: string;
  participantId: string;
  code: string;
  quote?: string;
  memo?: string;
  sourceRef?: string;
  piiMasked: boolean;
  state: EntityState;
  createdAt: string;
};

export type BoardRecord = {
  id: string;
  workspaceId: string;
  name: string;
  hierarchyDepth: number;
  /** How the board is organized: flat groups, groups-in-themes, or themes-by-RQ. */
  hierarchyMode: HierarchyMode;
  /** Target number of leaf groups (granularity slider, group level). */
  groupGranularity: number;
  /** Target number of mid-level themes (granularity slider, theme level). */
  themeGranularity: number;
  createdAt: string;
};

export type ThemeRecord = {
  id: string;
  boardId: string;
  parentThemeId?: string;
  level: number;
  title: string;
  description?: string;
  /** Distinct participants represented in this theme: drives the "mentioned by N" badge. */
  participantCount: number;
  /** 0..1 cross-mention emphasis ratio: drives stronger color density. */
  mentionDensity: number;
  state: EntityState;
  createdAt: string;
};

export type ShareLinkScope = "WORKSPACE_VIEW" | "BOARD_VIEW";
export type ShareLinkStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export type ShareLinkRecord = {
  id: string;
  workspaceId: string;
  boardId?: string;
  createdByUserId: string;
  tokenHash: string;
  scope: ShareLinkScope;
  status: ShareLinkStatus;
  expiresAt?: string;
  allowExport: boolean;
  createdAt: string;
};

export type ExportFormat = "CSV" | "PDF" | "FIGJAM";
export type ExportStatus = "QUEUED" | "READY" | "FAILED";

export type ExportJobRecord = {
  id: string;
  workspaceId: string;
  boardId: string;
  requestedByUserId?: string;
  format: ExportFormat;
  status: ExportStatus;
  /** Inline artifact for synchronous exports. */
  artifactPreview?: string;
  artifactMimeType?: string;
  artifactFilename?: string;
  createdAt: string;
};

export type AssignmentRecord = {
  id: string;
  codeId: string;
  themeId: string;
  rationale: string;
  createdAt: string;
};

export type SnapshotRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  entityType: SnapshotEntityType;
  entityId: string;
  action: SnapshotAction;
  /** Previous value captured before the mutation, used to revert on undo. */
  previous: Record<string, unknown>;
  label: string;
  createdAt: string;
};

export type ActivityLogRecord = {
  id: string;
  workspaceId: string;
  actorUserId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  createdAt: string;
};
