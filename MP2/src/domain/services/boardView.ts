import { hexForToken } from "@/lib/color/palette";
import { repo } from "@/lib/repo/store";

export type BoardAssignmentView = {
  quoteId: string;
  content: string;
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
  quoteCount: number;
  themes: BoardThemeView[];
};

/**
 * Builds the read model rendered by the board page (server component).
 *
 * When `redactUnmasked` is set (anonymous share viewers), any quote that was
 * stored without anonymization is hidden so raw identifiers are never exposed
 * through a view-only link.
 */
export function getBoardView(workspaceId: string, options?: { redactUnmasked?: boolean }): BoardView {
  const redactUnmasked = options?.redactUnmasked ?? false;
  const workspace = repo.getWorkspace(workspaceId);
  const quotes = repo.listQuotes(workspaceId);
  const participants = new Map(repo.listParticipants(workspaceId).map((p) => [p.id, p]));
  const quoteById = new Map(quotes.map((q) => [q.id, q]));
  const board = repo.latestBoard(workspaceId);

  if (!board) {
    return {
      workspaceId,
      workspaceName: workspace?.name,
      quoteCount: quotes.length,
      themes: []
    };
  }

  const themes = repo.listThemes(board.id).map((theme) => {
    const assignments = repo
      .listAssignmentsByTheme(theme.id)
      .map((assignment): BoardAssignmentView | undefined => {
        const quote = quoteById.get(assignment.quoteId);
        if (!quote) {
          return undefined;
        }
        const participant = participants.get(quote.participantId);
        const hideRaw = redactUnmasked && !quote.piiMasked;
        return {
          quoteId: quote.id,
          content: hideRaw ? "[hidden: contains unmasked identifiers]" : quote.content,
          rationale: assignment.rationale,
          piiMasked: quote.piiMasked,
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
    quoteCount: quotes.length,
    themes
  };
}
