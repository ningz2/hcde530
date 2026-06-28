import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type {
  ActivityLogRecord,
  AssignmentRecord,
  BoardRecord,
  CodeRecord,
  EntityState,
  ExportJobRecord,
  ExportStatus,
  ParticipantRecord,
  SessionRecord,
  ShareLinkRecord,
  SnapshotRecord,
  ThemeRecord,
  UploadRecord,
  UserProvider,
  UserRecord,
  WorkspaceRecord
} from "@/lib/repo/types";

const sessionFallback = new Map<string, SessionRecord>();

function iso(d: Date): string {
  return d.toISOString();
}

function mapUser(row: {
  id: string;
  email: string;
  displayName: string | null;
  provider: "EMAIL_PASSWORD" | "GOOGLE";
  createdAt: Date;
}): UserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName ?? undefined,
    provider: row.provider,
    createdAt: iso(row.createdAt)
  };
}

function mapWorkspace(row: {
  id: string;
  name: string;
  researchQuestion: string | null;
  researchQuestions: unknown;
  projectGoal: string | null;
  projectContext: string | null;
  defaultHierarchyDepth: number;
  groupingDirection: "BOTTOM_UP" | "TOP_DOWN";
  createdByUserId: string;
  createdAt: Date;
}): WorkspaceRecord {
  const researchQuestions = Array.isArray(row.researchQuestions)
    ? (row.researchQuestions as string[])
    : undefined;
  return {
    id: row.id,
    name: row.name,
    researchQuestion: row.researchQuestion ?? undefined,
    researchQuestions,
    projectGoal: row.projectGoal ?? undefined,
    projectContext: row.projectContext ?? undefined,
    defaultHierarchyDepth: row.defaultHierarchyDepth,
    groupingDirection: row.groupingDirection,
    createdByUserId: row.createdByUserId,
    createdAt: iso(row.createdAt)
  };
}

function mapExportStatus(status: string): ExportStatus {
  if (status === "SUCCEEDED") return "READY";
  if (status === "FAILED") return "FAILED";
  return "QUEUED";
}

function toExportStatus(status: ExportStatus): "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" {
  if (status === "READY") return "SUCCEEDED";
  if (status === "FAILED") return "FAILED";
  return "QUEUED";
}

