import { stepIndex, totalSteps, workflowSteps, type StepSlug } from "@/components/flow/workflow";

/**
 * Passive progress indicator for the guided wizard. It shows where the user is
 * but is intentionally NOT clickable, so people complete one step before moving
 * to the next.
 */
export function WizardProgress({ current }: { current: StepSlug }) {
  const index = stepIndex(current);

  return (
    <nav aria-label="Progress" style={{ marginBottom: "1.5rem" }}>
      <p style={{ margin: "0 0 0.5rem", fontSize: 13, color: "#6b7280" }}>
        Step {index + 1} of {totalSteps}
      </p>
      <ol
        style={{
          display: "flex",
          gap: "0.4rem",
          listStyle: "none",
          padding: 0,
          margin: 0,
          flexWrap: "wrap"
        }}
      >
        {workflowSteps.map((step, i) => {
          const state = i < index ? "done" : i === index ? "current" : "upcoming";
          return (
            <li
              key={step.slug}
              style={{
                fontSize: 12,
                padding: "0.25rem 0.6rem",
                borderRadius: 999,
                border: "1px solid",
                borderColor: state === "upcoming" ? "#e5e7eb" : "#1d4ed8",
                background: state === "current" ? "#1d4ed8" : state === "done" ? "#eff6ff" : "#fff",
                color: state === "current" ? "#fff" : state === "done" ? "#1d4ed8" : "#9ca3af"
              }}
            >
              {state === "done" ? "✓ " : ""}
              {step.label}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
