"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { log } from "../../../lib/logger"
import { canOperateAdmissions } from "../../../lib/security/admissions-authz"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

async function readOperatorIdFromCookies(): Promise<string | null> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }
  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // read-only — writes sao no fluxo de mutacao
      },
    },
  })
  const {
    data: { user },
  } = await authClient.auth.getUser()
  return user?.id ?? null
}

// Resolve o caller do contexto do servidor E confirma que ele e operador.
// Uma Server Action nao passa pelo layout: o gate de (admin)/layout NAO vale
// aqui. Ver apps/web/lib/security/admissions-authz.ts para o porque.
async function requireOperatorId(
  serviceClient: ReturnType<typeof createServiceClient>,
): Promise<string | null> {
  const callerId = await readOperatorIdFromCookies()
  const { data: isOperator } = await serviceClient.rpc("is_current_user_operator", {
    p_user_id: callerId ?? "",
  })
  return canOperateAdmissions({ callerId, callerIsOperator: isOperator === true }) ? callerId : null
}

// Reprocessa o pending chamando verification_reconcile_step diretamente.
// O RPC roda como service_role e nao tem parametro de caller, entao a
// autorizacao precisa acontecer aqui, antes da chamada privilegiada.
export async function reprocessUserAction(
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const serviceClient = createServiceClient()
  const operatorId = await requireOperatorId(serviceClient)
  if (!operatorId) {
    return { ok: false, error: "forbidden" }
  }

  const { data, error } = await serviceClient.rpc("verification_reconcile_step", {
    p_user_id: userId,
  })
  if (error) {
    log.error("admission reprocess failed", {
      user_id: userId,
      operator_id: operatorId,
      error: error.message,
    })
    return { ok: false, error: error.message }
  }
  log.info("admission reprocess ok", {
    user_id: userId,
    operator_id: operatorId,
    outcome: data,
  })
  revalidatePath("/admissions")
  return { ok: true }
}

// Aprova ou rejeita um documento de verificacao. O gate confia no chamador.
export async function decideDocumentAction(
  documentId: string,
  decision: "approved" | "rejected",
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const serviceClient = createServiceClient()
  const operatorId = await requireOperatorId(serviceClient)
  if (!operatorId) {
    return { ok: false, error: "forbidden" }
  }

  if (decision === "rejected" && reason.trim().length === 0) {
    return { ok: false, error: "rejection requires a reason" }
  }

  const { error } = await serviceClient.rpc("decide_verification_document", {
    p_document_id: documentId,
    p_decision: decision,
    p_reason: reason.trim(),
    p_operator_user_id: operatorId,
  })
  if (error) {
    log.error("admission decide failed", {
      document_id: documentId,
      operator_id: operatorId,
      decision,
      error: error.message,
    })
    return { ok: false, error: error.message }
  }
  log.info("admission decide ok", {
    document_id: documentId,
    operator_id: operatorId,
    decision,
  })
  revalidatePath("/admissions")
  return { ok: true }
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

  const { error } = await serviceClient.rpc("reject_pending_user", {
    p_user_id: userId,
    p_operator_user_id: operatorId,
    p_reason: reason.trim(),
  })
  if (error) {
    log.error("admission reject failed", {
      user_id: userId,
      operator_id: operatorId,
      error: error.message,
    })
    return { ok: false, error: error.message }
  }
  log.info("admission reject ok", { user_id: userId, operator_id: operatorId })
  revalidatePath("/admissions")
  return { ok: true }
}
