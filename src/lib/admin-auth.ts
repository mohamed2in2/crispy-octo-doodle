import { timingSafeEqual } from "crypto";
import { prisma } from "./prisma";

// ─── Action type constants ────────────────────────────────────────────────────
export const LOG_ACTIONS = {
  SUSPEND_STUDENT: "SUSPEND_STUDENT",
  UNSUSPEND_STUDENT: "UNSUSPEND_STUDENT",
  SOFT_DELETE_STUDENT: "SOFT_DELETE_STUDENT",
  RESTORE_STUDENT: "RESTORE_STUDENT",
  HARD_DELETE_STUDENT: "HARD_DELETE_STUDENT",
  EDIT_TEACHER_NAME: "EDIT_TEACHER_NAME",
  DELETE_TEACHER: "DELETE_TEACHER",
  RESTORE_TEACHER: "RESTORE_TEACHER",
  HARD_DELETE_TEACHER: "HARD_DELETE_TEACHER",
  RESET_TEACHER_PASSWORD: "RESET_TEACHER_PASSWORD",
  CREATE_TEACHER: "CREATE_TEACHER",
  CREATE_STAFF_ACCOUNT: "CREATE_STAFF_ACCOUNT",
  DELETE_STAFF_ACCOUNT: "DELETE_STAFF_ACCOUNT",
  SUSPEND_STAFF_ACCOUNT: "SUSPEND_STAFF_ACCOUNT",
  UNSUSPEND_STAFF_ACCOUNT: "UNSUSPEND_STAFF_ACCOUNT",
  RESET_STAFF_PASSWORD: "RESET_STAFF_PASSWORD",
} as const;

export type LogAction = (typeof LOG_ACTIONS)[keyof typeof LOG_ACTIONS];

// ─── Password verification ────────────────────────────────────────────────────

function timingSafeCompare(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, "utf8");
    const bBuf = Buffer.from(b, "utf8");
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

/**
 * Verifies the action password for a given admin role.
 * superadmin → SUPERADMIN_ACTION_PASSWORD
 * admin      → ADMIN_ACTION_PASSWORD
 * staff      → always false (read-only role, no actions)
 */
export function verifyRoleActionPassword(role: string, password: string): boolean {
  if (!password) return false;
  const envVar =
    role === "superadmin"
      ? process.env.SUPERADMIN_ACTION_PASSWORD
      : role === "admin"
      ? process.env.ADMIN_ACTION_PASSWORD
      : null;
  if (!envVar) return false;
  return timingSafeCompare(password, envVar);
}

/** @deprecated Use verifyRoleActionPassword instead */
export function verifyActionPassword(password: string): boolean {
  return verifyRoleActionPassword("superadmin", password);
}

// ─── Activity logging ─────────────────────────────────────────────────────────

export interface ActivityLogParams {
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string;
  metadata?: Record<string, unknown>;
}

/**
 * Writes a structured audit log entry to stdout AND the ActivityLog table.
 * Never throws — DB failures are swallowed so they don't break the main flow.
 */
export async function logAdminAction(params: ActivityLogParams): Promise<void> {
  console.log(
    JSON.stringify({
      event: "admin_action",
      ...params,
      metadata: params.metadata ?? null,
      timestamp: new Date().toISOString(),
    })
  );

  try {
    await prisma.activityLog.create({
      data: {
        adminId: params.adminId,
        adminName: params.adminName,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        targetName: params.targetName,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (err) {
    console.error("ActivityLog DB write failed:", err);
  }
}
