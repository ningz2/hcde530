import { PageShell } from "@/components/layout/PageShell";
import { UploadDataForm } from "@/components/flow/UploadDataForm";
import { WizardProgress } from "@/components/flow/WizardProgress";

export const dynamic = "force-dynamic";

export default function HomePage() {
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
