import { PageShell } from "@/components/layout/PageShell";

export default function AuthCallbackPage() {
  return (
    <PageShell
      title="Auth callback"
      description="OAuth callback placeholder for Supabase authentication providers."
    >
      <p style={{ margin: 0 }}>This page will finalize SSO sessions and redirect users to their workspace.</p>
    </PageShell>
  );
}
