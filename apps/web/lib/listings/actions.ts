"use server"

// RECON-027 — escritas de Moradia. Mesmo ciclo de vida do Mercado (ADR D1/D2):
// o dono cria, edita e publica; a RLS confere dono e público a cada escrita.
// As fotos chegam já sem EXIF (o cliente redesenha em canvas) e são enviadas
// pelo cliente autenticado, então a policy de storage reconfere o dono.

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { ActionState } from "./action-state"
import { validateAddress } from "./address"
import { parseListingFilters, type RawSearchParams } from "./filters"
import { createListingClient } from "./ssr-client"
import { MAX_LISTING_PHOTOS, MAX_PHOTO_BYTES } from "./types"
import {
  type PropertyDraftInput,
  parseOptionalArea,
  parseOptionalCents,
  parseOptionalInt,
  validatePropertyDraft,
} from "./validation"

const GENERIC_ERROR: ActionState = {
  ok: false,
  message: "Não foi possível salvar agora. Tente de novo em instantes.",
}

function readPropertyDraft(formData: FormData): PropertyDraftInput {
  const value = (key: string) => String(formData.get(key) ?? "")
  return {
    title: value("title"),
    deal: value("deal"),
    propertyType: value("propertyType"),
    rent: value("rent"),
    condoFee: value("condoFee"),
    iptu: value("iptu"),
    salePrice: value("salePrice"),
    bedrooms: value("bedrooms"),
    suites: value("suites"),
    parkingSpots: value("parkingSpots"),
    areaM2: value("areaM2"),
    description: value("description"),
    neighborhood: value("neighborhood"),
    address: value("address"),
    availableFrom: value("availableFrom"),
  }
}

// Já validado por validatePropertyDraft; aqui só normaliza (vazio vira null).
function addressValue(raw: string | undefined): string | null {
  const result = validateAddress(raw)
  return result.ok ? result.value : null
}

async function currentUserId(): Promise<string | null> {
  const client = await createListingClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  return user?.id ?? null
}

