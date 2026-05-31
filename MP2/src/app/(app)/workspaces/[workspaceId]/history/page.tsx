import Link from "next/link";
import { WizardProgress } from "@/components/flow/WizardProgress";
import { PageShell } from "@/components/layout/PageShell";
import { repo } from "@/lib/repo/store";

export const dynamic = "force-dynamic";

type HistoryPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function HistoryPage({ params }: HistoryPageProps) {
  const { workspaceId } = await params;
  // Dev identity matches the mock header injected by the client API helper.
  const snapshots = repo.listSnapshots(workspaceId, "dev-user");

  return (
    <PageShell
      title="Activity"
      description="Your session's edit history. Each board edit captures a revertible snapshot; undo is available from the board."
    >
      <WizardProgress current="history" />

      {snapshots.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No edits recorded in this session yet.</p>
      ) : (
        <ol style={{ paddingLeft: "1.1rem" }}>
          {snapshots.map((s) => (
            <li key={s.id} style={{ marginBottom: "0.35rem" }}>
              <strong>{s.action}</strong> · {s.label}{" "}
              <span style={{ color: "#9ca3af", fontSize: 12 }}>
                ({new Date(s.createdAt).toLocaleTimeString()})
              </span>
            </li>
          ))}
        </ol>
      )}

      <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #eef0f3" }}>
        <Link href={`/workspaces/${workspaceId}/board`} style={{ fontSize: 14, color: "#6b7280" }}>
          ← Back to the board
        </Link>
      </div>
    </PageShell>
  );
}
