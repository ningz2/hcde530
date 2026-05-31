import { BoardClient } from "@/components/flow/BoardClient";
import { StepFooter } from "@/components/flow/StepFooter";
import { WizardProgress } from "@/components/flow/WizardProgress";
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
      title="Affinity board"
      description="Suggested themes grouping your codes, with a one-line reason per code and participant colors. Rename themes inline; undo is per session."
    >
      <WizardProgress current="board" />
      <BoardClient view={view} />
      <StepFooter workspaceId={workspaceId} current="board" continueLabel="Continue to export & share" />
    </PageShell>
  );
}