async function uploadPhotos(listingId: string, files: File[]): Promise<{ error?: string }> {
  if (files.length === 0) return {}
  const client = await createListingClient()
  const allowed = ["image/jpeg", "image/png", "image/webp"]

  for (const [index, file] of files.entries()) {
    if (!allowed.includes(file.type)) {
      return { error: `Formato de imagem não permitido: ${file.type || "desconhecido"}.` }
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { error: "Uma das fotos passa de 10 MB." }
    }
    const extension =
      file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
    const path = `${listingId}/${Date.now()}-${index}-${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await client.storage
      .from("listing-photos")
      .upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) {
      return { error: uploadError.message }
    }
    const { error: rowError } = await client
      .from("listing_photos")
      .insert({ listing_id: listingId, path, position: index })
    if (rowError) {
      return { error: rowError.message }
    }
  }
  return {}
}

export async function createPropertyAction(formData: FormData): Promise<ActionState> {
  const userId = await currentUserId()
  if (userId === null) {
    return { ok: false, message: "Sessão expirada. Entre novamente para publicar." }
  }

  const draft = readPropertyDraft(formData)
  const validation = validatePropertyDraft(draft)
  if (!validation.ok) {
    return { ok: false, field: validation.field, message: validation.message }
  }

  const intent = String(formData.get("intent") ?? "publish")
  const status = intent === "draft" ? "draft" : "active"
  const localityId = String(formData.get("localityId") ?? "")
  const communityId = String(formData.get("communityId") ?? "")
  const audience = communityId !== "" ? { community_id: communityId } : { locality_id: localityId }

  const client = await createListingClient()
  const { data: listing, error: listingError } = await client
    .from("listings")
    .insert({
      owner_user_id: userId,
      kind: "property",
      status,
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      neighborhood: draft.neighborhood.trim() || null,
      address: addressValue(draft.address),
      published_at: status === "active" ? new Date().toISOString() : null,
      ...audience,
    })
    .select("id")
    .single()

  if (listingError) {
    return { ...GENERIC_ERROR, message: listingError.message }
  }

  const { error: detailsError } = await client.from("property_details").insert({
    listing_id: listing.id,
    deal: draft.deal as "rent" | "sale",
    property_type: draft.propertyType as
      | "apartment"
      | "house"
      | "studio"
      | "room"
      | "land"
      | "commercial",
    rent_cents: parseOptionalCents(draft.rent),
    condo_fee_cents: parseOptionalCents(draft.condoFee),
    iptu_cents: parseOptionalCents(draft.iptu),
    sale_price_cents: parseOptionalCents(draft.salePrice),
    bedrooms: parseOptionalInt(draft.bedrooms),
    suites: parseOptionalInt(draft.suites),
    parking_spots: parseOptionalInt(draft.parkingSpots),
    area_m2: parseOptionalArea(draft.areaM2),
    available_from: draft.availableFrom.trim() || null,
  })

  if (detailsError) {
    await client.from("listings").delete().eq("id", listing.id)
    return { ...GENERIC_ERROR, message: detailsError.message }
  }

  const files = formData.getAll("photos").filter((entry): entry is File => entry instanceof File)
  const upload = await uploadPhotos(listing.id, files.slice(0, MAX_LISTING_PHOTOS))
  if (upload.error) {
    return { ok: false, message: upload.error }
  }

  revalidatePath("/imoveis")
  redirect(`/imoveis/${listing.id}`)
}

export async function updatePropertyAction(formData: FormData): Promise<ActionState> {
  const userId = await currentUserId()
  if (userId === null) {
    return { ok: false, message: "Sessão expirada. Entre novamente para editar." }
  }

  const listingId = String(formData.get("listingId") ?? "")
  if (listingId === "") {
    return { ok: false, message: "Anúncio não identificado." }
  }

  const draft = readPropertyDraft(formData)
  const validation = validatePropertyDraft(draft)
  if (!validation.ok) {
    return { ok: false, field: validation.field, message: validation.message }
  }

  const client = await createListingClient()
  const { error: listingError } = await client
    .from("listings")
    .update({
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      neighborhood: draft.neighborhood.trim() || null,
      address: addressValue(draft.address),
    })
    .eq("id", listingId)

  if (listingError) {
    return { ...GENERIC_ERROR, message: listingError.message }
  }

  const { error: detailsError } = await client
    .from("property_details")
    .update({
      deal: draft.deal as "rent" | "sale",
      property_type: draft.propertyType as
        | "apartment"
        | "house"
        | "studio"
        | "room"
        | "land"
        | "commercial",
      rent_cents: parseOptionalCents(draft.rent),
      condo_fee_cents: parseOptionalCents(draft.condoFee),
      iptu_cents: parseOptionalCents(draft.iptu),
      sale_price_cents: parseOptionalCents(draft.salePrice),
      bedrooms: parseOptionalInt(draft.bedrooms),
      suites: parseOptionalInt(draft.suites),
      parking_spots: parseOptionalInt(draft.parkingSpots),
      area_m2: parseOptionalArea(draft.areaM2),
      available_from: draft.availableFrom.trim() || null,
    })
    .eq("listing_id", listingId)

  if (detailsError) {
    return { ...GENERIC_ERROR, message: detailsError.message }
  }

  const files = formData.getAll("photos").filter((entry): entry is File => entry instanceof File)
  const upload = await uploadPhotos(listingId, files.slice(0, MAX_LISTING_PHOTOS))
  if (upload.error) {
    return { ok: false, message: upload.error }
  }

  revalidatePath(`/imoveis/${listingId}`)
  revalidatePath("/imoveis")
  redirect(`/imoveis/${listingId}`)
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
  const { error: storageError } = await client.storage.from("listing-photos").remove([path])
  if (storageError) {
    return { ...GENERIC_ERROR, message: storageError.message }
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
