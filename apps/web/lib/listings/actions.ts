"use server"

// RECON-027 — escritas de Moradia. Mesmo ciclo de vida do Mercado (ADR D1/D2):
// o dono cria, edita e publica; a RLS confere dono e público a cada escrita.
// O servidor limpa os metadados e grava com service_role. Antes de cada upload
// ele reconfere a mesma condição que a policy do Storage exigia (anúncio existe
// e é do chamador), porque privilégio não é identidade.

import { revalidatePath } from "next/cache"
import { enviarFotoDoAnuncio, FalhaDaFoto } from "../storage/listing-photo"
import { isDefiniteSqlRejection } from "../storage/rpc-outcome"
import { sanitizeImage } from "../storage/sanitize-image"
import { createServerClient as createServiceClient } from "../supabase/server"
import type { ActionState } from "./action-state"
import { buildListingPhotoPath } from "./catalog"
import { parseListingFilters, type RawSearchParams } from "./filters"
import { createListingClient } from "./ssr-client"
import { MAX_LISTING_PHOTOS, MAX_PHOTO_BYTES } from "./types"

const GENERIC_ERROR: ActionState = {
  ok: false,
  message: "Não foi possível salvar agora. Tente de novo em instantes.",
}

async function currentUserId(): Promise<string | null> {
  const client = await createListingClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  return user?.id ?? null
}

// SEC-006 (revisão M2) — Moradia envia UMA foto por chamada, como o Mercado.
// O `bodySizeLimit` cobre o corpo inteiro da requisição; mandar as até 12 fotos
// juntas estourava os 12 MB antes de a action rodar. Cada chamada reconfere a
// autorização que a policy exigia e limpa os metadados da imagem.
export async function uploadPropertyPhotoAction(
  formData: FormData,
): Promise<{ path: string } | { error: string }> {
  const listingId = String(formData.get("listingId") ?? "")
  const position = Number.parseInt(String(formData.get("position") ?? ""), 10)
  const file = formData.get("photo")

  if (listingId === "") {
    return { error: "Anúncio não identificado." }
  }
  if (!Number.isInteger(position) || position < 0 || position >= MAX_LISTING_PHOTOS) {
    return { error: "Posição de foto inválida." }
  }
  if (!(file instanceof File)) {
    return { error: "Escolha uma imagem para enviar." }
  }
  const allowed = ["image/jpeg", "image/png", "image/webp"]
  if (!allowed.includes(file.type)) {
    return { error: "Use uma imagem JPEG, PNG ou WebP." }
  }
  if (file.size === 0 || file.size > MAX_PHOTO_BYTES) {
    return { error: "A imagem deve ter até 10 MB." }
  }

  const client = await createListingClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) {
    return { error: "Sessão expirada. Entre novamente para enviar a foto." }
  }

  // Mesma autorização de listing_photos_storage_insert_owner: o anúncio existe
  // e owner_user_id é o chamador. A checagem é explícita porque o upload abaixo
  // usa service_role e não passa mais pela policy.
  const service = createServiceClient()
  const { data: ownedListing, error: ownershipError } = await service
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("owner_user_id", user.id)
    .maybeSingle()
  if (ownershipError) {
    return { error: ownershipError.message }
  }
  if (!ownedListing) {
    return { error: "Este anúncio não existe ou não é seu." }
  }

  let image: Buffer
  try {
    image = await sanitizeImage(file, MAX_PHOTO_BYTES)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Imagem inválida." }
  }

  const path = buildListingPhotoPath(listingId, position, file.type)
  const { error: uploadError } = await service.storage
    .from("listing-photos")
    .upload(path, image, { contentType: file.type, upsert: false })
  if (uploadError) {
    return { error: uploadError.message }
  }

  let rowError: { message: string; code?: string } | null = null
  try {
    const { error } = await client
      .from("listing_photos")
      .insert({ listing_id: listingId, path, position })
    rowError = error
  } catch (error) {
    // Sem resposta nao ha prova de rollback: o INSERT pode ter commitado e a
    // resposta se perdido depois. Apagar o objeto deixaria a linha apontando
    // para um arquivo inexistente.
    console.error("[moradia] falha de transporte ao gravar a linha da foto:", error)
    return {
      error:
        "Não foi possível confirmar o envio da foto. Recarregue o anúncio antes de tentar novamente.",
    }
  }

  if (rowError) {
    if (!isDefiniteSqlRejection(rowError)) {
      // Erro sem SQLSTATE (gateway, PostgREST, timeout) tambem e inconclusivo.
      // Preserva o objeto para o retry/recarga, como Mercado e Pedido fazem.
      return {
        error:
          "Não foi possível confirmar o envio da foto. Recarregue o anúncio antes de tentar novamente.",
      }
    }

    // Recusa SQL definitiva: a linha é o que torna a foto visível; sem ela o
    // objeto fica órfão. A colisão de posição (23505) e o teto/faixa (23514)
    // são invariantes do banco: a action não tenta "consertar" a posição por
    // conta própria.
    const cleanup = await service.storage.from("listing-photos").remove([path])
    if (cleanup.error) {
      console.error("[moradia] falha ao remover objeto sem linha:", cleanup.error.message)
    }
    return { error: rowError.message }
  }

  return { path }
}

