import { notFound } from "next/navigation";
import { UploadDataForm } from "@/components/flow/UploadDataForm";
import { WizardProgress } from "@/components/flow/WizardProgress";
import { PageShell } from "@/components/layout/PageShell";
import { repo } from "@/lib/repo/store";

export const dynamic = "force-dynamic";

type IngestPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function IngestPage({ params }: IngestPageProps) {
  const { workspaceId } = await params;
  if (!(await repo.getWorkspace(workspaceId))) {
    notFound();
  }

  return (
    <PageShell
      title="Add more data"
      description="Add additional data to this project. You'll confirm privacy options next."
    >
      <WizardProgress current="ingest" />
      <UploadDataForm mode="existing" workspaceId={workspaceId} />
    </PageShell>
  );
}
