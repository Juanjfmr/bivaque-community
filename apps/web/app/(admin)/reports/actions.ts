"use server"

import { revalidatePath } from "next/cache"
import { requireOperatorId } from "../../../lib/admin/operator"
import { applyReportDecision, type ResolveResult } from "../../../lib/reports/operator-decision"
import { createServerClient } from "../../../lib/supabase/server"
import { decisionToAction } from "./targets"

export async function resolveReport(
  reportId: string,
  decision: string,
  justificativa: string,
): Promise<ResolveResult> {
  const client = createServerClient()
  const operatorId = await requireOperatorId(client)
  if (!operatorId) return { ok: false, error: "forbidden" }
  const result = await applyReportDecision(
    client,
    operatorId,
    reportId,
    decisionToAction(decision),
    justificativa,
  )
  if (result.ok) {
    revalidatePath("/reports")
    revalidatePath(`/reports/${reportId}`)
  }
  return result
}