// SEC-006 (reconferência 2026-10-19) — a troca da foto do Mercado precisa ser
// uma transação só, não "apaga linhas, insere linha". A RPC reconfere o dono,
// trava o anúncio, apaga as linhas antigas e insere a nova no mesmo commit;
// devolve os caminhos antigos para a limpeza posterior. O objeto novo só é
// descartado quando a RPC recusa de forma definitiva e nenhuma linha aponta
// para ele.
export async function replaceListingPhotoAction(
  formData: FormData,
): Promise<
  | { ok: true; previousPaths: string[]; previousCleanupFailed: boolean }
  | { ok: false; definite: boolean; cleanupFailed: boolean; error: string }
> {
  const listingId = String(formData.get("listingId") ?? "")
  const newPath = String(formData.get("path") ?? "")
  const position = Number.parseInt(String(formData.get("position") ?? "0"), 10)

  if (listingId === "" || newPath === "") {
    return { ok: false, definite: true, cleanupFailed: false, error: "Foto não identificada." }
  }
  if (!newPath.startsWith(`${listingId}/`)) {
    return {
      ok: false,
      definite: true,
      cleanupFailed: false,
      error: "A foto não pertence a este anúncio.",
    }
  }
  if (!Number.isInteger(position) || position < 0 || position >= MAX_LISTING_PHOTOS) {
    return { ok: false, definite: true, cleanupFailed: false, error: "Posição de foto inválida." }
  }

  const userId = await currentUserId()
  if (userId === null) {
    return {
      ok: false,
      definite: true,
      cleanupFailed: false,
      error: "Sessão expirada. Entre novamente para trocar a foto.",
    }
  }

  const service = createServiceClient()
  const { data: ownedListing } = await service
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("owner_user_id", userId)
    .maybeSingle()
  if (!ownedListing) {
    return {
      ok: false,
      definite: true,
      cleanupFailed: false,
      error: "Este anúncio não existe ou não é seu.",
    }
  }

  const client = await createListingClient()
  let rpcData: string[] = []
  let rpcError: { message: string; code?: string } | null = null
  let transportFailure = false
  try {
    const { data, error } = await client.rpc("replace_listing_photo", {
      p_listing_id: listingId,
      p_path: newPath,
      p_position: position,
    })
    if (error) rpcError = error
    else rpcData = Array.isArray(data) ? (data as string[]) : []
  } catch (error) {
    transportFailure = true
    console.error("[mercado] falha de transporte na troca da foto:", error)
  }

  if (transportFailure) {
    // Sem resposta não há prova de rollback. O commit pode acontecer depois de
    // qualquer SELECT feito agora, então nenhum objeto é apagado. O caminho é
    // exclusivo desta chamada e fica preservado para o retry/recarga.
    return {
      ok: false,
      definite: false,
      cleanupFailed: false,
      error: "Não foi possível confirmar a troca da foto.",
    }
  }

  if (rpcError !== null) {
    if (!isDefiniteSqlRejection(rpcError)) {
      // Erro estruturado sem SQLSTATE (por exemplo, gateway/PGRST) não prova
      // que a transação foi recusada. Preserva o objeto.
      return {
        ok: false,
        definite: false,
        cleanupFailed: false,
        error: "Não foi possível confirmar a troca da foto.",
      }
    }

    // Recusa SQL definitiva: a transação não commitou. O caminho é exclusivo
    // desta chamada; limpar o objeto novo é seguro.
    let cleanupFailed = false
    try {
      const cleanup = await service.storage.from("listing-photos").remove([newPath])
      if (cleanup.error) {
        cleanupFailed = true
        console.error("[mercado] falha ao remover objeto sem linha:", cleanup.error.message)
      }
    } catch (error) {
      cleanupFailed = true
      console.error("[mercado] falha ao remover objeto sem linha:", error)
    }
    return { ok: false, definite: true, cleanupFailed, error: rpcError.message }
  }

  const oldPaths = rpcData.filter((path) => path !== newPath && path.startsWith(`${listingId}/`))
  let previousCleanupFailed = false
  if (oldPaths.length > 0) {
    try {
      const { error: removeError } = await service.storage.from("listing-photos").remove(oldPaths)
      if (removeError) {
        previousCleanupFailed = true
        console.error("[mercado] falha ao remover fotos anteriores:", removeError.message)
      }
    } catch (error) {
      previousCleanupFailed = true
      console.error("[mercado] falha ao remover fotos anteriores:", error)
    }
  }

  revalidatePath(`/mercado/${listingId}`)
  revalidatePath(`/mercado/${listingId}/editar`)
  return { ok: true, previousPaths: oldPaths, previousCleanupFailed }
}

