import { ExportShareClient } from "@/components/flow/ExportShareClient";
import { FlowStepper } from "@/components/flow/FlowStepper";
import { toWorkspaceStepHref, workflowSteps } from "@/components/flow/workflow";
import { PageShell } from "@/components/layout/PageShell";

export const dynamic = "force-dynamic";

type ExportSharePageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function ExportSharePage({ params }: ExportSharePageProps) {
  const { workspaceId } = await params;

  return (
    <PageShell
      title="Step 5: Export and share"
      description="Exports (CSV/PDF/FigJam) are available to all workspace roles. Anonymous links remain strictly view-only."
    >
      <FlowStepper
        currentHref={toWorkspaceStepHref(workspaceId, "export-share")}
        steps={workflowSteps.map((step) => ({
          label: step.label,
          href: toWorkspaceStepHref(workspaceId, step.slug)
        }))}
      />
      <ExportShareClient workspaceId={workspaceId} />
    </PageShell>
  );
}
