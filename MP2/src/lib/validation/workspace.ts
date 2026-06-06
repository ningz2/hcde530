import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email(),
  displayName: z.string().max(120).optional(),
  provider: z.enum(["EMAIL_PASSWORD", "GOOGLE"]).default("EMAIL_PASSWORD")
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(120),
  researchQuestion: z.string().max(2000).optional(),
  researchQuestions: z.array(z.string().min(1).max(2000)).max(20).optional(),
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
  filename: z.string().max(255).optional()
});

// Consent is its own step after data is confirmed; masking defaults ON.
export const anonymizationDecisionSchema = z.object({
  applyMasking: z.boolean().default(true)
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
  hierarchyDepth: z.number().int().min(1).max(5).default(2),
  hierarchyMode: z.enum(["GROUPS", "THEMES", "RQS"]).default("GROUPS"),
  // Granularity sliders: target counts for leaf groups and mid-level themes.
  groupGranularity: z.number().int().min(1).max(12).optional(),
  themeGranularity: z.number().int().min(1).max(8).optional()
});

export const themeUpdateSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional()
});

export const exportCreateSchema = z.object({
  boardId: z.string().min(1).optional(),
  format: z.enum(["CSV", "PDF", "FIGJAM"])
});
