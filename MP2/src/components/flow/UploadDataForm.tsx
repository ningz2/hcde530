"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, isError } from "@/lib/client/api";
import { ConsentModal } from "@/components/flow/ConsentModal";

type CreatedWorkspace = { workspace: { id: string } };
type IngestResponse = { workspaceId: string; ingestion: { codeCount: number } };

const sampleCsv = `code,quote,memo,participant
Onboarding friction,"The setup wizard confused me, I emailed support@acme.com",Mentioned during first run,P1
Pricing confusion,"Sarah from sales called me about pricing",Wants clearer tiers,P2
Performance,"Loading was slow but the dashboard is clear",,P3`;

type Method = "file" | "paste";
type FileMode = "single" | "multiple";
type LoadedFile = { name: string; content: string; codeCount: number };

/**
 * Estimate the number of codes in a file by counting data rows. CSV/TSV files
 * have a header row that is not a code, so it's excluded. This is a pre-submit
 * preview; the authoritative count comes back from the ingest API.
 */
function countCodeRows(content: string, filename?: string): number {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lower = (filename ?? "").toLowerCase();
  const looksCsv = lower.endsWith(".csv") || /^[^\n]*[,;\t][^\n]*\n/.test(content);
  return looksCsv ? Math.max(lines.length - 1, 0) : lines.length;
}

