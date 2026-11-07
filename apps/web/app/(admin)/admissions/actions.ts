"use server"

import { scrubReportReason } from "@bivaque/domain"
import { revalidatePath } from "next/cache"
import { removeReviewedDocuments } from "../../../lib/admin/document-removals"
import { requireOperatorId, UUID_RE } from "../../../lib/admin/operator"
import { log } from "../../../lib/logger"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

function admissionError(code: string): string {
  if (code === "42501") return "forbidden"
  if (code === "02000") return "not-found"
  if (code === "22023") return "invalid-input"
  return "unavailable"
}

// Reprocessamento e registro são uma transação, com caller confirmado também no RPC.
export async function reprocessUserAction(
  userId: string,
): Promise<{ ok: boolean; error?: string; warning?: string }> {
  const serviceClient = createServiceClient()
  const operatorId = await requireOperatorId(serviceClient)
  if (!operatorId) {
    return { ok: false, error: "forbidden" }
  }

  const { data, error } = await serviceClient.rpc("operator_reprocess_verification", {
    p_user_id: userId,
    p_operator_user_id: operatorId,
  })
  if (error) {
    log.error("admission reprocess failed", {
      user_id: userId,
      operator_id: operatorId,
      code: error.code,
    })
    return { ok: false, error: admissionError(error.code) }
  }
  log.info("admission reprocess ok", {
    user_id: userId,
    operator_id: operatorId,
    outcome: data,
  })
  revalidatePath("/admissions")
  return { ok: true }
}

// Caller vem da sessão; o RPC reconfere o operador antes de decidir.
export async function decideDocumentAction(
  documentId: string,
  decision: "approved" | "rejected",
  reason: string,
): Promise<{ ok: boolean; error?: string; warning?: string }> {
  const serviceClient = createServiceClient()
  const operatorId = await requireOperatorId(serviceClient)
  if (!operatorId) {
    return { ok: false, error: "forbidden" }
  }

  if (!UUID_RE.test(documentId) || (decision !== "approved" && decision !== "rejected")) {
    return { ok: false, error: "invalid-decision" }
  }

  if (decision === "rejected" && reason.trim().length === 0) {
    return { ok: false, error: "rejection requires a reason" }
  }

  const { error } = await serviceClient.rpc("decide_verification_document", {
    p_document_id: documentId,
    p_decision: decision,
    p_reason: scrubReportReason(reason.trim()).slice(0, 1000),
    p_operator_user_id: operatorId,
  })
  if (error) {
    log.error("admission decide failed", {
      document_id: documentId,
      operator_id: operatorId,
      decision,
      code: error.code,
    })
    return { ok: false, error: admissionError(error.code) }
  }
  log.info("admission decide ok", {
    document_id: documentId,
    operator_id: operatorId,
    decision,
  })
  const purged = await removeReviewedDocuments(serviceClient, operatorId)
  revalidatePath("/admissions")
  return purged ? { ok: true } : { ok: true, warning: "purge-pending" }
}

// Rejeicao definitiva de um pending (sem documento). Encerra o caso,
// notifica a pessoa, e ela ve o estado em /onboarding/status.
export async function rejectPendingUserAction(
  userId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const serviceClient = createServiceClient()
  const operatorId = await requireOperatorId(serviceClient)
  if (!operatorId) {
    return { ok: false, error: "forbidden" }
  }

  if (reason.trim().length === 0) {
    return { ok: false, error: "rejection requires a reason" }
  }

  const { error } = await serviceClient.rpc("operator_reject_pending", {
    p_user_id: userId,
    p_operator_user_id: operatorId,
    p_reason: scrubReportReason(reason.trim()).slice(0, 1000),
  })
  if (error) {
    log.error("admission reject failed", {
      user_id: userId,
      operator_id: operatorId,
      code: error.code,
    })
    return { ok: false, error: admissionError(error.code) }
  }
  log.info("admission reject ok", { user_id: userId, operator_id: operatorId })
  revalidatePath("/admissions")
  return { ok: true }
}

export async function purgeDocumentsAction(): Promise<{ ok: boolean; error?: string }> {
  const client = createServiceClient()
  const operatorId = await requireOperatorId(client)
  if (!operatorId) return { ok: false, error: "forbidden" }
  const ok = await removeReviewedDocuments(client, operatorId)
  revalidatePath("/admissions")
  return ok ? { ok: true } : { ok: false, error: "purge-pending" }
}
