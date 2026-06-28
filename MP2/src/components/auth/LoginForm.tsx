"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, isError } from "@/lib/client/api";
import { createSupabaseClient } from "@/lib/supabase/client";

type LoginResponse = {
  user: { id: string; email: string; displayName?: string; provider: string };
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: "EMAIL_PASSWORD" | "GOOGLE") {
    setBusy(true);
    setError(null);
    const result = await apiPost<LoginResponse>("/api/auth/login", {
      email: email.trim(),
      displayName: email.trim().split("@")[0] || undefined,
      provider
    });
    setBusy(false);
    if (isError(result)) {
      setError(result.error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function signInWithGoogle() {
    setBusy(true);
    setError(null);
    const supabase = createSupabaseClient();
    if (!supabase) {
      setBusy(false);
      setError("Google sign-in needs Supabase URL and anon key in .env.local.");
      return;
    }

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`
      }
    });
    setBusy(false);
    if (oauthError) {
      setError(oauthError.message);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">AF</div>
        <h1 className="auth-title">Log in to AffinityFlow</h1>

        <label className="field">
          <span className="field-label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input"
          />
        </label>

        <button
          type="button"
          onClick={() => signIn("EMAIL_PASSWORD")}
          disabled={busy || !email.trim()}
          className="btn btn-primary"
          style={{ width: "100%" }}
        >
          {busy ? "Signing in…" : "Next"}
        </button>

        <div className="auth-divider">
          <span className="auth-divider-line" />
          <span>OR</span>
          <span className="auth-divider-line" />
        </div>

        <button type="button" onClick={signInWithGoogle} disabled={busy} className="btn" style={{ width: "100%" }}>
          <GoogleIcon />
          Continue with Google
        </button>

        {error && <p className="form-error" style={{ textAlign: "center" }}>{error}</p>}
      </div>

      <p style={{ margin: 0, color: "var(--color-ink-muted)", fontSize: 14, textAlign: "center" }}>
        New to AffinityFlow?{" "}
        <button
          type="button"
          onClick={() => {
            if (email.trim()) void signIn("EMAIL_PASSWORD");
          }}
          disabled={!email.trim() || busy}
          className="btn btn-quiet"
          style={{ padding: 0, height: "auto", fontSize: 14, fontWeight: 560 }}
        >
          Sign up
        </button>
      </p>

      <p style={{ maxWidth: 480, margin: 0, color: "var(--color-ink-faint)", fontSize: 13, textAlign: "center" }}>
        Email sign-in is a local demo path. Google uses Supabase OAuth when configured.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.72H.94v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.41 5.41 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.82.94 4.03l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.67 8.67 0 0 0 9 0 9 9 0 0 0 .94 4.97L3.95 7.3C4.66 5.16 6.65 3.58 9 3.58Z" />
    </svg>
  );
}
