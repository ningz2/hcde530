"use client";

import { useEffect, useRef, useState } from "react";
import { ExportShareClient } from "@/components/flow/ExportShareClient";

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
      <button type="button" onClick={() => setOpen((o) => !o)} className="btn btn-primary">
        Export &amp; share ▾
      </button>
      {open && (
        <div className="popover-panel">
          <p className="popover-hint">Optional — download your board or create an anonymous view-only link.</p>
          <ExportShareClient workspaceId={workspaceId} />
        </div>
      )}
    </div>
  );
}
