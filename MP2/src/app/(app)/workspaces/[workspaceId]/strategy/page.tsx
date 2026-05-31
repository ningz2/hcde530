import { FlowStepper } from "@/components/flow/FlowStepper";
import { toWorkspaceStepHref, workflowSteps } from "@/components/flow/workflow";
import { PageShell } from "@/components/layout/PageShell";

type StrategyPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function StrategyPage({ params }: StrategyPageProps) {
  const { workspaceId } = await params;

  return (
    <PageShell
      title="Step 3: Strategy setup"
      description="Collect research questions, goals, and context first; then generate balanced grouping strategies with depth controls."
    >
      <FlowStepper
        currentHref={toWorkspaceStepHref(workspaceId, "strategy")}
        steps={workflowSteps.map((step) => ({
          label: step.label,
          href: toWorkspaceStepHref(workspaceId, step.slug)
        }))}
      />
      <p>
        API scaffold: <code>/api/workspaces/[workspaceId]/strategy</code>.
      </p>
    </PageShell>
  );
}