/**
 * Step 1 data input. In "new" mode it creates the project then stores the data;
 * in "existing" mode it adds data to the current project.
 *
 * Two file workflows:
 *  - "single": one CSV/TSV holding every participant (a participant column, e.g.
 *    tab-separated). Participants are read from that column.
 *  - "multiple": several files, one participant each. A file without a
 *    participant column is grouped under its file name.
 * Each file is ingested separately. After saving it moves to the privacy step.
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
  const [researchQuestions, setResearchQuestions] = useState<string[]>([""]);
  const [method, setMethod] = useState<Method>("file");
  const [fileMode, setFileMode] = useState<FileMode>("single");
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When set, the privacy-check modal is shown for the just-created data.
  const [consent, setConsent] = useState<{ workspaceId: string; codeCount: number } | null>(null);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length === 0) return;
    const loaded: LoadedFile[] = await Promise.all(
      picked.map(async (file) => {
        const text = await file.text();
        return { name: file.name, content: text, codeCount: countCodeRows(text, file.name) };
      })
    );
    setFiles((prev) => {
      // Single mode keeps exactly one file; multiple mode appends (de-duped by name).
      const base = fileMode === "single" ? [] : prev;
      const byName = new Map(base.map((f) => [f.name, f]));
      loaded.forEach((f) => byName.set(f.name, f));
      const next = [...byName.values()];
      return fileMode === "single" ? next.slice(-1) : next;
    });
  }

  function removeFile(fileName: string) {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
  }

  function changeFileMode(next: FileMode) {
    setFileMode(next);
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function useSample() {
    setMethod("paste");
    setContent(sampleCsv);
  }

  function updateRq(index: number, value: string) {
    setResearchQuestions((prev) => prev.map((q, i) => (i === index ? value : q)));
  }

  function addRq() {
    setResearchQuestions((prev) => [...prev, ""]);
  }

  function removeRq(index: number) {
    setResearchQuestions((prev) => (prev.length <= 1 ? [""] : prev.filter((_, i) => i !== index)));
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
      const cleanedRqs = researchQuestions.map((q) => q.trim()).filter(Boolean);
      const created = await apiPost<CreatedWorkspace>("/api/workspaces", {
        name: name.trim() || "Untitled project",
        ...(cleanedRqs.length > 0 ? { researchQuestions: cleanedRqs } : {})
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

    // Re-render server components (incl. the root layout) so the sidebar shows
    // the newly created project right away. Client state (this modal) persists.
    router.refresh();

    // Open the privacy-check modal as a follow-up step instead of navigating away.
    setConsent({ workspaceId: targetWorkspaceId as string, codeCount: totalCodes });
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.85rem", maxWidth: 720 }}>
      {mode === "new" && (
        <>
          <FormSection
            title="Project details"
            description={name.trim() ? name.trim() : "Optional. Defaults to Untitled project."}
          >
            <label style={{ display: "grid", gap: "0.25rem" }}>
              <span>Project name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Onboarding research Q2"
                style={inputStyle}
              />
            </label>
          </FormSection>

          <FormSection
            title="Research questions"
            description={
              researchQuestions.filter((q) => q.trim()).length > 0
                ? `${researchQuestions.filter((q) => q.trim()).length} question(s) added`
                : "Optional. Use this when you want the board organized by RQs."
            }
          >
            <div style={{ display: "grid", gap: "0.4rem" }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                Add the questions guiding your study. They help the assistant name themes and can organize
                the board by research question.
              </span>
              {researchQuestions.map((q, i) => (
                <div key={i} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  <span style={{ color: "#9ca3af", fontSize: 13, width: 22 }}>RQ{i + 1}</span>
                  <input
                    value={q}
                    onChange={(e) => updateRq(i, e.target.value)}
                    placeholder="e.g. What makes onboarding confusing for new users?"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeRq(i)}
                    style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer", fontSize: 13 }}
                    aria-label={`Remove research question ${i + 1}`}
                  >
                    remove
                  </button>
                </div>
              ))}
              <button type="button" onClick={addRq} style={{ ...secondaryButton, justifySelf: "start" }}>
                + Add research question
              </button>
            </div>
          </FormSection>
        </>
      )}

      <FormSection
        title="Data"
        description={
          method === "file"
            ? files.length > 0
              ? `${files.reduce((sum, f) => sum + f.codeCount, 0)} code(s) from ${files.length} file(s)`
              : "Required. Upload one or more CSV/TXT files."
            : content.trim()
              ? `${countCodeRows(content)} pasted code(s)`
              : "Required. Upload files or paste code data."
        }
      >
        <div style={{ display: "grid", gap: "0.8rem" }}>
          <div style={{ display: "flex", gap: "1rem" }}>
            <label>
              <input type="radio" checked={method === "file"} onChange={() => setMethod("file")} /> Upload a file
            </label>
            <label>
              <input type="radio" checked={method === "paste"} onChange={() => setMethod("paste")} /> Paste text
            </label>
          </div>

          {method === "file" ? (
            <div style={{ display: "grid", gap: "0.6rem" }}>
              <div style={{ display: "grid", gap: "0.4rem" }}>
                <label style={fileModeRow}>
                  <input
                    type="radio"
                    checked={fileMode === "single"}
                    onChange={() => changeFileMode("single")}
                  />
                  <span>
                    <strong>One file, all participants</strong>
                    <br />
                    <span style={{ color: "#6b7280", fontSize: 13 }}>
                      A single CSV/TSV with a <code>participant</code> column (e.g. tab-separated).
                    </span>
                  </span>
                </label>
                <label style={fileModeRow}>
                  <input
                    type="radio"
                    checked={fileMode === "multiple"}
                    onChange={() => changeFileMode("multiple")}
                  />
                  <span>
                    <strong>Multiple files, one participant each</strong>
                    <br />
                    <span style={{ color: "#6b7280", fontSize: 13 }}>
                      Upload several files; each file is grouped under its file name.
                    </span>
                  </span>
                </label>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
                multiple={fileMode === "multiple"}
                onChange={onFileChange}
              />

              {files.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.3rem" }}>
                  {files.map((f) => (
                    <li
                      key={f.name}
                      style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 13, color: "#374151" }}
                    >
                      <strong>{f.name}</strong>
                      <span style={{ color: "#2563eb", fontWeight: 600 }}>
                        {f.codeCount} code{f.codeCount === 1 ? "" : "s"}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(f.name)}
                        style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer", fontSize: 12 }}
                      >
                        remove
                      </button>
                    </li>
                  ))}
                  {files.length > 1 && (
                    <li style={{ fontSize: 13, color: "#111827", fontWeight: 600 }}>
                      Total: {files.reduce((sum, f) => sum + f.codeCount, 0)} codes across {files.length} files
                    </li>
                  )}
                </ul>
              )}

              <span style={{ fontSize: 12, color: "#6b7280" }}>
                CSV with a <code>code</code> column works best; optional <code>quote</code>, <code>memo</code>,
                and <code>participant</code> columns add context. Plain .txt is one code per line. Code counts
                above are estimated from the number of rows.
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
        </div>
      </FormSection>

      {error && <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}

      <button type="submit" disabled={busy} style={primaryButton}>
        {busy ? "Saving…" : "Save & continue"}
      </button>

      {consent && (
        <ConsentModal
          workspaceId={consent.workspaceId}
          codeCount={consent.codeCount}
          nextHref={`/workspaces/${consent.workspaceId}/board`}
        />
      )}
    </form>
  );
}

function FormSection({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section style={sectionCard}>
      <div style={sectionHeader}>
        <span style={{ display: "grid", gap: "0.15rem", textAlign: "left" }}>
          <strong style={{ color: "var(--af-text)" }}>{title}</strong>
          <span style={{ color: "var(--af-muted)", fontSize: 12 }}>{description}</span>
        </span>
      </div>
      <div style={sectionBody}>{children}</div>
    </section>
  );
}

const sectionCard: React.CSSProperties = {
  border: "1px solid var(--af-border)",
  borderRadius: 16,
  background: "var(--af-card-solid)",
  overflow: "hidden",
  boxShadow: "var(--af-shadow-soft)"
};

const sectionHeader: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  border: "none",
  background: "linear-gradient(90deg, #f8fbff, #ffffff)",
  padding: "0.85rem 1rem"
};

const sectionBody: React.CSSProperties = {
  display: "grid",
  gap: "0.75rem",
  padding: "1rem",
  borderTop: "1px solid var(--af-border)"
};

const inputStyle: React.CSSProperties = {
  padding: "0.5rem 0.65rem",
  border: "1px solid var(--af-border)",
  borderRadius: 8,
  fontSize: 14
};

const fileModeRow: React.CSSProperties = {
  display: "flex",
  gap: "0.6rem",
  alignItems: "flex-start",
  border: "1px solid var(--af-border)",
  borderRadius: 10,
  padding: "0.6rem 0.7rem",
  background: "#fbfdff"
};

const primaryButton: React.CSSProperties = {
  padding: "0.55rem 0.9rem",
  border: "1px solid var(--af-blue)",
  background: "var(--af-gradient)",
  color: "#fff",
  borderRadius: 8,
  fontSize: 14,
  cursor: "pointer",
  justifySelf: "start"
};

const secondaryButton: React.CSSProperties = {
  padding: "0.5rem 0.85rem",
  border: "1px solid var(--af-border)",
  background: "#fff",
  color: "var(--af-text)",
  borderRadius: 8,
  fontSize: 14,
  cursor: "pointer"
};
