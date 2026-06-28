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
    return <p style={{ color: "var(--color-ink-muted)" }}>No data found for this project yet. Go back and add data first.</p>;
  }

  return (
    <div className="form-surface" style={{ maxWidth: 560 }}>
      <p style={{ margin: 0, color: "var(--color-ink-muted)", fontSize: 14 }}>
        {codeCount} code{codeCount === 1 ? "" : "s"} were extracted. Choose how to handle personal information before
        continuing.
      </p>

      <label className={`radio-card${applyMasking ? " selected" : ""}`}>
        <input type="radio" checked={applyMasking} onChange={() => setApplyMasking(true)} />
        <div>
          <strong>Mask personal data (recommended)</strong>
          <span>Detects and hides names, emails, phone numbers, and links before any analysis.</span>
        </div>
      </label>

      <label className={`radio-card${!applyMasking ? " selected" : ""}`}>
        <input type="radio" checked={!applyMasking} onChange={() => setApplyMasking(false)} />
        <div>
          <strong>Keep data as-is</strong>
          <span>No masking. Personal information may remain in your codes.</span>
        </div>
      </label>

      {error && <p className="form-error">{error}</p>}

      <button type="button" onClick={onContinue} disabled={busy} className="btn btn-primary">
        {busy ? "Applying…" : applyMasking ? "Apply protection & continue" : "Continue without masking"}
      </button>
    </div>
  );
}
