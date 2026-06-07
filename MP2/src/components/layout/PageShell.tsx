import Link from "next/link";
import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <main style={{ margin: "0 auto", maxWidth: 980, padding: "2.25rem 1.5rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <Link href="/" style={brandLink}>
          AffinityFlow
        </Link>
        <h1 style={{ margin: "0.75rem 0 0.5rem", fontSize: "2rem", letterSpacing: "-0.03em" }}>{title}</h1>
        <p style={{ margin: 0, color: "var(--af-muted)", lineHeight: 1.5, maxWidth: 720 }}>{description}</p>
      </header>
      <section>{children}</section>
    </main>
  );
}

const brandLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.45rem",
  textDecoration: "none",
  color: "var(--af-blue)",
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: "-0.02em"
};
