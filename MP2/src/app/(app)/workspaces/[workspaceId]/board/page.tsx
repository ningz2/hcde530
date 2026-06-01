import Link from "next/link";
import { BoardClient } from "@/components/flow/BoardClient";
import { ExportShareClient } from "@/components/flow/ExportShareClient";
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
      description="Your codes grouped into themes as colored sticky notes (colored by participant). Rename themes inline; undo is per session."
    >
      <WizardProgress current="board" />
      <BoardClient view={view} />

      <section style={panel}>
        <h2 style={panelTitle}>Export & share (optional)</h2>
        <p style={panelHint}>
          Download your board or create an anonymous view-only link. This is optional — your board is
          the finished result.
        </p>
        <ExportShareClient workspaceId={workspaceId} />
      </section>

      <p style={{ marginTop: "1.25rem", fontSize: 13 }}>
        <Link href={`/workspaces/${workspaceId}/history`} style={{ color: "#6b7280" }}>
          View activity &amp; undo history →
        </Link>
      </p>
    </PageShell>
  );
}

const panel: React.CSSProperties = {
  marginTop: "2rem",
  paddingTop: "1.25rem",
  borderTop: "1px solid #eef0f3"
};

const panelTitle: React.CSSProperties = { margin: "0 0 0.25rem", fontSize: "1.05rem" };
const panelHint: React.CSSProperties = { margin: "0 0 0.75rem", color: "#6b7280", fontSize: 13 };
