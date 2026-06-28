import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function PageShell({ title, description, children, footer }: PageShellProps) {
  return (
    <div className="setup-workspace">
      <div className="setup-column">
        <header className="setup-header">
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        <main className="setup-body">{children}</main>
        {footer ? <footer className="setup-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
