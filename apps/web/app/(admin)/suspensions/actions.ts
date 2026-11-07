"use server"

import { scrubReportReason } from "@bivaque/domain"
import { revalidatePath } from "next/cache"
import { requireOperatorId, UUID_RE } from "../../../lib/admin/operator"
import { log } from "../../../lib/logger"
import { createServerClient } from "../../../lib/supabase/server"

type Result = { ok: boolean; error?: string }

async function changeSuspension(
  userId: string,
  reason: string,
  days: number | null,
): Promise<Result> {
  const client = createServerClient()
  const operatorId = await requireOperatorId(client)
  if (!operatorId) return { ok: false, error: "forbidden" }
  if (
    !UUID_RE.test(userId) ||
    !reason.trim() ||
    reason.length > 1000 ||
    (days !== null && (!Number.isInteger(days) || days < 1 || days > 365))
  ) {
    return { ok: false, error: "invalid-input" }
  }
  const common = {
    p_user_id: userId,
    p_operator_user_id: operatorId,
    p_reason: scrubReportReason(reason.trim()).slice(0, 1000),
  }
  const { error } =
    days === null
      ? await client.rpc("operator_end_suspension", common)
      : await client.rpc("operator_suspend_account", { ...common, p_days: days })
  if (error) {
    if (error.code === "42501") return { ok: false, error: "forbidden" }
    if (error.code === "P0001") return { ok: false, error: "conflict" }
    if (error.code === "P0002") return { ok: false, error: "not-found" }
    log.error("operator suspension failed", { code: error.code })
    return { ok: false, error: "unavailable" }
  }
  revalidatePath("/suspensions")
  revalidatePath("/operator-actions")
  return { ok: true }
}

export async function suspendAccountAction(userId: string, reason: string, days: number) {
  return changeSuspension(userId, reason, days)
}
export async function endSuspensionAction(userId: string, reason: string) {
  return changeSuspension(userId, reason, null)
}
