import { FlowStepper } from "@/components/flow/FlowStepper";
import { toWorkspaceStepHref, workflowSteps } from "@/components/flow/workflow";
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
      title="Step 6: Session history"
      description="Per-user session snapshots. Each board edit captures a revertible snapshot; undo is available from the board."
    >
      <FlowStepper
        currentHref={toWorkspaceStepHref(workspaceId, "history")}
        steps={workflowSteps.map((step) => ({
          label: step.label,
          href: toWorkspaceStepHref(workspaceId, step.slug)
        }))}
      />

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
    </PageShell>
  );
}
