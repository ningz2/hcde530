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
          <span style={googleIcon}>G</span>
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
  padding: "1.5rem"
};

const card: React.CSSProperties = {
  width: "min(520px, 100%)",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  boxShadow: "0 8px 28px rgba(15,23,42,0.08)",
  padding: "2rem",
  display: "grid",
  gap: "1rem",
  justifyItems: "center"
};

const logoMark: React.CSSProperties = {
  width: 52,
  height: 52,
  border: "2px solid #1d4ed8",
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
  fontSize: 18,
  color: "#1d4ed8",
  background: "#eef2ff",
  letterSpacing: "-0.04em"
};

const title: React.CSSProperties = {
  margin: 0,
  color: "#111827",
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
  color: "#374151",
  fontSize: 14,
  fontWeight: 700
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.75rem",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  outline: "none"
};

const nextButton: React.CSSProperties = {
  padding: "0.55rem 1rem",
  border: "1px solid #1d4ed8",
  background: "#1d4ed8",
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
  color: "#4b5563",
  fontWeight: 700,
  fontSize: 13
};

const line: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: "#e5e7eb"
};

const orText: React.CSSProperties = { flex: "0 0 auto" };

const googleButton: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.85rem",
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "1rem"
};

const googleIcon: React.CSSProperties = {
  color: "#4285f4",
  fontWeight: 900,
  fontSize: 18
};

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
