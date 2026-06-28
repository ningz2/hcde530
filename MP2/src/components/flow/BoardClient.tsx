"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost, apiSend, isError } from "@/lib/client/api";
import { tokensForHex } from "@/lib/color/palette";
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
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const [mode, setMode] = useState<HierarchyMode>(view.board?.hierarchyMode ?? "GROUPS");
  const [groupGranularity, setGroupGranularity] = useState(view.board?.groupGranularity ?? 4);
  const [themeGranularity, setThemeGranularity] = useState(view.board?.themeGranularity ?? 2);

  const maxGroups = Math.max(2, Math.min(12, view.codeCount || 2));
  const effectiveGroupGranularity = Math.min(groupGranularity, maxGroups);
  const maxThemes = Math.max(1, effectiveGroupGranularity - 1);
  const effectiveThemeGranularity = Math.min(themeGranularity, maxThemes);
  const hasBoard = Boolean(view.board) && view.tree.length > 0;

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
    if ((e.target as HTMLElement).closest("button, input, aside, .float-toolbar, .minimap, .inspector-tab")) return;
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

  function resetView() {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }

  function fitBoard() {
    if (view.tree.length <= 3) {
      resetView();
      return;
    }
    setScale(0.65);
    setPan({ x: 0, y: 0 });
  }

  return (
    <div className="board-client">
      {error && <p className="board-error">{error}</p>}

      <div className="board-row">
        <div className="canvas-wrap">
          <div
            ref={viewportRef}
            className="canvas-viewport"
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
          >
            {hasBoard ? (
              <div
                className="canvas-inner"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                  transformOrigin: "top left"
                }}
              >
                {view.tree.map((node) => (
                  <div key={node.id} className="board-group">
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
              <p className="canvas-empty">
                {view.codeCount === 0
                  ? "No codes yet. Add data to generate an affinity board."
                  : "Preparing your board…"}
              </p>
            )}

            <div className="float-toolbar" aria-label="Canvas controls">
              <button type="button" className="icon-btn" title="Zoom out" onClick={() => setScale((s) => Math.max(0.4, s - 0.15))}>
                −
              </button>
              <span className="zoom-label">{Math.round(scale * 100)}%</span>
              <button type="button" className="icon-btn" title="Zoom in" onClick={() => setScale((s) => Math.min(2, s + 0.15))}>
                +
              </button>
              <div className="toolbar-divider" />
              <button type="button" className="icon-btn" title="100%" onClick={() => setScale(1)}>
                100%
              </button>
              <button type="button" className="icon-btn" title="Fit board" onClick={fitBoard}>
                ⤢
              </button>
              <div className="toolbar-divider" />
              <button type="button" className="icon-btn" title="Undo last change" disabled={busy} onClick={undo}>
                ↶
              </button>
            </div>

            {hasBoard && view.tree.length > 0 && (
              <div className="minimap" aria-hidden="true">
                <div className="minimap-label">Overview</div>
                <div className="minimap-viewport">
                  {view.tree.map((_, i) => {
                    const width = Math.max(18, 100 / view.tree.length - 4);
                    const left = 4 + i * (100 / view.tree.length);
                    return (
                      <div
                        key={i}
                        className="minimap-block"
                        style={{ left: `${left}%`, top: "18%", width: `${width}%`, height: "58%" }}
                      />
                    );
                  })}
                  <div className="minimap-frame" style={{ left: "8%", top: "8%", width: "78%", height: "76%" }} />
                </div>
              </div>
            )}

            {!inspectorOpen && (
              <button
                type="button"
                className="inspector-tab visible"
                title="Show organize inspector"
                onClick={() => setInspectorOpen(true)}
              >
                Organize
              </button>
            )}
          </div>
        </div>

        <aside className={`inspector${inspectorOpen ? "" : " collapsed"}`} aria-hidden={!inspectorOpen}>
          <div className="inspector-head">
            <h2>Organize</h2>
            <button
              type="button"
              className="icon-btn"
              style={{ width: 28, height: 28, border: "1px solid var(--color-border)" }}
              title="Hide organize inspector"
              aria-expanded={inspectorOpen}
              onClick={() => setInspectorOpen(false)}
            >
              −
            </button>
          </div>
          <div className="inspector-body">
            <p className="inspector-hint">Adjust hierarchy and granularity, then apply to regenerate groups.</p>

            <div>
              <span className="field-label">Hierarchy</span>
              <div className="segment-list">
                {HIERARCHY_OPTIONS.map((opt) => (
                  <button
                    key={opt.mode}
                    type="button"
                    className={`segment-btn${mode === opt.mode ? " active" : ""}`}
                    onClick={() => setMode(opt.mode)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="inspector-hint">{HIERARCHY_OPTIONS.find((o) => o.mode === mode)?.hint}</p>
            </div>

            <div>
              <span className="field-label">Group granularity · {effectiveGroupGranularity}</span>
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
              <p className="inspector-hint">Fewer = broader groups</p>
            </div>

            <div style={{ opacity: mode === "GROUPS" ? 0.45 : 1 }}>
              <span className="field-label">Theme granularity · {effectiveThemeGranularity}</span>
              <input
                type="range"
                min={1}
                max={Math.min(8, maxThemes)}
                value={effectiveThemeGranularity}
                disabled={mode === "GROUPS"}
                onChange={(e) => setThemeGranularity(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <p className="inspector-hint">
                {mode === "GROUPS" ? "Switch to Themes or RQs to use this." : "How many mid-level themes to create."}
              </p>
            </div>

            <button type="button" onClick={regenerate} disabled={busy} className="btn btn-primary" style={{ width: "100%" }}>
              {busy ? "Generating…" : "Apply"}
            </button>
          </div>
        </aside>
      </div>
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
  const levelClass = node.level === 2 ? " level-2" : node.level >= 3 ? " level-3" : "";

  return (
    <section className={`board-node${levelClass}`}>
      <header className="board-node-header">
        {editing ? (
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="board-rename-input" />
        ) : (
          <h3 className={node.level > 1 ? "small" : undefined}>{node.title}</h3>
        )}
        {editing ? (
          <button type="button" onClick={save} disabled={busy} className="btn" style={{ height: 32, fontSize: 12 }}>
            Save
          </button>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="btn btn-quiet" style={{ height: 32, fontSize: 12 }}>
            Rename
          </button>
        )}
      </header>

      {node.mentionCount > 0 && (
        <span className="board-badge">
          Mentioned by {node.mentionCount} participant{node.mentionCount === 1 ? "" : "s"}
        </span>
      )}

      {isLeaf ? (
        <div className="board-notes">
          {node.assignments.map((a) => {
            const colors = tokensForHex(a.participantHex);
            const sourceHint =
              a.sourceRef?.trim() ||
              (a.participantLabel && a.participantLabel !== "Unassigned" ? a.participantLabel : undefined);
            return (
              <div
                key={a.codeId}
                className="sticky-note-hover"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div
                  className="sticky-note"
                  style={{
                    background: colors.bg,
                    borderColor: colors.edge,
                    color: colors.ink
                  }}
                >
                  <span className="sticky-note-code">{a.code}</span>
                  {sourceHint ? (
                    <span className="sticky-note-source" title={sourceHint}>
                      {sourceHint}
                    </span>
                  ) : null}
                </div>
                <div
                  className="sticky-note-hover-card"
                  style={{
                    transform: `scale(${1 / canvasScale})`,
                    transformOrigin: "top left"
                  }}
                >
                  <h4 className="hover-card-title">{a.code}</h4>
                  <InfoRow label="Why here" value={a.rationale} />
                  <InfoRow label="Quote" value={a.quote} empty="No associated quote" />
                  <InfoRow label="Memo" value={a.memo} empty="No memo" />
                  <InfoRow label="Source file" value={a.sourceRef ?? sourceHint} empty="Pasted text / unknown source" subdued />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="board-children">
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
    </section>
  );
}

function InfoRow({
  label,
  value,
  empty,
  subdued
}: {
  label: string;
  value?: string;
  empty?: string;
  subdued?: boolean;
}) {
  const text = value || empty || "Not provided";
  const isEmpty = !value;
  return (
    <div className={`hover-card-row${subdued ? " subdued" : ""}`}>
      <span className="hover-card-label">{label}</span>
      <p className={`hover-card-value${isEmpty ? " empty" : ""}`}>{text}</p>
    </div>
  );
}
