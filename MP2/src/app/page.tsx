import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { UploadDataForm } from "@/components/flow/UploadDataForm";
import { WizardProgress } from "@/components/flow/WizardProgress";
import { getSessionContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSessionContext();
  if (!session.identity) {
    redirect("/login");
  }

  return (
    <PageShell
      title="Add your data"
      description="Start by adding your research data. Upload a CSV, paste text, or try the sample. You'll choose privacy options in the next step. Open or delete existing projects from the sidebar."
    >
      <WizardProgress current="ingest" />
      <UploadDataForm mode="new" />
    </PageShell>
  );
}
