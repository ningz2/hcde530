export const workflowSteps = [
  { slug: "ingest", label: "Ingest" },
  { slug: "anonymization", label: "Consent" },
  { slug: "strategy", label: "Strategy" },
  { slug: "board", label: "Affinity Board" },
  { slug: "export-share", label: "Export & Share" },
  { slug: "history", label: "History" }
] as const;

export function toWorkspaceStepHref(workspaceId: string, slug: (typeof workflowSteps)[number]["slug"]): string {
  return `/workspaces/${workspaceId}/${slug}`;
}
