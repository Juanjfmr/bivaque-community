"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"
import { insertGuideCorrection } from "../../../../../lib/guide/guide-article"

// RECON-030 — R38: formulário contextual de correção (prancha 25). A
// submissão só PERSISTE a sugestão; nada é publicado. O estado devolvido
// carrega o texto REALMENTE recebido para a confirmação mostrar o que chegou,
// e preserva o texto no erro (a form é controlada no cliente).
export interface CorrectionFormState {
  status: "idle" | "ok" | "error"
  message: string
  receivedDescription: string
  receivedReference: string | null
  protocol: string | null
}

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

function errorState(
  message: string,
  receivedDescription: string,
  receivedReference: string | null,
): CorrectionFormState {
  return {
    status: "error",
    message,
    receivedDescription,
    receivedReference,
    protocol: null,
  }
}

export async function submitGuideCorrectionAction(
  _previous: CorrectionFormState,
  formData: FormData,
): Promise<CorrectionFormState> {
  const articleId = formData.get("articleId")
  const entryId = formData.get("entryId")
  const rawSection = formData.get("sectionId")
  const rawDescription = formData.get("description")
  const rawReference = formData.get("reference")

  const description = typeof rawDescription === "string" ? rawDescription.trim() : ""
  const reference = typeof rawReference === "string" ? rawReference.trim() : ""
  const sectionId = typeof rawSection === "string" && rawSection.length > 0 ? rawSection : null
  const receivedReference = reference.length > 0 ? reference : null

  if (typeof articleId !== "string" || articleId.length === 0) {
    return errorState(
      "Sugestão inválida. Volte ao artigo e tente de novo.",
      description,
      receivedReference,
    )
  }
  if (description.length < 1 || description.length > 2000) {
    return errorState("Descreva a correção em até 2000 caracteres.", description, receivedReference)
  }
  if (reference.length > 500) {
    return errorState("A referência deve ter até 500 caracteres.", description, receivedReference)
  }

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return errorState(
      "Sua sessão expirou. Entre novamente para enviar a sugestão.",
      description,
      receivedReference,
    )
  }

  const { id, error } = await insertGuideCorrection(supabase, {
    articleId,
    sectionId,
    requesterId: user.id,
    description,
    reference: receivedReference,
  })

  if (error || !id) {
    return errorState(
      "Não foi possível enviar sua sugestão. O texto foi preservado; tente novamente.",
      description,
      receivedReference,
    )
  }

  if (typeof entryId === "string" && entryId.length > 0) {
    revalidatePath(`/guide/${entryId}/correcao`)
    revalidatePath(`/guide/${entryId}`)
  }

  return {
    status: "ok",
    message: "Recebemos sua sugestão. A curadoria vai revisar e a decisão aparece nesta página.",
    receivedDescription: description,
    receivedReference,
    protocol: id.slice(0, 8),
  }
}
