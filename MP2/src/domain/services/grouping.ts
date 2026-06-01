import { repo, type CodeRecord, type HierarchyMode, type ThemeRecord } from "@/lib/repo/store";
import {
  clusterByKeywords,
  keywordName,
  keywordOverlap,
  tokenize,
  type Cluster
} from "@/domain/services/clustering";
import { nameClustersWithAI, type NamedCluster } from "@/lib/ai/naming";

export type GenerateBoardResult = {
  boardId: string;
  themeCount: number;
  assignmentCount: number;
};

export type GenerateBoardParams = {
  workspaceId: string;
  boardName: string;
  hierarchyMode?: HierarchyMode;
  groupGranularity?: number;
  themeGranularity?: number;
};

/** Sensible default granularity derived from how many codes exist. */
export function defaultGranularity(codeCount: number): { groups: number; themes: number } {
  const groups = Math.max(2, Math.min(6, Math.round(Math.sqrt(Math.max(codeCount, 1)))));
  const themes = Math.max(1, Math.min(4, Math.ceil(groups / 2)));
  return { groups: codeCount <= 2 ? Math.max(codeCount, 1) : groups, themes };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function modeDepth(mode: HierarchyMode): number {
  return mode === "GROUPS" ? 1 : mode === "THEMES" ? 2 : 3;
}

function combinedText(code: CodeRecord): string {
  return [code.code, code.quote, code.memo].filter(Boolean).join(" ");
}

function rationaleFor(code: CodeRecord, themeTitle: string): string {
  return `Grouped under "${themeTitle}" because it shares language with related codes.`;
}

/** Resolve names for clusters: AI when available, keyword-derived otherwise. */
async function resolveNames(
  inputs: { keywords: string[]; samples: string[] }[],
  researchQuestions?: string[]
): Promise<NamedCluster[]> {
  const ai = await nameClustersWithAI(inputs, { researchQuestions });
  if (ai) return ai;
  return inputs.map((input, index) => ({
    title: keywordName(input.keywords, index),
    description: input.keywords.length
      ? `Codes about ${input.keywords.slice(0, 3).join(", ")}.`
      : "Related codes grouped together (editable)."
  }));
}

/**
 * Build a *real* persisted affinity board.
 *
 * Clustering is deterministic keyword grouping; AI (optional) names the groups
 * and themes. The board is organized per `hierarchyMode`:
 *  - GROUPS: flat named groups (level 1), codes assigned to each group.
 *  - THEMES: groups (level 2) nested under named themes (level 1).
 *  - RQS:    themes (level 2) nested under research questions (level 1),
 *            with groups (level 3) under each theme.
 * One board per workspace: regenerating replaces the prior board.
 */
export async function generateBoard(params: GenerateBoardParams): Promise<GenerateBoardResult> {
  const mode: HierarchyMode = params.hierarchyMode ?? "GROUPS";
  const codes = repo.listCodes(params.workspaceId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const workspace = repo.getWorkspace(params.workspaceId);

  repo.clearBoards(params.workspaceId);

  const defaults = defaultGranularity(codes.length);
  const groupTarget = clamp(params.groupGranularity ?? defaults.groups, 1, Math.max(codes.length, 1));
  const themeTarget = clamp(params.themeGranularity ?? defaults.themes, 1, groupTarget);

  const board = repo.createBoard({
    workspaceId: params.workspaceId,
    name: params.boardName,
    hierarchyDepth: modeDepth(mode),
    hierarchyMode: mode,
    groupGranularity: groupTarget,
    themeGranularity: themeTarget
  });

  if (codes.length === 0) {
    return { boardId: board.id, themeCount: 0, assignmentCount: 0 };
  }

  const codeById = new Map(codes.map((c) => [c.id, c]));
  const parentOf = new Map<string, string | undefined>();
  const create = (
    title: string,
    description: string | undefined,
    level: number,
    parentThemeId?: string
  ): ThemeRecord => {
    const theme = repo.createTheme({
      boardId: board.id,
      parentThemeId,
      level,
      title,
      description,
      participantCount: 0,
      mentionDensity: 0,
      state: "ACTIVE"
    });
    parentOf.set(theme.id, parentThemeId);
    return theme;
  };

  // 1) Cluster codes into leaf groups and name them.
  const leafClusters = clusterByKeywords(
    codes.map((c) => ({ id: c.id, text: combinedText(c) })),
    groupTarget
  );
  const leafNames = await resolveNames(
    leafClusters.map((cluster) => ({
      keywords: cluster.keywords,
      samples: cluster.items.map((i) => codeById.get(i.id)?.code ?? "")
    })),
    workspace?.researchQuestions
  );

  // (leaf index) -> created leaf theme id, filled in per mode below.
  const leafThemeIds: string[] = new Array(leafClusters.length);
  const assignmentPairs: { themeId: string; participantId: string }[] = [];
  let assignmentCount = 0;

  const assignLeaf = (leafIndex: number, themeId: string) => {
    leafThemeIds[leafIndex] = themeId;
    for (const item of leafClusters[leafIndex].items) {
      const code = codeById.get(item.id);
      if (!code) continue;
      repo.createAssignment({
        codeId: code.id,
        themeId,
        rationale: rationaleFor(code, leafNames[leafIndex].title)
      });
      assignmentPairs.push({ themeId, participantId: code.participantId });
      assignmentCount += 1;
    }
  };

  if (mode === "GROUPS") {
    leafClusters.forEach((_, i) => {
      const theme = create(leafNames[i].title, leafNames[i].description, 1);
      assignLeaf(i, theme.id);
    });
  } else {
    // Cluster the leaf groups into mid-level themes.
    const groupDocs = leafClusters.map((cluster, i) => ({
      id: String(i),
      text: `${cluster.keywords.join(" ")} ${cluster.items.map((it) => codeById.get(it.id)?.code ?? "").join(" ")}`
    }));
    const themeClusters: Cluster<{ id: string; text: string }>[] = clusterByKeywords(groupDocs, themeTarget);
    const themeNames = await resolveNames(
      themeClusters.map((tc) => ({
        keywords: tc.keywords,
        samples: tc.items.map((gd) => leafNames[Number(gd.id)].title)
      })),
      workspace?.researchQuestions
    );

    if (mode === "THEMES") {
      themeClusters.forEach((tc, ti) => {
        const parent = create(themeNames[ti].title, themeNames[ti].description, 1);
        for (const gd of tc.items) {
          const i = Number(gd.id);
          const leaf = create(leafNames[i].title, leafNames[i].description, 2, parent.id);
          assignLeaf(i, leaf.id);
        }
      });
    } else {
      // RQS: research questions are the top level.
      const rqs =
        workspace?.researchQuestions && workspace.researchQuestions.length > 0
          ? workspace.researchQuestions
          : ["All research questions"];
      const rqTokens = rqs.map((q) => tokenize(q));
      const rqNodes = rqs.map((q) => create(q, "Research question", 1));

      themeClusters.forEach((tc, ti) => {
        let bestRq = 0;
        let bestScore = -1;
        rqTokens.forEach((tokens, qi) => {
          const score = keywordOverlap(tc.keywords, tokens);
          if (score > bestScore) {
            bestScore = score;
            bestRq = qi;
          }
        });
        if (bestScore <= 0) bestRq = ti % rqs.length;

        const parent = create(themeNames[ti].title, themeNames[ti].description, 2, rqNodes[bestRq].id);
        for (const gd of tc.items) {
          const i = Number(gd.id);
          const leaf = create(leafNames[i].title, leafNames[i].description, 3, parent.id);
          assignLeaf(i, leaf.id);
        }
      });
    }
  }

  // 2) Participant aggregation for the "mentioned by N" badge + color density.
  const totalParticipants = Math.max(repo.listParticipants(params.workspaceId).length, 1);
  const participantsByTheme = new Map<string, Set<string>>();
  for (const pair of assignmentPairs) {
    let cursor: string | undefined = pair.themeId;
    while (cursor) {
      const set = participantsByTheme.get(cursor) ?? new Set<string>();
      set.add(pair.participantId);
      participantsByTheme.set(cursor, set);
      cursor = parentOf.get(cursor);
    }
  }

  for (const theme of repo.listThemes(board.id)) {
    const count = participantsByTheme.get(theme.id)?.size ?? 0;
    repo.updateTheme(theme.id, {
      participantCount: count,
      mentionDensity: Math.min(count / totalParticipants, 1)
    });
  }

  return {
    boardId: board.id,
    themeCount: leafThemeIds.filter(Boolean).length,
    assignmentCount
  };
}
