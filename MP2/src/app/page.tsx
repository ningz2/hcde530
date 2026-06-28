import { UploadDataSetup } from "@/components/flow/UploadDataSetup";
import { getSessionContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const FORM_ID = "upload-data-form";

export default async function HomePage() {
  const session = await getSessionContext();
  if (!session.identity) {
    redirect("/login");
  }

  return (
    <UploadDataSetup
      title="Upload research data"
      description="Upload a CSV or paste coded text. You'll review privacy options before opening the board."
      mode="new"
      formId={FORM_ID}
    />
  );
}
