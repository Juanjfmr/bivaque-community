"use server"

// RECON-029 (R34 / ADR-20260909): a pergunta ao organizador persiste.
//
// O destinatário NÃO vem daqui: `open_event_question` deriva o organizador do
// próprio evento no banco. Esta camada só entrega o id do evento e o texto da
// sessão; a autorização é da RLS (dm_conversations/dm_messages) e da função
// SECURITY DEFINER. Falha nunca é engolida: volta como mensagem para a tela
// preservar o texto.

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"
import {
  canSendQuestion,
  friendlyQuestionError,
  normalizeQuestion,
  QUESTION_SEND_FAILURE_COPY,
} from "../../../../../lib/events/question-thread"

export type QuestionActionResult = { ok: true } | { ok: false; message: string }

async function getAuthClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
}

async function insertQuestionMessage(
  conversationId: string,
  senderId: string,
  content: string,
  eventId: string,
): Promise<QuestionActionResult> {
  const supabase = await getAuthClient()
  const { error } = await supabase.from("dm_messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content: normalizeQuestion(content),
  })

  if (error) return { ok: false, message: friendlyQuestionError(error.message) }

  revalidatePath(`/events/${eventId}/perguntas`)
  return { ok: true }
}

/** Primeira pergunta: abre (ou reencontra) a conversa do evento e grava o texto. */
export async function askQuestionAction(formData: FormData): Promise<QuestionActionResult> {
  const eventId = formData.get("eventId")
  const content = formData.get("content")
  if (typeof eventId !== "string" || eventId.length === 0) {
    return { ok: false, message: "Evento inválido." }
  }
  if (typeof content !== "string" || !canSendQuestion(content)) {
    return { ok: false, message: "Escreva sua pergunta antes de enviar." }
  }

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Sua sessão expirou. Entre novamente para enviar." }

  // `rpc` é chamado NO cliente: separar a função em variável perde o `this` e
  // ela explode em "cannot read properties of undefined (reading 'rest')".
  const opened = await supabase.rpc("open_event_question", { p_event_id: eventId })
  if (opened.error || !opened.data) {
    return { ok: false, message: friendlyQuestionError(opened.error?.message) }
  }

  return insertQuestionMessage(opened.data, user.id, content, eventId)
}

/** Resposta no fio já existente (autor ou organizador — a RLS decide). */
export async function replyQuestionAction(formData: FormData): Promise<QuestionActionResult> {
  const eventId = formData.get("eventId")
  const conversationId = formData.get("conversationId")
  const content = formData.get("content")
  if (typeof eventId !== "string" || eventId.length === 0) {
    return { ok: false, message: "Evento inválido." }
  }
  if (typeof conversationId !== "string" || conversationId.length === 0) {
    return { ok: false, message: QUESTION_SEND_FAILURE_COPY }
  }
  if (typeof content !== "string" || !canSendQuestion(content)) {
    return { ok: false, message: "Escreva sua resposta antes de enviar." }
  }

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Sua sessão expirou. Entre novamente para enviar." }

  return insertQuestionMessage(conversationId, user.id, content, eventId)
}
