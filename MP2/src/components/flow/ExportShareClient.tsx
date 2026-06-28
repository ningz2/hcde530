"use client";

import { useState } from "react";
import { apiPost, isError } from "@/lib/client/api";

type ExportResponse = {
  exportJob: {
    id: string;
    format: string;
    status: string;
    artifactPreview?: string;
    artifactMimeType?: string;
    artifactFilename?: string;
  };
};

type ShareResponse = { token: string; shareLink: { id: string; scope: string } };

export function ExportShareClient({ workspaceId }: { workspaceId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<ExportResponse["exportJob"] | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const selectedFormat = exportResult?.format;

  async function runExport(format: "CSV" | "PDF" | "FIGJAM") {
    setBusy(true);
    setError(null);
    setNotice(null);
    setShowPreview(false);
    setExportResult(null);
    const result = await apiPost<ExportResponse>(`/api/workspaces/${workspaceId}/exports`, { format });
    setBusy(false);
    if (isError(result)) {
      setError(result.error.message);
      return;
    }
    setExportResult(result.data.exportJob);
  }

  async function copyArtifact() {
    if (!exportResult?.artifactPreview || exportResult.artifactMimeType === "application/pdf") return;
    await navigator.clipboard.writeText(exportResult.artifactPreview);
    setNotice("Copied export content to clipboard.");
  }

  function downloadArtifact() {
    if (!exportResult?.artifactPreview) return;
    const blob =
      exportResult.artifactMimeType === "application/pdf"
        ? new Blob([Uint8Array.from(atob(exportResult.artifactPreview), (char) => char.charCodeAt(0))], {
            type: "application/pdf"
          })
        : new Blob([exportResult.artifactPreview], {
            type: exportResult.artifactMimeType ?? "text/plain;charset=utf-8"
          });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportResult.artifactFilename ?? `affinity-export.${exportResult.format.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setNotice(`Downloaded ${a.download}.`);
  }

  async function createShareLink() {
    setBusy(true);
    setError(null);
    const result = await apiPost<ShareResponse>(`/api/workspaces/${workspaceId}/share-links`, {
      scope: "WORKSPACE_VIEW",
      allowExport: false
    });
    setBusy(false);
    if (isError(result)) {
      setError(result.error.message);
      return;
    }
    setShareToken(result.data.token);
  }

  async function copyShareToken() {
    if (!shareToken) return;
    await navigator.clipboard.writeText(shareToken);
    setNotice("Copied share token to clipboard.");
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: 14, fontWeight: 560 }}>Export (available to all roles)</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => runExport("CSV")}
            className={`btn${selectedFormat === "CSV" ? " btn-primary" : ""}`}
            aria-pressed={selectedFormat === "CSV"}
          >
            Generate CSV
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => runExport("PDF")}
            className={`btn${selectedFormat === "PDF" ? " btn-primary" : ""}`}
            aria-pressed={selectedFormat === "PDF"}
          >
            Download printable PDF
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => runExport("FIGJAM")}
            className={`btn${selectedFormat === "FIGJAM" ? " btn-primary" : ""}`}
            aria-pressed={selectedFormat === "FIGJAM"}
          >
            Export FigJam sticky notes
          </button>
        </div>
        {exportResult && (
          <div style={{ marginTop: "0.75rem" }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              {exportResult.format} job <code>{exportResult.id.slice(0, 8)}</code> · status {exportResult.status}
            </p>
            {exportResult.artifactPreview && (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <button type="button" onClick={downloadArtifact} className="btn btn-quiet">
                    Download
                  </button>
                  {exportResult.artifactMimeType !== "application/pdf" && (
                    <button type="button" onClick={copyArtifact} className="btn btn-quiet">
                      Copy
                    </button>
                  )}
                  {exportResult.artifactMimeType !== "application/pdf" && (
                    <button type="button" onClick={() => setShowPreview((open) => !open)} className="btn btn-quiet">
                      {showPreview ? "Hide preview" : "Show preview"}
                    </button>
                  )}
                </div>
                <p style={{ margin: "8px 0 0", color: "var(--color-ink-muted)", fontSize: 12 }}>
                  {exportResult.format === "PDF"
                    ? "Downloads a PDF file of your grouped board."
                    : exportResult.format === "FIGJAM"
                      ? "Downloads a FigJam-friendly CSV: each row is one grouped sticky note."
                      : "CSV can be downloaded or copied directly."}
                </p>
                {showPreview && (
                  <pre
                    style={{
                      marginTop: 8,
                      padding: "0.75rem",
                      background: "#0f172a",
                      color: "#e2e8f0",
                      borderRadius: 8,
                      overflowX: "auto",
                      maxHeight: 220,
                      fontSize: 12
                    }}
                  >
                    {exportResult.artifactPreview}
                  </pre>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <section>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: 14, fontWeight: 560 }}>Anonymous view-only link</h3>
        <button type="button" disabled={busy} onClick={createShareLink} className="btn">
          Create view-only link
        </button>
        {shareToken && (
          <p style={{ marginTop: 8, fontSize: 13 }}>
            Share token (shown once): <code>{shareToken}</code>{" "}
            <button
              type="button"
              onClick={copyShareToken}
              className="btn btn-quiet"
              style={{ padding: "2px 6px", height: "auto", fontSize: 12 }}
              aria-label="Copy anonymous share token"
              title="Copy token"
            >
              ⧉
            </button>
            <br />
            <span style={{ color: "var(--color-ink-muted)" }}>
              View-only access sends this as the <code>x-share-token</code> header; unmasked codes are redacted and
              edit/admin/export are blocked.
            </span>
          </p>
        )}
      </section>

      {error && <p className="form-error">{error}</p>}
      {notice && <p style={{ color: "var(--color-success)", margin: 0, fontSize: 13 }}>{notice}</p>}
    </div>
  );
}
