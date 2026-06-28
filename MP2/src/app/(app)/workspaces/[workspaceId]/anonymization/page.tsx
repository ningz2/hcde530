import { notFound } from "next/navigation";
import { ConsentClient } from "@/components/flow/ConsentClient";
import { PageShell } from "@/components/layout/PageShell";
import { repo } from "@/lib/repo/store";

export const dynamic = "force-dynamic";

type AnonymizationPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function AnonymizationPage({ params }: AnonymizationPageProps) {
  const { workspaceId } = await params;
  if (!(await repo.getWorkspace(workspaceId))) {
    notFound();
  }

  const codes = await repo.listCodes(workspaceId);

  return (
    <PageShell
      title="Privacy check"
      description="Decide how to handle personal information. Raw files were already discarded after extraction."
    >
      <ConsentClient workspaceId={workspaceId} codeCount={codes.length} />
    </PageShell>
  );
}
