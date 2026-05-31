import type { WorkspaceRole } from "@/domain/entities/types";
import { assertRoleCan } from "@/domain/policies/access";

export function canManageMembers(role: WorkspaceRole): boolean {
  try {
    assertRoleCan("admin.manage_members", role);
    return true;
  } catch {
    return false;
  }
}

export function canEditBoard(role: WorkspaceRole): boolean {
  try {
    assertRoleCan("board.edit", role);
    return true;
  } catch {
    return false;
  }
}

export function canExport(role: WorkspaceRole): boolean {
  try {
    assertRoleCan("export.create", role);
    return true;
  } catch {
    return false;
  }
}
