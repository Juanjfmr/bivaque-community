"use server"

import { randomUUID } from "node:crypto"
import {
  ALLOWED_STORAGE_IMAGE_MIME_TYPES,
  type AllowedStorageImageMime,
  LISTING_PHOTO_MAX_SIZE_BYTES,
  LISTING_PROPERTY_MAX_PHOTOS,
  LISTING_PROPERTY_TYPES,
  type ListingPropertyType,
  stripImageExif,
} from "@bivaque/domain"
import { revalidatePath } from "next/cache"
import type { Database } from "supabase/database.generated"
import { createServerClient } from "../supabase/server"
import { createUserClient } from "./server"
import type { ListingRow } from "./types"
import { numericFormValues, validatePropertyNumbers } from "./validation"

// FIGMA-002 — escritas do domínio de anúncios. Validação no cliente E no
// servidor (contrato): MIME/size/magic e o limite de 12 fotos são checados
// aqui; o banco re-checa (trigger de cota com lock, constraints, RLS).
// EXIF sai NA ENTRADA: o byte que chega ao bucket já foi reescrito sem
// metadado de câmera/coordenada (ADR de mídia D5).
//
// Storage: o bucket listing-photos NÃO tem policy de DELETE (guard da casa em
// supabase/tests/storage-policies.sql). Remoção de objeto é caminho de servidor
// privilegiado, SOMENTE depois de confirmar o dono pela linha do anúncio, e o
// resultado de cada passo é verificado — compensação que falha vira erro
// relatado, nunca objeto órfão alcançável em silêncio (ADR de mídia D3).
// Mutações via client de sessão conferem a linha afetada: RLS devolve 0 linhas
// sem erro para terceiro, e 0 linhas NÃO é sucesso.

export interface ActionResult {
  ok: boolean
  error: string | null
  listingId?: string
  conversationId?: string
}

const MIME_EXT: Record<AllowedStorageImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

function magicMatches(mime: AllowedStorageImageMime, bytes: Uint8Array): boolean {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8
  if (mime === "image/png")
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
}

function propertyFormFields(form: FormData) {
  const text = (name: string) => {
    const value = form.get(name)
    return typeof value === "string" ? value.trim() : ""
  }
  const num = (name: string): number | null => {
    const value = text(name)
    if (value === "") return null
    const parsed = Number(value.replace(",", "."))
    return Number.isFinite(parsed) ? parsed : null
  }
  return {
    title: text("title"),
    description: text("description") || null,
    propertyType: text("property_type") as ListingPropertyType,
    neighborhood: text("neighborhood"),
    rentCents: (() => {
      const reais = num("rent_reais")
      return reais === null ? null : Math.round(reais * 100)
    })(),
    condoFeeCents: (() => {
      const reais = num("condo_reais")
      return reais === null ? null : Math.round(reais * 100)
    })(),
    iptuCents: (() => {
      const reais = num("iptu_reais")
      return reais === null ? null : Math.round(reais * 100)
    })(),
    bedrooms: num("bedrooms"),
    bathrooms: num("bathrooms"),
    parkingSpots: num("parking_spots"),
    areaM2: num("area_m2"),
    availableFrom: text("available_from") || null,
    isFurnished: form.get("is_furnished") === "on",
    acceptsPets: form.get("accepts_pets") === "on",
    condoIncluded: form.get("condo_included") === "on",
  }
}

function validatePropertyForm(fields: ReturnType<typeof propertyFormFields>): string | null {
  if (fields.title.length < 3 || fields.title.length > 80) {
    return "O título precisa ter entre 3 e 80 caracteres."
  }
  if (!LISTING_PROPERTY_TYPES.includes(fields.propertyType)) {
    return "Escolha um tipo de imóvel válido."
  }
  if (fields.neighborhood.length < 2 || fields.neighborhood.length > 60) {
    return "Informe o bairro (sem endereço, número ou complemento)."
  }
  if (
    fields.description !== null &&
    (fields.description.length < 10 || fields.description.length > 2000)
  ) {
    return "A descrição precisa ter entre 10 e 2000 caracteres."
  }
  return null
}

/** Confirma com a sessão real + RLS que o caller é o dono do anúncio. */
async function ownerOfListing(listingId: string, callerId: string | null) {
  if (!callerId) return null
  const service = await createUserClient()
  const { data } = await service
    .from("listings")
    .select("id, owner_user_id, status")
    .eq("id", listingId)
    .maybeSingle()
  if (!data || data.owner_user_id !== callerId) return null
  return data
}

/** Remove objeto no bucket pelo caminho privilegiado, verificando o resultado. */
async function removeObjectPrivileged(objectPath: string): Promise<string | null> {
  const service = createServerClient()
  const { error } = await service.storage.from("listing-photos").remove([objectPath])
  return error ? error.message : null
}

