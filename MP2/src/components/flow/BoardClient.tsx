"use client";

import { useLayoutEffect, useRef, useState } from "react";
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

const PANEL_MARGIN = 12;
const PANEL_SNAP_THRESHOLD = 72;

type PanelBounds = {
  viewportWidth: number;
  viewportHeight: number;
  panelWidth: number;
  panelHeight: number;
};

function panelEdgeLimits(bounds: PanelBounds) {
  return {
    minX: PANEL_MARGIN,
    minY: PANEL_MARGIN,
    maxX: Math.max(PANEL_MARGIN, bounds.viewportWidth - bounds.panelWidth - PANEL_MARGIN),
    maxY: Math.max(PANEL_MARGIN, bounds.viewportHeight - bounds.panelHeight - PANEL_MARGIN)
  };
}

function clampPanelPosition(x: number, y: number, bounds: PanelBounds) {
  const { minX, minY, maxX, maxY } = panelEdgeLimits(bounds);
  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y))
  };
}

function snapPanelToEdges(x: number, y: number, bounds: PanelBounds) {
  const { minX, minY, maxX, maxY } = panelEdgeLimits(bounds);
  const clamped = clampPanelPosition(x, y, bounds);

  let snappedX = clamped.x;
  if (clamped.x - minX <= PANEL_SNAP_THRESHOLD) snappedX = minX;
  else if (maxX - clamped.x <= PANEL_SNAP_THRESHOLD) snappedX = maxX;

  let snappedY = clamped.y;
  if (clamped.y - minY <= PANEL_SNAP_THRESHOLD) snappedY = minY;
  else if (maxY - clamped.y <= PANEL_SNAP_THRESHOLD) snappedY = maxY;

  return { x: snappedX, y: snappedY };
}

function positionForSnap(
  snapX: "left" | "right" | "free",
  snapY: "top" | "bottom" | "free",
  bounds: PanelBounds,
  current: { x: number; y: number }
) {
  const { minX, minY, maxX, maxY } = panelEdgeLimits(bounds);
  return {
    x: snapX === "left" ? minX : snapX === "right" ? maxX : current.x,
    y: snapY === "top" ? minY : snapY === "bottom" ? maxY : current.y
  };
}

function resolveSnapAnchors(
  position: { x: number; y: number },
  bounds: PanelBounds
): { x: "left" | "right" | "free"; y: "top" | "bottom" | "free" } {
  const { minX, minY, maxX, maxY } = panelEdgeLimits(bounds);
  return {
    x: Math.abs(position.x - minX) <= 2 ? "left" : Math.abs(position.x - maxX) <= 2 ? "right" : "free",
    y: Math.abs(position.y - minY) <= 2 ? "top" : Math.abs(position.y - maxY) <= 2 ? "bottom" : "free"
  };
}

