"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, isError } from "@/lib/client/api";
import { createSupabaseClient } from "@/lib/supabase/client";

type LoginResponse = {
  user: { id: string; email: string; displayName?: string; provider: string };
};

export function AuthCallbackClient() {
  const router = useRouter();
  const [message, setMessage] = useState("Finishing Google sign-in...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function finish() {
      const supabase = createSupabaseClient();
      if (!supabase) {
        setError("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        return;
      }

      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.user?.email) {
        setError(sessionError?.message ?? "Google did not return an email address.");
        return;
      }

      const user = data.session.user;
      const email = user.email;
      if (!email) {
        setError("Google did not return an email address.");
        return;
      }
      const result = await apiPost<LoginResponse>("/api/auth/login", {
        email,
        displayName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? email.split("@")[0],
        provider: "GOOGLE"
      });
      if (isError(result)) {
        setError(result.error.message);
        return;
      }

      setMessage("Signed in. Redirecting...");
      router.push("/");
      router.refresh();
    }

    void finish();
  }, [router]);

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <p style={{ margin: 0, color: error ? "#b91c1c" : "#374151" }}>{error ?? message}</p>
      {error && (
        <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
          Check your Supabase/Google OAuth setup and callback URL, then try signing in again.
        </p>
      )}
    </div>
  );
}