/** Valida, remove EXIF e grava fotos; devolve quantas gravou e o primeiro erro. */
async function storePhotos(
  supabase: Awaited<ReturnType<typeof createUserClient>>,
  listingId: string,
  files: File[],
): Promise<{ stored: number; error: string | null }> {
  let stored = 0
  for (const file of files) {
    const mime = file.type as AllowedStorageImageMime
    if (!ALLOWED_STORAGE_IMAGE_MIME_TYPES.includes(mime)) {
      return { stored, error: "Formato de foto não aceito. Use JPEG, PNG ou WebP." }
    }
    if (file.size > LISTING_PHOTO_MAX_SIZE_BYTES) {
      return { stored, error: "Cada foto deve ter no máximo 10 MB." }
    }
    const raw = new Uint8Array(await file.arrayBuffer())
    if (!magicMatches(mime, raw)) {
      return { stored, error: "O conteúdo do arquivo não confere com o formato declarado." }
    }
    const cleaned = stripImageExif(raw)
    const path = `${listingId}/${randomUUID()}.${MIME_EXT[mime]}`
    const { error: uploadError } = await supabase.storage
      .from("listing-photos")
      .upload(path, cleaned, { contentType: mime, upsert: false })
    if (uploadError) {
      return { stored, error: "Não foi possível guardar uma das fotos. Tente novamente." }
    }
    const { data: row, error: rowError } = await supabase
      .from("listing_media")
      .insert({
        listing_id: listingId,
        position: 0, // o trigger posiciona (servidor) e valida a cota de 12
        is_cover: false,
        object_path: path,
        mime_type: mime,
        byte_size: cleaned.byteLength,
      })
      .select("id")
      .maybeSingle()
    if (rowError || !row) {
      // Compensação pelo caminho privilegiado (não há policy de delete no
      // bucket): objeto sem linha seria órfão alcançável (ADR de mídia D3).
      const cleanupError = await removeObjectPrivileged(path)
      if (cleanupError)
        return {
          stored,
          error: "Falha ao registrar uma foto e ao desfazer o upload. Tente novamente.",
        }
      if (rowError?.code === "23514") {
        return { stored, error: "Um anúncio de imóvel aceita no máximo 12 fotos." }
      }
      return { stored, error: "Não foi possível registrar uma das fotos. Tente novamente." }
    }
    stored += 1
  }
  return { stored, error: null }
}

export async function publishPropertyListing(form: FormData): Promise<ActionResult> {
  const numericError = validatePropertyNumbers(numericFormValues(form))
  if (numericError) return { ok: false, error: numericError }
  const supabase = await createUserClient()
  const fields = propertyFormFields(form)
  const invalid = validatePropertyForm(fields)
  if (invalid) return { ok: false, error: invalid }

  const audience = form.get("audience")
  const audienceValue = typeof audience === "string" ? audience : ""
  const audienceIsCommunity = audienceValue.startsWith("community:")
  const localityId = audienceIsCommunity ? null : audienceValue || null
  const communityId = audienceIsCommunity ? audienceValue.slice("community:".length) : null
  if (!localityId && !communityId) {
    return { ok: false, error: "Escolha quem pode ver o anúncio." }
  }

  const files = form.getAll("photos").filter((entry): entry is File => entry instanceof File)
  if (files.length > LISTING_PROPERTY_MAX_PHOTOS) {
    return { ok: false, error: "Um anúncio de imóvel aceita no máximo 12 fotos." }
  }

  // pg_proc types do not encode nullable SQL arguments. The RPC explicitly
  // accepts NULL costs/audience alternatives; keep NULL at the wire boundary.
  const args = {
    p_title: fields.title,
    p_description: fields.description,
    p_locality_id: localityId,
    p_community_id: communityId,
    p_property_type: fields.propertyType,
    p_neighborhood: fields.neighborhood,
    p_rent_cents: fields.rentCents,
    p_condo_fee_cents: fields.condoFeeCents,
    p_iptu_cents: fields.iptuCents,
    p_bedrooms: fields.bedrooms,
    p_bathrooms: fields.bathrooms,
    p_parking_spots: fields.parkingSpots,
    p_area_m2: fields.areaM2,
    p_available_from: fields.availableFrom,
    p_is_furnished: fields.isFurnished,
    p_accepts_pets: fields.acceptsPets,
    p_condo_included_in_rent: fields.condoIncluded,
  }
  const { data: listingId, error: createError } = await supabase.rpc(
    "create_property_listing",
    args as Database["public"]["Functions"]["create_property_listing"]["Args"],
  )
  if (createError || !listingId) {
    return {
      ok: false,
      error: "Não foi possível criar o anúncio. Revise os campos e tente novamente.",
    }
  }

  let photoError: string | null = null
  if (files.length > 0) {
    const stored = await storePhotos(supabase, listingId, files)
    photoError = stored.error
  }
  if (photoError) {
    revalidatePath("/imoveis")
    return { ok: false, error: photoError, listingId }
  }
  if (form.get("defer_activation") === "on") {
    revalidatePath("/imoveis")
    return { ok: true, error: null, listingId }
  }

  // Publicar é a segunda escrita autorizada (draft -> active). Linha afetada
  // conferida: 0 linhas não é sucesso. Se falhar, o rascunho permanece
  // retomável na edição — nunca um falso "publicado".
  const { data: published, error: publishError } = await supabase
    .from("listings")
    .update({ status: "active" })
    .eq("id", listingId)
    .select("id")
    .maybeSingle()
  if (publishError || !published) {
    return {
      ok: false,
      error: "O anúncio foi salvo como rascunho, mas não foi possível publicar agora.",
      listingId,
    }
  }

  revalidatePath("/imoveis")
  revalidatePath(`/imoveis/${listingId}`)
  return {
    ok: photoError === null,
    error: photoError,
    listingId,
  }
}

