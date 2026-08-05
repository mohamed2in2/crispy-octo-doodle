import { createHash, timingSafeEqual } from "crypto";

import { prisma } from "./prisma";

export const LOG_ACTIONS = {
  SUSPEND_STUDENT: "SUSPEND_STUDENT", UNSUSPEND_STUDENT: "UNSUSPEND_STUDENT", SOFT_DELETE_STUDENT: "SOFT_DELETE_STUDENT", RESTORE_STUDENT: "RESTORE_STUDENT", HARD_DELETE_STUDENT: "HARD_DELETE_STUDENT",
  EDIT_TEACHER_NAME: "EDIT_TEACHER_NAME", DELETE_TEACHER: "DELETE_TEACHER", RESTORE_TEACHER: "RESTORE_TEACHER", HARD_DELETE_TEACHER: "HARD_DELETE_TEACHER", RESET_TEACHER_PASSWORD: "RESET_TEACHER_PASSWORD", CREATE_TEACHER: "CREATE_TEACHER",
  CREATE_STAFF_ACCOUNT: "CREATE_STAFF_ACCOUNT", DELETE_STAFF_ACCOUNT: "DELETE_STAFF_ACCOUNT", SUSPEND_STAFF_ACCOUNT: "SUSPEND_STAFF_ACCOUNT", UNSUSPEND_STAFF_ACCOUNT: "UNSUSPEND_STAFF_ACCOUNT", RESET_STAFF_PASSWORD: "RESET_STAFF_PASSWORD",
  BULK_DELETE_SCHEDULED: "BULK_DELETE_SCHEDULED", BULK_DELETE_INSTANT: "BULK_DELETE_INSTANT", BULK_DELETE_CANCELLED: "BULK_DELETE_CANCELLED", BULK_DELETE_EXECUTED: "BULK_DELETE_EXECUTED",
} as const;

export type LogAction = (typeof LOG_ACTIONS)[keyof typeof LOG_ACTIONS];

/** Hash each value first so comparison time does not disclose secret length. */
function timingSafeCompare(a: string, b: string): boolean {
  try {
    return timingSafeEqual(createHash("sha256").update(a, "utf8").digest(), createHash("sha256").update(b, "utf8").digest());
  } catch {
    return false;
  }
}

function verifyConfiguredSecret(provided: string, configured: string | undefined | null): boolean {
  return typeof configured === "string" && configured.length > 0 && provided.length > 0 && timingSafeCompare(provided, configured);
}

export function verifyRoleActionPassword(role: string, password: string): boolean {
  const configured = role === "superadmin" ? process.env.SUPERADMIN_ACTION_PASSWORD : role === "admin" ? process.env.ADMIN_ACTION_PASSWORD : undefined;
  return verifyConfiguredSecret(password, configured);
}

/** @deprecated Use verifyRoleActionPassword instead. */
export function verifyActionPassword(password: string): boolean { return verifyRoleActionPassword("superadmin", password); }
export function verifyMasterPassword(password: string): boolean { return verifyConfiguredSecret(password, process.env.SUPERADMIN_MASTER_PASSWORD); }
export function verifyBulkPassword(password: string): boolean { return verifyConfiguredSecret(password, process.env.BULK_DELETE_PASSWORD); }
export function verifyWalletPassword(password: string): boolean { return verifyConfiguredSecret(password, process.env.WALLET_PASSWORD); }

export interface ActivityLogParams {
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string;
  metadata?: Record<string, unknown>;
}

/** Writes a structured audit log entry to stdout and the ActivityLog table. */
export async function logAdminAction(params: ActivityLogParams): Promise<void> {
  console.log(JSON.stringify({ event: "admin_action", ...params, metadata: params.metadata ?? null, timestamp: new Date().toISOString() }));
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
  } catch (error) {
    console.error("ActivityLog DB write failed:", error);
  }
}
