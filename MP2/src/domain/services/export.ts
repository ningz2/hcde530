import { getBoardView } from "@/domain/services/boardView";
import { ApiError } from "@/lib/errors/types";
import { repo, type ExportFormat, type ExportJobRecord } from "@/lib/repo/store";

/**
 * Export scaffolds for the three v1 formats.
 *
 * CSV is generated synchronously from the current board (status READY with an
 * inline preview). PDF and FigJam are contract stubs that enqueue a job (status
 * QUEUED) for a future async worker. All three are available to every workspace
 * role; anonymous view-only links are blocked at the route layer.
 */
export function requestExport(params: {
  workspaceId: string;
  requestedByUserId?: string;
  format: ExportFormat;
}): ExportJobRecord {
  const board = repo.latestBoard(params.workspaceId);
  if (!board) {
    throw new ApiError("NOT_FOUND", "No board to export. Generate a board first.", 404);
  }

  if (params.format === "CSV") {
    const job = repo.createExportJob({
      workspaceId: params.workspaceId,
      boardId: board.id,
      requestedByUserId: params.requestedByUserId,
      format: "CSV",
      status: "READY",
      artifactPreview: buildBoardCsv(params.workspaceId)
    });
    logExport(params.workspaceId, params.requestedByUserId, job.id, "CSV");
    return job;
  }

  // PDF / FigJam: enqueue only; rendering is deferred to a background worker.
  const job = repo.createExportJob({
    workspaceId: params.workspaceId,
    boardId: board.id,
    requestedByUserId: params.requestedByUserId,
    format: params.format,
    status: "QUEUED"
  });
  logExport(params.workspaceId, params.requestedByUserId, job.id, params.format);
  return job;
}

function logExport(workspaceId: string, userId: string | undefined, jobId: string, format: string): void {
  repo.logActivity({
    workspaceId,
    actorUserId: userId,
    action: `export_${format.toLowerCase()}`,
    targetType: "ExportJob",
    targetId: jobId
  });
}

export function buildBoardCsv(workspaceId: string): string {
  const view = getBoardView(workspaceId);
  const rows: string[][] = [["theme", "mention_count", "participant", "quote", "rationale"]];

  for (const theme of view.themes) {
    for (const assignment of theme.assignments) {
      rows.push([
        theme.title,
        String(theme.mentionCount),
        assignment.participantLabel,
        assignment.content,
        assignment.rationale
      ]);
    }
  }

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
