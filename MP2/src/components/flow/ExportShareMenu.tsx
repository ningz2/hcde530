"use client";

import { useEffect, useRef, useState } from "react";
import { ExportShareClient } from "@/components/flow/ExportShareClient";

/**
 * Compact top-right "Export & share" control. Click to open a popover holding
 * the full export/share options without taking up board space.
 */
export function ExportShareMenu({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={trigger}>
        Export &amp; share ▾
      </button>
      {open && (
        <div style={popover}>
          <p style={{ margin: "0 0 0.5rem", color: "#6b7280", fontSize: 12 }}>
            Optional — download your board or create an anonymous view-only link.
          </p>
          <ExportShareClient workspaceId={workspaceId} />
        </div>
      )}
    </div>
  );
}

const trigger: React.CSSProperties = {
  padding: "0.5rem 0.85rem",
  border: "1px solid var(--af-blue)",
  background: "var(--af-gradient)",
  color: "#fff",
  borderRadius: 10,
  fontSize: 14,
  cursor: "pointer",
  whiteSpace: "nowrap"
};

const popover: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 0.5rem)",
  right: 0,
  width: 360,
  maxWidth: "90vw",
  maxHeight: "70vh",
  overflowY: "auto",
  background: "rgba(255,255,255,0.96)",
  border: "1px solid var(--af-border)",
  borderRadius: 16,
  boxShadow: "var(--af-shadow)",
  backdropFilter: "blur(16px)",
  padding: "1rem",
  zIndex: 40
};
