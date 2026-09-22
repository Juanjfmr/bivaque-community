"use server"

import { revalidatePath } from "next/cache"
import { createReport, type ReportMutationError, unblockPerson } from "../../../lib/reports/reports"
import { createAuthedClient } from "./authed-client"

export type SubmitReportResult =
  | { ok: true; reportId: string }
  | { ok: false; error: ReportMutationError }

// A identidade do autor vem do cookie de sessao no servidor — nunca de
// FormData. A validacao de alvo, tipo, acesso e motivo fechado acontece em
// `createReport` (web/lib/reports), a mesma que o formulario chama: uma
// chamada direta sem interface passa pelas mesmas recusas.

export async function submitReport(input: {
  targetType: string
  targetId: string
  reason: string
  explanation: string
}): Promise<SubmitReportResult> {
  const supabase = await createAuthedClient()
  return createReport(supabase, input)
}

export async function unblockPersonAction(blockedUserId: string): Promise<boolean> {
  const supabase = await createAuthedClient()
  const removed = await unblockPerson(supabase, blockedUserId)
  if (removed) {
    revalidatePath("/denuncias")
  }
  return removed
}
