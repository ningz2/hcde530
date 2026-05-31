import Link from "next/link";
import { nextStep, prevStep, toWorkspaceStepHref, type StepSlug } from "@/components/flow/workflow";

/**
 * Forward/back navigation for steps whose primary action does not itself
 * navigate. `continueLabel` overrides the default "Continue" text.
 */
export function StepFooter({
  workspaceId,
  current,
  continueLabel
}: {
  workspaceId: string;
  current: StepSlug;
  continueLabel?: string;
}) {
  const next = nextStep(current);
  const prev = prevStep(current);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "1.5rem",
        paddingTop: "1rem",
        borderTop: "1px solid #eef0f3"
      }}
    >
      {prev ? (
        <Link href={toWorkspaceStepHref(workspaceId, prev.slug)} style={{ fontSize: 14, color: "#6b7280" }}>
          ← Back
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={toWorkspaceStepHref(workspaceId, next.slug)} style={continueStyle}>
          {continueLabel ?? `Continue to ${next.label}`}
        </Link>
      )}
    </div>
  );
}

const continueStyle: React.CSSProperties = {
  padding: "0.55rem 0.9rem",
  border: "1px solid #1d4ed8",
  background: "#1d4ed8",
  color: "#fff",
  borderRadius: 8,
  fontSize: 14,
  textDecoration: "none"
};
