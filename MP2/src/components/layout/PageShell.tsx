import Link from "next/link";
import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <main style={{ margin: "0 auto", maxWidth: 980, padding: "2rem 1.5rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <Link href="/" style={{ textDecoration: "none", color: "#1d4ed8", fontSize: 14 }}>
          MP2 Affinity App
        </Link>
        <h1 style={{ margin: "0.75rem 0 0.5rem", fontSize: "1.85rem" }}>{title}</h1>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.45 }}>{description}</p>
      </header>
      <section>{children}</section>
    </main>
  );
}
