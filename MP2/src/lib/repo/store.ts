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

type StoreShape = {
  users: Map<string, UserRecord>;
  sessions: Map<string, SessionRecord>;
  workspaces: Map<string, WorkspaceRecord>;
  uploads: Map<string, UploadRecord>;
  participants: Map<string, ParticipantRecord>;
  codes: Map<string, CodeRecord>;
  boards: Map<string, BoardRecord>;
  themes: Map<string, ThemeRecord>;
  assignments: Map<string, AssignmentRecord>;
  shareLinks: Map<string, ShareLinkRecord>;
  exportJobs: Map<string, ExportJobRecord>;
  /** Undo stacks keyed by `${workspaceId}:${userId}` (per-user-session scope). */
  snapshotStacks: Map<string, SnapshotRecord[]>;
  activityLogs: ActivityLogRecord[];
};

declare global {
  // eslint-disable-next-line no-var
  var __mp2Store__: StoreShape | undefined;
}

function createStore(): StoreShape {
  return {
    users: new Map(),
    sessions: new Map(),
    workspaces: new Map(),
    uploads: new Map(),
    participants: new Map(),
    codes: new Map(),
    boards: new Map(),
    themes: new Map(),
    assignments: new Map(),
    shareLinks: new Map(),
    exportJobs: new Map(),
    snapshotStacks: new Map(),
    activityLogs: []
  };
}

/**
 * Reuse the process-global store across dev hot-reloads, but backfill any fields
 * added after the global was first created. Without this, a store created before
 * new maps (e.g. exportJobs/shareLinks) were added would be missing them and
 * crash with "Cannot read properties of undefined" until a full server restart.
 */
function initStore(): StoreShape {
  const existing = global.__mp2Store__;
  const fresh = createStore();
  if (!existing) {
    return fresh;
  }
  for (const key of Object.keys(fresh) as (keyof StoreShape)[]) {
    if (existing[key] === undefined) {
      // Index assignment across the union of map/array fields is safe here.
      (existing as Record<string, unknown>)[key] = fresh[key];
    }
  }
  return existing;
}

const store: StoreShape = initStore();

if (process.env.NODE_ENV !== "production") {
  global.__mp2Store__ = store;
}

function now(): string {
  return new Date().toISOString();
}

function snapshotKey(workspaceId: string, userId: string): string {
  return `${workspaceId}:${userId}`;
}

