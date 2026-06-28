"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, isError } from "@/lib/client/api";
import { ConsentModal } from "@/components/flow/ConsentModal";
import { PageShell } from "@/components/layout/PageShell";

type CreatedWorkspace = { workspace: { id: string } };
type IngestResponse = { workspaceId: string; ingestion: { codeCount: number } };

const sampleCsv = `code,quote,memo,participant
Onboarding friction,"The setup wizard confused me, I emailed support@acme.com",Mentioned during first run,P1
Pricing confusion,"Sarah from sales called me about pricing",Wants clearer tiers,P2
Performance,"Loading was slow but the dashboard is clear",,P3`;

type Method = "file" | "paste";
type FileMode = "single" | "multiple";
type LoadedFile = { name: string; content: string; codeCount: number };

function countCodeRows(content: string, filename?: string): number {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lower = (filename ?? "").toLowerCase();
  const looksCsv = lower.endsWith(".csv") || /^[^\n]*[,;\t][^\n]*\n/.test(content);
  return looksCsv ? Math.max(lines.length - 1, 0) : lines.length;
}

export function UploadDataForm({
  mode,
  workspaceId,
  formId = "upload-data-form",
  hideFooter = false,
  onBusyChange,
  shell
}: {
  mode: "new" | "existing";
  workspaceId?: string;
  formId?: string;
  hideFooter?: boolean;
  onBusyChange?: (busy: boolean) => void;
  shell?: {
    title: string;
    description: string;
  };
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [researchQuestions, setResearchQuestions] = useState<string[]>([""]);
  const [method, setMethod] = useState<Method>("file");
  const [fileMode, setFileMode] = useState<FileMode>("single");
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusyState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [consent, setConsent] = useState<{ workspaceId: string; codeCount: number } | null>(null);

  function setBusy(next: boolean) {
    setBusyState(next);
    onBusyChange?.(next);
  }

  async function loadFiles(picked: File[]) {
    if (picked.length === 0) return;
    const loaded: LoadedFile[] = await Promise.all(
      picked.map(async (file) => {
        const text = await file.text();
        return { name: file.name, content: text, codeCount: countCodeRows(text, file.name) };
      })
    );
    setFiles((prev) => {
      const base = fileMode === "single" ? [] : prev;
      const byName = new Map(base.map((f) => [f.name, f]));
      loaded.forEach((f) => byName.set(f.name, f));
      const next = [...byName.values()];
      return fileMode === "single" ? next.slice(-1) : next;
    });
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    await loadFiles(Array.from(event.target.files ?? []));
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
    if (/^[^\n]*,[^\n]*\n/.test(text)) return "CSV";
    return "PASTED_TEXT";
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

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
    router.refresh();
    setConsent({ workspaceId: targetWorkspaceId as string, codeCount: totalCodes });
  }

  const footer = (
    <button type="submit" form={formId} disabled={busy} className="btn btn-primary">
      {busy ? "Saving…" : "Save & continue"}
    </button>
  );

  const body = (
    <>
      <form id={formId} onSubmit={onSubmit} className="form-surface">
        {mode === "new" && (
          <>
            <section className="form-section">
              <div>
                <h2>Project details</h2>
                <p className="form-help">Optional. Defaults to Untitled project.</p>
              </div>
              <label className="field">
                <span className="field-label">Project name</span>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kitchen research Q2"
                />
              </label>
            </section>

            <section className="form-section">
              <div>
                <h2>Research questions</h2>
                <p className="form-help">Optional. Used when organizing the board by research questions.</p>
              </div>
              {researchQuestions.map((q, i) => (
                <div key={i} className="rq-row">
                  <span className="rq-num">RQ{i + 1}</span>
                  <input
                    className="input"
                    value={q}
                    onChange={(e) => updateRq(i, e.target.value)}
                    placeholder="What makes meal prep frustrating?"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeRq(i)}
                    className="icon-quiet"
                    aria-label={`Remove research question ${i + 1}`}
                    title="Remove research question"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" onClick={addRq} className="btn btn-quiet">
                + Add research question
              </button>
            </section>
          </>
        )}

        <section className="form-section">
          <div>
            <h2>Data</h2>
            <p className="form-help">Required. CSV with a <code>code</code> column works best.</p>
          </div>

          <div className="method-tabs" role="tablist" aria-label="Input method">
            <button
              type="button"
              role="tab"
              aria-selected={method === "file"}
              className={`method-tab${method === "file" ? " active" : ""}`}
              onClick={() => setMethod("file")}
            >
              Upload file
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={method === "paste"}
              className={`method-tab${method === "paste" ? " active" : ""}`}
              onClick={() => setMethod("paste")}
            >
              Paste text
            </button>
          </div>

          {method === "file" ? (
            <>
              <div className="radio-cards">
                <label className={`radio-card${fileMode === "single" ? " selected" : ""}`}>
                  <input
                    type="radio"
                    name="fileMode"
                    checked={fileMode === "single"}
                    onChange={() => changeFileMode("single")}
                  />
                  <div>
                    <strong>One file, all participants</strong>
                    <span>Single CSV/TSV with a participant column.</span>
                  </div>
                </label>
                <label className={`radio-card${fileMode === "multiple" ? " selected" : ""}`}>
                  <input
                    type="radio"
                    name="fileMode"
                    checked={fileMode === "multiple"}
                    onChange={() => changeFileMode("multiple")}
                  />
                  <div>
                    <strong>Multiple files, one participant each</strong>
                    <span>Each file grouped under its file name.</span>
                  </div>
                </label>
              </div>

              <div
                className={`dropzone${dragOver ? " dragover" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOver(false);
                  await loadFiles(Array.from(e.dataTransfer.files));
                }}
              >
                <p>Drop CSV or TXT here, or browse files</p>
                <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
                  Browse files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
                  multiple={fileMode === "multiple"}
                  onChange={onFileChange}
                  hidden
                />
                {files.length > 0 && (
                  <div className="file-list">
                    {files.map((f) => (
                      <div key={f.name} className="file-item">
                        <strong>{f.name}</strong>
                        <span className="count">
                          {f.codeCount} code{f.codeCount === 1 ? "" : "s"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(f.name)}
                          className="icon-quiet"
                          title="Remove file"
                          aria-label={`Remove ${f.name}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {files.length > 1 && (
                      <div className="file-item" style={{ fontWeight: 560 }}>
                        Total: {files.reduce((sum, f) => sum + f.codeCount, 0)} codes across {files.length} files
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <textarea
              className="textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="Paste CSV rows (code,quote,memo,participant) or one code per line…"
            />
          )}

          <button type="button" onClick={useSample} className="btn btn-quiet">
            Use sample data
          </button>
        </section>

        {error && <p className="form-error" style={{ padding: "0 24px 16px" }}>{error}</p>}
      </form>

      {!hideFooter && !shell && footer}

      {consent && (
        <ConsentModal
          workspaceId={consent.workspaceId}
          codeCount={consent.codeCount}
          nextHref={`/workspaces/${consent.workspaceId}/board`}
        />
      )}
    </>
  );

  if (shell) {
    return (
      <PageShell title={shell.title} description={shell.description} footer={footer}>
        {body}
      </PageShell>
    );
  }

  return body;
}
