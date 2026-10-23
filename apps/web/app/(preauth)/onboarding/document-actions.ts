"use server"

import { CODE_OF_CONDUCT_VERSION, CONSENT_VERSION } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { log } from "../../../lib/logger"
import { readDocumentPaths, readDocumentStatus } from "../../../lib/onboarding/document-status"
import { sanitizeImage } from "../../../lib/storage/sanitize-image"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

const DOCUMENT_BUCKET = "verification-documents"
const MAX_BYTES = 10 * 1024 * 1024
const ORPHAN_MIN_AGE_MS = 60 * 60 * 1000
const REMOVAL_ATTEMPTS = 2
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"])

// SEC-AUD-001: o MIME vem do cliente. A exceção byte a byte do PDF só pode ser
// aplicada quando os bytes começam com `%PDF-` no offset 0; verificar a
// assinatura digital ou o emissor exigiria um parser caro que o ADR não pede.
// A versão anterior varria os primeiros 1 KiB, então um JPEG com GPS e
// `%PDF-1.7` num comentário passava como PDF e era guardado sem limpeza. A
// assinatura de imagem nos primeiros bytes também é recusada, mesmo que o texto
// PDF apareça depois dela.
const IMAGE_SIGNATURES: Array<{ label: string; matches: (bytes: Buffer) => boolean }> = [
  {
    label: "jpeg",
    matches: (bytes) =>
      bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    label: "png",
    matches: (bytes) =>
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    label: "webp",
    matches: (bytes) =>
      bytes.length >= 12 &&
      bytes.toString("latin1", 0, 4) === "RIFF" &&
      bytes.toString("latin1", 8, 12) === "WEBP",
  },
  {
    label: "gif",
    matches: (bytes) => bytes.length >= 4 && bytes.toString("latin1", 0, 4) === "GIF8",
  },
]

function hasPdfHeader(bytes: Uint8Array): boolean {
  return Buffer.from(bytes.subarray(0, 5)).toString("latin1") === "%PDF-"
}

function hasImageSignature(bytes: Uint8Array): boolean {
  const head = Buffer.from(bytes.subarray(0, 12))
  return IMAGE_SIGNATURES.some((signature) => signature.matches(head))
}

export type UploadVerificationDocumentResult = { ok: true } | { ok: false; error: string }

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

