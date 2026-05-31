import { FlowStepper } from "@/components/flow/FlowStepper";
import { IngestForm } from "@/components/flow/IngestForm";
import { toWorkspaceStepHref, workflowSteps } from "@/components/flow/workflow";
import { PageShell } from "@/components/layout/PageShell";

export const dynamic = "force-dynamic";

type IngestPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function IngestPage({ params }: IngestPageProps) {
  const { workspaceId } = await params;

  return (
    <PageShell
      title="Step 1: Ingest qualitative data"
      description="Paste text or upload a CSV. Personal data is masked by default before anything is stored, and raw input is discarded after extraction."
    >
      <FlowStepper
        currentHref={toWorkspaceStepHref(workspaceId, "ingest")}
        steps={workflowSteps.map((step) => ({
          label: step.label,
          href: toWorkspaceStepHref(workspaceId, step.slug)
        }))}
      />
      <IngestForm workspaceId={workspaceId} />
    </PageShell>
  );
}
