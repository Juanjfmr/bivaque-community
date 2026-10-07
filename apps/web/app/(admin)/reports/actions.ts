"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { log } from "../../../lib/logger"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"
import { decisionToAction } from "./targets"

export interface ResolveResult {
  ok: boolean
  /** Moderation that actually moved state; false means idempotent no-op. */
  changed?: boolean
  error?: string
}

/**
 * Fecha uma denúncia cujo alvo é um anúncio.
 *
 * `dismiss` continua pelo `resolve_report` de service_role dos outros alvos:
 * ele não oculta nada e não depende da marca de moderação. `hide` NÃO passa por
 * ele — o RPC de listing é chamado pelo cliente de sessão do operador, para que
 * o ator gravado na trilha e no relatório venha de auth.uid().
 *
 * O `listingId` chega pelo fechamento da página (params do servidor), nunca
 * pelo formulário: quem manda é o relatório, não o browser. O RPC reconsulta o
 * tipo real da denúncia, então um relatório de outro tipo é recusado aqui.
 */
export async function resolveListingReport(
  reportId: string,
  listingId: string,
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

  if (action === "dismiss") {
    const serviceClient = createServiceClient()
    const operatorId = await requireOperatorId(serviceClient)
    if (operatorId === null) {
      return { ok: false, error: "forbidden" }
    }
    const { error } = await serviceClient.rpc("resolve_report", {
      p_report_id: reportId,
      p_operator_user_id: operatorId,
      p_action: "dismiss",
      p_note: note,
    })
    if (error) {
      log.error("report resolve failed", {
        report_id: reportId,
        operator_id: operatorId,
        action,
        error: error.message,
      })
      return { ok: false, error: error.code === "P0002" ? "already-resolved" : "resolve-failed" }
    }
    log.info("report resolved", { report_id: reportId, operator_id: operatorId, action })
    revalidatePath("/reports")
    revalidatePath(`/reports/${reportId}`)
    return { ok: true }
  }

  const sessionClient = await callerSessionClient()
  const { data, error } = await sessionClient.rpc("moderate_listing", {
    p_listing_id: listingId,
    p_action: "hide",
    p_note: note,
    p_report_id: reportId,
  })
  if (error) {
    log.error("listing moderate failed", {
      report_id: reportId,
      listing_id: listingId,
      error: error.message,
    })
    if (error.code === "P0002") {
      return { ok: false, error: "already-resolved" }
    }
    if (error.code === "42501") {
      return { ok: false, error: "forbidden" }
    }
    return { ok: false, error: "resolve-failed" }
  }
  log.info("listing hidden from report", {
    report_id: reportId,
    listing_id: listingId,
    changed: data,
  })
  revalidatePath("/reports")
  revalidatePath(`/reports/${reportId}`)
  revalidatePath(`/imoveis/${listingId}`)
  return { ok: true }
}

/**
 * Restauração auditada de anúncio ocultado. Mesmo RPC, mesma identidade do
 * JWT, mesmo papel canônico conferido dentro da transação — a restauração não
 * altera status nem público do anúncio, só a marca da moderação.
 */
export async function restoreListing(
  listingId: string,
  justificativa: string,
): Promise<ResolveResult> {
  const note = justificativa.trim().slice(0, 1000)
  if (note.length === 0) {
    return { ok: false, error: "missing-justification" }
  }
  const sessionClient = await callerSessionClient()
  const { data, error } = await sessionClient.rpc("moderate_listing", {
    p_listing_id: listingId,
    p_action: "restore",
    p_note: note,
  })
  if (error) {
    log.error("listing restore failed", { listing_id: listingId, error: error.message })
    if (error.code === "P0002") {
      return { ok: false, error: "not-found" }
    }
    if (error.code === "42501") {
      return { ok: false, error: "forbidden" }
    }
    return { ok: false, error: "resolve-failed" }
  }
  log.info("listing restored", { listing_id: listingId, changed: data })
  revalidatePath("/reports")
  revalidatePath(`/imoveis/${listingId}`)
  return { ok: true, changed: data }
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

/**
 * Cliente com o JWT da sessão do OPERADOR — nunca service_role com o id
 * repassado. É o que o ADR-20261006 exige para o alvo `listing`: o ator do
 * evento de moderação vem de auth.uid() dentro do RPC, e o papel é conferido
 * na transação. Usar service_role aqui zeraria auth.uid() e o banco recusaria
 * a execução; pior, um id repassado por argumento seria o ator escolhido pelo
 * navegador.
 */
async function callerSessionClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }
  const cookieStore = await cookies()
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // Read-only nesta ação: o RPC faz a mutação.
      },
    },
  })
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