export async function updatePropertyListing(form: FormData): Promise<ActionResult> {
  const numericError = validatePropertyNumbers(numericFormValues(form))
  if (numericError) return { ok: false, error: numericError }
  const supabase = await createUserClient()
  const listingId = form.get("listing_id")
  if (typeof listingId !== "string" || listingId.length === 0) {
    return { ok: false, error: "Anúncio não informado." }
  }
  const fields = propertyFormFields(form)
  const invalid = validatePropertyForm(fields)
  if (invalid) return { ok: false, error: invalid }

  // Público NÃO entra no update: o formulário entrega o campo desabilitado e,
  // mesmo que um corpo hostil o envie, o trigger do banco recusa (D3).
  const { data: updated, error } = await supabase
    .from("listings")
    .update({ title: fields.title, description: fields.description })
    .eq("id", listingId)
    .select("id")
    .maybeSingle()
  if (error || !updated) {
    return { ok: false, error: "Não foi possível salvar as alterações deste anúncio." }
  }
  const { data: detailsUpdated, error: detailsError } = await supabase
    .from("property_details")
    .update({
      property_type: fields.propertyType,
      neighborhood: fields.neighborhood,
      rent_cents: fields.rentCents,
      condo_fee_cents: fields.condoFeeCents,
      iptu_cents: fields.iptuCents,
      bedrooms: fields.bedrooms,
      bathrooms: fields.bathrooms,
      parking_spots: fields.parkingSpots,
      area_m2: fields.areaM2,
      available_from: fields.availableFrom,
      is_furnished: fields.isFurnished,
      accepts_pets: fields.acceptsPets,
      condo_included_in_rent: fields.condoIncluded,
    })
    .eq("listing_id", listingId)
    .select("listing_id")
    .maybeSingle()
  if (detailsError || !detailsUpdated) {
    return { ok: false, error: "Não foi possível salvar a ficha do imóvel." }
  }
  revalidatePath("/imoveis")
  revalidatePath(`/imoveis/${listingId}`)
  revalidatePath(`/imoveis/${listingId}/editar`)
  return { ok: true, error: null, listingId }
}

export async function setListingStatus(form: FormData): Promise<ActionResult> {
  const supabase = await createUserClient()
  const listingId = form.get("listing_id")
  const status = form.get("status")
  if (typeof listingId !== "string" || typeof status !== "string") {
    return { ok: false, error: "Dados incompletos." }
  }
  if (!["draft", "active", "paused", "reserved", "sold", "closed"].includes(status))
    return { ok: false, error: "Situação inválida." }
  const { data: updated, error } = await supabase
    .from("listings")
    .update({ status: status as ListingRow["status"] })
    .eq("id", listingId)
    .select("id")
    .maybeSingle()
  // 0 linhas (terceiro ou id alheio) chega aqui como !updated, sem falso ok.
  if (error || !updated) {
    return { ok: false, error: "Não foi possível mudar a situação deste anúncio." }
  }
  revalidatePath("/imoveis")
  revalidatePath(`/imoveis/${listingId}`)
  revalidatePath(`/imoveis/${listingId}/editar`)
  return { ok: true, error: null, listingId }
}

