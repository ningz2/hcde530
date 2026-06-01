"use client";

import { useRef, useState } from "react";
import { apiPost, isError } from "@/lib/client/api";
import { ConsentModal } from "@/components/flow/ConsentModal";

type CreatedWorkspace = { workspace: { id: string } };
type IngestResponse = { workspaceId: string; ingestion: { codeCount: number } };

const sampleCsv = `code,quote,memo,participant
Onboarding friction,"The setup wizard confused me, I emailed support@acme.com",Mentioned during first run,P1
Pricing confusion,"Sarah from sales called me about pricing",Wants clearer tiers,P2
Performance,"Loading was slow but the dashboard is clear",,P3`;

type Method = "file" | "paste";
type LoadedFile = { name: string; content: string };

/**
 * Step 1 data input. In "new" mode it creates the project then stores the data;
 * in "existing" mode it adds data to the current project. Supports uploading
 * several files at once (e.g. one file per participant) — each file is ingested
 * separately so a file with no participant column is grouped under its file name.
 * After saving it moves to the privacy-check step.
 */
export function UploadDataForm({
  mode,
  workspaceId
}: {
  mode: "new" | "existing";
  workspaceId?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [method, setMethod] = useState<Method>("file");
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When set, the privacy-check modal is shown for the just-created data.
  const [consent, setConsent] = useState<{ workspaceId: string; codeCount: number } | null>(null);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length === 0) return;
    const loaded = await Promise.all(
      picked.map(async (file) => ({ name: file.name, content: await file.text() }))
    );
    // Append to any previously loaded files (de-duped by name).
    setFiles((prev) => {
      const byName = new Map(prev.map((f) => [f.name, f]));
      loaded.forEach((f) => byName.set(f.name, f));
      return [...byName.values()];
    });
  }

  function removeFile(fileName: string) {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
  }

  function useSample() {
    setMethod("paste");
    setContent(sampleCsv);
  }

  function detectSourceType(text: string, filename?: string): "CSV" | "TXT" | "PASTED_TEXT" {
    const lower = (filename ?? "").toLowerCase();
    if (lower.endsWith(".csv")) return "CSV";
    if (filename && lower.endsWith(".txt")) return "TXT";
    // Content that looks like CSV (header + commas) is treated as CSV.
    if (/^[^\n]*,[^\n]*\n/.test(text)) return "CSV";
    return "PASTED_TEXT";
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Build the list of uploads from either the selected files or pasted text.
    const uploads: { content: string; filename?: string }[] =
      method === "file"
        ? files.filter((f) => f.content.trim()).map((f) => ({ content: f.content, filename: f.name }))
        : content.trim()
          ? [{ content }]
          : [];

    if (uploads.length === 0) {
      setError("Add some data first — upload one or more files, paste text, or use the sample.");
      return;
    }

    setBusy(true);
    setError(null);

    let targetWorkspaceId = workspaceId;

    if (mode === "new") {
      const created = await apiPost<CreatedWorkspace>("/api/workspaces", {
        name: name.trim() || "Untitled project"
      });
      if (isError(created)) {
        setBusy(false);
        setError(created.error.message);
        return;
      }
      targetWorkspaceId = created.data.workspace.id;
    }

    let totalCodes = 0;
    for (const upload of uploads) {
      const ingest = await apiPost<IngestResponse>(`/api/workspaces/${targetWorkspaceId}/ingest`, {
        sourceType: detectSourceType(upload.content, upload.filename),
        content: upload.content,
        filename: upload.filename
      });
      if (isError(ingest)) {
        setBusy(false);
        setError(
          uploads.length > 1
            ? `${upload.filename ?? "Pasted text"}: ${ingest.error.message}`
            : ingest.error.message
        );
        return;
      }
      totalCodes += ingest.data.ingestion.codeCount;
    }

    setBusy(false);

    // Open the privacy-check modal as a follow-up step instead of navigating away.
    setConsent({ workspaceId: targetWorkspaceId as string, codeCount: totalCodes });
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: "1rem", maxWidth: 620 }}>
      {mode === "new" && (
        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span>Project name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Onboarding research Q2"
            style={inputStyle}
          />
        </label>
      )}

      <div style={{ display: "flex", gap: "1rem" }}>
        <label>
          <input type="radio" checked={method === "file"} onChange={() => setMethod("file")} /> Upload a file
        </label>
        <label>
          <input type="radio" checked={method === "paste"} onChange={() => setMethod("paste")} /> Paste text
        </label>
      </div>

      {method === "file" ? (
        <div style={{ display: "grid", gap: "0.4rem" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            multiple
            onChange={onFileChange}
          />
          {files.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.25rem" }}>
              {files.map((f) => (
                <li
                  key={f.name}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 13, color: "#374151" }}
                >
                  <strong>{f.name}</strong>
                  <span style={{ color: "#9ca3af" }}>({f.content.length} chars)</span>
                  <button
                    type="button"
                    onClick={() => removeFile(f.name)}
                    style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer", fontSize: 12 }}
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            Upload one or more files (e.g. one per participant). CSV with a <code>code</code> column works
            best; optional <code>quote</code>, <code>memo</code>, and <code>participant</code> columns add
            context. Plain .txt is one code per line. Files without a <code>participant</code> column are
            grouped under the file name.
          </span>
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder={"Paste CSV rows (code,quote,memo,participant) or one code per line…"}
          style={{
            padding: "0.65rem",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontFamily: "ui-monospace, monospace",
            fontSize: 13
          }}
        />
      )}

      <div>
        <button type="button" onClick={useSample} style={secondaryButton}>
          Use sample data
        </button>
      </div>

      {error && <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}

      <button type="submit" disabled={busy} style={primaryButton}>
        {busy ? "Saving…" : "Save & continue"}
      </button>

      {consent && (
        <ConsentModal
          workspaceId={consent.workspaceId}
          codeCount={consent.codeCount}
          nextHref={`/workspaces/${consent.workspaceId}/strategy`}
        />
      )}
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.5rem 0.65rem",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14
};

const primaryButton: React.CSSProperties = {
  padding: "0.55rem 0.9rem",
  border: "1px solid #1d4ed8",
  background: "#1d4ed8",
  color: "#fff",
  borderRadius: 8,
  fontSize: 14,
  cursor: "pointer",
  justifySelf: "start"
};

const secondaryButton: React.CSSProperties = {
  padding: "0.5rem 0.85rem",
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  borderRadius: 8,
  fontSize: 14,
  cursor: "pointer"
};
