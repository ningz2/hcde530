// Step slugs map to route segments and must stay stable; labels are user-facing.
export const workflowSteps = [
  { slug: "ingest", label: "Add data" },
  { slug: "anonymization", label: "Privacy check" },
  { slug: "strategy", label: "Set up grouping" },
  { slug: "board", label: "Affinity board" },
  { slug: "export-share", label: "Export & share" },
  { slug: "history", label: "Activity" }
] as const;

export type StepSlug = (typeof workflowSteps)[number]["slug"];

export function toWorkspaceStepHref(workspaceId: string, slug: StepSlug): string {
  return `/workspaces/${workspaceId}/${slug}`;
}

export function stepIndex(slug: StepSlug): number {
  return workflowSteps.findIndex((step) => step.slug === slug);
}

export function stepLabel(slug: StepSlug): string {
  return workflowSteps.find((step) => step.slug === slug)?.label ?? slug;
}

export const totalSteps = workflowSteps.length;

export function nextStep(slug: StepSlug): (typeof workflowSteps)[number] | null {
  const index = stepIndex(slug);
  return index >= 0 && index < workflowSteps.length - 1 ? workflowSteps[index + 1] : null;
}

export function prevStep(slug: StepSlug): (typeof workflowSteps)[number] | null {
  const index = stepIndex(slug);
  return index > 0 ? workflowSteps[index - 1] : null;
}
