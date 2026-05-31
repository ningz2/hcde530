import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { UploadDataForm } from "@/components/flow/UploadDataForm";
import { WizardProgress } from "@/components/flow/WizardProgress";
import { repo } from "@/lib/repo/store";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const workspaces = repo.listWorkspaces();

  return (
    <PageShell
      title="Add your data"
      description="Start by adding your research data. Upload a CSV, paste text, or try the sample. You'll choose privacy options in the next step."
    >
      <WizardProgress current="ingest" />
      <UploadDataForm mode="new" />

      {workspaces.length > 0 && (
        <section style={{ marginTop: "2.5rem" }}>
          <h2 style={{ fontSize: "1.05rem" }}>Open an existing project</h2>
          <ul style={{ paddingLeft: "1.1rem", margin: 0 }}>
            {workspaces.map((w) => (
              <li key={w.id} style={{ marginBottom: "0.35rem" }}>
                <Link href={`/workspaces/${w.id}/board`}>{w.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  );
}
