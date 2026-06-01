/**
 * Lightweight keyword clustering used as the deterministic backbone of the
 * affinity grouping. It is intentionally simple and dependency-free so the
 * result is reproducible and testable; AI is layered on top only to *name*
 * the resulting clusters (see grouping.ts).
 */

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "for", "with",
  "is", "are", "was", "were", "be", "been", "it", "this", "that", "these",
  "those", "i", "you", "we", "they", "he", "she", "as", "at", "by", "from",
  "about", "into", "than", "then", "so", "too", "very", "can", "could", "would",
  "should", "will", "just", "not", "no", "yes", "my", "our", "their", "your",
  "me", "us", "them", "his", "her", "its", "do", "did", "does", "had", "has",
  "have", "more", "most", "some", "any", "all", "when", "what", "how", "why",
  "who", "which", "there", "here", "up", "down", "out", "if", "because"
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

export type Clusterable = { id: string; text: string };

export type Cluster<T extends Clusterable> = {
  items: T[];
  /** Keywords most representative of this cluster, most salient first. */
  keywords: string[];
};

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Top keywords within a set of items, by frequency. */
function topKeywords(items: Clusterable[], limit: number): string[] {
  const freq = new Map<string, number>();
  for (const item of items) {
    for (const token of new Set(tokenize(item.text))) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

/** A readable fallback name derived from a cluster's salient keywords. */
export function keywordName(keywords: string[], index: number): string {
  if (keywords.length === 0) {
    return `Group ${index + 1}`;
  }
  return keywords.slice(0, 2).map(titleCase).join(" & ");
}

/**
 * Cluster items into roughly `target` groups using shared keywords.
 *
 * Strategy: bucket by each item's most globally-salient keyword, then merge the
 * smallest buckets together (or split the largest) until we hit the target
 * count. `target` behaves as a soft target bounded by the number of items.
 */
export function clusterByKeywords<T extends Clusterable>(items: T[], target: number): Cluster<T>[] {
  if (items.length === 0) return [];
  const k = Math.max(1, Math.min(target, items.length));

  // Document frequency across the corpus, used to pick each item's lead keyword.
  const df = new Map<string, number>();
  for (const item of items) {
    for (const token of new Set(tokenize(item.text))) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }

  function leadKeyword(item: Clusterable): string {
    const tokens = tokenize(item.text);
    let best: string | undefined;
    let bestScore = -1;
    for (const token of tokens) {
      const score = (df.get(token) ?? 0) * 100 + token.length;
      if (score > bestScore) {
        bestScore = score;
        best = token;
      }
    }
    return best ?? "__misc__";
  }

  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = leadKeyword(item);
    const bucket = buckets.get(key) ?? [];
    bucket.push(item);
    buckets.set(key, bucket);
  }

  let groups: T[][] = [...buckets.values()];

  // Merge smallest groups together until we are at or below the target.
  while (groups.length > k) {
    groups.sort((a, b) => a.length - b.length);
    const smallest = groups.shift()!;
    groups[0] = [...groups[0], ...smallest];
  }

  // Split the largest groups (round-robin) until we reach the target.
  while (groups.length < k) {
    groups.sort((a, b) => b.length - a.length);
    const largest = groups[0];
    if (largest.length < 2) break;
    const left: T[] = [];
    const right: T[] = [];
    largest.forEach((item, i) => (i % 2 === 0 ? left : right).push(item));
    groups[0] = left;
    groups.push(right);
  }

  return groups
    .filter((g) => g.length > 0)
    .map((g) => ({ items: g, keywords: topKeywords(g, 3) }));
}

/** Overlap score between two keyword sets (for assigning themes to RQs etc.). */
export function keywordOverlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.reduce((score, token) => score + (setB.has(token) ? 1 : 0), 0);
}
