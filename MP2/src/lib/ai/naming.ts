/**
 * AI naming for affinity groups/themes.
 *
 * Clustering is deterministic (see clustering.ts); this module asks Anthropic to
 * turn each cluster into a concise, scannable theme name + one-line description.
 * It is strictly optional: with no ANTHROPIC_API_KEY (tests, local dev, CI) or
 * on any error it returns null and the caller uses keyword-derived names.
 */

export type NameInput = {
  /** Representative keywords for the cluster. */
  keywords: string[];
  /** A few example code labels from the cluster, for context. */
  samples: string[];
};

export type NamedCluster = { title: string; description: string };

export async function nameClustersWithAI(
  clusters: NameInput[],
  context?: { researchQuestions?: string[] }
): Promise<NamedCluster[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || clusters.length === 0) {
    return null;
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const rqLine = context?.researchQuestions?.length
      ? `Research questions guiding this study:\n${context.researchQuestions.map((q) => `- ${q}`).join("\n")}\n\n`
      : "";

    const clusterText = clusters
      .map(
        (c, i) =>
          `Cluster ${i + 1}: keywords [${c.keywords.join(", ")}]; examples: ${c.samples
            .slice(0, 6)
            .map((s) => `"${s}"`)
            .join(", ")}`
      )
      .join("\n");

    const prompt =
      `${rqLine}You are helping a UX researcher build an affinity diagram. ` +
      `For each cluster of codes below, produce a short theme name (2-5 words, balanced and methodologically sound) ` +
      `and a one-sentence description. Return ONLY JSON: an array of objects ` +
      `{"title": string, "description": string} in the same order as the clusters.\n\n${clusterText}`;

    const response = await client.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    });

    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();

    const json = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
    const parsed = JSON.parse(json) as NamedCluster[];

    if (!Array.isArray(parsed) || parsed.length !== clusters.length) {
      return null;
    }
    return parsed.map((p) => ({
      title: String(p.title ?? "").slice(0, 120),
      description: String(p.description ?? "").slice(0, 500)
    }));
  } catch {
    // Any failure (no network, bad key, malformed output) falls back to keywords.
    return null;
  }
}
