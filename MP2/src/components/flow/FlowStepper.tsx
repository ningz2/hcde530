import Link from "next/link";

type Step = {
  href: string;
  label: string;
};

type FlowStepperProps = {
  steps: Step[];
  currentHref: string;
};

export function FlowStepper({ steps, currentHref }: FlowStepperProps) {
  return (
    <nav aria-label="Workflow steps" style={{ marginBottom: "1.5rem" }}>
      <ul
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "0.5rem",
          listStyle: "none",
          padding: 0,
          margin: 0
        }}
      >
        {steps.map((step) => {
          const active = currentHref === step.href;

          return (
            <li key={step.href}>
              <Link
                href={step.href}
                style={{
                  display: "block",
                  padding: "0.5rem 0.75rem",
                  borderRadius: 8,
                  border: active ? "1px solid #1d4ed8" : "1px solid #d1d5db",
                  background: active ? "#eff6ff" : "#fff",
                  color: active ? "#1d4ed8" : "#374151",
                  textDecoration: "none",
                  fontSize: 14,
                  textAlign: "center"
                }}
              >
                {step.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
