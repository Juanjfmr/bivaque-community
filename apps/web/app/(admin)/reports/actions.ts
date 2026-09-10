"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { log } from "../../../lib/logger"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"
import { decisionToAction } from "./targets"

export interface ResolveResult {
  ok: boolean
  error?: string
}

// Quem decide vem do contexto do servidor — cookie de sessão — nunca de
// FormData, query string ou estado de cliente. `service_role` é privilégio,
// não identidade: o id do operador é resolvido aqui e re-autorizado no banco
// dentro do próprio `resolve_report`.
async function readCallerId(): Promise<string | null> {
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
        // Read-only: a mutação acontece no RPC privilegiado abaixo.
      },
    },
  })
  const {
    data: { user },
  } = await authClient.auth.getUser()
  return user?.id ?? null
}

async function requireOperatorId(
  serviceClient: ReturnType<typeof createServiceClient>,
): Promise<string | null> {
  const callerId = await readCallerId()
  // Sem caller não há o que perguntar ao banco.
  if (callerId === null) return null

  const { data: isOperator, error } = await serviceClient.rpc("is_current_user_operator", {
    p_user_id: callerId,
  })
  if (error) {
    // Indisponibilidade do banco não é autorização: nega e registra.
    log.error("operator check failed", { caller_id: callerId, error: error.message })
    return null
  }
  return isOperator === true ? callerId : null
}

// O encerramento é o mecanismo único que já existe (migration 20260821000034):
// `resolve_report` re-autoriza o operador, oculta conforme o tipo do alvo,
// registra a decisão com a justificativa e notifica quem denunciou — num só
// ato transacional. Nada aqui reimplementa metade disso.
//
// `reportId` chega pelo fechamento da página (params do servidor), não pelo
// formulário: o cliente escolhe a decisão, nunca o alvo.
export async function resolveReport(
  reportId: string,
  decision: string,
  justificativa: string,
): Promise<ResolveResult> {
  const action = decisionToAction(decision)
  if (action === null) {
    return { ok: false, error: "invalid-decision" }
  }

  const note = justificativa.trim().slice(0, 1000)
  if (note.length === 0) {
    return { ok: false, error: "missing-justification" }
  }

  const serviceClient = createServiceClient()
  const operatorId = await requireOperatorId(serviceClient)
  if (operatorId === null) {
    return { ok: false, error: "forbidden" }
  }

  const { error } = await serviceClient.rpc("resolve_report", {
    p_report_id: reportId,
    p_operator_user_id: operatorId,
    p_action: action,
    p_note: note,
  })
  if (error) {
    log.error("report resolve failed", {
      report_id: reportId,
      operator_id: operatorId,
      action,
      error: error.message,
    })
    if (error.code === "P0002") {
      return { ok: false, error: "already-resolved" }
    }
    return { ok: false, error: "resolve-failed" }
  }

  log.info("report resolved", {
    report_id: reportId,
    operator_id: operatorId,
    action,
  })
  revalidatePath("/reports")
  revalidatePath(`/reports/${reportId}`)
  return { ok: true }
}
