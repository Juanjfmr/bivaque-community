"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { log } from "../../../../lib/logger"
import {
  CANCEL_CONFLICT_FINISHED,
  CLOSE_CONFLICT_CANCELLED,
} from "../../../../lib/service-requests/conflict-messages"
import {
  type ServiceRequestStatus,
  validateEditDescription,
  validateMessageContent,
} from "../../../../lib/service-requests/tracking"
import { REQUEST_TERMINAL_MESSAGE } from "../../../components/bivaque/message-delivery"

// RECON-023 — as escritas do acompanhamento do pedido.
//
// Chamadas pelo cliente, mas decididas no SERVIDOR: o remetente e a sessao
// (nunca o corpo), a conversa e o pedido sao conferidos no banco pelo RPC e a
// RLS decide a leitura. As actions so traduzem erro de banco em estado de tela
// e nunca inventam sucesso.

export type SendMessageState =
  | {
      status: "sent"
      message: { id: string; sender_id: string; content: string; created_at: string }
    }
  | { status: "error"; message: string }
  | { status: "session" }

// `conflict`: o pedido terminou por outro caminho (a outra parte encerrou, ou
// quem pediu cancelou) entre abrir a tela e confirmar. Não é erro para tentar
// de novo: a tela avisa o que aconteceu e recarrega o estado final.
export type CloseRequestState =
  | {
      status: "closed"
      requestStatus: ServiceRequestStatus
      closedAt: string | null
      closedByUserId: string | null
    }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string }
  | { status: "session" }

export type CancelRequestState =
  | {
      status: "cancelled"
      cancelledAt: string | null
      cancelledByUserId: string | null
    }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string }
  | { status: "session" }

export type EditRequestState =
  | { status: "saved"; description: string; whenText: string | null }
  | { status: "error"; message: string }
  | { status: "session" }

async function authedClient() {
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
        // A sessao ja existe; estas actions nao renovam cookie.
      },
    },
  })
}

function isSessionError(message: string | undefined): boolean {
  return (message ?? "").includes("unauthenticated")
}

function revalidateRequestSurfaces(requestId: string): void {
  revalidatePath("/pedidos")
  revalidatePath(`/pedidos/${requestId}`)
  revalidatePath("/prestador")
  revalidatePath(`/prestador/pedidos/${requestId}`)
}

export async function sendRequestMessage(input: {
  requestId: string
  conversationId: string
  content: string
  clientKey: string
}): Promise<SendMessageState> {
  const validation = validateMessageContent(input.content)
  if (!validation.ok) {
    return { status: "error", message: validation.message }
  }

  const client = await authedClient()
  const { data, error } = await client.rpc("send_conversation_message", {
    p_conversation_id: input.conversationId,
    p_content: input.content.trim(),
    p_client_key: input.clientKey,
  })

  if (error) {
    if (isSessionError(error.message)) return { status: "session" }
    if (error.message.includes("request is terminal")) {
      revalidateRequestSurfaces(input.requestId)
      return { status: "error", message: REQUEST_TERMINAL_MESSAGE }
    }
    log.error("pedidos: send_conversation_message failed", { error: error.message })
    return { status: "error", message: "Não foi possível enviar a mensagem agora." }
  }

  const row = data as {
    id: string
    sender_id: string
    content: string
    created_at: string
  }
  revalidateRequestSurfaces(input.requestId)
  return { status: "sent", message: row }
}

export async function closeRequest(requestId: string): Promise<CloseRequestState> {
  const client = await authedClient()
  const { data, error } = await client.rpc("close_service_request", {
    p_request_id: requestId,
  })

  if (error) {
    if (isSessionError(error.message)) return { status: "session" }
    revalidateRequestSurfaces(requestId)
    log.error("pedidos: close_service_request failed", { error: error.message })
    // A frase do banco nunca chega à tela.
    return { status: "error", message: "Não foi possível encerrar o pedido agora." }
  }

  const row = data as {
    status: ServiceRequestStatus
    closed_at: string | null
    closed_by_user_id: string | null
  }
  if (row.status === "cancelled") {
    revalidateRequestSurfaces(requestId)
    return { status: "conflict", message: CLOSE_CONFLICT_CANCELLED }
  }
  revalidateRequestSurfaces(requestId)
  return {
    status: "closed",
    requestStatus: row.status,
    closedAt: row.closed_at,
    closedByUserId: row.closed_by_user_id,
  }
}

export async function cancelRequest(requestId: string): Promise<CancelRequestState> {
  const client = await authedClient()
  const { data, error } = await client.rpc("cancel_service_request", {
    p_request_id: requestId,
  })

  if (error) {
    if (isSessionError(error.message)) return { status: "session" }
    revalidateRequestSurfaces(requestId)
    if (error.message.includes("request already finished")) {
      // Perdeu a corrida para um encerramento: conflito, não falha.
      return { status: "conflict", message: CANCEL_CONFLICT_FINISHED }
    }
    log.error("pedidos: cancel_service_request failed", { error: error.message })
    return { status: "error", message: "Não foi possível cancelar o pedido agora." }
  }

  const row = data as {
    status: ServiceRequestStatus
    cancelled_at: string | null
    cancelled_by_user_id: string | null
  }
  if (row.status !== "cancelled") {
    revalidateRequestSurfaces(requestId)
    return { status: "conflict", message: CANCEL_CONFLICT_FINISHED }
  }
  revalidateRequestSurfaces(requestId)
  return {
    status: "cancelled",
    cancelledAt: row.cancelled_at,
    cancelledByUserId: row.cancelled_by_user_id,
  }
}

export async function saveRequestEdit(input: {
  requestId: string
  description: string
  whenText: string
}): Promise<EditRequestState> {
  const validation = validateEditDescription(input.description)
  if (!validation.ok) {
    return { status: "error", message: validation.message }
  }

  const client = await authedClient()
  const trimmedWhen = input.whenText.trim()
  const { data, error } = await client.rpc("update_service_request", {
    p_request_id: input.requestId,
    p_description: input.description.trim(),
    p_when_text: trimmedWhen === "" ? null : trimmedWhen,
  })

  if (error) {
    if (isSessionError(error.message)) return { status: "session" }
    revalidateRequestSurfaces(input.requestId)
    log.error("pedidos: update_service_request failed", { error: error.message })
    return { status: "error", message: error.message }
  }

  const row = data as { description: string; when_text: string | null }
  revalidateRequestSurfaces(input.requestId)
  return { status: "saved", description: row.description, whenText: row.when_text }
}

export async function markRequestRead(conversationId: string): Promise<{ ok: boolean }> {
  const client = await authedClient()
  const { error } = await client.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  })
  if (error) {
    log.error("pedidos: mark_conversation_read failed", { error: error.message })
    return { ok: false }
  }
  return { ok: true }
}