// SEC-006 — foto do Mercado. O navegador não grava mais direto no bucket: envia
// o arquivo para cá, que limpa os metadados e grava com service_role. A
// autorização de listing_photos_storage_insert_owner é reconferida antes do
// upload: o anúncio existe e é do chamador.
export async function uploadListingPhotoAction(
  formData: FormData,
): Promise<{ path: string } | { error: string }> {
  const listingId = String(formData.get("listingId") ?? "")
  const position = Number.parseInt(String(formData.get("position") ?? ""), 10)
  const file = formData.get("photo")

  if (listingId === "") {
    return { error: "Anúncio não identificado." }
  }
  if (!Number.isInteger(position) || position < 0 || position >= MAX_LISTING_PHOTOS) {
    return { error: "Posição de foto inválida." }
  }
  if (!(file instanceof File)) {
    return { error: "Escolha uma imagem para enviar." }
  }
  const allowed = ["image/jpeg", "image/png", "image/webp"]
  if (!allowed.includes(file.type)) {
    return { error: "Use uma imagem JPEG, PNG ou WebP." }
  }
  if (file.size === 0 || file.size > MAX_PHOTO_BYTES) {
    return { error: "A imagem deve ter até 10 MB." }
  }

  const userId = await currentUserId()
  if (userId === null) {
    return { error: "Sessão expirada. Entre novamente para enviar a foto." }
  }

  try {
    const path = await enviarFotoDoAnuncio(
      await createListingClient(),
      userId,
      listingId,
      position,
      file,
    )
    return { path }
  } catch (error) {
    return {
      error:
        error instanceof FalhaDaFoto
          ? error.message
          : "Não foi possível enviar a foto. Confira a imagem e tente novamente.",
    }
  }
}

function alertNameFromFilters(raw: RawSearchParams): string {
  const filters = parseListingFilters(raw)
  const parts: string[] = ["Moradia"]
  if (filters.deal === "rent") parts.push("para alugar")
  if (filters.neighborhood) parts.push(`em ${filters.neighborhood}`)
  const name = parts.join(" ").slice(0, 80)
  return name.length >= 2 ? name : "Busca de imóveis"
}

