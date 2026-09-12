"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

// RECON-030 — R39: a curadoria decide a sugestão. Nada aqui publica sozinho:
// a função de banco registra a versão publicada anterior em
// guide_article_revisions, aplica ou rejeita, e a revalidação invalida o cache
// do artigo para que a versão vigente apareça (inclusive para quem salvou).
export interface CorrectionDecisionState {
  status: "idle" | "ok" | "error" | "forbidden"
  message: string
}

async function getAuthedUserId(): Promise<string | null> {
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
      setAll() {},
    },
  })
  const {
    data: { user },
  } = await authClient.auth.getUser()
  return user?.id ?? null
}

async function authorizeOperator(userId: string): Promise<boolean> {
  const serviceClient = createServiceClient()
  const { data } = await serviceClient.rpc("is_current_user_operator", { p_user_id: userId })
  return data === true
}

async function callDecisionRpc(
  name: "apply_guide_correction" | "reject_guide_correction",
  args: Record<string, unknown>,
): Promise<{ error: { message: string } | null }> {
  const serviceClient = createServiceClient()
  const rpc = serviceClient.rpc as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>
  const { error } = await rpc.call(serviceClient, name, args)
  return { error }
}

function mapDecisionError(message: string): CorrectionDecisionState {
  if (message.includes("only operators")) {
    return { status: "forbidden", message: "Sua conta não tem permissão de curadoria." }
  }
  if (message.includes("already decided")) {
    return { status: "error", message: "Esta sugestão já foi decidida." }
  }
  if (message.includes("justification")) {
    return { status: "error", message: "Informe a justificativa da rejeição." }
  }
  if (message.includes("not found")) {
    return { status: "error", message: "Sugestão não encontrada." }
  }
  return { status: "error", message: "Não foi possível registrar a decisão. Tente novamente." }
}

async function revoke(entryId: string): Promise<void> {
  revalidatePath("/guide-queue")
  if (entryId.length > 0) {
    revalidatePath(`/guide/${entryId}`)
    revalidatePath(`/guide/${entryId}/correcao`)
  }
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

export async function applyCorrectionAction(
  _previous: CorrectionDecisionState,
  formData: FormData,
): Promise<CorrectionDecisionState> {
  const requestId = text(formData, "requestId")
  const entryId = text(formData, "entryId")
  if (requestId.length === 0) {
    return { status: "error", message: "Sugestão inválida." }
  }

  const userId = await getAuthedUserId()
  if (!userId) {
    return { status: "error", message: "Sua sessão expirou. Entre novamente." }
  }
  if (!(await authorizeOperator(userId))) {
    return { status: "forbidden", message: "Sua conta não tem permissão de curadoria." }
  }

  const note = text(formData, "note")
  const sectionBody = text(formData, "sectionBody")
  const summary = text(formData, "summary")
  if (sectionBody.length === 0 && summary.length === 0) {
    return { status: "error", message: "Preencha o texto que será publicado." }
  }

  const { error } = await callDecisionRpc("apply_guide_correction", {
    p_request_id: requestId,
    p_operator_user_id: userId,
    p_note: note.length > 0 ? note : null,
    p_section_title: text(formData, "sectionTitle") || null,
    p_section_body: sectionBody.length > 0 ? sectionBody : null,
    p_summary: summary.length > 0 ? summary : null,
  })

  if (error) {
    return mapDecisionError(error.message)
  }

  await revoke(entryId)
  return {
    status: "ok",
    message: "Correção aplicada e publicada. A versão anterior ficou registrada.",
  }
}

export async function rejectCorrectionAction(
  _previous: CorrectionDecisionState,
  formData: FormData,
): Promise<CorrectionDecisionState> {
  const requestId = text(formData, "requestId")
  const entryId = text(formData, "entryId")
  if (requestId.length === 0) {
    return { status: "error", message: "Sugestão inválida." }
  }

  const note = text(formData, "note")
  if (note.length === 0) {
    return { status: "error", message: "Informe a justificativa da rejeição." }
  }

  const userId = await getAuthedUserId()
  if (!userId) {
    return { status: "error", message: "Sua sessão expirou. Entre novamente." }
  }
  if (!(await authorizeOperator(userId))) {
    return { status: "forbidden", message: "Sua conta não tem permissão de curadoria." }
  }

  const { error } = await callDecisionRpc("reject_guide_correction", {
    p_request_id: requestId,
    p_operator_user_id: userId,
    p_note: note,
  })

  if (error) {
    return mapDecisionError(error.message)
  }

  await revoke(entryId)
  return {
    status: "ok",
    message: "Sugestão rejeitada com justificativa. O solicitante verá a decisão.",
  }
}