export async function uploadListingPhotos(form: FormData): Promise<ActionResult> {
  const supabase = await createUserClient()
  const listingId = form.get("listing_id")
  if (typeof listingId !== "string") return { ok: false, error: "Anúncio não informado." }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const owner = await ownerOfListing(listingId, user?.id ?? null)
  if (!owner) {
    return { ok: false, error: "Anúncio não encontrado para edição." }
  }
  const files = form.getAll("photos").filter((entry): entry is File => entry instanceof File)
  if (files.length === 0) return { ok: false, error: "Escolha ao menos uma foto." }
  const stored = await storePhotos(supabase, listingId, files)
  revalidatePath(`/imoveis/${listingId}`)
  revalidatePath(`/imoveis/${listingId}/editar`)
  return { ok: stored.error === null && stored.stored > 0, error: stored.error, listingId }
}

export async function removeListingPhoto(form: FormData): Promise<ActionResult> {
  const supabase = await createUserClient()
  const mediaId = form.get("media_id")
  if (typeof mediaId !== "string") return { ok: false, error: "Foto não informada." }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const me = user?.id ?? null

  // Linha primeiro, pelo client de sessão (select deriva do público): sem ela,
  // nada a remover. O dono é confirmado com a identidade real e RLS ANTES de
  // qualquer escrita privilegiada em storage.
  const { data: row, error: readError } = await supabase
    .from("listing_media")
    .select("id, listing_id, object_path")
    .eq("id", mediaId)
    .maybeSingle()
  if (readError || !row) {
    return { ok: false, error: "Não foi possível remover a foto." }
  }
  const owner = await ownerOfListing(row.listing_id, me)
  if (!owner) {
    return { ok: false, error: "Não foi possível remover a foto." }
  }

  // Objeto primeiro: se a remoção do arquivo falhar, a linha permanece e o
  // estado continua coerente (nada de "removida" com arquivo alcançável).
  const objectError = await removeObjectPrivileged(row.object_path)
  if (objectError) {
    return { ok: false, error: "Não foi possível remover o arquivo da foto. Tente novamente." }
  }

  const { data: deleted, error: rowError } = await supabase
    .from("listing_media")
    .delete()
    .eq("id", mediaId)
    .select("id")
    .maybeSingle()
  if (rowError || !deleted) {
    // Linha sobreviveu sem objeto: relata para intervenção, não finge sucesso.
    return {
      ok: false,
      error: "O arquivo foi removido, mas o registro da foto não. Tente novamente.",
      listingId: row.listing_id,
    }
  }
  revalidatePath(`/imoveis/${row.listing_id}`)
  revalidatePath(`/imoveis/${row.listing_id}/editar`)
  return { ok: true, error: null, listingId: row.listing_id }
}

export async function setListingCover(form: FormData): Promise<ActionResult> {
  const supabase = await createUserClient()
  const mediaId = form.get("media_id")
  if (typeof mediaId !== "string") return { ok: false, error: "Foto não informada." }
  const { data: updated, error } = await supabase
    .from("listing_media")
    .update({ is_cover: true })
    .eq("id", mediaId)
    .select("listing_id")
    .maybeSingle()
  if (error || !updated) {
    return { ok: false, error: "Não foi possível definir a capa." }
  }
  revalidatePath(`/imoveis/${updated.listing_id}`)
  revalidatePath(`/imoveis/${updated.listing_id}/editar`)
  return { ok: true, error: null, listingId: updated.listing_id }
}

export async function reorderListingPhotos(form: FormData): Promise<ActionResult> {
  const supabase = await createUserClient()
  const listingId = form.get("listing_id")
  const order = form.get("order")
  if (typeof listingId !== "string" || typeof order !== "string") {
    return { ok: false, error: "Dados incompletos." }
  }
  const ids = order.split(",").filter(Boolean)
  const { error } = await supabase.rpc("listing_media_set_order", {
    p_listing_id: listingId,
    p_media_ids: ids,
  })
  if (error) {
    return { ok: false, error: "Não foi possível reordenar as fotos." }
  }
  revalidatePath(`/imoveis/${listingId}`)
  revalidatePath(`/imoveis/${listingId}/editar`)
  return { ok: true, error: null, listingId }
}

export async function registerListingInterest(form: FormData): Promise<ActionResult> {
  const supabase = await createUserClient()
  const listingId = form.get("listing_id")
  if (typeof listingId !== "string") return { ok: false, error: "Anúncio não informado." }
  const { data, error } = await supabase.rpc("register_listing_interest", {
    p_listing_id: listingId,
  })
  if (error || !data) {
    if (error?.code === "22023") {
      return { ok: false, error: "Você não pode demonstrar interesse no próprio anúncio." }
    }
    return { ok: false, error: "Este anúncio não aceita interesse agora." }
  }
  revalidatePath(`/imoveis/${listingId}`)
  revalidatePath("/messages")
  return { ok: true, error: null, conversationId: data }
}