export async function createListingAlertAction(formData: FormData): Promise<ActionState> {
  const userId = await currentUserId()
  if (userId === null) {
    return { ok: false, message: "Sessão expirada. Entre novamente para salvar a busca." }
  }

  const filters = parseListingFilters({
    q: String(formData.get("q") ?? "") || undefined,
    bairro: String(formData.get("bairro") ?? "") || undefined,
    tipo_negocio: String(formData.get("tipo_negocio") ?? "") || undefined,
    valor_max: String(formData.get("valor_max") ?? "") || undefined,
    quartos: String(formData.get("quartos") ?? "") || undefined,
    tipo: String(formData.get("tipo") ?? "") || undefined,
  })
  const name =
    String(formData.get("name") ?? "").trim() ||
    alertNameFromFilters({
      bairro: filters.neighborhood ?? undefined,
      tipo_negocio: filters.deal ?? undefined,
    })
  if (name.length < 2 || name.length > 80) {
    return { ok: false, field: "name", message: "Dê um nome de 2 a 80 caracteres à busca." }
  }

  // "Salvar busca" guarda sem entrega; "Criar alerta" ativa a entrega.
  const activate = String(formData.get("intent") ?? "alert") === "alert"
  const client = await createListingClient()
  const { error } = await client.from("listing_alerts").insert({
    owner_user_id: userId,
    name,
    kind: "property",
    locality_id: String(formData.get("localityId") ?? "") || null,
    neighborhood: filters.neighborhood,
    deal: filters.deal,
    max_value_cents: filters.maxValueCents,
    min_bedrooms: filters.minBedrooms,
    is_active: activate,
  })

  if (error) {
    return { ...GENERIC_ERROR, message: error.message }
  }

  revalidatePath("/imoveis/alertas")
  return { ok: true, message: activate ? "Alerta criado." : "Busca salva." }
}

// Objetos gravados pela action têm owner nulo (o service_role não carrega o
// `sub` do usuário), então a policy de DELETE `owner = auth.uid()` não os
// alcança. A remoção também passa a ser privilegiada, reconferindo a mesma
// posse e o mesmo prefixo de pasta que a policy exigia.
async function removeOwnedListingObjects(
  listingId: string,
  paths: string[],
): Promise<{ error?: string }> {
  if (paths.length === 0) return {}
  const userId = await currentUserId()
  if (userId === null) {
    return { error: "Sessão expirada. Entre novamente para editar." }
  }
  if (paths.some((path) => !path.startsWith(`${listingId}/`))) {
    return { error: "A foto não pertence a este anúncio." }
  }

  const service = createServiceClient()
  const { data: ownedListing, error: ownershipError } = await service
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("owner_user_id", userId)
    .maybeSingle()
  if (ownershipError) return { error: ownershipError.message }
  if (!ownedListing) return { error: "Este anúncio não existe ou não é seu." }

  const { error: removeError } = await service.storage.from("listing-photos").remove(paths)
  if (removeError) return { error: removeError.message }
  return {}
}

export async function deleteListingPhotoObjectAction(formData: FormData): Promise<ActionState> {
  const listingId = String(formData.get("listingId") ?? "")
  const path = String(formData.get("path") ?? "")
  if (listingId === "" || path === "") {
    return { ok: false, message: "Foto não identificada." }
  }
  const removal = await removeOwnedListingObjects(listingId, [path])
  if (removal.error) return { ...GENERIC_ERROR, message: removal.error }
  revalidatePath(`/imoveis/${listingId}`)
  revalidatePath(`/mercado/${listingId}`)
  return { ok: true }
}

export async function removeListingPhotoAction(formData: FormData): Promise<ActionState> {
  const userId = await currentUserId()
  if (userId === null) {
    return { ok: false, message: "Sessão expirada. Entre novamente para editar." }
  }
  const listingId = String(formData.get("listingId") ?? "")
  const path = String(formData.get("path") ?? "")
  if (listingId === "" || path === "") {
    return { ok: false, message: "Foto não identificada." }
  }

  const client = await createListingClient()
  const { error: rowError } = await client
    .from("listing_photos")
    .delete()
    .eq("listing_id", listingId)
    .eq("path", path)
  if (rowError) {
    return { ...GENERIC_ERROR, message: rowError.message }
  }

  // D3 do ADR de mídia: remover a imagem do recurso remove o objeto.
  const removal = await removeOwnedListingObjects(listingId, [path])
  if (removal.error) {
    return { ...GENERIC_ERROR, message: removal.error }
  }

  revalidatePath(`/imoveis/${listingId}`)
  revalidatePath(`/imoveis/${listingId}/editar`)
  return { ok: true }
}

