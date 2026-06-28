import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { repo } from "@/lib/repo/store";

export const dynamic = "force-dynamic";

type HistoryPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function HistoryPage({ params }: HistoryPageProps) {
  const { workspaceId } = await params;
  // Dev identity matches the mock header injected by the client API helper.
  const snapshots = await repo.listSnapshots(workspaceId, "dev-user");

  return (
    <PageShell
      title="Activity"
      description="Your session's edit history. Each board edit captures a revertible snapshot; undo is available from the board."
    >
      {snapshots.length === 0 ? (
        <p style={{ color: "var(--color-ink-muted)" }}>No edits recorded in this session yet.</p>
      ) : (
        <ol style={{ paddingLeft: "1.1rem", margin: 0 }}>
          {snapshots.map((s) => (
            <li key={s.id} style={{ marginBottom: "0.35rem" }}>
              <strong>{s.action}</strong> · {s.label}{" "}
              <span style={{ color: "var(--color-ink-faint)", fontSize: 12 }}>
                ({new Date(s.createdAt).toLocaleTimeString()})
              </span>
            </li>
          ))}
        </ol>
      )}

      <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
        <Link href={`/workspaces/${workspaceId}/board`} className="btn btn-quiet">
          ← Back to the board
        </Link>
      </div>
    </PageShell>
  );
}
