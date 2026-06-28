import Link from "next/link";
import { BoardClient } from "@/components/flow/BoardClient";
import { ExportShareMenu } from "@/components/flow/ExportShareMenu";
import { getBoardView } from "@/domain/services/boardView";
import { generateBoard } from "@/domain/services/grouping";

export const dynamic = "force-dynamic";

type BoardPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function BoardPage({ params }: BoardPageProps) {
  const { workspaceId } = await params;
  let view = await getBoardView(workspaceId);

  if (!view.board && view.codeCount > 0) {
    await generateBoard({ workspaceId, boardName: "Affinity board", hierarchyMode: "GROUPS" });
    view = await getBoardView(workspaceId);
  }

  const projectName = view.workspaceName ?? "Project";

  return (
    <div className="board-workspace">
      <header className="board-toolbar">
        <span className="breadcrumb">
          {projectName} / <strong>Organize board</strong>
        </span>
        <span className="board-meta">
          {view.codeCount} codes · {view.themes.length} groups
        </span>
        <div className="board-toolbar-actions">
          <Link href={`/workspaces/${workspaceId}/history`} className="btn btn-quiet">
            Activity
          </Link>
          <ExportShareMenu workspaceId={workspaceId} />
        </div>
      </header>

      <BoardClient view={view} />
    </div>
  );
}
