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

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`
      }
    });
    setBusy(false);
    if (error) {
      setError(error.message);
    }
  }

  return (
    <div style={authShell}>
      <div style={card}>
        <div style={logoMark}>AF</div>
        <h1 style={title}>Log in to AffinityFlow</h1>

        <label style={field}>
          <span style={label}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={input}
          />
        </label>

        <button type="button" onClick={() => signIn("EMAIL_PASSWORD")} disabled={busy || !email.trim()} style={nextButton}>
          {busy ? "Signing in..." : "Next"}
        </button>

        <div style={divider}>
          <span style={line} />
          <span style={orText}>OR</span>
          <span style={line} />
        </div>

        <button type="button" onClick={signInWithGoogle} disabled={busy} style={googleButton}>
          <GoogleIcon />
          Continue with Google
        </button>

        {error && <p style={{ color: "#b91c1c", margin: "0.75rem 0 0", textAlign: "center" }}>{error}</p>}
      </div>

      <p style={signupPrompt}>
        New to AffinityFlow?{" "}
        <button
          type="button"
          onClick={() => {
            if (email.trim()) {
              void signIn("EMAIL_PASSWORD");
            }
          }}
          disabled={!email.trim() || busy}
          style={signupButton}
        >
          Sign Up
        </button>
      </p>

      <p style={hint}>
        Email sign-in is a local demo path. Google uses Supabase OAuth when configured.
      </p>
    </div>
  );
}

const authShell: React.CSSProperties = {
  minHeight: "calc(100vh - 4rem)",
  display: "grid",
  justifyItems: "center",
  alignContent: "center",
  gap: "1.5rem",
  padding: "1.5rem",
  background:
    "radial-gradient(circle at 50% 8%, rgba(37,99,235,0.1), transparent 20rem), radial-gradient(circle at 70% 25%, rgba(6,182,212,0.1), transparent 22rem)"
};

const card: React.CSSProperties = {
  width: "min(520px, 100%)",
  background: "rgba(255,255,255,0.86)",
  border: "1px solid var(--af-border)",
  borderRadius: 18,
  boxShadow: "var(--af-shadow)",
  backdropFilter: "blur(16px)",
  padding: "2rem",
  display: "grid",
  gap: "1rem",
  justifyItems: "center"
};

const logoMark: React.CSSProperties = {
  width: 52,
  height: 52,
  border: "2px solid rgba(37,99,235,0.35)",
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
  fontSize: 18,
  color: "#fff",
  background: "var(--af-gradient)",
  letterSpacing: "-0.04em"
};

const title: React.CSSProperties = {
  margin: 0,
  color: "var(--af-text)",
  fontSize: "1.85rem",
  lineHeight: 1.15,
  textAlign: "center"
};

const field: React.CSSProperties = {
  width: "100%",
  display: "grid",
  gap: "0.45rem"
};

const label: React.CSSProperties = {
  color: "var(--af-text)",
  fontSize: 14,
  fontWeight: 700
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.75rem",
  border: "1px solid var(--af-border)",
  borderRadius: 8,
  fontSize: 14,
  outline: "none"
};

const nextButton: React.CSSProperties = {
  padding: "0.55rem 1rem",
  border: "1px solid var(--af-blue)",
  background: "var(--af-gradient)",
  color: "#fff",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  justifySelf: "center",
  minWidth: 120
};

const divider: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  color: "var(--af-muted)",
  fontWeight: 700,
  fontSize: 13
};

const line: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: "var(--af-border)"
};

const orText: React.CSSProperties = { flex: "0 0 auto" };

const googleButton: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.85rem",
  border: "1px solid var(--af-border)",
  background: "#fff",
  color: "var(--af-text)",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "1rem"
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.72H.94v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.41 5.41 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.82.94 4.03l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.67 8.67 0 0 0 9 0 9 9 0 0 0 .94 4.97L3.95 7.3C4.66 5.16 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}

const signupPrompt: React.CSSProperties = {
  margin: 0,
  color: "#374151",
  fontSize: 15,
  textAlign: "center"
};

const signupButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#1d4ed8",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer"
};

const hint: React.CSSProperties = {
  maxWidth: 560,
  margin: 0,
  color: "#6b7280",
  fontSize: 13,
  textAlign: "center"
};
