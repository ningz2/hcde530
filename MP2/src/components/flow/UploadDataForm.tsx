"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, isError } from "@/lib/client/api";

type CreatedWorkspace = { workspace: { id: string } };
type IngestResponse = { workspaceId: string; ingestion: { quoteCount: number } };

const sampleCsv = `participant,quote
P1,"The setup wizard confused me, I emailed support@acme.com"
P2,"Sarah from sales called me about pricing"
P3,"Loading was slow but the dashboard is clear"`;

type Method = "file" | "paste";

/**
 * Step 1 data input. In "new" mode it creates the project then stores the data;
 * in "existing" mode it adds data to the current project. After saving it moves
 * to the privacy-check step (anonymization is a separate, later decision).
 */
export function UploadDataForm({
  mode,
  workspaceId
}: {
  mode: "new" | "existing";
  workspaceId?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [method, setMethod] = useState<Method>("file");
  const [content, setContent] = useState("");
  const [filename, setFilename] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setContent(text);
    setFilename(file.name);
  }

  function useSample() {
    setMethod("paste");
    setContent(sampleCsv);
    setFilename("sample.csv");
  }

  function detectSourceType(): "CSV" | "TXT" | "PASTED_TEXT" {
    const lower = (filename ?? "").toLowerCase();
    if (lower.endsWith(".csv")) return "CSV";
    if (method === "file" && lower.endsWith(".txt")) return "TXT";
    // Pasted content that looks like CSV (header + commas) is treated as CSV.
    if (/^[^\n]*,[^\n]*\n/.test(content)) return "CSV";
    return "PASTED_TEXT";
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim()) {
      setError("Add some data first — upload a file, paste text, or use the sample.");
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

    const ingest = await apiPost<IngestResponse>(`/api/workspaces/${targetWorkspaceId}/ingest`, {
      sourceType: detectSourceType(),
      content,
      filename
    });

    setBusy(false);

    if (isError(ingest)) {
      setError(ingest.error.message);
      return;
    }

    router.push(`/workspaces/${targetWorkspaceId}/anonymization`);
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
            onChange={onFileChange}
          />
          {filename && (
            <span style={{ fontSize: 13, color: "#374151" }}>
              Loaded <strong>{filename}</strong> ({content.length} characters)
            </span>
          )}
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            CSV with a participant and quote column works best. Plain .txt is one quote per line.
          </span>
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder={"Paste CSV rows or one quote per line…"}
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
