"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, isError } from "@/lib/client/api";

type IngestResponse = {
  ingestion: {
    quoteCount: number;
    anonymizationApplied: boolean;
    rawRetained: boolean;
    participants: { anonymizedLabel: string; colorToken: string }[];
    maskingNotes: string[];
  };
};

const sampleCsv = `participant,quote
P1,"The setup wizard confused me, I emailed support@acme.com"
P2,"Sarah from sales called me about pricing"
P3,"Loading was slow but the dashboard is clear"`;

export function IngestForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<"PASTED_TEXT" | "CSV">("PASTED_TEXT");
  const [content, setContent] = useState("");
  // Privacy default ON: masking is applied unless the user explicitly opts out.
  const [maskEnabled, setMaskEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IngestResponse["ingestion"] | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    const response = await apiPost<IngestResponse>(`/api/workspaces/${workspaceId}/ingest`, {
      sourceType,
      content,
      filename: sourceType === "CSV" ? "upload.csv" : undefined,
      consentAnonymization: true,
      optOutAnonymization: !maskEnabled
    });

    setBusy(false);

    if (isError(response)) {
      setError(response.error.message);
      return;
    }

    setResult(response.data.ingestion);
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <div style={{ display: "flex", gap: "1rem" }}>
          <label>
            <input
              type="radio"
              name="sourceType"
              checked={sourceType === "PASTED_TEXT"}
              onChange={() => setSourceType("PASTED_TEXT")}
            />{" "}
            Paste text (one quote per line)
          </label>
          <label>
            <input
              type="radio"
              name="sourceType"
              checked={sourceType === "CSV"}
              onChange={() => setSourceType("CSV")}
            />{" "}
            CSV (participant, quote)
          </label>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder={sourceType === "CSV" ? sampleCsv : "I found the onboarding confusing…"}
          style={{
            padding: "0.65rem",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontFamily: "ui-monospace, monospace",
            fontSize: 13
          }}
        />

        {sourceType === "CSV" && (
          <button
            type="button"
            onClick={() => setContent(sampleCsv)}
            style={{ ...secondaryButton, justifySelf: "start" }}
          >
            Insert sample CSV
          </button>
        )}

        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={maskEnabled}
            onChange={(e) => setMaskEnabled(e.target.checked)}
          />
          <span>
            Mask personal data before storing <strong>(recommended)</strong>. Unchecking opts out of
            anonymization for this upload.
          </span>
        </label>

        {error && <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}

        <button type="submit" disabled={busy || !content} style={primaryButton}>
          {busy ? "Processing…" : "Ingest & anonymize"}
        </button>
      </form>

      {result && (
        <div style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Ingestion complete</h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            <li>{result.quoteCount} quotes normalized and stored</li>
            <li>Anonymization applied: {result.anonymizationApplied ? "yes" : "no (opted out)"}</li>
            <li>Raw source retained: {result.rawRetained ? "yes" : "no (discarded)"}</li>
            <li>Participants: {result.participants.map((p) => p.anonymizedLabel).join(", ") || "—"}</li>
            {result.maskingNotes.length > 0 && <li>Notes: {result.maskingNotes.join(" ")}</li>}
          </ul>
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => router.push(`/workspaces/${workspaceId}/anonymization`)}
              style={secondaryButton}
            >
              Review anonymization
            </button>
            <button
              type="button"
              onClick={() => router.push(`/workspaces/${workspaceId}/board`)}
              style={primaryButton}
            >
              Go to board
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  padding: "0.55rem 0.9rem",
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  borderRadius: 8,
  fontSize: 14,
  cursor: "pointer"
};