export function BoardClient({ view }: { view: BoardView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Canvas view transform (Miro/FigJam-style zoom + pan).
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ x: PANEL_MARGIN, y: PANEL_MARGIN });
  const panelPositionRef = useRef(panelPosition);
  const [panelDragging, setPanelDragging] = useState(false);
  const [panelSnap, setPanelSnap] = useState<{ x: "left" | "right" | "free"; y: "top" | "bottom" | "free" }>({
    x: "right",
    y: "top"
  });
  const panelRef = useRef<HTMLElement | null>(null);
  const panelDragRef = useRef<{ x: number; y: number; panelX: number; panelY: number } | null>(null);

  // Control panel state, seeded from the current board.
  const [mode, setMode] = useState<HierarchyMode>(view.board?.hierarchyMode ?? "GROUPS");
  const [groupGranularity, setGroupGranularity] = useState(view.board?.groupGranularity ?? 4);
  const [themeGranularity, setThemeGranularity] = useState(view.board?.themeGranularity ?? 2);

  const maxGroups = Math.max(2, Math.min(12, view.codeCount || 2));
  const effectiveGroupGranularity = Math.min(groupGranularity, maxGroups);
  const maxThemes = Math.max(1, effectiveGroupGranularity - 1);
  const effectiveThemeGranularity = Math.min(themeGranularity, maxThemes);

  async function regenerate() {
    setBusy(true);
    setError(null);
    const result = await apiPost(`/api/workspaces/${view.workspaceId}/grouping`, {
      boardName: "Affinity board",
      hierarchyMode: mode,
      groupGranularity: effectiveGroupGranularity,
      themeGranularity: effectiveThemeGranularity
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
  function getPanelBounds(): PanelBounds | null {
    const viewportRect = viewportRef.current?.getBoundingClientRect();
    const panelRect = panelRef.current?.getBoundingClientRect();
    if (!viewportRect || !panelRect) return null;
    return {
      viewportWidth: viewportRect.width,
      viewportHeight: viewportRect.height,
      panelWidth: panelRect.width,
      panelHeight: panelRect.height
    };
  }

  function endDrag() {
    if (panelDragRef.current) {
      const bounds = getPanelBounds();
      if (bounds) {
        const snapped = snapPanelToEdges(panelPositionRef.current.x, panelPositionRef.current.y, bounds);
        panelPositionRef.current = snapped;
        setPanelPosition(snapped);
        setPanelSnap(resolveSnapAnchors(snapped, bounds));
      }
      setPanelDragging(false);
    }
    dragRef.current = null;
    panelDragRef.current = null;
  }

  function startPanelDrag(e: React.MouseEvent) {
    setPanelDragging(true);
    panelDragRef.current = {
      x: e.clientX,
      y: e.clientY,
      panelX: panelPosition.x,
      panelY: panelPosition.y
    };
  }

  function onPanelDrag(e: React.MouseEvent) {
    const d = panelDragRef.current;
    if (!d) return;
    const bounds = getPanelBounds();
    if (!bounds) return;
    const next = clampPanelPosition(d.panelX + (e.clientX - d.x), d.panelY + (e.clientY - d.y), bounds);
    panelPositionRef.current = next;
    setPanelPosition(next);
  }

  useLayoutEffect(() => {
    function syncDockedPanel() {
      const bounds = getPanelBounds();
      if (!bounds) return;
      const next = positionForSnap(panelSnap.x, panelSnap.y, bounds, panelPositionRef.current);
      panelPositionRef.current = next;
      setPanelPosition(next);
    }

    syncDockedPanel();
    window.addEventListener("resize", syncDockedPanel);
    return () => window.removeEventListener("resize", syncDockedPanel);
  }, [panelCollapsed, panelSnap.x, panelSnap.y]);

  const hasBoard = Boolean(view.board) && view.tree.length > 0;

  return (
    <div style={{ display: "grid", gap: "0.5rem", width: "100%" }}>
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
        ref={viewportRef}
        style={canvasViewport}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={(e) => {
          onMouseMove(e);
          onPanelDrag(e);
        }}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
      >
        {hasBoard ? (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: "top left",
              display: "flex",
              flexWrap: "nowrap",
              gap: "1.25rem",
              alignItems: "flex-start",
              padding: "1.25rem"
            }}
          >
            {view.tree.map((node) => (
              <div key={node.id} style={{ flex: "0 0 auto" }}>
                <NodeBox
                  workspaceId={view.workspaceId}
                  node={node}
                  canvasScale={scale}
                  onSaved={() => router.refresh()}
                />
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#6b7280", padding: "1rem" }}>
            {view.codeCount === 0
              ? "No codes yet. Add data to generate an affinity board."
              : "Preparing your board…"}
          </p>
        )}

        {/* "Organize the board" panel floats inside the canvas and can be moved out of the way. */}
        <aside
          ref={panelRef}
          style={{
            ...panel,
            left: panelPosition.x,
            top: panelPosition.y,
            width: panelCollapsed ? 190 : 250,
            transition: panelDragging ? "none" : "left 0.22s ease-out, top 0.22s ease-out"
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          <div style={panelHeader} onMouseDown={startPanelDrag} title="Drag to move · release near an edge to snap">
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Organize the board</h3>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setPanelCollapsed((v) => !v)}
              style={panelIconButton}
              aria-label={panelCollapsed ? "Expand organize panel" : "Collapse organize panel"}
            >
              {panelCollapsed ? "+" : "−"}
            </button>
          </div>

          {panelCollapsed ? (
            <p style={{ ...panelHint, margin: 0 }}>Drag near a canvas edge to snap. Expand when you need controls.</p>
          ) : (
            <>

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
              Group granularity: <strong>{effectiveGroupGranularity}</strong> groups
            </span>
            <input
              type="range"
              min={2}
              max={maxGroups}
              value={effectiveGroupGranularity}
              onChange={(e) => {
                const next = Number(e.target.value);
                setGroupGranularity(next);
                setThemeGranularity((current) => Math.min(current, Math.max(1, next - 1)));
              }}
              style={{ width: "100%" }}
            />
            <span style={panelHint}>Fewer = broader groups · more = finer groups.</span>
          </div>

          <div style={{ opacity: mode === "GROUPS" ? 0.45 : 1 }}>
            <span style={panelLabel}>
              Theme granularity: <strong>{effectiveThemeGranularity}</strong> themes
            </span>
            <input
              type="range"
              min={1}
            max={Math.min(8, maxThemes)}
            value={effectiveThemeGranularity}
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
            </>
          )}
        </aside>
      </div>
      <span style={{ fontSize: 12, color: "#9ca3af" }}>Scroll to zoom · drag the background to pan.</span>
    </div>
  );
}

function NodeBox({
  workspaceId,
  node,
  canvasScale,
  onSaved
}: {
  workspaceId: string;
  node: BoardNode;
  canvasScale: number;
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
              className="sticky-note-hover"
              style={stickyNoteWrap}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
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
              <div
                className="sticky-note-hover-card"
                style={{
                  ...hoverCard,
                  transform: `scale(${1 / canvasScale})`,
                  transformOrigin: "top left"
                }}
              >
                <h4 style={hoverTitle}>{a.code}</h4>
                <InfoRow label="Why here" value={a.rationale} />
                <InfoRow label="Quote" value={a.quote} empty="No associated quote" />
                <InfoRow label="Memo" value={a.memo} empty="No memo" />
                <InfoRow label="Source file" value={a.sourceRef} empty="Pasted text / unknown source" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={childrenWrap}>
          {node.children.map((child) => (
            <NodeBox
              key={child.id}
              workspaceId={workspaceId}
              node={child}
              canvasScale={canvasScale}
              onSaved={onSaved}
            />
          ))}
        </div>
      )}
      <style jsx>{`
        .sticky-note-hover:hover {
          z-index: 30;
        }
        .sticky-note-hover:hover .sticky-note-hover-card {
          display: block !important;
        }
      `}</style>
    </section>
  );
}

function InfoRow({ label, value, empty }: { label: string; value?: string; empty?: string }) {
  return (
    <div style={infoRow}>
      <span style={infoLabel}>{label}</span>
      <p style={{ ...infoValue, color: value ? "#374151" : "#9ca3af", fontStyle: value ? "normal" : "italic" }}>
        {value || empty || "Not provided"}
      </p>
    </div>
  );
}

const toolbar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem"
};

const zoomButton: React.CSSProperties = {
  border: "1px solid var(--af-border)",
  background: "rgba(255,255,255,0.92)",
  borderRadius: 6,
  padding: "0.25rem 0.5rem",
  fontSize: 13,
  cursor: "pointer",
  color: "var(--af-text)"
};

const canvasViewport: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "calc(100vh - 230px)",
  minHeight: 480,
  overflow: "hidden",
  background: "linear-gradient(135deg, #f8fbff, #f6f0ff)",
  backgroundImage: "radial-gradient(rgba(37,99,235,0.18) 1px, transparent 1px)",
  backgroundSize: "20px 20px",
  border: "1px solid var(--af-border)",
  borderRadius: 18,
  boxShadow: "var(--af-shadow)",
  cursor: "grab"
};

