import { authProviders } from "@/lib/auth/providers";
import { PageShell } from "@/components/layout/PageShell";

export default function LoginPage() {
  return (
    <PageShell
      title="Sign in"
      description="Scaffold login options for email/password, Google SSO, and Microsoft SSO via Supabase Auth."
    >
      <ul style={{ margin: 0, paddingLeft: "1rem" }}>
        {authProviders.map((provider) => (
          <li key={provider.id}>
            {provider.label} ({provider.mode}) - {provider.enabled ? "enabled" : "disabled"}
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
