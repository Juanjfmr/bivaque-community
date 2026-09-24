"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { log } from "../../../../lib/logger"
import {
  type ServiceRequestStatus,
  validateEditDescription,
  validateMessageContent,
} from "../../../../lib/service-requests/tracking"

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

export type CloseRequestState =
  | {
      status: "closed"
      requestStatus: ServiceRequestStatus
      closedAt: string | null
      closedByUserId: string | null
    }
  | { status: "error"; message: string }
  | { status: "session" }

export type CancelRequestState =
  | {
      status: "cancelled"
      cancelledAt: string | null
      cancelledByUserId: string | null
    }
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

export async function sendRequestMessage(input: {
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
    log.error("pedidos: send_conversation_message failed", { error: error.message })
    return { status: "error", message: error.message }
  }

  const row = data as {
    id: string
    sender_id: string
    content: string
    created_at: string
  }
  return { status: "sent", message: row }
}

export async function closeRequest(requestId: string): Promise<CloseRequestState> {
  const client = await authedClient()
  const { data, error } = await client.rpc("close_service_request", {
    p_request_id: requestId,
  })

  if (error) {
    if (isSessionError(error.message)) return { status: "session" }
    log.error("pedidos: close_service_request failed", { error: error.message })
    return { status: "error", message: error.message }
  }

  const row = data as {
    status: ServiceRequestStatus
    closed_at: string | null
    closed_by_user_id: string | null
  }
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
    log.error("pedidos: cancel_service_request failed", { error: error.message })
    return { status: "error", message: "Não foi possível cancelar o pedido agora." }
  }

  const row = data as {
    status: ServiceRequestStatus
    cancelled_at: string | null
    cancelled_by_user_id: string | null
  }
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
    log.error("pedidos: update_service_request failed", { error: error.message })
    return { status: "error", message: error.message }
  }

  const row = data as { description: string; when_text: string | null }
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
