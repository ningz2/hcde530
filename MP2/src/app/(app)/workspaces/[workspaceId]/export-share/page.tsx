import { ExportShareClient } from "@/components/flow/ExportShareClient";
import { StepFooter } from "@/components/flow/StepFooter";
import { WizardProgress } from "@/components/flow/WizardProgress";
import { PageShell } from "@/components/layout/PageShell";

export const dynamic = "force-dynamic";

type ExportSharePageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function ExportSharePage({ params }: ExportSharePageProps) {
  const { workspaceId } = await params;

  return (
    <PageShell
      title="Export & share"
      description="Download CSV/PDF/FigJam (available to everyone on the project), or create an anonymous view-only link."
    >
      <WizardProgress current="export-share" />
      <ExportShareClient workspaceId={workspaceId} />
      <StepFooter workspaceId={workspaceId} current="export-share" continueLabel="Continue to activity" />
    </PageShell>
  );
}
