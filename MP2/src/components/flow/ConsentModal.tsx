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
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Privacy check">
      <div className="modal-panel">
        {summary ? (
          <>
            <h2>{summary.applied ? "Personal info masked" : "Saved without masking"}</h2>
            {summary.applied ? (
              <div className="notice-success">
                <p style={{ margin: 0 }}>
                  Protected your participants. We masked personal info in{" "}
                  <strong>
                    {summary.maskedCount} of {summary.totalCodes}
                  </strong>{" "}
                  code{summary.totalCodes === 1 ? "" : "s"}.
                </p>
                {summary.categories.length > 0 ? (
                  <p style={{ margin: "8px 0 0", color: "var(--color-ink-muted)" }}>
                    Hidden: {summary.categories.map((c) => categoryLabels[c] ?? c).join(", ")}.
                  </p>
                ) : null}
              </div>
            ) : (
              <p style={{ margin: 0, color: "var(--color-ink-muted)" }}>
                Your codes are stored as provided. Personal information may remain visible.
              </p>
            )}
            <button type="button" onClick={continueToNext} className="btn btn-primary">
              Continue
            </button>
          </>
        ) : (
          <>
            <h2>Privacy check</h2>
            <p style={{ margin: 0, color: "var(--color-ink-muted)", fontSize: 14 }}>
              {codeCount} code{codeCount === 1 ? "" : "s"} added. Choose how to handle personal information before
              continuing.
            </p>

            <label className={`radio-card${applyMasking ? " selected" : ""}`}>
              <input type="radio" checked={applyMasking} onChange={() => setApplyMasking(true)} />
              <div>
                <strong>Mask personal data (recommended)</strong>
                <span>Hide names, emails, phone numbers, and links.</span>
              </div>
            </label>

            <label className={`radio-card${!applyMasking ? " selected" : ""}`}>
              <input type="radio" checked={!applyMasking} onChange={() => setApplyMasking(false)} />
              <div>
                <strong>Keep data as-is</strong>
                <span>No masking. Personal info may remain in your codes.</span>
              </div>
            </label>

            {error && <p className="form-error">{error}</p>}

            <button type="button" onClick={apply} disabled={busy} className="btn btn-primary">
              {busy ? "Applying…" : applyMasking ? "Apply protection" : "Continue without masking"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
