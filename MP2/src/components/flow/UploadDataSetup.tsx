"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { UploadDataForm } from "@/components/flow/UploadDataForm";

type UploadDataSetupProps = {
  title: string;
  description: string;
  mode: "new" | "existing";
  workspaceId?: string;
  formId: string;
};

export function UploadDataSetup({ title, description, mode, workspaceId, formId }: UploadDataSetupProps) {
  const [busy, setBusy] = useState(false);

  return (
    <PageShell
      title={title}
      description={description}
      footer={
        <button type="submit" form={formId} disabled={busy} className="btn btn-primary">
          {busy ? "Saving…" : "Save & continue"}
        </button>
      }
    >
      <UploadDataForm
        mode={mode}
        workspaceId={workspaceId}
        formId={formId}
        hideFooter
        onBusyChange={setBusy}
      />
    </PageShell>
  );
}