const containerBase: React.CSSProperties = {
  borderRadius: 16,
  padding: "0.75rem",
  display: "grid",
  gap: "0.5rem",
  alignContent: "start"
};

const containerL1: React.CSSProperties = {
  background: "rgba(255,255,255,0.9)",
  border: "1px solid var(--af-border)",
  boxShadow: "var(--af-shadow-soft)",
  backdropFilter: "blur(8px)"
};

const containerL2: React.CSSProperties = {
  background: "rgba(248,251,255,0.9)",
  border: "1px dashed rgba(124,58,237,0.35)"
};

const containerL3: React.CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid var(--af-border)"
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
  color: "var(--af-blue)",
  fontWeight: 600,
  fontSize: 11
};

const notesWrap: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  maxWidth: 420
};

const stickyNoteWrap: React.CSSProperties = {
  position: "relative",
  width: 120,
  height: 120
};

const stickyNote: React.CSSProperties = {
  width: 120,
  height: 120,
  border: "1px solid",
  borderRadius: 12,
  padding: "0.5rem",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
  overflow: "hidden"
};

const hoverCard: React.CSSProperties = {
  position: "absolute",
  left: "calc(100% + 0.6rem)",
  top: 0,
  width: 280,
  maxHeight: 320,
  overflowY: "auto",
  background: "rgba(255,255,255,0.96)",
  border: "1px solid var(--af-border)",
  borderRadius: 12,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
  padding: "0.75rem",
  display: "none",
  zIndex: 20,
  pointerEvents: "none"
};