export const prismaRepo = {
  async reset(): Promise<void> {
    // Tests use memory repo; no-op for Prisma.
  },

  async upsertUser(input: {
    email: string;
    provider: UserProvider;
    displayName?: string;
  }): Promise<UserRecord> {
    const email = input.email.trim().toLowerCase();
    const row = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        authUserId: email,
        displayName: input.displayName,
        provider: input.provider
      },
      update: {
        displayName: input.displayName,
        provider: input.provider
      }
    });
    return mapUser(row);
  },

  async getUser(id: string): Promise<UserRecord | undefined> {
    const row = await prisma.user.findUnique({ where: { id } });
    return row ? mapUser(row) : undefined;
  },

  async createSession(userId: string): Promise<SessionRecord> {
    const record = { token: randomUUID(), userId, createdAt: new Date().toISOString() };
    sessionFallback.set(record.token, record);
    return record;
  },

  async getSession(token: string): Promise<SessionRecord | undefined> {
    return sessionFallback.get(token);
  },

  async deleteSession(token: string): Promise<void> {
    sessionFallback.delete(token);
  },

  async createWorkspace(input: Omit<WorkspaceRecord, "id" | "createdAt">): Promise<WorkspaceRecord> {
    const row = await prisma.workspace.create({
      data: {
        name: input.name,
        researchQuestion: input.researchQuestion,
        researchQuestions: input.researchQuestions ?? undefined,
        projectGoal: input.projectGoal,
        projectContext: input.projectContext,
        defaultHierarchyDepth: input.defaultHierarchyDepth,
        groupingDirection: input.groupingDirection,
        createdByUserId: input.createdByUserId
      }
    });
    return mapWorkspace(row);
  },

  async getWorkspace(id: string): Promise<WorkspaceRecord | undefined> {
    const row = await prisma.workspace.findUnique({ where: { id } });
    return row ? mapWorkspace(row) : undefined;
  },

  async deleteWorkspace(id: string): Promise<boolean> {
    const existing = await prisma.workspace.findUnique({ where: { id } });
    if (!existing) return false;
    await prisma.workspace.delete({ where: { id } });
    return true;
  },

  async listWorkspaces(): Promise<WorkspaceRecord[]> {
    const rows = await prisma.workspace.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(mapWorkspace);
  },

  async listWorkspacesForUser(userId: string): Promise<WorkspaceRecord[]> {
    const rows = await prisma.workspace.findMany({
      where: { createdByUserId: userId },
      orderBy: { createdAt: "desc" }
    });
    return rows.map(mapWorkspace);
  },

  async createUpload(input: Omit<UploadRecord, "id" | "createdAt">): Promise<UploadRecord> {
    const row = await prisma.ingestionUpload.create({
      data: {
        workspaceId: input.workspaceId,
        submittedByUserId: input.submittedByUserId,
        sourceType: input.sourceType,
        originalFilename: input.originalFilename,
        anonymizationState: input.anonymizationState,
        anonymizationOptOut: input.anonymizationOptOut,
        rawRetained: input.rawRetained
      }
    });
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      submittedByUserId: row.submittedByUserId ?? input.submittedByUserId,
      sourceType: row.sourceType,
      originalFilename: row.originalFilename ?? undefined,
      anonymizationState: row.anonymizationState,
      anonymizationOptOut: row.anonymizationOptOut,
      rawRetained: row.rawRetained,
      createdAt: iso(row.createdAt)
    };
  },

  async listUploads(workspaceId: string): Promise<UploadRecord[]> {
    const rows = await prisma.ingestionUpload.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspaceId,
      submittedByUserId: row.submittedByUserId ?? "",
      sourceType: row.sourceType,
      originalFilename: row.originalFilename ?? undefined,
      anonymizationState: row.anonymizationState,
      anonymizationOptOut: row.anonymizationOptOut,
      rawRetained: row.rawRetained,
      createdAt: iso(row.createdAt)
    }));
  },

  async updateUpload(
    id: string,
    patch: Partial<Pick<UploadRecord, "anonymizationState" | "anonymizationOptOut">>
  ): Promise<void> {
    await prisma.ingestionUpload.update({ where: { id }, data: patch });
  },

  async ensureParticipant(params: {
    workspaceId: string;
    sourceLabel: string;
    anonymizedLabel: string;
    assignColorToken: (existingCount: number) => string;
  }): Promise<ParticipantRecord> {
    const existing = await prisma.participant.findUnique({
      where: {
        workspaceId_sourceLabel: {
          workspaceId: params.workspaceId,
          sourceLabel: params.sourceLabel
        }
      }
    });
    if (existing) {
      return {
        id: existing.id,
        workspaceId: existing.workspaceId,
        sourceLabel: existing.sourceLabel,
        anonymizedLabel: existing.anonymizedLabel,
        colorToken: existing.stableColorToken,
        createdAt: iso(existing.createdAt)
      };
    }

    const count = await prisma.participant.count({ where: { workspaceId: params.workspaceId } });
    const row = await prisma.participant.create({
      data: {
        workspaceId: params.workspaceId,
        sourceLabel: params.sourceLabel,
        anonymizedLabel: params.anonymizedLabel,
        stableColorToken: params.assignColorToken(count)
      }
    });
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      sourceLabel: row.sourceLabel,
      anonymizedLabel: row.anonymizedLabel,
      colorToken: row.stableColorToken,
      createdAt: iso(row.createdAt)
    };
  },

  async listParticipants(workspaceId: string): Promise<ParticipantRecord[]> {
    const rows = await prisma.participant.findMany({ where: { workspaceId } });
    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspaceId,
      sourceLabel: row.sourceLabel,
      anonymizedLabel: row.anonymizedLabel,
      colorToken: row.stableColorToken,
      createdAt: iso(row.createdAt)
    }));
  },

  async createCode(input: Omit<CodeRecord, "id" | "createdAt">): Promise<CodeRecord> {
    const row = await prisma.code.create({
      data: {
        workspaceId: input.workspaceId,
        uploadId: input.uploadId,
        participantId: input.participantId,
        code: input.code,
        quote: input.quote,
        memo: input.memo,
        sourceRef: input.sourceRef,
        piiMasked: input.piiMasked,
        state: input.state
      }
    });
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      uploadId: row.uploadId,
      participantId: row.participantId,
      code: row.code,
      quote: row.quote ?? undefined,
      memo: row.memo ?? undefined,
      sourceRef: row.sourceRef ?? undefined,
      piiMasked: row.piiMasked,
      state: row.state as EntityState,
      createdAt: iso(row.createdAt)
    };
  },

  async createCodes(inputs: Omit<CodeRecord, "id" | "createdAt">[]): Promise<void> {
    if (inputs.length === 0) return;

    await prisma.code.createMany({
      data: inputs.map((input) => ({
        workspaceId: input.workspaceId,
        uploadId: input.uploadId,
        participantId: input.participantId,
        code: input.code,
        quote: input.quote,
        memo: input.memo,
        sourceRef: input.sourceRef,
        piiMasked: input.piiMasked,
        state: input.state
      }))
    });
  },

  async listCodes(workspaceId: string, includeDeleted = false): Promise<CodeRecord[]> {
    const rows = await prisma.code.findMany({
      where: {
        workspaceId,
        ...(includeDeleted ? {} : { state: "ACTIVE" })
      }
    });
    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspaceId,
      uploadId: row.uploadId,
      participantId: row.participantId,
      code: row.code,
      quote: row.quote ?? undefined,
      memo: row.memo ?? undefined,
      sourceRef: row.sourceRef ?? undefined,
      piiMasked: row.piiMasked,
      state: row.state as EntityState,
      createdAt: iso(row.createdAt)
    }));
  },

  async updateCode(
    id: string,
    patch: Partial<Pick<CodeRecord, "code" | "quote" | "memo" | "piiMasked" | "state">>
  ): Promise<void> {
    await prisma.code.update({ where: { id }, data: patch });
  },

  async createBoard(input: Omit<BoardRecord, "id" | "createdAt">): Promise<BoardRecord> {
    const row = await prisma.affinityBoard.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        hierarchyDepth: input.hierarchyDepth,
        hierarchyMode: input.hierarchyMode,
        groupGranularity: input.groupGranularity,
        themeGranularity: input.themeGranularity,
        status: "SUCCEEDED"
      }
    });
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      hierarchyDepth: row.hierarchyDepth,
      hierarchyMode: row.hierarchyMode,
      groupGranularity: row.groupGranularity,
      themeGranularity: row.themeGranularity,
      createdAt: iso(row.createdAt)
    };
  },

  async latestBoard(workspaceId: string): Promise<BoardRecord | undefined> {
    const row = await prisma.affinityBoard.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: "desc" }
    });
    if (!row) return undefined;
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      hierarchyDepth: row.hierarchyDepth,
      hierarchyMode: row.hierarchyMode,
      groupGranularity: row.groupGranularity,
      themeGranularity: row.themeGranularity,
      createdAt: iso(row.createdAt)
    };
  },

  async createTheme(input: Omit<ThemeRecord, "id" | "createdAt">): Promise<ThemeRecord> {
    const row = await prisma.theme.create({
      data: {
        boardId: input.boardId,
        parentThemeId: input.parentThemeId,
        level: input.level,
        title: input.title,
        description: input.description,
        participantCount: input.participantCount,
        mentionDensity: input.mentionDensity,
        state: input.state
      }
    });
    return {
      id: row.id,
      boardId: row.boardId,
      parentThemeId: row.parentThemeId ?? undefined,
      level: row.level,
      title: row.title,
      description: row.description ?? undefined,
      participantCount: row.participantCount,
      mentionDensity: row.mentionDensity,
      state: row.state as EntityState,
      createdAt: iso(row.createdAt)
    };
  },

  async getTheme(id: string): Promise<ThemeRecord | undefined> {
    const row = await prisma.theme.findUnique({ where: { id } });
    if (!row) return undefined;
    return {
      id: row.id,
      boardId: row.boardId,
      parentThemeId: row.parentThemeId ?? undefined,
      level: row.level,
      title: row.title,
      description: row.description ?? undefined,
      participantCount: row.participantCount,
      mentionDensity: row.mentionDensity,
      state: row.state as EntityState,
      createdAt: iso(row.createdAt)
    };
  },

  async updateTheme(
    id: string,
    patch: Partial<Pick<ThemeRecord, "title" | "description" | "state" | "participantCount" | "mentionDensity">>
  ): Promise<ThemeRecord> {
    const row = await prisma.theme.update({ where: { id }, data: patch });
    return {
      id: row.id,
      boardId: row.boardId,
      parentThemeId: row.parentThemeId ?? undefined,
      level: row.level,
      title: row.title,
      description: row.description ?? undefined,
      participantCount: row.participantCount,
      mentionDensity: row.mentionDensity,
      state: row.state as EntityState,
      createdAt: iso(row.createdAt)
    };
  },

  async listThemes(boardId: string): Promise<ThemeRecord[]> {
    const rows = await prisma.theme.findMany({
      where: { boardId },
      orderBy: { createdAt: "asc" }
    });
    return rows.map((row) => ({
      id: row.id,
      boardId: row.boardId,
      parentThemeId: row.parentThemeId ?? undefined,
      level: row.level,
      title: row.title,
      description: row.description ?? undefined,
      participantCount: row.participantCount,
      mentionDensity: row.mentionDensity,
      state: row.state as EntityState,
      createdAt: iso(row.createdAt)
    }));
  },

  async createAssignment(input: Omit<AssignmentRecord, "id" | "createdAt">): Promise<AssignmentRecord> {
    const row = await prisma.codeAssignment.create({
      data: {
        codeId: input.codeId,
        themeId: input.themeId,
        rationale: input.rationale
      }
    });
    return {
      id: row.id,
      codeId: row.codeId,
      themeId: row.themeId,
      rationale: row.rationale,
      createdAt: iso(row.createdAt)
    };
  },

  async listAssignmentsByTheme(themeId: string): Promise<AssignmentRecord[]> {
    const rows = await prisma.codeAssignment.findMany({ where: { themeId } });
    return rows.map((row) => ({
      id: row.id,
      codeId: row.codeId,
      themeId: row.themeId,
      rationale: row.rationale,
      createdAt: iso(row.createdAt)
    }));
  },

  async clearBoards(workspaceId: string): Promise<void> {
    const boards = await prisma.affinityBoard.findMany({ where: { workspaceId }, select: { id: true } });
    const boardIds = boards.map((b) => b.id);
    if (boardIds.length === 0) return;
    const themes = await prisma.theme.findMany({ where: { boardId: { in: boardIds } }, select: { id: true } });
    const themeIds = themes.map((t) => t.id);
    if (themeIds.length > 0) {
      await prisma.codeAssignment.deleteMany({ where: { themeId: { in: themeIds } } });
      await prisma.theme.deleteMany({ where: { id: { in: themeIds } } });
    }
    await prisma.affinityBoard.deleteMany({ where: { id: { in: boardIds } } });
  },

  async createShareLink(input: Omit<ShareLinkRecord, "id" | "createdAt">): Promise<ShareLinkRecord> {
    const row = await prisma.shareLink.create({
      data: {
        workspaceId: input.workspaceId,
        boardId: input.boardId,
        createdByUserId: input.createdByUserId,
        tokenHash: input.tokenHash,
        scope: input.scope,
        status: input.status,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        allowExport: input.allowExport
      }
    });
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      boardId: row.boardId ?? undefined,
      createdByUserId: row.createdByUserId ?? input.createdByUserId,
      tokenHash: row.tokenHash,
      scope: row.scope,
      status: row.status,
      expiresAt: row.expiresAt ? iso(row.expiresAt) : undefined,
      allowExport: row.allowExport,
      createdAt: iso(row.createdAt)
    };
  },

  async findActiveShareLink(workspaceId: string, tokenHash: string): Promise<ShareLinkRecord | undefined> {
    const row = await prisma.shareLink.findFirst({
      where: {
        workspaceId,
        tokenHash,
        status: "ACTIVE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      }
    });
    if (!row) return undefined;
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      boardId: row.boardId ?? undefined,
      createdByUserId: row.createdByUserId ?? "",
      tokenHash: row.tokenHash,
      scope: row.scope,
      status: row.status,
      expiresAt: row.expiresAt ? iso(row.expiresAt) : undefined,
      allowExport: row.allowExport,
      createdAt: iso(row.createdAt)
    };
  },

  async listShareLinks(workspaceId: string): Promise<ShareLinkRecord[]> {
    const rows = await prisma.shareLink.findMany({ where: { workspaceId } });
    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspaceId,
      boardId: row.boardId ?? undefined,
      createdByUserId: row.createdByUserId ?? "",
      tokenHash: row.tokenHash,
      scope: row.scope,
      status: row.status,
      expiresAt: row.expiresAt ? iso(row.expiresAt) : undefined,
      allowExport: row.allowExport,
      createdAt: iso(row.createdAt)
    }));
  },

  async createExportJob(input: Omit<ExportJobRecord, "id" | "createdAt">): Promise<ExportJobRecord> {
    const row = await prisma.exportJob.create({
      data: {
        workspaceId: input.workspaceId,
        boardId: input.boardId,
        requestedById: input.requestedByUserId,
        format: input.format,
        status: toExportStatus(input.status),
        artifactPreview: input.artifactPreview,
        artifactMimeType: input.artifactMimeType,
        artifactFilename: input.artifactFilename
      }
    });
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      boardId: row.boardId,
      requestedByUserId: row.requestedById ?? undefined,
      format: row.format,
      status: mapExportStatus(row.status),
      artifactPreview: row.artifactPreview ?? undefined,
      artifactMimeType: row.artifactMimeType ?? undefined,
      artifactFilename: row.artifactFilename ?? undefined,
      createdAt: iso(row.createdAt)
    };
  },

  async listExportJobs(workspaceId: string): Promise<ExportJobRecord[]> {
    const rows = await prisma.exportJob.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspaceId,
      boardId: row.boardId,
      requestedByUserId: row.requestedById ?? undefined,
      format: row.format,
      status: mapExportStatus(row.status),
      artifactPreview: row.artifactPreview ?? undefined,
      artifactMimeType: row.artifactMimeType ?? undefined,
      artifactFilename: row.artifactFilename ?? undefined,
      createdAt: iso(row.createdAt)
    }));
  },

  async pushSnapshot(input: Omit<SnapshotRecord, "id" | "createdAt">): Promise<SnapshotRecord> {
    const row = await prisma.undoSnapshot.create({
      data: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        previous: input.previous as Prisma.InputJsonValue,
        label: input.label
      }
    });
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      userId: row.userId,
      entityType: input.entityType,
      entityId: row.entityId,
      action: row.action,
      previous: row.previous as Record<string, unknown>,
      label: row.label,
      createdAt: iso(row.createdAt)
    };
  },

  async popSnapshot(workspaceId: string, userId: string): Promise<SnapshotRecord | undefined> {
    const row = await prisma.undoSnapshot.findFirst({
      where: { workspaceId, userId },
      orderBy: { createdAt: "desc" }
    });
    if (!row) return undefined;
    await prisma.undoSnapshot.delete({ where: { id: row.id } });
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      userId: row.userId,
      entityType: row.entityType as SnapshotRecord["entityType"],
      entityId: row.entityId,
      action: row.action,
      previous: row.previous as Record<string, unknown>,
      label: row.label,
      createdAt: iso(row.createdAt)
    };
  },

  async listSnapshots(workspaceId: string, userId: string): Promise<SnapshotRecord[]> {
    const rows = await prisma.undoSnapshot.findMany({
      where: { workspaceId, userId },
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspaceId,
      userId: row.userId,
      entityType: row.entityType as SnapshotRecord["entityType"],
      entityId: row.entityId,
      action: row.action,
      previous: row.previous as Record<string, unknown>,
      label: row.label,
      createdAt: iso(row.createdAt)
    }));
  },

  async logActivity(input: Omit<ActivityLogRecord, "id" | "createdAt">): Promise<void> {
    await prisma.activityLog.create({
      data: {
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId
      }
    });
  },

  async listActivity(workspaceId: string): Promise<ActivityLogRecord[]> {
    const rows = await prisma.activityLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspaceId,
      actorUserId: row.actorUserId ?? undefined,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId ?? undefined,
      createdAt: iso(row.createdAt)
    }));
  }
};
