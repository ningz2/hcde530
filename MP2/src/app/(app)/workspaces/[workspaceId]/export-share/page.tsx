import Link from "next/link";
import { ExportShareClient } from "@/components/flow/ExportShareClient";
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
      description="Download CSV/PDF/FigJam (available to everyone on the project), or create an anonymous view-only link. This is optional — the board is the finished result."
    >
      <ExportShareClient workspaceId={workspaceId} />

      <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
        <Link href={`/workspaces/${workspaceId}/board`} className="btn btn-quiet">
          ← Back to the board
        </Link>
      </div>
    </PageShell>
  );
}
