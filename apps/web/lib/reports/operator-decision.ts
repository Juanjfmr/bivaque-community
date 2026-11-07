import { scrubReportReason } from "@bivaque/domain"
import { UUID_RE } from "../admin/operator"
import { log } from "../logger"
import type { createServerClient } from "../supabase/server"

export type ReportAction = "dismiss" | "hide" | "remove"
export type ResolveResult = { ok: boolean; error?: string }

export async function applyReportDecision(
  client: ReturnType<typeof createServerClient>,
  operatorId: string,
  reportId: string,
  action: unknown,
  reason: unknown,
): Promise<ResolveResult> {
  if (
    !UUID_RE.test(reportId) ||
    typeof action !== "string" ||
    !["dismiss", "hide", "remove"].includes(action)
  ) {
    return { ok: false, error: "invalid-decision" }
  }
  if (typeof reason !== "string" || !reason.trim() || reason.length > 1000) {
    return { ok: false, error: "missing-justification" }
  }
  const { error } = await client.rpc("resolve_report", {
    p_report_id: reportId,
    p_operator_user_id: operatorId,
    p_action: action,
    p_note: scrubReportReason(reason.trim()).slice(0, 1000),
  })
  if (!error) return { ok: true }
  if (error.code === "P0002") return { ok: false, error: "already-resolved" }
  if (error.code === "42501") return { ok: false, error: "forbidden" }
  log.error("report resolve failed", { report_id: reportId, code: error.code })
  return { ok: false, error: "resolve-failed" }
}
