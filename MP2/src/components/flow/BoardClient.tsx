"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost, apiSend, isError } from "@/lib/client/api";
import { tintForHex } from "@/lib/color/palette";
import type { BoardNode, BoardView } from "@/domain/services/boardView";
import type { HierarchyMode } from "@/lib/repo/store";

const HIERARCHY_OPTIONS: { mode: HierarchyMode; label: string; hint: string }[] = [
  { mode: "GROUPS", label: "Groups", hint: "Flat named groups of codes." },
  { mode: "THEMES", label: "Themes", hint: "Groups nested inside broader themes." },
  { mode: "RQS", label: "By research questions", hint: "Themes organized under each research question." }
];

export function BoardClient({ view }: { view: BoardView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Canvas view transform (Miro/FigJam-style zoom + pan).
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Control panel state, seeded from the current board.
  const [mode, setMode] = useState<HierarchyMode>(view.board?.hierarchyMode ?? "GROUPS");
  const [groupGranularity, setGroupGranularity] = useState(view.board?.groupGranularity ?? 4);
  const [themeGranularity, setThemeGranularity] = useState(view.board?.themeGranularity ?? 2);

  const maxGroups = Math.max(2, Math.min(12, view.codeCount || 2));

  async function regenerate() {
    setBusy(true);
    setError(null);
    const result = await apiPost(`/api/workspaces/${view.workspaceId}/grouping`, {
      boardName: "Affinity board",
      hierarchyMode: mode,
      groupGranularity: Math.min(groupGranularity, maxGroups),
      themeGranularity
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

  function onWheel(e: React.WheelEvent) {
    if (e.deltaY === 0) return;
    e.preventDefault();
    setScale((s) => Math.max(0.4, Math.min(2, s - e.deltaY * 0.0015)));
  }

  function onMouseDown(e: React.MouseEvent) {
    // Don't start a pan when interacting with controls inside the canvas.
    if ((e.target as HTMLElement).closest("button, input")) return;
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    const d = dragRef.current;
    if (!d) return;
    setPan({ x: d.panX + (e.clientX - d.x), y: d.panY + (e.clientY - d.y) });
  }
  function endDrag() {
    dragRef.current = null;
  }

  const hasBoard = Boolean(view.board) && view.tree.length > 0;

  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "stretch", flexWrap: "wrap" }}>
      {/* Canvas */}
      <div style={{ flex: "1 1 520px", minWidth: 320, display: "grid", gap: "0.5rem" }}>
        <div style={toolbar}>
          <span style={{ color: "#6b7280", fontSize: 13 }}>
            {view.codeCount} codes{view.board ? ` · ${view.themes.length} groups` : ""}
          </span>
          <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", marginLeft: "auto" }}>
            <button type="button" onClick={() => setScale((s) => Math.max(0.4, s - 0.15))} style={zoomButton}>
              −
            </button>
            <span style={{ fontSize: 12, color: "#6b7280", width: 38, textAlign: "center" }}>
              {Math.round(scale * 100)}%
            </span>
            <button type="button" onClick={() => setScale((s) => Math.min(2, s + 0.15))} style={zoomButton}>
              +
            </button>
            <button
              type="button"
              onClick={() => {
                setScale(1);
                setPan({ x: 0, y: 0 });
              }}
              style={zoomButton}
              title="Reset view"
            >
              ⟳
            </button>
            <button type="button" onClick={undo} disabled={busy} style={zoomButton} title="Undo last change">
              Undo
            </button>
          </div>
        </div>

        {error && <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}

        <div
          style={canvasViewport}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
        >
          {hasBoard ? (
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: "top left",
                display: "flex",
                flexWrap: "wrap",
                gap: "1rem",
                alignItems: "flex-start",
                padding: "1rem"
              }}
            >
              {view.tree.map((node) => (
                <NodeBox
                  key={node.id}
                  workspaceId={view.workspaceId}
                  node={node}
                  onSaved={() => router.refresh()}
                />
              ))}
            </div>
          ) : (
            <p style={{ color: "#6b7280", padding: "1rem" }}>
              {view.codeCount === 0
                ? "No codes yet. Add data to generate an affinity board."
                : "Preparing your board…"}
            </p>
          )}
        </div>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>
          Scroll to zoom · drag the background to pan.
        </span>
      </div>

      {/* Right control panel */}
      <aside style={panel}>
        <h3 style={{ margin: 0, fontSize: "1rem" }}>Organize the board</h3>

        <div>
          <span style={panelLabel}>Hierarchy</span>
          <div style={gradientRow}>
            {HIERARCHY_OPTIONS.map((opt) => (
              <button
                key={opt.mode}
                type="button"
                onClick={() => setMode(opt.mode)}
                style={{
                  ...gradientOption,
                  ...(mode === opt.mode ? gradientOptionActive : {})
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span style={panelHint}>{HIERARCHY_OPTIONS.find((o) => o.mode === mode)?.hint}</span>
        </div>

        <div>
          <span style={panelLabel}>
            Group granularity: <strong>{Math.min(groupGranularity, maxGroups)}</strong> groups
          </span>
          <input
            type="range"
            min={2}
            max={maxGroups}
            value={Math.min(groupGranularity, maxGroups)}
            onChange={(e) => setGroupGranularity(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <span style={panelHint}>Fewer = broader groups · more = finer groups.</span>
        </div>

        <div style={{ opacity: mode === "GROUPS" ? 0.45 : 1 }}>
          <span style={panelLabel}>
            Theme granularity: <strong>{themeGranularity}</strong> themes
          </span>
          <input
            type="range"
            min={1}
            max={8}
            value={themeGranularity}
            disabled={mode === "GROUPS"}
            onChange={(e) => setThemeGranularity(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <span style={panelHint}>
            {mode === "GROUPS" ? "Switch to Themes or RQs to use this." : "How many mid-level themes to create."}
          </span>
        </div>

        <button type="button" onClick={regenerate} disabled={busy} style={applyButton}>
          {busy ? "Generating…" : "Apply"}
        </button>
      </aside>
    </div>
  );
}

function NodeBox({
  workspaceId,
  node,
  onSaved
}: {
  workspaceId: string;
  node: BoardNode;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(node.title);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const result = await apiPatch(`/api/workspaces/${workspaceId}/themes/${node.id}`, { title });
    setBusy(false);
    if (!isError(result)) {
      setEditing(false);
      onSaved();
    }
  }

  const isLeaf = node.children.length === 0;
  const tone =
    node.level === 1 ? containerL1 : node.level === 2 ? containerL2 : containerL3;

  return (
    <section style={{ ...containerBase, ...tone }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
        {editing ? (
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1, padding: "0.3rem" }} />
        ) : (
          <h3 style={{ margin: 0, fontSize: node.level === 1 ? "1.02rem" : "0.92rem" }}>{node.title}</h3>
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

      {node.mentionCount > 0 && (
        <span style={badge}>
          Mentioned by {node.mentionCount} participant{node.mentionCount === 1 ? "" : "s"}
        </span>
      )}

      {isLeaf ? (
        <div style={notesWrap}>
          {node.assignments.map((a) => (
            <div
              key={a.codeId}
              title={a.rationale}
              style={{
                ...stickyNote,
                background: tintForHex(a.participantHex, 0.2),
                borderColor: tintForHex(a.participantHex, 0.5),
                borderTop: `5px solid ${a.participantHex}`
              }}
            >
              <span style={codeText}>{a.code}</span>
              <span style={{ ...participantTag, color: a.participantHex }}>{a.participantLabel}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={childrenWrap}>
          {node.children.map((child) => (
            <NodeBox key={child.id} workspaceId={workspaceId} node={child} onSaved={onSaved} />
          ))}
        </div>
      )}
    </section>
  );
}

const toolbar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem"
};

const zoomButton: React.CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#fff",
  borderRadius: 6,
  padding: "0.25rem 0.5rem",
  fontSize: 13,
  cursor: "pointer",
  color: "#374151"
};

const canvasViewport: React.CSSProperties = {
  position: "relative",
  height: 600,
  overflow: "hidden",
  background: "#f8fafc",
  backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)",
  backgroundSize: "20px 20px",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  cursor: "grab"
};

const containerBase: React.CSSProperties = {
  borderRadius: 12,
  padding: "0.75rem",
  display: "grid",
  gap: "0.5rem",
  alignContent: "start"
};

const containerL1: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
};

const containerL2: React.CSSProperties = {
  background: "#fbfcff",
  border: "1px dashed #c7d2fe"
};

const containerL3: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb"
};

const childrenWrap: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.6rem",
  alignItems: "flex-start"
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
  gap: "0.5rem",
  maxWidth: 420
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

const miniButton: React.CSSProperties = {
  padding: "0.25rem 0.5rem",
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  borderRadius: 6,
  fontSize: 12,
  cursor: "pointer"
};

const panel: React.CSSProperties = {
  flex: "0 0 250px",
  alignSelf: "flex-start",
  position: "sticky",
  top: "1rem",
  display: "grid",
  gap: "1rem",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "1rem"
};

const panelLabel: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  marginBottom: "0.35rem"
};

const panelHint: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#6b7280",
  marginTop: "0.25rem"
};

const gradientRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
  background: "linear-gradient(135deg, #2563eb, #7c3aed)",
  padding: "0.3rem",
  borderRadius: 10
};

const gradientOption: React.CSSProperties = {
  border: "none",
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
  borderRadius: 7,
  padding: "0.45rem 0.5rem",
  fontSize: 13,
  cursor: "pointer",
  textAlign: "left",
  fontWeight: 600
};

const gradientOptionActive: React.CSSProperties = {
  background: "#fff",
  color: "#3730a3"
};

const applyButton: React.CSSProperties = {
  padding: "0.55rem 0.9rem",
  border: "1px solid #1d4ed8",
  background: "#1d4ed8",
  color: "#fff",
  borderRadius: 8,
  fontSize: 14,
  cursor: "pointer"
};
