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

function maxThemeGranularity(groupTarget: number): number {
  // Affinity hierarchy invariant: themes are broader containers, so there must
  // always be fewer themes than leaf groups whenever themes are present.
  return Math.max(1, groupTarget - 1);
}

function modeDepth(mode: HierarchyMode): number {
  return mode === "GROUPS" ? 1 : mode === "THEMES" ? 2 : 3;
}

function combinedText(code: CodeRecord): string {
  return [code.code, code.quote, code.memo].filter(Boolean).join(" ");
}

function shortEvidence(text?: string): string | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.length > 90 ? `${cleaned.slice(0, 87)}...` : cleaned;
}

/**
 * Assignment rationale should be more than keyword matching. It uses:
 *  - the named group/topic (what bucket it belongs to),
 *  - shared concepts in the surrounding cluster (why related to peers),
 *  - quote/memo evidence when present (interpretive support from the row).
 */
function rationaleFor(code: CodeRecord, themeTitle: string, clusterKeywords: string[]): string {
  const concepts = clusterKeywords.slice(0, 2);
  const quote = shortEvidence(code.quote);
  const memo = shortEvidence(code.memo);

  if (quote && memo) {
    return `Placed in "${themeTitle}" because the code points to ${concepts.join(" and ") || "this topic"}, while the quote ("${quote}") and memo ("${memo}") add evidence for that interpretation.`;
  }
  if (quote) {
    return `Placed in "${themeTitle}" because the code reflects ${concepts.join(" and ") || "this topic"}, and the supporting quote ("${quote}") shows the experience behind it.`;
  }
  if (memo) {
    return `Placed in "${themeTitle}" because the code relates to ${concepts.join(" and ") || "this topic"}, and the memo ("${memo}") explains why it matters.`;
  }

  const codeTokens = tokenize(code.code);
  const shared = concepts.filter((token) => codeTokens.includes(token));
  if (shared.length > 0) {
    return `Placed in "${themeTitle}" because "${code.code}" directly reflects the shared concept ${shared.join(" / ")} in this group.`;
  }

  return `Placed in "${themeTitle}" because its meaning fits the group's broader topic, not only a literal keyword match.`;
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
  const codes = (await repo.listCodes(params.workspaceId)).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
  const workspace = await repo.getWorkspace(params.workspaceId);

  await repo.clearBoards(params.workspaceId);

  const defaults = defaultGranularity(codes.length);
  const groupTarget = clamp(params.groupGranularity ?? defaults.groups, 1, Math.max(codes.length, 1));
  const themeTarget = clamp(
    params.themeGranularity ?? defaults.themes,
    1,
    maxThemeGranularity(groupTarget)
  );

  const board = await repo.createBoard({
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
  const create = async (
    title: string,
    description: string | undefined,
    level: number,
    parentThemeId?: string
  ): Promise<ThemeRecord> => {
    const theme = await repo.createTheme({
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

  const assignLeaf = async (leafIndex: number, themeId: string) => {
    leafThemeIds[leafIndex] = themeId;
    for (const item of leafClusters[leafIndex].items) {
      const code = codeById.get(item.id);
      if (!code) continue;
      await repo.createAssignment({
        codeId: code.id,
        themeId,
        rationale: rationaleFor(code, leafNames[leafIndex].title, leafClusters[leafIndex].keywords)
      });
      assignmentPairs.push({ themeId, participantId: code.participantId });
      assignmentCount += 1;
    }
  };

  if (mode === "GROUPS") {
    for (let i = 0; i < leafClusters.length; i += 1) {
      const theme = await create(leafNames[i].title, leafNames[i].description, 1);
      await assignLeaf(i, theme.id);
    }
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
      for (let ti = 0; ti < themeClusters.length; ti += 1) {
        const tc = themeClusters[ti];
        const parent = await create(themeNames[ti].title, themeNames[ti].description, 1);
        for (const gd of tc.items) {
          const i = Number(gd.id);
          const leaf = await create(leafNames[i].title, leafNames[i].description, 2, parent.id);
          await assignLeaf(i, leaf.id);
        }
      }
    } else {
      // RQS: research questions are the top level.
      const rqs =
        workspace?.researchQuestions && workspace.researchQuestions.length > 0
          ? workspace.researchQuestions
          : ["All research questions"];
      const rqTokens = rqs.map((q) => tokenize(q));
      const rqNodes: ThemeRecord[] = [];
      for (const q of rqs) {
        rqNodes.push(await create(q, "Research question", 1));
      }

      for (let ti = 0; ti < themeClusters.length; ti += 1) {
        const tc = themeClusters[ti];
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

        const parent = await create(themeNames[ti].title, themeNames[ti].description, 2, rqNodes[bestRq].id);
        for (const gd of tc.items) {
          const i = Number(gd.id);
          const leaf = await create(leafNames[i].title, leafNames[i].description, 3, parent.id);
          await assignLeaf(i, leaf.id);
        }
      }
    }
  }

  // 2) Participant aggregation for the "mentioned by N" badge + color density.
  const totalParticipants = Math.max((await repo.listParticipants(params.workspaceId)).length, 1);
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

  for (const theme of await repo.listThemes(board.id)) {
    const count = participantsByTheme.get(theme.id)?.size ?? 0;
    await repo.updateTheme(theme.id, {
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