export const repo = {
  reset(): void {
    const fresh = createStore();
    store.users = fresh.users;
    store.sessions = fresh.sessions;
    store.workspaces = fresh.workspaces;
    store.uploads = fresh.uploads;
    store.participants = fresh.participants;
    store.codes = fresh.codes;
    store.boards = fresh.boards;
    store.themes = fresh.themes;
    store.assignments = fresh.assignments;
    store.shareLinks = fresh.shareLinks;
    store.exportJobs = fresh.exportJobs;
    store.snapshotStacks = fresh.snapshotStacks;
    store.activityLogs = fresh.activityLogs;
  },

  upsertUser(input: { email: string; provider: UserProvider; displayName?: string }): UserRecord {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = [...store.users.values()].find((u) => u.email === normalizedEmail);
    if (existing) {
      const updated = { ...existing, provider: input.provider, displayName: input.displayName ?? existing.displayName };
      store.users.set(existing.id, updated);
      return updated;
    }

    const record: UserRecord = {
      id: randomUUID(),
      email: normalizedEmail,
      provider: input.provider,
      displayName: input.displayName,
      createdAt: now()
    };
    store.users.set(record.id, record);
    return record;
  },

  getUser(id: string): UserRecord | undefined {
    return store.users.get(id);
  },

  createSession(userId: string): SessionRecord {
    const record: SessionRecord = { token: randomUUID(), userId, createdAt: now() };
    store.sessions.set(record.token, record);
    return record;
  },

  getSession(token: string): SessionRecord | undefined {
    return store.sessions.get(token);
  },

  deleteSession(token: string): void {
    store.sessions.delete(token);
  },

  createWorkspace(input: Omit<WorkspaceRecord, "id" | "createdAt">): WorkspaceRecord {
    const record: WorkspaceRecord = { ...input, id: randomUUID(), createdAt: now() };
    store.workspaces.set(record.id, record);
    return record;
  },

  getWorkspace(id: string): WorkspaceRecord | undefined {
    return store.workspaces.get(id);
  },

  /** Hard-delete a workspace and every record that belongs to it. */
  deleteWorkspace(id: string): boolean {
    if (!store.workspaces.has(id)) {
      return false;
    }

    // Boards/themes/assignments are cleaned up via the existing helper.
    this.clearBoards(id);

    for (const [key, record] of store.uploads) {
      if (record.workspaceId === id) store.uploads.delete(key);
    }
    for (const [key, record] of store.participants) {
      if (record.workspaceId === id) store.participants.delete(key);
    }
    for (const [key, record] of store.codes) {
      if (record.workspaceId === id) store.codes.delete(key);
    }
    for (const [key, record] of store.shareLinks) {
      if (record.workspaceId === id) store.shareLinks.delete(key);
    }
    for (const [key, record] of store.exportJobs) {
      if (record.workspaceId === id) store.exportJobs.delete(key);
    }
    for (const key of [...store.snapshotStacks.keys()]) {
      if (key.startsWith(`${id}:`)) store.snapshotStacks.delete(key);
    }
    store.activityLogs = store.activityLogs.filter((a) => a.workspaceId !== id);
    store.workspaces.delete(id);
    return true;
  },

  listWorkspaces(): WorkspaceRecord[] {
    return [...store.workspaces.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  listWorkspacesForUser(userId: string): WorkspaceRecord[] {
    return this.listWorkspaces().filter((w) => w.createdByUserId === userId);
  },

  createUpload(input: Omit<UploadRecord, "id" | "createdAt">): UploadRecord {
    const record: UploadRecord = { ...input, id: randomUUID(), createdAt: now() };
    store.uploads.set(record.id, record);
    return record;
  },

  listUploads(workspaceId: string): UploadRecord[] {
    return [...store.uploads.values()]
      .filter((u) => u.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  updateUpload(
    id: string,
    patch: Partial<Pick<UploadRecord, "anonymizationState" | "anonymizationOptOut">>
  ): void {
    const existing = store.uploads.get(id);
    if (existing) {
      store.uploads.set(id, { ...existing, ...patch });
    }
  },

  /** Return existing participant for a source label or create one with a stable color. */
  ensureParticipant(params: {
    workspaceId: string;
    sourceLabel: string;
    anonymizedLabel: string;
    assignColorToken: (existingCount: number) => string;
  }): ParticipantRecord {
    const existing = [...store.participants.values()].find(
      (p) => p.workspaceId === params.workspaceId && p.sourceLabel === params.sourceLabel
    );

    if (existing) {
      return existing;
    }

    const existingCount = [...store.participants.values()].filter(
      (p) => p.workspaceId === params.workspaceId
    ).length;

    const record: ParticipantRecord = {
      id: randomUUID(),
      workspaceId: params.workspaceId,
      sourceLabel: params.sourceLabel,
      anonymizedLabel: params.anonymizedLabel,
      colorToken: params.assignColorToken(existingCount),
      createdAt: now()
    };

    store.participants.set(record.id, record);
    return record;
  },

  listParticipants(workspaceId: string): ParticipantRecord[] {
    return [...store.participants.values()].filter((p) => p.workspaceId === workspaceId);
  },

  createCode(input: Omit<CodeRecord, "id" | "createdAt">): CodeRecord {
    const record: CodeRecord = { ...input, id: randomUUID(), createdAt: now() };
    store.codes.set(record.id, record);
    return record;
  },

  listCodes(workspaceId: string, includeDeleted = false): CodeRecord[] {
    return [...store.codes.values()].filter(
      (c) => c.workspaceId === workspaceId && (includeDeleted || c.state === "ACTIVE")
    );
  },

  updateCode(
    id: string,
    patch: Partial<Pick<CodeRecord, "code" | "quote" | "memo" | "piiMasked" | "state">>
  ): void {
    const existing = store.codes.get(id);
    if (existing) {
      store.codes.set(id, { ...existing, ...patch });
    }
  },

  createBoard(input: Omit<BoardRecord, "id" | "createdAt">): BoardRecord {
    const record: BoardRecord = { ...input, id: randomUUID(), createdAt: now() };
    store.boards.set(record.id, record);
    return record;
  },

  latestBoard(workspaceId: string): BoardRecord | undefined {
    return [...store.boards.values()]
      .filter((b) => b.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  },

  createTheme(input: Omit<ThemeRecord, "id" | "createdAt">): ThemeRecord {
    const record: ThemeRecord = { ...input, id: randomUUID(), createdAt: now() };
    store.themes.set(record.id, record);
    return record;
  },

  getTheme(id: string): ThemeRecord | undefined {
    return store.themes.get(id);
  },

  updateTheme(
    id: string,
    patch: Partial<Pick<ThemeRecord, "title" | "description" | "state" | "participantCount" | "mentionDensity">>
  ): ThemeRecord {
    const existing = store.themes.get(id);
    if (!existing) {
      throw new Error(`Theme ${id} not found`);
    }
    const updated = { ...existing, ...patch };
    store.themes.set(id, updated);
    return updated;
  },

  listThemes(boardId: string): ThemeRecord[] {
    return [...store.themes.values()]
      .filter((t) => t.boardId === boardId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  createAssignment(input: Omit<AssignmentRecord, "id" | "createdAt">): AssignmentRecord {
    const record: AssignmentRecord = { ...input, id: randomUUID(), createdAt: now() };
    store.assignments.set(record.id, record);
    return record;
  },

  listAssignmentsByTheme(themeId: string): AssignmentRecord[] {
    return [...store.assignments.values()].filter((a) => a.themeId === themeId);
  },

  clearBoards(workspaceId: string): void {
    for (const board of [...store.boards.values()].filter((b) => b.workspaceId === workspaceId)) {
      const themes = [...store.themes.values()].filter((t) => t.boardId === board.id);
      for (const theme of themes) {
        for (const assignment of [...store.assignments.values()].filter((a) => a.themeId === theme.id)) {
          store.assignments.delete(assignment.id);
        }
        store.themes.delete(theme.id);
      }
      store.boards.delete(board.id);
    }
  },

  createShareLink(input: Omit<ShareLinkRecord, "id" | "createdAt">): ShareLinkRecord {
    const record: ShareLinkRecord = { ...input, id: randomUUID(), createdAt: now() };
    store.shareLinks.set(record.id, record);
    return record;
  },

  findActiveShareLink(workspaceId: string, tokenHash: string): ShareLinkRecord | undefined {
    return [...store.shareLinks.values()].find(
      (link) =>
        link.workspaceId === workspaceId &&
        link.tokenHash === tokenHash &&
        link.status === "ACTIVE" &&
        (!link.expiresAt || link.expiresAt > now())
    );
  },

  listShareLinks(workspaceId: string): ShareLinkRecord[] {
    return [...store.shareLinks.values()].filter((l) => l.workspaceId === workspaceId);
  },

  createExportJob(input: Omit<ExportJobRecord, "id" | "createdAt">): ExportJobRecord {
    const record: ExportJobRecord = { ...input, id: randomUUID(), createdAt: now() };
    store.exportJobs.set(record.id, record);
    return record;
  },

  listExportJobs(workspaceId: string): ExportJobRecord[] {
    return [...store.exportJobs.values()]
      .filter((j) => j.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  pushSnapshot(input: Omit<SnapshotRecord, "id" | "createdAt">): SnapshotRecord {
    const record: SnapshotRecord = { ...input, id: randomUUID(), createdAt: now() };
    const key = snapshotKey(record.workspaceId, record.userId);
    const stack = store.snapshotStacks.get(key) ?? [];
    stack.push(record);
    store.snapshotStacks.set(key, stack);
    return record;
  },

  popSnapshot(workspaceId: string, userId: string): SnapshotRecord | undefined {
    const key = snapshotKey(workspaceId, userId);
    const stack = store.snapshotStacks.get(key);
    if (!stack || stack.length === 0) {
      return undefined;
    }
    const record = stack.pop();
    store.snapshotStacks.set(key, stack);
    return record;
  },

  listSnapshots(workspaceId: string, userId: string): SnapshotRecord[] {
    const stack = store.snapshotStacks.get(snapshotKey(workspaceId, userId)) ?? [];
    return [...stack].reverse();
  },

  logActivity(input: Omit<ActivityLogRecord, "id" | "createdAt">): void {
    store.activityLogs.push({ ...input, id: randomUUID(), createdAt: now() });
  },

  listActivity(workspaceId: string): ActivityLogRecord[] {
    return store.activityLogs.filter((a) => a.workspaceId === workspaceId);
  }
};
