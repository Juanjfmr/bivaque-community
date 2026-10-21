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
import { isDefiniteSqlRejection } from "../../../../lib/storage/rpc-outcome"
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
export type UploadServiceRequestPhotoResult =
  | { ok: true }
  | {
      error: string
      definite?: boolean
      indeterminate?: boolean
      cleanupFailed?: boolean
    }

function definiteFailure(error: string): UploadServiceRequestPhotoResult {
  return { error }
}

export async function uploadServiceRequestPhotoAction(
  formData: FormData,
): Promise<UploadServiceRequestPhotoResult> {
  const requestId = text(formData, "requestId").trim()
  const position = Number.parseInt(text(formData, "position"), 10)
  const file = formData.get("photo")

  if (requestId === "") {
    return definiteFailure("Pedido não identificado.")
  }
  if (!Number.isInteger(position) || position < 0 || position >= SERVICE_REQUEST_MAX_PHOTOS) {
    return definiteFailure("Posição de foto inválida.")
  }
  if (!(file instanceof File) || file.size === 0) {
    return definiteFailure("Escolha uma imagem para enviar.")
  }
  const validation = validateRequestPhotos([file])
  if (!validation.ok) {
    return definiteFailure(validation.message)
  }

  const client = await createUserClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) {
    return definiteFailure("Sessão expirada. Entre novamente para enviar a foto.")
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
    return definiteFailure("O pedido não existe ou não é seu.")
  }
  if (!ownedRequest) {
    log.error("pedidos: request ownership mismatch", { request_id: requestId })
    return definiteFailure("O pedido não existe ou não é seu.")
  }

  let body: Buffer
  try {
    body = await sanitizeImage(file, SERVICE_REQUEST_PHOTO_MAX_BYTES)
  } catch {
    return definiteFailure("Envie imagens JPEG, PNG ou WebP válidas de até 10 MB.")
  }

  // Caminho único por chamada: duas tentativas na mesma posição não podem
  // sobrescrever o objeto uma da outra antes de a linha decidir quem vence.
  const path = `${requestId}/${position}-${Date.now()}-${crypto.randomUUID()}.${extensionFor(file.type)}`
  const { error: uploadError } = await serviceClient.storage
    .from("service-request-photos")
    .upload(path, body, { contentType: file.type, upsert: false })
  if (uploadError) {
    log.error("pedidos: photo upload failed", { error: uploadError.message })
    return definiteFailure("Não foi possível enviar a foto.")
  }

  // O vínculo é uma RPC transacional: ela reconfere o solicitante, trava o
  // pedido, grava/atualiza a linha e devolve o caminho anterior.
  let previousPath: string | null = null
  let registrationError: { message: string; code?: string } | null = null
  let transportFailure = false
  try {
    const { data, error } = await client.rpc("register_service_request_photo", {
      p_request_id: requestId,
      p_path: path,
      p_position: position,
    })
    if (error) registrationError = error
    else if (typeof data === "string") previousPath = data
  } catch (error) {
    transportFailure = true
    log.error("pedidos: photo registration transport failure", {
      error: error instanceof Error ? error.message : "unknown",
    })
  }

  if (transportFailure) {
    // Sem resposta, o commit pode acontecer depois de qualquer SELECT. Os bytes
    // ficam preservados; a próxima chamada na mesma posição substitui a linha e
    // limpa o objeto anterior somente após o commit.
    return {
      error:
        "Não foi possível confirmar o envio da foto. Recarregue o pedido antes de tentar novamente.",
      definite: false,
      indeterminate: true,
      cleanupFailed: false,
    }
  }

  if (registrationError !== null) {
    if (!isDefiniteSqlRejection(registrationError)) {
      return {
        error:
          "Não foi possível confirmar o envio da foto. Recarregue o pedido antes de tentar novamente.",
        definite: false,
        indeterminate: true,
        cleanupFailed: false,
      }
    }

    // Recusa SQL definitiva: não houve commit. O caminho é exclusivo desta
    // chamada; compensar o objeto novo é seguro.
    let cleanupFailed = false
    try {
      const cleanup = await serviceClient.storage.from("service-request-photos").remove([path])
      if (cleanup.error) {
        cleanupFailed = true
        log.error("pedidos: orphan photo cleanup failed", { error: cleanup.error.message })
      }
    } catch (error) {
      cleanupFailed = true
      log.error("pedidos: orphan photo cleanup failed", {
        error: error instanceof Error ? error.message : "unknown",
      })
    }
    log.error("pedidos: photo row failed", { error: registrationError.message })
    return {
      error: "Não foi possível registrar a foto.",
      definite: true,
      indeterminate: false,
      cleanupFailed,
    }
  }

  // A partir daqui o commit aconteceu: o caminho anterior não é mais lido pelo
  // pedido e pode ser removido. Falhar nessa limpeza deixa um objeto órfão e não
  // invalida o anexo novo.
  if (previousPath !== null && previousPath !== path && previousPath.startsWith(`${requestId}/`)) {
    try {
      const cleanup = await serviceClient.storage
        .from("service-request-photos")
        .remove([previousPath])
      if (cleanup.error) {
        log.error("pedidos: previous photo cleanup failed", { error: cleanup.error.message })
      }
    } catch (error) {
      log.error("pedidos: previous photo cleanup failed", {
        error: error instanceof Error ? error.message : "unknown",
      })
    }
  }

  return { ok: true }
}
