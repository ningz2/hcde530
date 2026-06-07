import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { repo } from "@/lib/repo/store";

type WorkspaceLayoutProps = {
  children: ReactNode;
  params: Promise<{ workspaceId: string }>;
};

export default async function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  const { workspaceId } = await params;
  const session = await getSessionContext();
  if (!session.identity) {
    redirect("/login");
  }
  const workspace = await repo.getWorkspace(workspaceId);
  if (!workspace || workspace.createdByUserId !== session.identity.userId) {
    notFound();
  }

  return <div data-workspace-id={workspaceId}>{children}</div>;
}
