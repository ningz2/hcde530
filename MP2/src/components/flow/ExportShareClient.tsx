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
    if (!exportResult?.artifactPreview) return;
    await navigator.clipboard.writeText(exportResult.artifactPreview);
    setNotice("Copied export content to clipboard.");
  }

  function downloadArtifact() {
    if (!exportResult?.artifactPreview) return;
    const blob = new Blob([exportResult.artifactPreview], {
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
        <h3 style={{ margin: "0 0 0.5rem" }}>Export (available to all roles)</h3>
        <div style={exportButtonPanel}>
          <button
            type="button"
            disabled={busy}
            onClick={() => runExport("CSV")}
            style={selectedFormat === "CSV" ? selectedButton : button}
            aria-pressed={selectedFormat === "CSV"}
          >
            Generate CSV
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => runExport("PDF")}
            style={selectedFormat === "PDF" ? selectedButton : button}
            aria-pressed={selectedFormat === "PDF"}
          >
            Download printable PDF
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => runExport("FIGJAM")}
            style={selectedFormat === "FIGJAM" ? selectedButton : button}
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
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  <button type="button" onClick={downloadArtifact} style={secondaryButton}>
                    Download
                  </button>
                  <button type="button" onClick={copyArtifact} style={secondaryButton}>
                    Copy
                  </button>
                  <button type="button" onClick={() => setShowPreview((open) => !open)} style={secondaryButton}>
                    {showPreview ? "Hide preview" : "Show preview"}
                  </button>
                </div>
                <p style={{ margin: "0.5rem 0 0", color: "#6b7280", fontSize: 12 }}>
                  {exportResult.format === "PDF"
                    ? "Downloads a printable HTML file. Open it and use your browser's Print / Save as PDF."
                    : exportResult.format === "FIGJAM"
                      ? "Downloads a FigJam-friendly CSV: each row is one grouped sticky note."
                      : "CSV can be downloaded or copied directly."}
                </p>
                {showPreview && <pre style={preview}>{exportResult.artifactPreview}</pre>}
              </>
            )}
          </div>
        )}
      </section>

      <section>
        <h3 style={{ margin: "0 0 0.5rem" }}>Anonymous view-only link</h3>
        <button type="button" disabled={busy} onClick={createShareLink} style={button}>
          Create view-only link
        </button>
        {shareToken && (
          <p style={{ marginTop: "0.5rem", fontSize: 13 }}>
            Share token (shown once): <code>{shareToken}</code>{" "}
            <button
              type="button"
              onClick={copyShareToken}
              style={copyIconButton}
              aria-label="Copy anonymous share token"
              title="Copy token"
            >
              ⧉
            </button>
            <br />
            <span style={{ color: "#6b7280" }}>
              View-only access sends this as the <code>x-share-token</code> header; unmasked codes are
              redacted and edit/admin/export are blocked.
            </span>
          </p>
        )}
      </section>

      {error && <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}
      {notice && <p style={{ color: "#047857", margin: 0, fontSize: 13 }}>{notice}</p>}
    </div>
  );
}

const button: React.CSSProperties = {
  padding: "0.5rem 0.85rem",
  border: "1px solid #1d4ed8",
  background: "#1d4ed8",
  color: "#fff",
  borderRadius: 8,
  fontSize: 14,
  cursor: "pointer"
};

const selectedButton: React.CSSProperties = {
  ...button,
  background: "#eef2ff",
  color: "#1d4ed8",
  boxShadow: "inset 0 0 0 2px #1d4ed8"
};

const exportButtonPanel: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 1,
  display: "grid",
  gap: "0.45rem",
  background: "#fff",
  paddingBottom: "0.5rem"
};

const secondaryButton: React.CSSProperties = {
  padding: "0.4rem 0.7rem",
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  borderRadius: 8,
  fontSize: 13,
  cursor: "pointer"
};

const copyIconButton: React.CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  borderRadius: 6,
  padding: "0.1rem 0.35rem",
  fontSize: 12,
  cursor: "pointer",
  verticalAlign: "middle"
};

const preview: React.CSSProperties = {
  marginTop: "0.5rem",
  padding: "0.75rem",
  background: "#0f172a",
  color: "#e2e8f0",
  borderRadius: 8,
  overflowX: "auto",
  maxHeight: 220,
  fontSize: 12
};
