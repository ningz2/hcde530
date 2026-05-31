import { repo } from "@/lib/repo/store";

export type GenerateBoardResult = {
  boardId: string;
  themeCount: number;
  assignmentCount: number;
};

/**
 * Deterministic stand-in for the Anthropic grouping call.
 *
 * It produces a *real* persisted board: Theme + QuoteAssignment records, each
 * assignment carrying a one-sentence rationale (a hard requirement of the AI
 * workflow). The clustering itself is a simple stable round-robin so the slice
 * is reproducible and testable; the real model swaps in behind this function.
 */
export function generateBoard(params: {
  workspaceId: string;
  boardName: string;
  hierarchyDepth: number;
}): GenerateBoardResult {
  const quotes = repo
    .listQuotes(params.workspaceId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // One board per workspace in this slice: replace any prior board.
  repo.clearBoards(params.workspaceId);

  const board = repo.createBoard({
    workspaceId: params.workspaceId,
    name: params.boardName,
    hierarchyDepth: params.hierarchyDepth
  });

  if (quotes.length === 0) {
    return { boardId: board.id, themeCount: 0, assignmentCount: 0 };
  }

  const totalParticipants = Math.max(repo.listParticipants(params.workspaceId).length, 1);
  const themeCount = Math.min(3, quotes.length);
  const themes = Array.from({ length: themeCount }, (_, index) =>
    repo.createTheme({
      boardId: board.id,
      level: 1,
      title: `Theme ${index + 1}`,
      description: "AI-suggested grouping (editable).",
      participantCount: 0,
      mentionDensity: 0,
      state: "ACTIVE"
    })
  );

  const participantsByTheme = new Map<string, Set<string>>();
  let assignmentCount = 0;

  quotes.forEach((quote, index) => {
    const theme = themes[index % themeCount];
    const snippet = quote.content.split(/\s+/).slice(0, 4).join(" ");

    repo.createAssignment({
      quoteId: quote.id,
      themeId: theme.id,
      rationale: `Mentions "${snippet}…"; grouped under ${theme.title} with related quotes.`
    });
    assignmentCount += 1;

    const set = participantsByTheme.get(theme.id) ?? new Set<string>();
    set.add(quote.participantId);
    participantsByTheme.set(theme.id, set);
  });

  for (const theme of themes) {
    const participantCount = participantsByTheme.get(theme.id)?.size ?? 0;
    // Cross-mention emphasis: ratio of this theme's participants to all participants.
    const mentionDensity = Math.min(participantCount / totalParticipants, 1);
    repo.updateTheme(theme.id, { participantCount, mentionDensity });
  }

  return { boardId: board.id, themeCount, assignmentCount };
}
