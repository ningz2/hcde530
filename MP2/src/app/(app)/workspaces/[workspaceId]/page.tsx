import { redirect } from "next/navigation";

type WorkspaceIndexPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function WorkspaceIndexPage({ params }: WorkspaceIndexPageProps) {
  const { workspaceId } = await params;
  redirect(`/workspaces/${workspaceId}/ingest`);
}
