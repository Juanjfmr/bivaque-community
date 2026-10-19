"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { log } from "../../../../lib/logger"
import {
  firstFailure,
  SERVICE_REQUEST_PHOTO_MAX_BYTES,
  SERVICE_REQUEST_PHOTO_MIME_TYPES,
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

export type ServiceRequestActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "session" }
  | { status: "success"; requestId: string }

function text(formData: FormData, name: string): string {
  const raw = formData.get(name)
  return typeof raw === "string" ? raw : ""
}

function extensionFor(mime: string): string {
  if (mime === "image/png") return "png"
  if (mime === "image/webp") return "webp"
  return "jpg"
}

export async function submitServiceRequest(formData: FormData): Promise<ServiceRequestActionState> {
  const providerId = text(formData, "providerId").trim()
  const description = text(formData, "description")
  const when = text(formData, "when")
  const idempotencyKey = text(formData, "idempotencyKey").trim()
  const photos = formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)

  const validation = firstFailure(
    validateRequestDescription(description),
    validateRequestWhen(when),
    validateRequestPhotos(photos),
  )
  if (!validation.ok) {
    return { status: "error", message: validation.message }
  }

  if (providerId === "") {
    return { status: "error", message: "Não foi possível identificar o destinatário do pedido." }
  }

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // A sessão já existe; esta action não renova cookie.
      },
    },
  })

  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) {
    return { status: "session" }
  }

  const images: { file: File; body: Buffer }[] = []
  try {
    for (const file of photos) {
      images.push({ file, body: await sanitizeImage(file, SERVICE_REQUEST_PHOTO_MAX_BYTES) })
    }
  } catch {
    return { status: "error", message: "Envie imagens JPEG, PNG ou WebP válidas de até 10 MB." }
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

  const createdId = requestId as string

  // SEC-006 — a policy service_request_photos_storage_insert_owner exigia dono
  // do objeto e pedido cujo requester é o chamador. O upload agora usa
  // service_role, então a mesma condição é reconferida aqui antes de escrever.
  // Sem anexo não há escrita no Storage e nada a reconferir.
  if (images.length > 0) {
    const serviceClient = createServiceClient()
    const { data: ownedRequest, error: ownershipError } = await serviceClient
      .from("service_requests")
      .select("id")
      .eq("id", createdId)
      .eq("requester_user_id", user.id)
      .maybeSingle()
    if (ownershipError) {
      log.error("pedidos: request ownership check failed", { error: ownershipError.message })
      return {
        status: "error",
        message: "O pedido foi criado, mas o envio das fotos falhou. Tente novamente.",
      }
    }
    if (!ownedRequest) {
      log.error("pedidos: request ownership mismatch", { request_id: createdId })
      return {
        status: "error",
        message: "O pedido foi criado, mas o envio das fotos falhou. Tente novamente.",
      }
    }

    // Anexo é opcional e vem depois do pedido existir: o caminho começa pelo id
    // do pedido, que é o que a policy de leitura do storage confere.
    for (const [index, { file, body }] of images.entries()) {
      if (!SERVICE_REQUEST_PHOTO_MIME_TYPES.some((mime) => mime === file.type)) {
        return { status: "error", message: "Use imagens JPEG, PNG ou WebP." }
      }
      const path = `${createdId}/${index}.${extensionFor(file.type)}`
      const { error: uploadError } = await serviceClient.storage
        .from("service-request-photos")
        .upload(path, body, { contentType: file.type, upsert: true })
      if (uploadError) {
        log.error("pedidos: photo upload failed", { error: uploadError.message })
        return {
          status: "error",
          message: "O pedido foi criado, mas o envio das fotos falhou. Tente novamente.",
        }
      }
      // A migration dá a `authenticated` apenas SELECT e INSERT em
      // `service_request_photos` (sem policy/grants de UPDATE). Um upsert com
      // merge exigiria UPDATE e falharia com "permission denied" já na primeira
      // foto; `ignoreDuplicates` produz ON CONFLICT DO NOTHING, que só precisa
      // de INSERT e mantém o reenvio idempotente. O arquivo já foi sobrescrito no
      // storage (upsert: true), então o caminho continua apontando para o novo.
      const { error: photoError } = await client
        .from("service_request_photos")
        .upsert(
          { request_id: createdId, photo_path: path, position: index },
          { onConflict: "request_id,position", ignoreDuplicates: true },
        )
      if (photoError) {
        log.error("pedidos: photo row failed", { error: photoError.message })
        return {
          status: "error",
          message: "O pedido foi criado, mas o envio das fotos falhou. Tente novamente.",
        }
      }
    }
  }

  return { status: "success", requestId: createdId }
}