async function sweepOrphanedUploads(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<void> {
  const referenced = await readDocumentPaths(supabase, userId)
  if (referenced === null) return

  const referencedNames = new Set(referenced.map((path) => path.split("/").pop()))

  const { data: objects, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .list(userId, { limit: 100 })

  if (error || !objects) return

  const cutoff = Date.now() - ORPHAN_MIN_AGE_MS
  const orphans = objects
    .filter((object) => {
      if (referencedNames.has(object.name)) return false
      const createdAt = object.created_at ? Date.parse(object.created_at) : Number.NaN
      return Number.isFinite(createdAt) && createdAt < cutoff
    })
    .map((object) => `${userId}/${object.name}`)

  if (orphans.length > 0) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove(orphans)
  }
}

// A remoção do arquivo substituído é tentada duas vezes antes de desistir: a
// falha do Storage costuma ser transitória, e uma segunda chamada resolve a
// maior parte dos casos. Nada aqui desfaz o envio — o contrato da action é o
// documento novo já registrado.
async function removeSupersededDocument(
  supabase: ReturnType<typeof createServiceClient>,
  path: string,
): Promise<boolean> {
  for (let attempt = 0; attempt < REMOVAL_ATTEMPTS; attempt += 1) {
    const { error } = await supabase.storage.from(DOCUMENT_BUCKET).remove([path])
    if (!error) return true
  }
  return false
}

export async function uploadVerificationDocumentAction(
  formData: FormData,
): Promise<UploadVerificationDocumentResult> {
  const userId = await readSessionUserId()
  if (!userId) {
    return { ok: false, error: "Sua sessão expirou. Entre novamente para continuar." }
  }

  const supabase = createServiceClient()

  const { data: hasAcceptedConsent } = await supabase.rpc("has_accepted_consent", {
    p_user_id: userId,
    p_consent_version: CONSENT_VERSION,
    p_code_of_conduct_version: CODE_OF_CONDUCT_VERSION,
  })

  if (!hasAcceptedConsent) {
    return { ok: false, error: "O aceite da entrada ainda não foi registrado." }
  }

  const { data: membership } = await supabase
    .from("locality_memberships")
    .select("locality_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (membership) {
    return { ok: false, error: "Sua entrada já está concluída." }
  }

  const file = formData.get("document")
  if (!(file instanceof File)) {
    return { ok: false, error: "Escolha o arquivo da sua identidade." }
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return { ok: false, error: "O arquivo deve ter até 10 MB." }
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: "Formato inválido. Envie um PDF, JPEG ou PNG." }
  }

  let buffer: Uint8Array
  try {
    if (file.type === "application/pdf") {
      const original = new Uint8Array(await file.arrayBuffer())
      if (hasImageSignature(original) || !hasPdfHeader(original)) {
        return {
          ok: false,
          error: "O arquivo não é um PDF válido. Envie um PDF, JPEG ou PNG.",
        }
      }
      buffer = original
    } else {
      buffer = await sanitizeImage(file, MAX_BYTES)
    }
  } catch {
    return {
      ok: false,
      error: "Não foi possível ler a imagem. Envie um JPEG ou PNG válido de até 10 MB.",
    }
  }

  await sweepOrphanedUploads(supabase, userId)
  const { randomUUID } = await import("node:crypto")
  const storageObjectPath = `${userId}/${randomUUID()}`

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storageObjectPath, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    log.error("verification document upload failed", { user_id: userId })
    return { ok: false, error: "Não foi possível enviar o arquivo agora. Tente novamente." }
  }

  // Com um documento já em análise, o envio é uma troca: a tabela admite uma
  // única análise pendente por pessoa (índice único), e a função de troca
  // substitui a linha em vez de falhar com 23505. Sem documento em análise, é o
  // envio normal. A validação de tipo e tamanho, o bucket e as policies são os
  // mesmos nos dois caminhos; o que muda é a função que registra.
  const currentDocument = await readDocumentStatus(supabase, userId)
  const isReplacement = currentDocument.situation === "in_review"

  let failed = false
  let errorCode: string | undefined
  let supersededPath: string | null = null

  if (isReplacement) {
    const { data, error } = await supabase.rpc("replace_verification_document", {
      p_user_id: userId,
      p_storage_object_path: storageObjectPath,
      p_mime_type: file.type,
    })
    failed = error !== null
    errorCode = error?.code
    supersededPath = data?.[0]?.replaced_storage_object_path ?? null
  } else {
    const { error } = await supabase.rpc("submit_verification_document", {
      p_user_id: userId,
      p_storage_object_path: storageObjectPath,
      p_mime_type: file.type,
    })
    failed = error !== null
    errorCode = error?.code
  }

  if (failed) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([storageObjectPath])
    log.error("verification document submission failed", {
      user_id: userId,
      code: errorCode,
    })

    if (errorCode === "23505") {
      return { ok: false, error: "Já existe um documento em análise. Aguarde a decisão." }
    }
    return { ok: false, error: "Não foi possível registrar o envio agora. Tente novamente." }
  }

  // O arquivo substituído sai do bucket na hora: a linha dele já foi removida
  // pelo banco, e a varredura de órfãos só alcança objetos com mais de uma hora
  // e só roda no próximo envio da mesma pessoa. Sem a fila, um caminho órfão
  // ficaria no bucket para sempre, porque nenhuma varredura agendada olha para
  // objetos sem linha — o cron diário de TTL apenas marca a linha como purgada.
  // A falha aqui não desfaz o envio: o objeto é privado e o caminho fica
  // registrado em private.verification_document_removals para um processador.
  if (supersededPath !== null && supersededPath !== storageObjectPath) {
    const removed = await removeSupersededDocument(supabase, supersededPath)

    if (!removed) {
      const { error: queueError } = await supabase.rpc("enqueue_verification_document_removal", {
        p_storage_object_path: supersededPath,
      })

      if (queueError) {
        log.error("superseded verification document could not be queued", { user_id: userId })
      } else {
        log.warn("superseded verification document queued for removal", { user_id: userId })
      }
    }
  }

  return { ok: true }
}
