import { StepFooter } from "@/components/flow/StepFooter";
import { WizardProgress } from "@/components/flow/WizardProgress";
import { PageShell } from "@/components/layout/PageShell";

export const dynamic = "force-dynamic";

type StrategyPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function StrategyPage({ params }: StrategyPageProps) {
  const { workspaceId } = await params;

  return (
    <PageShell
      title="Set up grouping"
      description="Tell the assistant your research question and goals so it can suggest how to group quotes into themes."
    >
      <WizardProgress current="strategy" />
      <p style={{ color: "#6b7280" }}>
        Strategy setup is still a scaffold. For now you can continue and generate a board with default
        grouping.
      </p>
      <StepFooter workspaceId={workspaceId} current="strategy" continueLabel="Continue to the board" />
    </PageShell>
  );
}
