import { ApiError } from "@/lib/errors/types";
import type { WorkspaceRole } from "@/domain/entities/types";

export type Action =
  | "workspace.read"
  | "workspace.write"
  | "workspace.delete"
  | "board.edit"
  | "share.manage"
  | "export.create"
  | "admin.manage_members";

const matrix: Record<Action, WorkspaceRole[]> = {
  "workspace.read": ["OWNER", "EDITOR", "VIEWER"],
  "workspace.write": ["OWNER", "EDITOR"],
  "workspace.delete": ["OWNER"],
  "board.edit": ["OWNER", "EDITOR"],
  "share.manage": ["OWNER", "EDITOR"],
  "export.create": ["OWNER", "EDITOR", "VIEWER"],
  "admin.manage_members": ["OWNER"]
};

export function assertRoleCan(action: Action, role: WorkspaceRole): void {
  if (!matrix[action].includes(role)) {
    throw new ApiError("FORBIDDEN", "Your workspace role does not allow this action.", 403, {
      action,
      role
    });
  }
}

export function assertAnonymousViewOnly(): never {
  throw new ApiError(
    "FORBIDDEN",
    "Anonymous share links are view-only and cannot perform this action.",
    403
  );
}
