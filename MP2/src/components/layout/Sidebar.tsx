"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiSend, isError } from "@/lib/client/api";

type Project = { id: string; name: string };

const STORAGE_KEY = "mp2-sidebar-collapsed";

/**
 * Collapsible project sidebar (chat-style thread list). Projects are the
 * "threads"; click to open a board, or delete with a confirmation. The
 * collapsed/expanded state is remembered in localStorage.
 */
export function Sidebar({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    setError(null);
    const result = await apiSend(`/api/workspaces/${pendingDelete.id}`, "DELETE");
    setBusy(false);
    if (isError(result)) {
      setError(result.error.message);
      return;
    }
    const deletedId = pendingDelete.id;
    setPendingDelete(null);
    // If we deleted the project we're viewing, go home; otherwise just refresh.
    if (pathname.includes(deletedId)) {
      router.push("/");
    } else {
      router.refresh();
    }
  }

  return (
    <aside style={{ ...sidebar, width: collapsed ? 52 : 264 }}>
      <div style={topRow}>
        {!collapsed && <span style={{ fontWeight: 700, fontSize: 14 }}>Projects</span>}
        <button
          type="button"
          onClick={toggle}
          style={iconButton}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      {!collapsed && (
        <>
          <Link href="/" style={newButton}>
            + New project
          </Link>

          <nav style={{ overflowY: "auto", display: "grid", gap: "0.2rem", marginTop: "0.5rem" }}>
            {projects.length === 0 ? (
              <span style={{ color: "#9ca3af", fontSize: 13, padding: "0.4rem 0.5rem" }}>
                No projects yet.
              </span>
            ) : (
              projects.map((p) => {
                const active = pathname.includes(p.id);
                return (
                  <div key={p.id} style={{ ...threadRow, background: active ? "#eef2ff" : "transparent" }}>
                    <Link
                      href={`/workspaces/${p.id}/board`}
                      style={{
                        ...threadLink,
                        color: active ? "#3730a3" : "#1f2937",
                        fontWeight: active ? 600 : 400
                      }}
                      title={p.name}
                    >
                      {p.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(p)}
                      style={trashButton}
                      aria-label={`Delete ${p.name}`}
                      title="Delete project"
                    >
                      ×
                    </button>
                  </div>
                );
              })
            )}
          </nav>
        </>
      )}

      {pendingDelete && (
        <div style={overlay} role="dialog" aria-modal="true" aria-label="Confirm delete project">
          <div style={modal}>
            <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.15rem" }}>Delete this project?</h2>
            <p style={{ margin: 0, color: "#374151" }}>
              <strong>{pendingDelete.name}</strong> and all of its codes and board will be permanently
              removed. This cannot be undone.
            </p>
            {error && <p style={{ color: "#b91c1c", margin: "0.5rem 0 0" }}>{error}</p>}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => {
                  setPendingDelete(null);
                  setError(null);
                }}
                disabled={busy}
                style={cancelButton}
              >
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} disabled={busy} style={confirmButton}>
                {busy ? "Deleting…" : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

const sidebar: React.CSSProperties = {
  flexShrink: 0,
  borderRight: "1px solid #e5e7eb",
  background: "#f9fafb",
  height: "100vh",
  position: "sticky",
  top: 0,
  padding: "0.6rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  transition: "width 0.15s ease",
  overflow: "hidden"
};

const topRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: 32
};

const iconButton: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  background: "#fff",
  borderRadius: 6,
  width: 30,
  height: 30,
  cursor: "pointer",
  fontSize: 15,
  lineHeight: 1,
  color: "#374151"
};

const newButton: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  border: "1px solid #d1d5db",
  background: "#fff",
  borderRadius: 8,
  padding: "0.45rem",
  fontSize: 14,
  color: "#1f2937",
  textDecoration: "none",
  marginTop: "0.4rem"
};

const threadRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  borderRadius: 8,
  paddingRight: "0.25rem"
};

const threadLink: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  textDecoration: "none",
  padding: "0.45rem 0.5rem",
  fontSize: 14,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};

const trashButton: React.CSSProperties = {
  border: "none",
  background: "none",
  color: "#9ca3af",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
  padding: "0 0.3rem"
};

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  zIndex: 50
};

const modal: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: "1.5rem",
  maxWidth: 440,
  width: "100%",
  boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  display: "grid",
  gap: "0.5rem"
};

const cancelButton: React.CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  borderRadius: 8,
  padding: "0.5rem 0.85rem",
  fontSize: 14,
  cursor: "pointer"
};

const confirmButton: React.CSSProperties = {
  border: "1px solid #b91c1c",
  background: "#b91c1c",
  color: "#fff",
  borderRadius: 8,
  padding: "0.5rem 0.85rem",
  fontSize: 14,
  cursor: "pointer"
};
