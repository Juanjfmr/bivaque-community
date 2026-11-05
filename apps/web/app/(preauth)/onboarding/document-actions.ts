"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import {
  type UploadVerificationDocumentResult as ResultadoDoNucleo,
  uploadVerificationDocument,
} from "../../../lib/onboarding/upload-verification-document"

// O tipo continua saindo daqui, como antes da extração: quem já importava da
// action não muda. Ele é um alias do tipo do núcleo, para não existirem duas
// definições do mesmo contrato.
export type UploadVerificationDocumentResult = ResultadoDoNucleo

/**
 * O caminho da web (Server Action) do envio do documento de identidade.
 *
 * Aqui só fica o que é do caminho da web: resolver a sessão pelo cookie e
 * extrair o arquivo do `FormData`. Toda a regra — consentimento, vínculo,
 * tamanho, MIME, assinatura do PDF, sanitize da imagem, bucket e RPC — vive no
 * núcleo `upload-verification-document`, que o app também chama
 * (`POST /api/app/entry/document`). As mensagens continuam as mesmas que a tela
 * da web mostra.
 */

async function readSessionUserId(): Promise<string | null> {
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

export async function uploadVerificationDocumentAction(
  formData: FormData,
): Promise<UploadVerificationDocumentResult> {
  const userId = await readSessionUserId()
  if (!userId) {
    return { ok: false, error: "Sua sessão expirou. Entre novamente para continuar." }
  }

  const file = formData.get("document")
  if (!(file instanceof File)) {
    return { ok: false, error: "Escolha o arquivo da sua identidade." }
  }

  return uploadVerificationDocument({ userId, file })
}
