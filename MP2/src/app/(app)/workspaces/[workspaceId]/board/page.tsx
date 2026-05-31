import { BoardClient } from "@/components/flow/BoardClient";
import { FlowStepper } from "@/components/flow/FlowStepper";
import { toWorkspaceStepHref, workflowSteps } from "@/components/flow/workflow";
import { PageShell } from "@/components/layout/PageShell";
import { getBoardView } from "@/domain/services/boardView";

export const dynamic = "force-dynamic";

type BoardPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function BoardPage({ params }: BoardPageProps) {
  const { workspaceId } = await params;
  const view = getBoardView(workspaceId);

  return (
    <PageShell
      title="Step 4: Affinity board"
      description="AI-suggested themes with per-assignment rationale and participant-aware colors. Rename themes inline; undo is per session."
    >
      <FlowStepper
        currentHref={toWorkspaceStepHref(workspaceId, "board")}
        steps={workflowSteps.map((step) => ({
          label: step.label,
          href: toWorkspaceStepHref(workspaceId, step.slug)
        }))}
      />
      <BoardClient view={view} />
    </PageShell>
  );
}
