import PDFDocument from "pdfkit";
import { getBoardView } from "@/domain/services/boardView";
import { ApiError } from "@/lib/errors/types";
import { repo, type ExportFormat, type ExportJobRecord } from "@/lib/repo/store";

/**
 * Export scaffolds for the three v1 formats.
 *
 * Exports are generated synchronously for the current vertical slice:
 *  - CSV: board rows with theme/code context.
 *  - PDF: downloadable PDF artifact generated server-side.
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
    content: await buildPrintablePdfBase64(workspaceId),
    mimeType: "application/pdf",
    filename: "affinity-board.pdf"
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

export async function buildPrintablePdfBase64(workspaceId: string): Promise<string> {
  const pdf = await buildPrintablePdfBuffer(workspaceId);
  return pdf.toString("base64");
}

export async function buildPrintablePdfBuffer(workspaceId: string): Promise<Buffer> {
  const view = await getBoardView(workspaceId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PDF_MARGIN, size: "LETTER" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(PDF_FONT.title).fillColor(PDF_COLORS.ink).text(view.workspaceName ?? "Affinity board");
    doc
      .font("Helvetica")
      .fontSize(PDF_FONT.meta)
      .fillColor(PDF_COLORS.muted)
      .text(`${view.codeCount} codes · ${view.themes.length} groups · generated by AffinityFlow`, { lineGap: 2 });

    for (const theme of view.themes) {
      doc.moveDown(0.7);
      ensureSpace(doc, 48);
      doc.font("Helvetica-Bold").fontSize(PDF_FONT.theme).fillColor(PDF_COLORS.ink).text(theme.title);
      doc.moveDown(0.2);
      const badgeBottom = drawBadge(
        doc,
        `Mentioned by ${theme.mentionCount} participant${theme.mentionCount === 1 ? "" : "s"}`,
        doc.page.margins.left,
        doc.y
      );
      doc.y = badgeBottom + 4;

      layoutNoteCards(doc, theme.assignments);
      doc.moveDown(0.2);
    }

    doc.end();
  });
}

const PDF_MARGIN = 28;
const PDF_FONT = {
  title: 16,
  meta: 8,
  theme: 11,
  badge: 8,
  code: 10,
  body: 8
} as const;
const PDF_COLORS = {
  ink: "#111827",
  muted: "#6b7280",
  badgeBg: "#eef2ff",
  badgeInk: "#3730a3",
  noteBorder: "#d1d5db",
  noteBg: "#ffffff"
} as const;

const NOTE_GAP = 5;
const NOTE_MIN_WIDTH = 118;
const NOTE_PADDING = 5;
const NOTE_TOP_ACCENT = 3;
const NOTE_RADIUS = 4;
const NOTE_FIELD_GAP = 3;

type PrintableAssignment = {
  code: string;
  participantLabel: string;
  participantHex: string;
  quote?: string;
  memo?: string;
  rationale: string;
};

function contentWidth(doc: InstanceType<typeof PDFDocument>): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function noteColumnLayout(doc: InstanceType<typeof PDFDocument>): { columns: number; noteWidth: number } {
  const width = contentWidth(doc);
  const columns = Math.max(1, Math.floor((width + NOTE_GAP) / (NOTE_MIN_WIDTH + NOTE_GAP)));
  const noteWidth = (width - (columns - 1) * NOTE_GAP) / columns;
  return { columns, noteWidth };
}

function layoutNoteCards(doc: InstanceType<typeof PDFDocument>, assignments: PrintableAssignment[]): void {
  if (assignments.length === 0) return;

  const { columns, noteWidth } = noteColumnLayout(doc);
  let column = 0;
  let rowY = doc.y;
  let rowHeight = 0;

  for (const assignment of assignments) {
    const cardHeight = measureNoteCardHeight(doc, assignment, noteWidth);
    if (column === columns) {
      rowY += rowHeight + NOTE_GAP;
      column = 0;
      rowHeight = 0;
    }

    if (rowY + cardHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      rowY = doc.page.margins.top;
      column = 0;
      rowHeight = 0;
    }

    const x = doc.page.margins.left + column * (noteWidth + NOTE_GAP);
    drawNoteCard(doc, assignment, x, rowY, noteWidth, cardHeight);
    rowHeight = Math.max(rowHeight, cardHeight);
    column += 1;
  }

  doc.y = rowY + rowHeight;
}

function measureNoteCardHeight(
  doc: InstanceType<typeof PDFDocument>,
  assignment: PrintableAssignment,
  width: number
): number {
  const innerWidth = width - NOTE_PADDING * 2;
  let height = NOTE_PADDING * 2 + NOTE_TOP_ACCENT + NOTE_FIELD_GAP;

  doc.font("Helvetica-Bold").fontSize(PDF_FONT.code);
  height += doc.heightOfString(assignment.code, { width: innerWidth }) + NOTE_FIELD_GAP;

  doc.font("Helvetica").fontSize(PDF_FONT.body);
  for (const field of noteFields(assignment)) {
    height += doc.heightOfString(`${field.label} ${field.value}`, { width: innerWidth, lineGap: 1 }) + NOTE_FIELD_GAP;
  }

  return height;
}

function noteFields(assignment: PrintableAssignment): { label: string; value: string }[] {
  return [
    { label: "Participant:", value: assignment.participantLabel },
    { label: "Why here:", value: assignment.rationale },
    ...(assignment.quote ? [{ label: "Quote:", value: assignment.quote }] : []),
    ...(assignment.memo ? [{ label: "Memo:", value: assignment.memo }] : [])
  ];
}

function drawBadge(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  x: number,
  y: number
): number {
  const padX = 4;
  const padY = 1;
  doc.font("Helvetica-Bold").fontSize(PDF_FONT.badge);
  const textWidth = doc.widthOfString(text);
  const pillWidth = textWidth + padX * 2;
  const pillHeight = 11;

  doc.save();
  doc.roundedRect(x, y, pillWidth, pillHeight, pillHeight / 2).fill(PDF_COLORS.badgeBg);
  doc.fillColor(PDF_COLORS.badgeInk).text(text, x + padX, y + padY, { width: textWidth, lineBreak: false });
  doc.restore();

  return y + pillHeight;
}

function drawNoteCard(
  doc: InstanceType<typeof PDFDocument>,
  assignment: PrintableAssignment,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const accent = normalizeHex(assignment.participantHex);
  const innerWidth = width - NOTE_PADDING * 2;
  let textY = y + NOTE_TOP_ACCENT + NOTE_PADDING;

  doc.save();
  doc.roundedRect(x, y, width, height, NOTE_RADIUS).fillAndStroke(PDF_COLORS.noteBg, PDF_COLORS.noteBorder);
  doc.rect(x, y, width, NOTE_TOP_ACCENT).fill(accent);
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(PDF_FONT.code).fillColor(PDF_COLORS.ink);
  doc.text(assignment.code, x + NOTE_PADDING, textY, { width: innerWidth });
  textY = doc.y + NOTE_FIELD_GAP;

  for (const field of noteFields(assignment)) {
    doc.font("Helvetica-Bold").fontSize(PDF_FONT.body).fillColor(PDF_COLORS.ink);
    doc.text(`${field.label} `, x + NOTE_PADDING, textY, { continued: true, width: innerWidth });
    doc.font("Helvetica").text(field.value, { width: innerWidth, lineGap: 1 });
    textY = doc.y + NOTE_FIELD_GAP;
  }
}

function normalizeHex(hex: string): string {
  const trimmed = hex.trim();
  if (!trimmed) return "#2563eb";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function ensureSpace(doc: InstanceType<typeof PDFDocument>, neededHeight: number): void {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + neededHeight > bottom) {
    doc.addPage();
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
