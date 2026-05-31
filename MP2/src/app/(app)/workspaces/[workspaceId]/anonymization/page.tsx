import { FlowStepper } from "@/components/flow/FlowStepper";
import { toWorkspaceStepHref, workflowSteps } from "@/components/flow/workflow";
import { PageShell } from "@/components/layout/PageShell";
import { repo } from "@/lib/repo/store";

export const dynamic = "force-dynamic";

type AnonymizationPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function AnonymizationPage({ params }: AnonymizationPageProps) {
  const { workspaceId } = await params;
  const uploads = repo.listUploads(workspaceId);
  const quotes = repo.listQuotes(workspaceId);
  const maskedCount = quotes.filter((q) => q.piiMasked).length;

  return (
    <PageShell
      title="Step 2: Anonymization consent"
      description="Masking is ON by default and was applied at ingest time. Opting out is recorded per upload."
    >
      <FlowStepper
        currentHref={toWorkspaceStepHref(workspaceId, "anonymization")}
        steps={workflowSteps.map((step) => ({
          label: step.label,
          href: toWorkspaceStepHref(workspaceId, step.slug)
        }))}
      />

      <p style={{ marginTop: 0, color: "#374151" }}>
        {quotes.length} stored quotes · {maskedCount} masked · raw source discarded after extraction.
      </p>

      {uploads.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No uploads yet. Start at the ingest step.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
          <thead>
            <tr>
              <Th>Source</Th>
              <Th>Anonymization</Th>
              <Th>Opted out</Th>
              <Th>Raw retained</Th>
            </tr>
          </thead>
          <tbody>
            {uploads.map((u) => (
              <tr key={u.id}>
                <Td>{u.originalFilename ?? u.sourceType}</Td>
                <Td>{u.anonymizationState}</Td>
                <Td>{u.anonymizationOptOut ? "yes" : "no"}</Td>
                <Td>{u.rawRetained ? "yes" : "no"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ textAlign: "left", borderBottom: "1px solid #d1d5db", padding: "0.4rem 0.5rem" }}>
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ borderBottom: "1px solid #eef0f3", padding: "0.4rem 0.5rem" }}>{children}</td>;
}
