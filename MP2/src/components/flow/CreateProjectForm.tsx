"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, isError } from "@/lib/client/api";

type CreatedWorkspace = { workspace: { id: string } };

export function CreateProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [researchQuestion, setResearchQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await apiPost<CreatedWorkspace>("/api/workspaces", {
      name,
      researchQuestion: researchQuestion || undefined
    });

    setBusy(false);

    if (isError(result)) {
      setError(result.error.message);
      return;
    }

    router.push(`/workspaces/${result.data.workspace.id}/ingest`);
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem", maxWidth: 480 }}>
      <label style={{ display: "grid", gap: "0.25rem" }}>
        <span>Project name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Onboarding research Q2"
          style={inputStyle}
        />
      </label>
      <label style={{ display: "grid", gap: "0.25rem" }}>
        <span>Research question (optional)</span>
        <input
          value={researchQuestion}
          onChange={(e) => setResearchQuestion(e.target.value)}
          placeholder="What blocks new users during onboarding?"
          style={inputStyle}
        />
      </label>
      {error && <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}
      <button type="submit" disabled={busy || !name} style={buttonStyle}>
        {busy ? "Creating…" : "Create project"}
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

const buttonStyle: React.CSSProperties = {
  padding: "0.55rem 0.9rem",
  border: "1px solid #1d4ed8",
  background: "#1d4ed8",
  color: "#fff",
  borderRadius: 8,
  fontSize: 14,
  cursor: "pointer",
  justifySelf: "start"
};
