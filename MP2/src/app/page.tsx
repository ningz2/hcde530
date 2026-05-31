import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { CreateProjectForm } from "@/components/flow/CreateProjectForm";
import { repo } from "@/lib/repo/store";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const workspaces = repo.listWorkspaces();

  return (
    <PageShell
      title="AI-Powered Affinity Diagram Generator"
      description="Create a project to ingest qualitative data, anonymize it, and generate an editable affinity board."
    >
      <div style={{ display: "grid", gap: "2rem" }}>
        <section>
          <h2 style={{ fontSize: "1.1rem" }}>New project</h2>
          <CreateProjectForm />
        </section>

        <section>
          <h2 style={{ fontSize: "1.1rem" }}>Open existing</h2>
          {workspaces.length === 0 ? (
            <p style={{ color: "#6b7280", margin: 0 }}>No projects yet.</p>
          ) : (
            <ul style={{ paddingLeft: "1.1rem", margin: 0 }}>
              {workspaces.map((w) => (
                <li key={w.id} style={{ marginBottom: "0.35rem" }}>
                  <Link href={`/workspaces/${w.id}/ingest`}>{w.name}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
