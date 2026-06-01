import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { repo } from "@/lib/repo/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MP2 Affinity Diagram Generator",
  description: "Privacy-first AI powered affinity diagram scaffolding for qualitative research."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const projects = repo.listWorkspaces().map((w) => ({ id: w.id, name: w.name }));

  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "flex-start" }}>
          <Sidebar projects={projects} />
          <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
        </div>
      </body>
    </html>
  );
}