const hoverTitle: React.CSSProperties = {
  margin: "0 0 0.5rem",
  color: "var(--af-text)",
  fontSize: 14,
  lineHeight: 1.25
};

const infoRow: React.CSSProperties = {
  display: "grid",
  gap: "0.1rem",
  paddingTop: "0.45rem",
  borderTop: "1px solid var(--af-border)"
};

const infoLabel: React.CSSProperties = {
  color: "var(--af-blue)",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em"
};

const infoValue: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.4
};

const codeText: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--af-text)",
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
  border: "1px solid var(--af-border)",
  background: "#fff",
  color: "var(--af-text)",
  borderRadius: 6,
  fontSize: 12,
  cursor: "pointer"
};

const panel: React.CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  width: 250,
  maxHeight: "calc(100% - 24px)",
  overflowY: "auto",
  display: "grid",
  gap: "1rem",
  background: "rgba(255,255,255,0.9)",
  border: "1px solid var(--af-border)",
  borderRadius: 16,
  padding: "1rem",
  boxShadow: "var(--af-shadow)",
  backdropFilter: "blur(16px)",
  zIndex: 5,
  cursor: "default"
};

const panelHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  cursor: "move",
  userSelect: "none"
};

const panelIconButton: React.CSSProperties = {
  width: 28,
  height: 28,
  border: "1px solid var(--af-border)",
  borderRadius: 999,
  background: "#fff",
  color: "var(--af-text)",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 4px 12px rgba(23, 32, 51, 0.08)"
};

const panelLabel: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--af-text)",
  marginBottom: "0.35rem"
};

const panelHint: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--af-muted)",
  marginTop: "0.25rem"
};

const gradientRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
  background: "var(--af-gradient)",
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
  border: "1px solid var(--af-blue)",
  background: "var(--af-gradient)",
  color: "#fff",
  borderRadius: 8,
  fontSize: 14,
  cursor: "pointer"
};
