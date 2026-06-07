import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { getSessionContext } from "@/lib/auth/session";
import { repo } from "@/lib/repo/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AffinityFlow",
  description: "Privacy-first AI-powered affinity mapping for qualitative research."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionContext();
  const projects = session.identity
    ? (await repo.listWorkspacesForUser(session.identity.userId)).map((w) => ({ id: w.id, name: w.name }))
    : [];

  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "flex-start" }}>
          <Sidebar
            projects={projects}
            user={
              session.identity
                ? {
                    email: session.identity.email,
                    displayName: session.identity.displayName,
                    provider: session.identity.provider
                  }
                : null
            }
          />
          <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
        </div>
      </body>
    </html>
  );
}
