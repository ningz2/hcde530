import { notFound } from "next/navigation";
import { UploadDataSetup } from "@/components/flow/UploadDataSetup";
import { repo } from "@/lib/repo/store";

export const dynamic = "force-dynamic";

const FORM_ID = "ingest-data-form";

type IngestPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function IngestPage({ params }: IngestPageProps) {
  const { workspaceId } = await params;
  if (!(await repo.getWorkspace(workspaceId))) {
    notFound();
  }

  return (
    <UploadDataSetup
      title="Add more data"
      description="Upload additional codes to this project. You'll review privacy options before returning to the board."
      mode="existing"
      workspaceId={workspaceId}
      formId={FORM_ID}
    />
  );
}
