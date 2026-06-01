"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, isError } from "@/lib/client/api";

/**
 * Privacy-check step. The user confirms whether to mask personal data in the
 * already-stored quotes. Default is ON (recommended); opting out keeps data as-is.
 */
export function ConsentClient({ workspaceId, codeCount }: { workspaceId: string; codeCount: number }) {
  const router = useRouter();
  const [applyMasking, setApplyMasking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onContinue() {
    setBusy(true);
    setError(null);
    const result = await apiPost(`/api/workspaces/${workspaceId}/anonymization`, { applyMasking });
    setBusy(false);
    if (isError(result)) {
      setError(result.error.message);
      return;
    }
    router.push(`/workspaces/${workspaceId}/board`);
  }

  if (codeCount === 0) {
    return (
      <p style={{ color: "#6b7280" }}>
        No data found for this project yet. Go back and add data first.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 560 }}>
      <p style={{ margin: 0 }}>
        {codeCount} code{codeCount === 1 ? "" : "s"} were extracted. Choose how to handle personal
        information before continuing.
      </p>

      <label style={radioRow}>
        <input type="radio" checked={applyMasking} onChange={() => setApplyMasking(true)} />
        <span>
          <strong>Mask personal data (recommended)</strong>
          <br />
          <span style={{ color: "#6b7280", fontSize: 13 }}>
            Detects and hides names, emails, phone numbers, and links before any analysis.
          </span>
        </span>
      </label>

      <label style={radioRow}>
        <input type="radio" checked={!applyMasking} onChange={() => setApplyMasking(false)} />
        <span>
          <strong>Keep data as-is</strong>
          <br />
          <span style={{ color: "#6b7280", fontSize: 13 }}>
            No masking. Personal information may remain in your codes.
          </span>
        </span>
      </label>

      {error && <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}

      <button type="button" onClick={onContinue} disabled={busy} style={primaryButton}>
        {busy ? "Applying…" : applyMasking ? "Apply protection & continue" : "Continue without masking"}
      </button>
    </div>
  );
}

const radioRow: React.CSSProperties = {
  display: "flex",
  gap: "0.6rem",
  alignItems: "flex-start",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "0.75rem"
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
