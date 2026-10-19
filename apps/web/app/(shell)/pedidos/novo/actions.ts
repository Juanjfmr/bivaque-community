"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { log } from "../../../../lib/logger"
import {
  firstFailure,
  SERVICE_REQUEST_MAX_PHOTOS,
  SERVICE_REQUEST_PHOTO_MAX_BYTES,
  validateRequestDescription,
  validateRequestPhotos,
  validateRequestWhen,
} from "../../../../lib/service-requests/request-form"
import { sanitizeImage } from "../../../../lib/storage/sanitize-image"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"

// RECON-022 — criação do pedido de serviço.
//
// O autor é a SESSÃO, nunca o corpo: o `providerId` vem da URL do formulário e
// o RPC `create_service_request` deriva o destinatário do próprio banco e
// reconfere `can_see_provider`. Sem service_role aqui: a RLS e o RPC
// autorizam. A chave de idempotência faz o reenvio devolver o mesmo pedido.
//
// SEC-006 (revisão M2) — as fotos saem deste corpo. O `bodySizeLimit` de 12 MB
// vale para a requisição inteira, então cada foto vira uma chamada própria em
// `uploadServiceRequestPhotoAction`, depois que o pedido já existe.

export type ServiceRequestActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "session" }
  | { status: "success"; requestId: string; photoWarning?: string }

function text(formData: FormData, name: string): string {
  const raw = formData.get(name)
  return typeof raw === "string" ? raw : ""
}

function extensionFor(mime: string): string {
  if (mime === "image/png") return "png"
  if (mime === "image/webp") return "webp"
  return "jpg"
}

async function createUserClient() {
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
        // A sessão já existe; estas actions não renovam cookie.
      },
    },
  })
}

export async function submitServiceRequest(formData: FormData): Promise<ServiceRequestActionState> {
  const providerId = text(formData, "providerId").trim()
  const description = text(formData, "description")
  const when = text(formData, "when")
  const idempotencyKey = text(formData, "idempotencyKey").trim()

  const validation = firstFailure(
    validateRequestDescription(description),
    validateRequestWhen(when),
  )
  if (!validation.ok) {
    return { status: "error", message: validation.message }
  }

  if (providerId === "") {
    return { status: "error", message: "Não foi possível identificar o destinatário do pedido." }
  }

  const client = await createUserClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) {
    return { status: "session" }
  }

  const { data: requestId, error } = await client.rpc("create_service_request", {
    p_provider_id: providerId,
    p_description: description.trim(),
    p_when_text: when.trim() === "" ? null : when.trim(),
    p_idempotency_key: idempotencyKey === "" ? null : idempotencyKey,
  })

  if (error) {
    // ADR-20260923-teto-de-pedidos-por-par: cinco em aberto por par, recusados
    // com 54000 (o mesmo código do teto de convites). A recusa precisa dizer a
    // saída — "feche ou cancele um" —, senão vira o erro genérico abaixo e a
    // pessoa reenvia o mesmo pedido sem entender.
    if (error.code === "54000") {
      return {
        status: "error",
        message:
          "Você já tem cinco pedidos em aberto com este prestador. Feche ou cancele um para enviar outro.",
      }
    }
    log.error("pedidos: create_service_request failed", { error: error.message, user_id: user.id })
    return {
      status: "error",
      message: "Não foi possível enviar o pedido agora. Seu texto continua aqui — tente novamente.",
    }
  }

  return { status: "success", requestId: requestId as string }
}

/**
 * SEC-006 (revisão M2) — uma foto por chamada, sempre depois de o pedido
 * existir. Repete a autorização que a policy do Storage exigia (pedido cujo
 * `requester_user_id` é o chamador) antes de usar service_role.
 */
export async function uploadServiceRequestPhotoAction(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const requestId = text(formData, "requestId").trim()
  const position = Number.parseInt(text(formData, "position"), 10)
  const file = formData.get("photo")

  if (requestId === "") {
    return { error: "Pedido não identificado." }
  }
  if (!Number.isInteger(position) || position < 0 || position >= SERVICE_REQUEST_MAX_PHOTOS) {
    return { error: "Posição de foto inválida." }
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Escolha uma imagem para enviar." }
  }
  const validation = validateRequestPhotos([file])
  if (!validation.ok) {
    return { error: validation.message }
  }

  const client = await createUserClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) {
    return { error: "Sessão expirada. Entre novamente para enviar a foto." }
  }

  const serviceClient = createServiceClient()
  const { data: ownedRequest, error: ownershipError } = await serviceClient
    .from("service_requests")
    .select("id")
    .eq("id", requestId)
    .eq("requester_user_id", user.id)
    .maybeSingle()
  if (ownershipError) {
    log.error("pedidos: request ownership check failed", { error: ownershipError.message })
    return { error: "O pedido não existe ou não é seu." }
  }
  if (!ownedRequest) {
    log.error("pedidos: request ownership mismatch", { request_id: requestId })
    return { error: "O pedido não existe ou não é seu." }
  }

  let body: Buffer
  try {
    body = await sanitizeImage(file, SERVICE_REQUEST_PHOTO_MAX_BYTES)
  } catch {
    return { error: "Envie imagens JPEG, PNG ou WebP válidas de até 10 MB." }
  }

  const path = `${requestId}/${position}.${extensionFor(file.type)}`
  const { error: uploadError } = await serviceClient.storage
    .from("service-request-photos")
    .upload(path, body, { contentType: file.type, upsert: true })
  if (uploadError) {
    log.error("pedidos: photo upload failed", { error: uploadError.message })
    return { error: "Não foi possível enviar a foto." }
  }

  // A migration dá a `authenticated` apenas SELECT e INSERT em
  // `service_request_photos` (sem policy/grants de UPDATE). Um upsert com merge
  // exigiria UPDATE e falharia com "permission denied" já na primeira foto;
  // `ignoreDuplicates` produz ON CONFLICT DO NOTHING, que só precisa de INSERT e
  // mantém o reenvio idempotente.
  const { error: photoError } = await client
    .from("service_request_photos")
    .upsert(
      { request_id: requestId, photo_path: path, position },
      { onConflict: "request_id,position", ignoreDuplicates: true },
    )
  if (photoError) {
    log.error("pedidos: photo row failed", { error: photoError.message })
    return { error: "Não foi possível registrar a foto." }
  }

  return { ok: true }
}
