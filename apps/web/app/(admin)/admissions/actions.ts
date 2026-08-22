"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { log } from "../../../lib/logger"
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

// Reprocessa o pending chamando verification_reconcile_step diretamente.
// O gate do (admin)/layout garante que o caller e operador; o RPC confia
// no chamador (contrato da casa).
export async function reprocessUserAction(
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const operatorId = await readOperatorIdFromCookies()
  if (!operatorId) {
    return { ok: false, error: "unauthenticated" }
  }

  const serviceClient = createServiceClient()
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
  const operatorId = await readOperatorIdFromCookies()
  if (!operatorId) {
    return { ok: false, error: "unauthenticated" }
  }

  if (decision === "rejected" && reason.trim().length === 0) {
    return { ok: false, error: "rejection requires a reason" }
  }

  const serviceClient = createServiceClient()
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
  const operatorId = await readOperatorIdFromCookies()
  if (!operatorId) {
    return { ok: false, error: "unauthenticated" }
  }

  if (reason.trim().length === 0) {
    return { ok: false, error: "rejection requires a reason" }
  }

  const serviceClient = createServiceClient()
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
