"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, isError } from "@/lib/client/api";

type AnonymizationSummary = {
  anonymization: {
    totalCodes: number;
    maskedCount: number;
    applied: boolean;
    categories: string[];
  };
};

const categoryLabels: Record<string, string> = {
  email: "email addresses",
  url: "links",
  phone: "phone numbers",
  handle: "social handles",
  name: "names"
};

/**
 * Privacy-check modal shown right after data is added. The user decides whether
 * to mask personal info; after applying we report exactly what was masked before
 * letting them continue.
 */
export function ConsentModal({
  workspaceId,
  codeCount,
  nextHref
}: {
  workspaceId: string;
  codeCount: number;
  nextHref: string;
}) {
  const router = useRouter();
  const [applyMasking, setApplyMasking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AnonymizationSummary["anonymization"] | null>(null);

  async function apply() {
    setBusy(true);
    setError(null);
    const result = await apiPost<AnonymizationSummary>(
      `/api/workspaces/${workspaceId}/anonymization`,
      { applyMasking }
    );
    setBusy(false);
    if (isError(result)) {
      setError(result.error.message);
      return;
    }
    setSummary(result.data.anonymization);
  }

  function continueToNext() {
    router.push(nextHref);
  }

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Privacy check">
      <div style={modal}>
        {summary ? (
          <>
            <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem" }}>
              {summary.applied ? "Personal info masked" : "Saved without masking"}
            </h2>
            {summary.applied ? (
              <div style={notice}>
                <p style={{ margin: 0 }}>
                  ✓ Protected your participants. We masked personal info in{" "}
                  <strong>
                    {summary.maskedCount} of {summary.totalCodes}
                  </strong>{" "}
                  code{summary.totalCodes === 1 ? "" : "s"} (across code, quote, and memo text).
                </p>
                {summary.categories.length > 0 ? (
                  <p style={{ margin: "0.5rem 0 0", color: "#374151" }}>
                    Hidden: {summary.categories.map((c) => categoryLabels[c] ?? c).join(", ")}.
                  </p>
                ) : (
                  <p style={{ margin: "0.5rem 0 0", color: "#6b7280" }}>
                    No obvious identifiers were detected, but masking is now on for this data.
                  </p>
                )}
              </div>
            ) : (
              <p style={{ color: "#6b7280" }}>
                Your codes are stored as provided. Personal information may remain visible.
              </p>
            )}
            <button type="button" onClick={continueToNext} style={primaryButton}>
              Continue
            </button>
          </>
        ) : (
          <>
            <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.15rem" }}>Privacy check</h2>
            <p style={{ margin: "0 0 1rem", color: "#6b7280" }}>
              {codeCount} code{codeCount === 1 ? "" : "s"} added. Choose how to handle personal
              information before continuing. The original file was already discarded.
            </p>

            <label style={radioRow}>
              <input type="radio" checked={applyMasking} onChange={() => setApplyMasking(true)} />
              <span>
                <strong>Mask personal data (recommended)</strong>
                <br />
                <span style={hint}>Hide names, emails, phone numbers, and links.</span>
              </span>
            </label>

            <label style={radioRow}>
              <input type="radio" checked={!applyMasking} onChange={() => setApplyMasking(false)} />
              <span>
                <strong>Keep data as-is</strong>
                <br />
                <span style={hint}>No masking. Personal info may remain in your codes.</span>
              </span>
            </label>

            {error && <p style={{ color: "#b91c1c", margin: "0.5rem 0 0" }}>{error}</p>}

            <button type="button" onClick={apply} disabled={busy} style={primaryButton}>
              {busy ? "Applying…" : applyMasking ? "Apply protection" : "Continue without masking"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  zIndex: 50
};

const modal: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: "1.5rem",
  maxWidth: 460,
  width: "100%",
  boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  display: "grid",
  gap: "0.75rem"
};

const radioRow: React.CSSProperties = {
  display: "flex",
  gap: "0.6rem",
  alignItems: "flex-start",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "0.7rem"
};

const notice: React.CSSProperties = {
  background: "#ecfdf5",
  border: "1px solid #a7f3d0",
  borderRadius: 8,
  padding: "0.75rem",
  fontSize: 14
};

const hint: React.CSSProperties = { color: "#6b7280", fontSize: 13 };

const primaryButton: React.CSSProperties = {
  marginTop: "0.5rem",
  padding: "0.55rem 0.9rem",
  border: "1px solid #1d4ed8",
  background: "#1d4ed8",
  color: "#fff",
  borderRadius: 8,
  fontSize: 14,
  cursor: "pointer",
  justifySelf: "stretch"
};
