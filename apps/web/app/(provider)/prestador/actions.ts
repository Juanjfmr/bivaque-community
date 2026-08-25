"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import {
  validateBio,
  validateCategory,
  validateContactPhone,
  validateDescription,
  validateDisplayName,
  validatePriceCents,
  validateTitle,
} from "../../../lib/providers/showcase"

// Onda G Task 4 — Server Actions do painel do prestador.
//
// NENHUMA action aqui usa service_role: a RLS owner-only da Task 3
// (20260825185327) é quem autoriza cada leitura e escrita. O caller real sai
// sempre do contexto autenticado (cookies), nunca do FormData. O `error` de
// TODA consulta é lido — descartá-lo já quebrou produção uma vez
// (lição PostgREST do README).

type PrestadorClient = ReturnType<typeof createServerClient>

async function requireAuthClient(): Promise<{ client: PrestadorClient; userId: string }> {
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
        // A sessão já existe; estas actions não renova cookie.
      },
    },
  })
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error("não autenticado")
  return { client, userId: user.id }
}

async function requireOwnProfileId(client: PrestadorClient, userId: string): Promise<string> {
  const { data, error } = await client
    .from("provider_profiles")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle()
  if (error) throw new Error(`Falha ao localizar a ficha: ${error.message}`)
  if (!data) throw new Error("Crie a ficha antes de gerenciar catálogo e portfólio.")
  return data.id as string
}

function text(formData: FormData, name: string): string | null {
  const raw = formData.get(name)
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed.length === 0 ? null : trimmed
}

export async function saveProfileAction(formData: FormData): Promise<void> {
  const displayName = text(formData, "displayName") ?? ""
  const category = text(formData, "category") ?? ""
  const bio = text(formData, "bio")
  const contactPhone = text(formData, "contactPhone")
  const contactIsPublic = formData.get("contactIsPublic") === "on"

  for (const result of [
    validateDisplayName(displayName),
    validateCategory(category),
    validateBio(bio),
    validateContactPhone(contactPhone),
  ]) {
    if (!result.ok) throw new Error(result.message)
  }

  const { client, userId } = await requireAuthClient()

  const { data: existing, error: existingError } = await client
    .from("provider_profiles")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle()
  if (existingError) throw new Error(`Falha ao localizar a ficha: ${existingError.message}`)

  const values = {
    display_name: displayName,
    category,
    bio,
    contact_phone: contactPhone,
    contact_is_public: contactIsPublic && contactPhone !== null,
  }

  if (existing?.id) {
    const { error } = await client.from("provider_profiles").update(values).eq("id", existing.id)
    if (error) throw new Error(`Falha ao salvar a ficha: ${error.message}`)
  } else {
    const { error } = await client
      .from("provider_profiles")
      .insert({ ...values, owner_user_id: userId })
    if (error) throw new Error(`Falha ao criar a ficha: ${error.message}`)
  }

  revalidatePath("/prestador")
  revalidatePath("/prestador/ficha")
}

export async function saveCatalogItemAction(formData: FormData): Promise<void> {
  const providerId = text(formData, "providerId")
  const itemId = text(formData, "itemId")
  const title = text(formData, "title") ?? ""
  const description = text(formData, "description")
  const priceRaw = text(formData, "priceCents")

  for (const result of [validateTitle(title), validateDescription(description)]) {
    if (!result.ok) throw new Error(result.message)
  }
  const price = priceRaw === null ? null : Number.parseInt(priceRaw, 10)
  const priceCheck = validatePriceCents(priceRaw)
  if (!priceCheck.ok) throw new Error(priceCheck.message)

  const { client, userId } = await requireAuthClient()
  const profileId = providerId ?? (await requireOwnProfileId(client, userId))

  const values = {
    title,
    description,
    price_cents: price,
  }

  if (itemId) {
    const { error } = await client.from("provider_catalog_items").update(values).eq("id", itemId)
    if (error) throw new Error(`Falha ao salvar o item: ${error.message}`)
  } else {
    const { count, error: countError } = await client
      .from("provider_catalog_items")
      .select("*", { count: "exact", head: true })
      .eq("provider_id", profileId)
    if (countError) throw new Error(`Falha a contar o catálogo: ${countError.message}`)
    const { error } = await client.from("provider_catalog_items").insert({
      ...values,
      provider_id: profileId,
      position: count ?? 0,
    })
    if (error) throw new Error(`Falha ao publicar o item: ${error.message}`)
  }

  revalidatePath("/prestador/catalogo")
  revalidatePath("/prestador")
}

export async function deleteCatalogItemAction(formData: FormData): Promise<void> {
  const itemId = text(formData, "itemId")
  if (!itemId) throw new Error("itemId required")

  const { client } = await requireAuthClient()
  const { error } = await client.from("provider_catalog_items").delete().eq("id", itemId)
  if (error) throw new Error(`Falha ao remover o item: ${error.message}`)

  revalidatePath("/prestador/catalogo")
}

