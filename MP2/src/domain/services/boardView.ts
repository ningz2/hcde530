import { hexForToken } from "@/lib/color/palette";
import { repo } from "@/lib/repo/store";

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

export type BoardView = {
  workspaceId: string;
  workspaceName?: string;
  board?: { id: string; name: string; hierarchyDepth: number };
  codeCount: number;
  themes: BoardThemeView[];
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
      themes: []
    };
  }

  const themes = repo.listThemes(board.id).map((theme) => {
    const assignments = repo
      .listAssignmentsByTheme(theme.id)
      .map((assignment): BoardAssignmentView | undefined => {
        const item = codeById.get(assignment.codeId);
        if (!item) {
          return undefined;
        }
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

    return {
      id: theme.id,
      title: theme.title,
      description: theme.description,
      mentionCount: theme.participantCount,
      colorDensity: theme.mentionDensity,
      assignments
    };
  });

  return {
    workspaceId,
    workspaceName: workspace?.name,
    board: { id: board.id, name: board.name, hierarchyDepth: board.hierarchyDepth },
    codeCount: codes.length,
    themes
  };
}
