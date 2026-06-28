"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiSend, isError } from "@/lib/client/api";

type Project = { id: string; name: string };
type SidebarUser = { email: string; displayName?: string; provider: string } | null;

const STORAGE_KEY = "mp2-sidebar-collapsed";

export function Sidebar({ projects, user }: { projects: Project[]; user: SidebarUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (pathname === "/login" || pathname === "/callback") {
    return null;
  }

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

    const alreadyGone = isError(result) && result.error.code === "NOT_FOUND";
    if (isError(result) && !alreadyGone) {
      setError(result.error.message);
      return;
    }

    const deletedId = pendingDelete.id;
    setPendingDelete(null);
    if (pathname.includes(deletedId)) {
      router.push("/");
    } else {
      router.refresh();
    }
  }

  async function logout() {
    await apiSend("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  const accountLabel = user?.displayName?.slice(0, 2).toUpperCase() ?? user?.email?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebar-top">
        {!collapsed && <h2 className="sidebar-title">Projects</h2>}
        <button
          type="button"
          onClick={toggle}
          className="sidebar-toggle"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      {!collapsed && (
        <>
          {user ? (
            <Link href="/" className="sidebar-new">
              + New project
            </Link>
          ) : (
            <Link href="/login" className="sidebar-new">
              Sign in
            </Link>
          )}

          <nav className="sidebar-nav">
            {projects.length === 0 ? (
              <span className="sidebar-empty">{user ? "No projects yet." : "Sign in to see your projects."}</span>
            ) : (
              projects.map((p) => {
                const active = pathname.includes(p.id);
                return (
                  <div key={p.id} className={`sidebar-row${active ? " active" : ""}`}>
                    <Link href={`/workspaces/${p.id}/board`} className="sidebar-link" title={p.name}>
                      {p.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(menuOpen === p.id ? null : p.id);
                        setPendingDelete(p);
                      }}
                      className="sidebar-menu-btn"
                      aria-label={`Delete ${p.name}`}
                      title="Delete project"
                    >
                      ⋯
                    </button>
                  </div>
                );
              })
            )}
          </nav>

          <div className="sidebar-account">
            {user ? (
              <>
                Account · {accountLabel}
                <div>
                  <button type="button" onClick={logout} className="sidebar-signout">
                    Sign out
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </>
      )}

      {pendingDelete && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm delete project">
          <div className="modal-panel">
            <h2>Delete project and its codes?</h2>
            <p style={{ margin: 0, color: "var(--color-ink-muted)", fontSize: 14 }}>
              <strong style={{ color: "var(--color-ink)" }}>{pendingDelete.name}</strong> and all of its codes and
              board will be permanently removed. This cannot be undone.
            </p>
            {error && <p className="form-error">{error}</p>}
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => {
                  setPendingDelete(null);
                  setError(null);
                }}
                disabled={busy}
                className="btn"
              >
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} disabled={busy} className="btn btn-danger">
                {busy ? "Deleting…" : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