export async function toggleListingSaveAction(formData: FormData): Promise<ActionState> {
  const userId = await currentUserId()
  if (userId === null) {
    return { ok: false, message: "Sessão expirada. Entre novamente para salvar." }
  }
  const listingId = String(formData.get("listingId") ?? "")
  const saved = String(formData.get("saved") ?? "") === "true"
  if (listingId === "") {
    return { ok: false, message: "Anúncio não identificado." }
  }

  const client = await createListingClient()
  if (saved) {
    const { error } = await client
      .from("listing_saves")
      .delete()
      .eq("listing_id", listingId)
      .eq("user_id", userId)
    if (error) return { ...GENERIC_ERROR, message: error.message }
  } else {
    const { error } = await client
      .from("listing_saves")
      .insert({ listing_id: listingId, user_id: userId })
    if (error && error.code !== "23505") return { ...GENERIC_ERROR, message: error.message }
  }

  revalidatePath("/imoveis")
  revalidatePath(`/imoveis/${listingId}`)
  return { ok: true }
}

// RECON-028 — gestão da assinatura (prancha 65, painel 2). A RLS de
// `listing_alerts` é quem garante que só o dono altera; `.select("id")` devolve
// as linhas realmente afetadas, então uma assinatura que sumiu ou mudou em outra
// aba vira conflito declarado, não "sucesso" silencioso.
export async function updateListingAlertAction(formData: FormData): Promise<ActionState> {
  const userId = await currentUserId()
  if (userId === null) {
    return { ok: false, message: "Sessão expirada. Entre novamente para editar o alerta." }
  }

  const alertId = String(formData.get("alertId") ?? "")
  if (alertId === "") {
    return { ok: false, message: "Alerta não identificado." }
  }

  const filters = parseListingFilters({
    bairro: String(formData.get("bairro") ?? "") || undefined,
    tipo_negocio: String(formData.get("tipo_negocio") ?? "") || undefined,
    valor_max: String(formData.get("valor_max") ?? "") || undefined,
    quartos: String(formData.get("quartos") ?? "") || undefined,
  })

  const client = await createListingClient()
  const { data, error } = await client
    .from("listing_alerts")
    .update({
      locality_id: String(formData.get("localityId") ?? "") || null,
      neighborhood: filters.neighborhood,
      deal: filters.deal,
      max_value_cents: filters.maxValueCents,
      min_bedrooms: filters.minBedrooms,
    })
    .eq("id", alertId)
    .select("id")

  if (error) {
    return { ...GENERIC_ERROR, message: error.message }
  }
  if (!data || data.length === 0) {
    return {
      ok: false,
      message: "Este alerta não existe mais ou mudou em outra aba. Recarregue e tente de novo.",
    }
  }

  revalidatePath("/imoveis/alertas")
  return { ok: true, message: "Alerta atualizado." }
}

export async function setListingAlertActiveAction(formData: FormData): Promise<ActionState> {
  const userId = await currentUserId()
  if (userId === null) {
    return { ok: false, message: "Sessão expirada. Entre novamente para mudar o alerta." }
  }

  const alertId = String(formData.get("alertId") ?? "")
  if (alertId === "") {
    return { ok: false, message: "Alerta não identificado." }
  }
  const active = String(formData.get("active") ?? "") === "true"

  const client = await createListingClient()
  const { data, error } = await client
    .from("listing_alerts")
    .update({ is_active: active })
    .eq("id", alertId)
    .select("id")

  if (error) {
    return { ...GENERIC_ERROR, message: error.message }
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "Este alerta não existe mais. Recarregue a página." }
  }

  revalidatePath("/imoveis/alertas")
  return { ok: true, message: active ? "Alerta ligado." : "Alerta desligado." }
}

export async function deleteListingAlertAction(formData: FormData): Promise<ActionState> {
  const userId = await currentUserId()
  if (userId === null) {
    return { ok: false, message: "Sessão expirada. Entre novamente para excluir o alerta." }
  }

  const alertId = String(formData.get("alertId") ?? "")
  if (alertId === "") {
    return { ok: false, message: "Alerta não identificado." }
  }

  const client = await createListingClient()
  const { data, error } = await client
    .from("listing_alerts")
    .delete()
    .eq("id", alertId)
    .select("id")

  if (error) {
    return { ...GENERIC_ERROR, message: error.message }
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "Este alerta não existe mais. Recarregue a página." }
  }

  revalidatePath("/imoveis/alertas")
  return { ok: true, message: "Alerta excluído." }
}
