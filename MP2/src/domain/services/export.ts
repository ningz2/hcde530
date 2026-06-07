import { getBoardView } from "@/domain/services/boardView";
import { ApiError } from "@/lib/errors/types";
import { repo, type ExportFormat, type ExportJobRecord } from "@/lib/repo/store";

/**
 * Export scaffolds for the three v1 formats.
 *
 * Exports are generated synchronously for the current vertical slice:
 *  - CSV: board rows with theme/code context.
 *  - PDF: printable HTML artifact downloaded as .html (browser can print/save PDF).
 *  - FigJam: FigJam-friendly CSV where each row is a grouped sticky note.
 * All three are available to every workspace role; anonymous view-only links are
 * blocked at the route layer.
 */
export async function requestExport(params: {
  workspaceId: string;
  requestedByUserId?: string;
  format: ExportFormat;
}): Promise<ExportJobRecord> {
  const board = await repo.latestBoard(params.workspaceId);
  if (!board) {
    throw new ApiError("NOT_FOUND", "No board to export. Generate a board first.", 404);
  }

  const artifact = await buildArtifact(params.workspaceId, params.format);
  const job = await repo.createExportJob({
    workspaceId: params.workspaceId,
    boardId: board.id,
    requestedByUserId: params.requestedByUserId,
    format: params.format,
    status: "READY",
    artifactPreview: artifact.content,
    artifactMimeType: artifact.mimeType,
    artifactFilename: artifact.filename
  });
  await logExport(params.workspaceId, params.requestedByUserId, job.id, params.format);
  return job;
}

async function buildArtifact(
  workspaceId: string,
  format: ExportFormat
): Promise<{ content: string; mimeType: string; filename: string }> {
  if (format === "CSV") {
    return {
      content: await buildBoardCsv(workspaceId),
      mimeType: "text/csv;charset=utf-8",
      filename: "affinity-board.csv"
    };
  }
  if (format === "FIGJAM") {
    return {
      content: await buildFigJamCsv(workspaceId),
      mimeType: "text/csv;charset=utf-8",
      filename: "figjam-sticky-notes.csv"
    };
  }
  return {
    content: await buildPrintablePdfHtml(workspaceId),
    mimeType: "text/html;charset=utf-8",
    filename: "affinity-board-printable.html"
  };
}

async function logExport(
  workspaceId: string,
  userId: string | undefined,
  jobId: string,
  format: string
): Promise<void> {
  await repo.logActivity({
    workspaceId,
    actorUserId: userId,
    action: `export_${format.toLowerCase()}`,
    targetType: "ExportJob",
    targetId: jobId
  });
}

export async function buildBoardCsv(workspaceId: string): Promise<string> {
  const view = await getBoardView(workspaceId);
  const rows: string[][] = [
    ["theme", "mention_count", "participant", "code", "quote", "memo", "rationale"]
  ];

  for (const theme of view.themes) {
    for (const assignment of theme.assignments) {
      rows.push([
        theme.title,
        String(theme.mentionCount),
        assignment.participantLabel,
        assignment.code,
        assignment.quote ?? "",
        assignment.memo ?? "",
        assignment.rationale
      ]);
    }
  }

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export async function buildFigJamCsv(workspaceId: string): Promise<string> {
  const view = await getBoardView(workspaceId);
  const rows: string[][] = [
    ["section", "group", "sticky_note", "participant", "color", "quote", "memo", "rationale", "source"]
  ];

  for (const root of view.tree) {
    collectFigJamRows(root, root.title, rows);
  }

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function collectFigJamRows(
  node: { title: string; assignments: { code: string; participantLabel: string; participantHex: string; quote?: string; memo?: string; rationale: string; sourceRef?: string }[]; children: typeof node[] },
  section: string,
  rows: string[][]
): void {
  for (const assignment of node.assignments) {
    rows.push([
      section,
      node.title,
      assignment.code,
      assignment.participantLabel,
      assignment.participantHex,
      assignment.quote ?? "",
      assignment.memo ?? "",
      assignment.rationale,
      assignment.sourceRef ?? ""
    ]);
  }
  for (const child of node.children) {
    collectFigJamRows(child, section, rows);
  }
}

export async function buildPrintablePdfHtml(workspaceId: string): Promise<string> {
  const view = await getBoardView(workspaceId);
  const body = view.themes
    .map(
      (theme) => `
        <section class="theme">
          <h2>${escapeHtml(theme.title)}</h2>
          <p class="badge">Mentioned by ${theme.mentionCount} participant${theme.mentionCount === 1 ? "" : "s"}</p>
          <div class="notes">
            ${theme.assignments
              .map(
                (a) => `
                  <article class="note" style="border-top-color:${escapeHtml(a.participantHex)}">
                    <h3>${escapeHtml(a.code)}</h3>
                    <p><strong>Participant:</strong> ${escapeHtml(a.participantLabel)}</p>
                    <p><strong>Why here:</strong> ${escapeHtml(a.rationale)}</p>
                    ${a.quote ? `<p><strong>Quote:</strong> ${escapeHtml(a.quote)}</p>` : ""}
                    ${a.memo ? `<p><strong>Memo:</strong> ${escapeHtml(a.memo)}</p>` : ""}
                  </article>
                `
              )
              .join("")}
          </div>
        </section>
      `
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(view.workspaceName ?? "Affinity board")}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; color: #111827; }
    h1 { margin-bottom: 4px; }
    .meta { color: #6b7280; margin-top: 0; }
    .theme { break-inside: avoid; margin-top: 28px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #eef2ff; color: #3730a3; font-size: 12px; font-weight: 700; }
    .notes { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-top: 12px; }
    .note { border: 1px solid #d1d5db; border-top: 6px solid #2563eb; border-radius: 10px; padding: 12px; background: #fff; break-inside: avoid; }
    .note h3 { margin: 0 0 8px; font-size: 15px; }
    .note p { margin: 6px 0; font-size: 12px; line-height: 1.35; }
    @media print { body { margin: 18mm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(view.workspaceName ?? "Affinity board")}</h1>
  <p class="meta">${view.codeCount} codes · ${view.themes.length} groups · generated by AffinityFlow</p>
  ${body}
</body>
</html>`;
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
