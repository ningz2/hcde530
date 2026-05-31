"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost, apiSend, isError } from "@/lib/client/api";
import { densityBackgroundFromRatio } from "@/lib/color/palette";
import type { BoardView } from "@/domain/services/boardView";

export function BoardClient({ view }: { view: BoardView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateBoard() {
    setBusy(true);
    setError(null);
    const result = await apiPost(`/api/workspaces/${view.workspaceId}/grouping`, {
      boardName: "Affinity board"
    });
    setBusy(false);
    if (isError(result)) {
      setError(result.error.message);
      return;
    }
    router.refresh();
  }

  async function undo() {
    setBusy(true);
    setError(null);
    const result = await apiSend(`/api/workspaces/${view.workspaceId}/history/undo`);
    setBusy(false);
    if (isError(result)) {
      setError(result.error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={generateBoard} disabled={busy} style={primaryButton}>
          {view.board ? "Regenerate board" : "Generate affinity board"}
        </button>
        <button type="button" onClick={undo} disabled={busy} style={secondaryButton}>
          Undo last change
        </button>
        <span style={{ color: "#6b7280", fontSize: 13 }}>
          {view.codeCount} stored codes{view.board ? ` · ${view.themes.length} themes` : ""}
        </span>
      </div>

      {error && <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}

      {!view.board && (
        <p style={{ margin: 0, color: "#6b7280" }}>
          No board yet. Add data, then generate an affinity board to group your codes.
        </p>
      )}

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {view.themes.map((theme) => (
          <ThemeCard key={theme.id} workspaceId={view.workspaceId} theme={theme} onSaved={() => router.refresh()} />
        ))}
      </div>
    </div>
  );
}

function ThemeCard({
  workspaceId,
  theme,
  onSaved
}: {
  workspaceId: string;
  theme: BoardView["themes"][number];
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(theme.title);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const result = await apiPatch(`/api/workspaces/${workspaceId}/themes/${theme.id}`, { title });
    setBusy(false);
    if (!isError(result)) {
      setEditing(false);
      onSaved();
    }
  }

  return (
    <section style={{ border: "1px solid #d1d5db", borderRadius: 10, padding: "0.85rem", background: "#fff" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
        {editing ? (
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1, padding: "0.3rem" }} />
        ) : (
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{theme.title}</h3>
        )}
        {editing ? (
          <button type="button" onClick={save} disabled={busy} style={miniButton}>
            Save
          </button>
        ) : (
          <button type="button" onClick={() => setEditing(true)} style={miniButton}>
            Rename
          </button>
        )}
      </header>

      <p style={{ margin: "0.4rem 0", fontSize: 12 }}>
        <span
          style={{
            display: "inline-block",
            padding: "0.1rem 0.45rem",
            borderRadius: 999,
            background: "#eef2ff",
            color: "#3730a3",
            fontWeight: 600
          }}
        >
          Mentioned by {theme.mentionCount} participant{theme.mentionCount === 1 ? "" : "s"}
        </span>
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
        {theme.assignments.map((assignment) => (
          <li
            key={assignment.codeId}
            style={{
              borderLeft: `4px solid ${assignment.participantHex}`,
              background: densityBackgroundFromRatio(assignment.participantHex, theme.colorDensity),
              borderRadius: 6,
              padding: "0.5rem 0.6rem"
            }}
          >
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{assignment.code}</p>
            {assignment.quote && (
              <p style={{ margin: "0.2rem 0 0", fontSize: 12, fontStyle: "italic", color: "#374151" }}>
                “{assignment.quote}”
              </p>
            )}
            {assignment.memo && (
              <p style={{ margin: "0.2rem 0 0", fontSize: 11, color: "#6b7280" }}>
                Memo: {assignment.memo}
              </p>
            )}
            <p style={{ margin: "0.3rem 0 0", fontSize: 11, color: "#6b7280" }}>
              <span style={{ color: assignment.participantHex, fontWeight: 600 }}>
                {assignment.participantLabel}
              </span>{" "}
              · {assignment.rationale}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

const primaryButton: React.CSSProperties = {
  padding: "0.5rem 0.85rem",
  border: "1px solid #1d4ed8",
  background: "#1d4ed8",
  color: "#fff",
  borderRadius: 8,
  fontSize: 14,
  cursor: "pointer"
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

const miniButton: React.CSSProperties = {
  padding: "0.25rem 0.5rem",
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  borderRadius: 6,
  fontSize: 12,
  cursor: "pointer"
};
