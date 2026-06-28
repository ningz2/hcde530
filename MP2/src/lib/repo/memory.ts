import { randomUUID } from "node:crypto";
import type {
  ActivityLogRecord,
  AnonymizationState,
  AssignmentRecord,
  BoardRecord,
  CodeRecord,
  EntityState,
  ExportFormat,
  ExportJobRecord,
  ExportStatus,
  ParticipantRecord,
  SessionRecord,
  ShareLinkRecord,
  ShareLinkScope,
  ShareLinkStatus,
  SnapshotAction,
  SnapshotEntityType,
  SnapshotRecord,
  ThemeRecord,
  UploadInputType,
  UploadRecord,
  UserProvider,
  UserRecord,
  WorkspaceRecord
} from "@/lib/repo/types";

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

export const memoryRepo = {
  async reset(): Promise<void> {
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

  async upsertUser(input: { email: string; provider: UserProvider; displayName?: string }): Promise<UserRecord> {
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

  async getUser(id: string): Promise<UserRecord | undefined> {
    return store.users.get(id);
  },

  async createSession(userId: string): Promise<SessionRecord> {
    const record: SessionRecord = { token: randomUUID(), userId, createdAt: now() };
    store.sessions.set(record.token, record);
    return record;
  },

  async getSession(token: string): Promise<SessionRecord | undefined> {
    return store.sessions.get(token);
  },

  async deleteSession(token: string): Promise<void> {
    store.sessions.delete(token);
  },

  async createWorkspace(input: Omit<WorkspaceRecord, "id" | "createdAt">): Promise<WorkspaceRecord> {
    const record: WorkspaceRecord = { ...input, id: randomUUID(), createdAt: now() };
    store.workspaces.set(record.id, record);
    return record;
  },

  async getWorkspace(id: string): Promise<WorkspaceRecord | undefined> {
    return store.workspaces.get(id);
  },

  /** Hard-delete a workspace and every record that belongs to it. */
  async deleteWorkspace(id: string): Promise<boolean> {
    if (!store.workspaces.has(id)) {
      return false;
    }

    // Boards/themes/assignments are cleaned up via the existing helper.
    await this.clearBoards(id);

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

  async listWorkspaces(): Promise<WorkspaceRecord[]> {
    return [...store.workspaces.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listWorkspacesForUser(userId: string): Promise<WorkspaceRecord[]> {
    return (await this.listWorkspaces()).filter((w) => w.createdByUserId === userId);
  },

  async createUpload(input: Omit<UploadRecord, "id" | "createdAt">): Promise<UploadRecord> {
    const record: UploadRecord = { ...input, id: randomUUID(), createdAt: now() };
    store.uploads.set(record.id, record);
    return record;
  },

  async listUploads(workspaceId: string): Promise<UploadRecord[]> {
    return [...store.uploads.values()]
      .filter((u) => u.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async updateUpload(
    id: string,
    patch: Partial<Pick<UploadRecord, "anonymizationState" | "anonymizationOptOut">>
  ): Promise<void> {
    const existing = store.uploads.get(id);
    if (existing) {
      store.uploads.set(id, { ...existing, ...patch });
    }
  },

  /** Return existing participant for a source label or create one with a stable color. */
  async ensureParticipant(params: {
    workspaceId: string;
    sourceLabel: string;
    anonymizedLabel: string;
    assignColorToken: (existingCount: number) => string;
  }): Promise<ParticipantRecord> {
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

  async listParticipants(workspaceId: string): Promise<ParticipantRecord[]> {
    return [...store.participants.values()].filter((p) => p.workspaceId === workspaceId);
  },

  async createCode(input: Omit<CodeRecord, "id" | "createdAt">): Promise<CodeRecord> {
    const record: CodeRecord = { ...input, id: randomUUID(), createdAt: now() };
    store.codes.set(record.id, record);
    return record;
  },

  async createCodes(inputs: Omit<CodeRecord, "id" | "createdAt">[]): Promise<void> {
    for (const input of inputs) {
      const record: CodeRecord = { ...input, id: randomUUID(), createdAt: now() };
      store.codes.set(record.id, record);
    }
  },

  async listCodes(workspaceId: string, includeDeleted = false): Promise<CodeRecord[]> {
    return [...store.codes.values()].filter(
      (c) => c.workspaceId === workspaceId && (includeDeleted || c.state === "ACTIVE")
    );
  },

  async updateCode(
    id: string,
    patch: Partial<Pick<CodeRecord, "code" | "quote" | "memo" | "piiMasked" | "state">>
  ): Promise<void> {
    const existing = store.codes.get(id);
    if (existing) {
      store.codes.set(id, { ...existing, ...patch });
    }
  },

  async createBoard(input: Omit<BoardRecord, "id" | "createdAt">): Promise<BoardRecord> {
    const record: BoardRecord = { ...input, id: randomUUID(), createdAt: now() };
    store.boards.set(record.id, record);
    return record;
  },

  async latestBoard(workspaceId: string): Promise<BoardRecord | undefined> {
    return [...store.boards.values()]
      .filter((b) => b.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  },

  async createTheme(input: Omit<ThemeRecord, "id" | "createdAt">): Promise<ThemeRecord> {
    const record: ThemeRecord = { ...input, id: randomUUID(), createdAt: now() };
    store.themes.set(record.id, record);
    return record;
  },

  async getTheme(id: string): Promise<ThemeRecord | undefined> {
    return store.themes.get(id);
  },

  async updateTheme(
    id: string,
    patch: Partial<Pick<ThemeRecord, "title" | "description" | "state" | "participantCount" | "mentionDensity">>
  ): Promise<ThemeRecord> {
    const existing = store.themes.get(id);
    if (!existing) {
      throw new Error(`Theme ${id} not found`);
    }
    const updated = { ...existing, ...patch };
    store.themes.set(id, updated);
    return updated;
  },

  async listThemes(boardId: string): Promise<ThemeRecord[]> {
    return [...store.themes.values()]
      .filter((t) => t.boardId === boardId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async createAssignment(input: Omit<AssignmentRecord, "id" | "createdAt">): Promise<AssignmentRecord> {
    const record: AssignmentRecord = { ...input, id: randomUUID(), createdAt: now() };
    store.assignments.set(record.id, record);
    return record;
  },

  async listAssignmentsByTheme(themeId: string): Promise<AssignmentRecord[]> {
    return [...store.assignments.values()].filter((a) => a.themeId === themeId);
  },

  async clearBoards(workspaceId: string): Promise<void> {
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

  async createShareLink(input: Omit<ShareLinkRecord, "id" | "createdAt">): Promise<ShareLinkRecord> {
    const record: ShareLinkRecord = { ...input, id: randomUUID(), createdAt: now() };
    store.shareLinks.set(record.id, record);
    return record;
  },

  async findActiveShareLink(workspaceId: string, tokenHash: string): Promise<ShareLinkRecord | undefined> {
    return [...store.shareLinks.values()].find(
      (link) =>
        link.workspaceId === workspaceId &&
        link.tokenHash === tokenHash &&
        link.status === "ACTIVE" &&
        (!link.expiresAt || link.expiresAt > now())
    );
  },

  async listShareLinks(workspaceId: string): Promise<ShareLinkRecord[]> {
    return [...store.shareLinks.values()].filter((l) => l.workspaceId === workspaceId);
  },

  async createExportJob(input: Omit<ExportJobRecord, "id" | "createdAt">): Promise<ExportJobRecord> {
    const record: ExportJobRecord = { ...input, id: randomUUID(), createdAt: now() };
    store.exportJobs.set(record.id, record);
    return record;
  },

  async listExportJobs(workspaceId: string): Promise<ExportJobRecord[]> {
    return [...store.exportJobs.values()]
      .filter((j) => j.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async pushSnapshot(input: Omit<SnapshotRecord, "id" | "createdAt">): Promise<SnapshotRecord> {
    const record: SnapshotRecord = { ...input, id: randomUUID(), createdAt: now() };
    const key = snapshotKey(record.workspaceId, record.userId);
    const stack = store.snapshotStacks.get(key) ?? [];
    stack.push(record);
    store.snapshotStacks.set(key, stack);
    return record;
  },

  async popSnapshot(workspaceId: string, userId: string): Promise<SnapshotRecord | undefined> {
    const key = snapshotKey(workspaceId, userId);
    const stack = store.snapshotStacks.get(key);
    if (!stack || stack.length === 0) {
      return undefined;
    }
    const record = stack.pop();
    store.snapshotStacks.set(key, stack);
    return record;
  },

  async listSnapshots(workspaceId: string, userId: string): Promise<SnapshotRecord[]> {
    const stack = store.snapshotStacks.get(snapshotKey(workspaceId, userId)) ?? [];
    return [...stack].reverse();
  },

  async logActivity(input: Omit<ActivityLogRecord, "id" | "createdAt">): Promise<void> {
    store.activityLogs.push({ ...input, id: randomUUID(), createdAt: now() });
  },

  async listActivity(workspaceId: string): Promise<ActivityLogRecord[]> {
    return store.activityLogs.filter((a) => a.workspaceId === workspaceId);
  }
};
