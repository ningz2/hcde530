"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost, apiSend, isError } from "@/lib/client/api";
import { tintForHex } from "@/lib/color/palette";
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

      {/* Canvas: each theme is a zone holding colored sticky notes (one per code). */}
      <div style={canvas}>
        {view.themes.map((theme) => (
          <ThemeZone
            key={theme.id}
            workspaceId={view.workspaceId}
            theme={theme}
            onSaved={() => router.refresh()}
          />
        ))}
      </div>
    </div>
  );
}

function ThemeZone({
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
    <section style={zone}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
        {editing ? (
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1, padding: "0.3rem" }} />
        ) : (
          <h3 style={{ margin: 0, fontSize: "1rem" }}>{theme.title}</h3>
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

      <span style={badge}>
        Mentioned by {theme.mentionCount} participant{theme.mentionCount === 1 ? "" : "s"}
      </span>

      <div style={notesWrap}>
        {theme.assignments.map((assignment) => (
          <div
            key={assignment.codeId}
            title={assignment.rationale}
            style={{
              ...stickyNote,
              background: tintForHex(assignment.participantHex, 0.2),
              borderColor: tintForHex(assignment.participantHex, 0.5),
              borderTop: `5px solid ${assignment.participantHex}`
            }}
          >
            <span style={codeText}>{assignment.code}</span>
            <span style={{ ...participantTag, color: assignment.participantHex }}>
              {assignment.participantLabel}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

const canvas: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "1rem",
  alignItems: "flex-start",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "1rem",
  minHeight: 160
};

const zone: React.CSSProperties = {
  flex: "1 1 260px",
  maxWidth: 360,
  display: "grid",
  gap: "0.5rem",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "0.75rem"
};

const badge: React.CSSProperties = {
  justifySelf: "start",
  padding: "0.1rem 0.45rem",
  borderRadius: 999,
  background: "#eef2ff",
  color: "#3730a3",
  fontWeight: 600,
  fontSize: 11
};

const notesWrap: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem"
};

const stickyNote: React.CSSProperties = {
  width: 120,
  height: 120,
  border: "1px solid",
  borderRadius: 8,
  padding: "0.5rem",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
  overflow: "hidden"
};

const codeText: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#111827",
  lineHeight: 1.25,
  display: "-webkit-box",
  WebkitLineClamp: 4,
  WebkitBoxOrient: "vertical",
  overflow: "hidden"
};

const participantTag: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};

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