// Reordenação por resequenciamento 0..n-1 na ordem informada. Cada update é
// uma chamada autenticada própria; a RLS owner-only limita o dano de qualquer
// chamada isolada, e o resultado final é determinístico.
async function resequence(
  client: PrestadorClient,
  table: "provider_catalog_items" | "provider_portfolio_photos",
  orderedIds: string[],
): Promise<void> {
  for (const [index, id] of orderedIds.entries()) {
    const { error } = await client.from(table).update({ position: index }).eq("id", id)
    if (error) throw new Error(`Falha a reordenar: ${error.message}`)
  }
}

async function moveRow(
  table: "provider_catalog_items" | "provider_portfolio_photos",
  formData: FormData,
  direction: "up" | "down",
): Promise<void> {
  const rowId = text(formData, "rowId")
  if (!rowId) throw new Error("rowId required")

  const { client } = await requireAuthClient()
  const { data: rows, error } = await client.from(table).select("id").order("position")
  if (error) throw new Error(`Falha a ler a ordem atual: ${error.message}`)

  const ids = ((rows ?? []) as Array<{ id: string }>).map((row) => row.id)
  const current = ids.indexOf(rowId)
  if (current < 0) return
  const target = direction === "up" ? current - 1 : current + 1
  if (target < 0 || target >= ids.length) return

  const moving = ids[current]
  const neighbor = ids[target]
  if (moving === undefined || neighbor === undefined) return
  ids[current] = neighbor
  ids[target] = moving
  await resequence(client, table, ids)
  revalidatePath("/prestador/catalogo")
}

export async function moveCatalogItemUpAction(formData: FormData): Promise<void> {
  await moveRow("provider_catalog_items", formData, "up")
}

export async function moveCatalogItemDownAction(formData: FormData): Promise<void> {
  await moveRow("provider_catalog_items", formData, "down")
}

export async function movePortfolioPhotoUpAction(formData: FormData): Promise<void> {
  await moveRow("provider_portfolio_photos", formData, "up")
}

export async function movePortfolioPhotoDownAction(formData: FormData): Promise<void> {
  await moveRow("provider_portfolio_photos", formData, "down")
}

export async function addPortfolioPhotoAction(formData: FormData): Promise<void> {
  const file = formData.get("file")
  const caption = text(formData, "caption")

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Escolha uma imagem para publicar.")
  }
  const allowed = ["image/jpeg", "image/png", "image/webp"]
  if (!allowed.includes(file.type)) {
    throw new Error("Use uma imagem JPEG, PNG ou WebP.")
  }
  if (file.size > 5242880) {
    throw new Error("A imagem passa de 5 MB.")
  }

  const { client, userId } = await requireAuthClient()
  const profileId = await requireOwnProfileId(client, userId)

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
  const path = `${profileId}/portfolio/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await client.storage
    .from("provider-photos")
    .upload(path, await file.arrayBuffer(), { contentType: file.type })
  if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`)

  const { count, error: countError } = await client
    .from("provider_portfolio_photos")
    .select("*", { count: "exact", head: true })
    .eq("provider_id", profileId)
  if (countError) throw new Error(`Falha a contar o portfólio: ${countError.message}`)

  const { error } = await client.from("provider_portfolio_photos").insert({
    provider_id: profileId,
    photo_path: path,
    caption,
    position: count ?? 0,
  })
  if (error) throw new Error(`Falha ao registrar a foto: ${error.message}`)

  revalidatePath("/prestador/catalogo")
}

export async function updatePhotoCaptionAction(formData: FormData): Promise<void> {
  const photoId = text(formData, "photoId")
  const caption = text(formData, "caption")
  if (!photoId) throw new Error("photoId required")

  const { client } = await requireAuthClient()
  const { error } = await client
    .from("provider_portfolio_photos")
    .update({ caption })
    .eq("id", photoId)
  if (error) throw new Error(`Falha ao salvar a legenda: ${error.message}`)

  revalidatePath("/prestador/catalogo")
}

export async function deletePortfolioPhotoAction(formData: FormData): Promise<void> {
  const photoId = text(formData, "photoId")
  if (!photoId) throw new Error("photoId required")

  const { client } = await requireAuthClient()

  const { data: row, error: readError } = await client
    .from("provider_portfolio_photos")
    .select("photo_path")
    .eq("id", photoId)
    .maybeSingle()
  if (readError) throw new Error(`Falha ao localizar a foto: ${readError.message}`)
  if (!row) return

  const { error: storageError } = await client.storage
    .from("provider-photos")
    .remove([row.photo_path as string])
  // Falha de remoção no storage não bloqueia a exclusão da linha: a ficha não
  // pode ficar presa a um objeto órfão; o caminho some da listagem de todo jeito.
  void storageError

  const { error } = await client.from("provider_portfolio_photos").delete().eq("id", photoId)
  if (error) throw new Error(`Falha ao remover a foto: ${error.message}`)

  revalidatePath("/prestador/catalogo")
}
