import { repo } from "@/lib/repo/store";

export type GenerateBoardResult = {
  boardId: string;
  themeCount: number;
  assignmentCount: number;
};

/**
 * Deterministic stand-in for the Anthropic grouping call.
 *
 * It produces a *real* persisted board: Theme + Assignment records, each
 * assignment carrying a one-sentence rationale (a hard requirement of the AI
 * workflow). The clustering itself is a simple stable round-robin so the slice
 * is reproducible and testable; the real model swaps in behind this function.
 */
export function generateBoard(params: {
  workspaceId: string;
  boardName: string;
  hierarchyDepth: number;
}): GenerateBoardResult {
  const codes = repo
    .listCodes(params.workspaceId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // One board per workspace in this slice: replace any prior board.
  repo.clearBoards(params.workspaceId);

  const board = repo.createBoard({
    workspaceId: params.workspaceId,
    name: params.boardName,
    hierarchyDepth: params.hierarchyDepth
  });

  if (codes.length === 0) {
    return { boardId: board.id, themeCount: 0, assignmentCount: 0 };
  }

  const totalParticipants = Math.max(repo.listParticipants(params.workspaceId).length, 1);
  const themeCount = Math.min(3, codes.length);
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

  codes.forEach((item, index) => {
    const theme = themes[index % themeCount];

    repo.createAssignment({
      codeId: item.id,
      themeId: theme.id,
      rationale: `Code "${item.code}" grouped under ${theme.title} with related codes.`
    });
    assignmentCount += 1;

    const set = participantsByTheme.get(theme.id) ?? new Set<string>();
    set.add(item.participantId);
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
