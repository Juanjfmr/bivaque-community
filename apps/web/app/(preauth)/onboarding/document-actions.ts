"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

const DOCUMENT_BUCKET = "verification-documents"
const MAX_BYTES = 10 * 1024 * 1024
const CONSENT_VERSION = 1
const CODE_OF_CONDUCT_VERSION = 1
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"])

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

export async function uploadVerificationDocumentAction(formData: FormData): Promise<void> {
  const userId = await readSessionUserId()
  if (!userId) {
    throw new Error("não autenticado")
  }

  const supabase = createServiceClient()

  const { data: hasAcceptedConsent } = await supabase.rpc("has_accepted_consent", {
    p_user_id: userId,
    p_consent_version: CONSENT_VERSION,
    p_code_of_conduct_version: CODE_OF_CONDUCT_VERSION,
  })

  if (!hasAcceptedConsent) {
    throw new Error("consentimento não registrado")
  }

  const { data: membership } = await supabase
    .from("locality_memberships")
    .select("locality_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (membership) {
    throw new Error("você já é membro da comunidade")
  }

  const file = formData.get("document")
  if (!(file instanceof File)) {
    throw new Error("documento é obrigatório")
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    throw new Error("documento deve ter entre 1 byte e 10MB")
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("formato inválido — use PDF, JPEG ou PNG")
  }

  const buffer = new Uint8Array(await file.arrayBuffer())
  const { randomUUID } = await import("node:crypto")
  const storageObjectPath = `${userId}/${randomUUID()}`

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storageObjectPath, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Falha ao armazenar o documento: ${uploadError.message}`)
  }

  const { error: rpcError } = await supabase.rpc("submit_verification_document", {
    p_user_id: userId,
    p_storage_object_path: storageObjectPath,
    p_mime_type: file.type,
  })

  if (rpcError) {
    // Do not leave an orphaned sensitive object when the record fails.
    await supabase.storage.from(DOCUMENT_BUCKET).remove([storageObjectPath])
    throw new Error(rpcError.message)
  }
}
