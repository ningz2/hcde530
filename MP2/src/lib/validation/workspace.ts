import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(120),
  researchQuestion: z.string().max(2000).optional(),
  projectGoal: z.string().max(2000).optional(),
  projectContext: z.string().max(5000).optional(),
  defaultHierarchyDepth: z.number().int().min(1).max(5).default(2),
  groupingDirection: z.enum(["BOTTOM_UP", "TOP_DOWN"]).default("BOTTOM_UP")
});

export const memberInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "EDITOR", "VIEWER"])
});

export const shareLinkCreateSchema = z.object({
  scope: z.enum(["WORKSPACE_VIEW", "BOARD_VIEW"]).default("WORKSPACE_VIEW"),
  boardId: z.string().min(1).optional(),
  expiresAtIso: z.string().datetime().optional(),
  allowExport: z.boolean().default(true)
});

export const ingestSchema = z.object({
  sourceType: z.enum(["CSV", "TXT", "DOC", "DOCX", "PASTED_TEXT"]),
  content: z.string().min(1).max(200000).optional(),
  filename: z.string().max(255).optional(),
  consentAnonymization: z.boolean().default(true),
  optOutAnonymization: z.boolean().default(false)
});

export const strategyCreateSchema = z.object({
  researchQuestion: z.string().min(1).max(2000),
  projectGoal: z.string().min(1).max(2000),
  projectContext: z.string().max(5000).optional(),
  direction: z.enum(["BOTTOM_UP", "TOP_DOWN"]),
  hierarchyDepth: z.number().int().min(1).max(5),
  tone: z.enum(["BALANCED"]).default("BALANCED")
});

export const groupingRunSchema = z.object({
  strategyId: z.string().optional(),
  boardName: z.string().min(1).max(120).default("Affinity board"),
  hierarchyDepth: z.number().int().min(1).max(5).default(2)
});

export const themeUpdateSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional()
});

export const exportCreateSchema = z.object({
  boardId: z.string().min(1).optional(),
  format: z.enum(["CSV", "PDF", "FIGJAM"])
});
