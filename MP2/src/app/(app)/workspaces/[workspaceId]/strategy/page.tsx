import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type StrategyPageProps = {
  params: Promise<{ workspaceId: string }>;
};

/**
 * Strategy setup was removed from the flow: the board now auto-generates a
 * default grouping. This route stays as a redirect so any old links still work.
 */
export default async function StrategyPage({ params }: StrategyPageProps) {
  const { workspaceId } = await params;
  redirect(`/workspaces/${workspaceId}/board`);
}
