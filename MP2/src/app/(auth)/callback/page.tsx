import { AuthCallbackClient } from "@/components/auth/AuthCallbackClient";
import { PageShell } from "@/components/layout/PageShell";

export default function AuthCallbackPage() {
  return (
    <PageShell
      title="Signing you in"
      description="AffinityFlow is finishing the Google OAuth flow and connecting it to your project account."
    >
      <AuthCallbackClient />
    </PageShell>
  );
}
