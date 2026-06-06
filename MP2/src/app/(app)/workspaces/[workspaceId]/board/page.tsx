import Link from "next/link";
import { BoardClient } from "@/components/flow/BoardClient";
import { ExportShareMenu } from "@/components/flow/ExportShareMenu";
import { WizardProgress } from "@/components/flow/WizardProgress";
import { getBoardView } from "@/domain/services/boardView";
import { generateBoard } from "@/domain/services/grouping";

export const dynamic = "force-dynamic";

type BoardPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function BoardPage({ params }: BoardPageProps) {
  const { workspaceId } = await params;
  let view = getBoardView(workspaceId);

  // Skip the old strategy step: auto-generate a default grouping the first time
  // someone lands on the board with codes but no board yet.
  if (!view.board && view.codeCount > 0) {
    await generateBoard({ workspaceId, boardName: "Affinity board", hierarchyMode: "GROUPS" });
    view = getBoardView(workspaceId);
  }

  return (
    <main style={{ width: "100%", padding: "1.5rem 1.5rem 2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <header>
          <Link href="/" style={{ textDecoration: "none", color: "#1d4ed8", fontSize: 14 }}>
            AffinityFlow
          </Link>
          <h1 style={{ margin: "0.5rem 0 0.25rem", fontSize: "1.6rem" }}>Affinity board</h1>
          <p style={{ margin: 0, color: "#4b5563", fontSize: 14 }}>
            Codes grouped into colored sticky notes (colored by participant). Rename inline; undo is per
            session. Use the panel on the right to change the hierarchy and granularity.
          </p>
        </header>

        <ExportShareMenu workspaceId={workspaceId} />
      </div>

      <div style={{ margin: "1rem 0" }}>
        <WizardProgress current="board" />
      </div>

      <BoardClient view={view} />

      <p style={{ marginTop: "1rem", fontSize: 13 }}>
        <Link href={`/workspaces/${workspaceId}/history`} style={{ color: "#6b7280" }}>
          View activity &amp; undo history →
        </Link>
      </p>
    </main>
  );
}
