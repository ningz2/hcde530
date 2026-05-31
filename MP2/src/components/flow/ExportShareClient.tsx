"use client";

import { useState } from "react";
import { apiPost, isError } from "@/lib/client/api";

type ExportResponse = {
  exportJob: { id: string; format: string; status: string; artifactPreview?: string };
};

type ShareResponse = { token: string; shareLink: { id: string; scope: string } };

export function ExportShareClient({ workspaceId }: { workspaceId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<ExportResponse["exportJob"] | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);

  async function runExport(format: "CSV" | "PDF" | "FIGJAM") {
    setBusy(true);
    setError(null);
    setExportResult(null);
    const result = await apiPost<ExportResponse>(`/api/workspaces/${workspaceId}/exports`, { format });
    setBusy(false);
    if (isError(result)) {
      setError(result.error.message);
      return;
    }
    setExportResult(result.data.exportJob);
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

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section>
        <h3 style={{ margin: "0 0 0.5rem" }}>Export (available to all roles)</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {(["CSV", "PDF", "FIGJAM"] as const).map((format) => (
            <button key={format} type="button" disabled={busy} onClick={() => runExport(format)} style={button}>
              Export {format}
            </button>
          ))}
        </div>
        {exportResult && (
          <div style={{ marginTop: "0.75rem" }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              {exportResult.format} job <code>{exportResult.id.slice(0, 8)}</code> · status {exportResult.status}
            </p>
            {exportResult.artifactPreview && (
              <pre
                style={{
                  marginTop: "0.5rem",
                  padding: "0.75rem",
                  background: "#0f172a",
                  color: "#e2e8f0",
                  borderRadius: 8,
                  overflowX: "auto",
                  fontSize: 12
                }}
              >
                {exportResult.artifactPreview}
              </pre>
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
            Share token (shown once): <code>{shareToken}</code>
            <br />
            <span style={{ color: "#6b7280" }}>
              View-only access sends this as the <code>x-share-token</code> header; unmasked quotes are
              redacted and edit/admin/export are blocked.
            </span>
          </p>
        )}
      </section>

      {error && <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}
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
