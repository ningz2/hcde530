import { hexForToken } from "@/lib/color/palette";
import { repo, type HierarchyMode, type ThemeRecord } from "@/lib/repo/store";

export type BoardAssignmentView = {
  codeId: string;
  code: string;
  quote?: string;
  memo?: string;
  rationale: string;
  piiMasked: boolean;
  participantLabel: string;
  participantHex: string;
};

export type BoardThemeView = {
  id: string;
  title: string;
  description?: string;
  /** Distinct participants in this theme: rendered as the "mentioned by N" badge. */
  mentionCount: number;
  /** 0..1 cross-mention emphasis ratio: rendered as stronger color density. */
  colorDensity: number;
  assignments: BoardAssignmentView[];
};

/** A node in the affinity hierarchy (research question / theme / group). */
export type BoardNode = {
  id: string;
  title: string;
  description?: string;
  level: number;
  mentionCount: number;
  colorDensity: number;
  /** Codes live on leaf nodes (groups). */
  assignments: BoardAssignmentView[];
  children: BoardNode[];
};

export type BoardView = {
  workspaceId: string;
  workspaceName?: string;
  board?: {
    id: string;
    name: string;
    hierarchyDepth: number;
    hierarchyMode: HierarchyMode;
    groupGranularity: number;
    themeGranularity: number;
  };
  codeCount: number;
  /** Flat list of leaf groups (with codes) — used by export and simple views. */
  themes: BoardThemeView[];
  /** Full hierarchy for the canvas (roots -> ... -> leaf groups). */
  tree: BoardNode[];
};

const REDACTED = "[hidden: contains unmasked identifiers]";

/**
 * Builds the read model rendered by the board page (server component).
 *
 * When `redactUnmasked` is set (anonymous share viewers), any code that was
 * stored without anonymization is hidden so raw identifiers are never exposed
 * through a view-only link.
 */
export function getBoardView(workspaceId: string, options?: { redactUnmasked?: boolean }): BoardView {
  const redactUnmasked = options?.redactUnmasked ?? false;
  const workspace = repo.getWorkspace(workspaceId);
  const codes = repo.listCodes(workspaceId);
  const participants = new Map(repo.listParticipants(workspaceId).map((p) => [p.id, p]));
  const codeById = new Map(codes.map((c) => [c.id, c]));
  const board = repo.latestBoard(workspaceId);

  if (!board) {
    return {
      workspaceId,
      workspaceName: workspace?.name,
      codeCount: codes.length,
      themes: [],
      tree: []
    };
  }

  const allThemes = repo.listThemes(board.id);

  const assignmentsFor = (themeId: string): BoardAssignmentView[] =>
    repo
      .listAssignmentsByTheme(themeId)
      .map((assignment): BoardAssignmentView | undefined => {
        const item = codeById.get(assignment.codeId);
        if (!item) return undefined;
        const participant = participants.get(item.participantId);
        const hideRaw = redactUnmasked && !item.piiMasked;
        return {
          codeId: item.id,
          code: hideRaw ? REDACTED : item.code,
          quote: hideRaw ? undefined : item.quote,
          memo: hideRaw ? undefined : item.memo,
          rationale: assignment.rationale,
          piiMasked: item.piiMasked,
          participantLabel: participant?.anonymizedLabel ?? "Unknown",
          participantHex: hexForToken(participant?.colorToken ?? "")
        };
      })
      .filter((a): a is BoardAssignmentView => a !== undefined);

  const childrenOf = new Map<string | undefined, ThemeRecord[]>();
  for (const theme of allThemes) {
    const list = childrenOf.get(theme.parentThemeId) ?? [];
    list.push(theme);
    childrenOf.set(theme.parentThemeId, list);
  }

  const buildNode = (theme: ThemeRecord): BoardNode => ({
    id: theme.id,
    title: theme.title,
    description: theme.description,
    level: theme.level,
    mentionCount: theme.participantCount,
    colorDensity: theme.mentionDensity,
    assignments: assignmentsFor(theme.id),
    children: (childrenOf.get(theme.id) ?? []).map(buildNode)
  });

  const tree = (childrenOf.get(undefined) ?? []).map(buildNode);

  // Leaf groups (themes that actually carry codes) for export/back-compat.
  const themes: BoardThemeView[] = allThemes
    .map((theme) => ({
      id: theme.id,
      title: theme.title,
      description: theme.description,
      mentionCount: theme.participantCount,
      colorDensity: theme.mentionDensity,
      assignments: assignmentsFor(theme.id)
    }))
    .filter((t) => t.assignments.length > 0);

  return {
    workspaceId,
    workspaceName: workspace?.name,
    board: {
      id: board.id,
      name: board.name,
      hierarchyDepth: board.hierarchyDepth,
      hierarchyMode: board.hierarchyMode,
      groupGranularity: board.groupGranularity,
      themeGranularity: board.themeGranularity
    },
    codeCount: codes.length,
    themes,
    tree
  };
}
