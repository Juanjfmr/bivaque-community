"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { encerrarPedido, responderPedido } from "../../../lib/service-requests/app-pedidos"
import { salvarFichaDoPrestador } from "../../../lib/providers/ficha-do-prestador"
import {
  salvarAtendimento,
  salvarContaDoPrestador,
} from "../../../lib/providers/prestador-area"
import {
  validateDescription,
  validatePriceCents,
  validateTitle,
} from "../../../lib/providers/showcase"
import { isDefiniteSqlRejection } from "../../../lib/storage/rpc-outcome"
import { sanitizeImage } from "../../../lib/storage/sanitize-image"
import { conferirEscritaDaConta } from "../../../lib/storage/veto-de-conta"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

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
  const { client, userId } = await requireAuthClient()

  // A regra é uma só: a mesma de `/api/app/prestador/ficha` (TROCA-005).
  const resultado = await salvarFichaDoPrestador(client, userId, {
    nome: text(formData, "displayName") ?? "",
    categoria: text(formData, "category") ?? "",
    descricao: text(formData, "bio"),
    telefone: text(formData, "contactPhone"),
    telefonePublico: formData.get("contactIsPublic") === "on",
  })
  if (!resultado.ok) throw new Error(resultado.mensagem)

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
  revalidatePath("/negocio/catalogo")
  revalidatePath("/prestador")
}

export async function deleteCatalogItemAction(formData: FormData): Promise<void> {
  const itemId = text(formData, "itemId")
  if (!itemId) throw new Error("itemId required")

  const { client } = await requireAuthClient()
  const { error } = await client.from("provider_catalog_items").delete().eq("id", itemId)
  if (error) throw new Error(`Falha ao remover o item: ${error.message}`)

  revalidatePath("/prestador/catalogo")
  revalidatePath("/negocio/catalogo")
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
  revalidatePath("/negocio/catalogo")
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

export async function addPortfolioPhotoAction(
  formData: FormData,
): Promise<{ error: string } | undefined> {
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

  // SEC-006 — mesma autorização da policy provider_photos_insert_owner, agora
  // reconferida explicitamente porque a gravação usa service_role: a ficha é do
  // chamador e ele ainda pode gerenciá-la (conta ativa ou alcance próprio).
  const { data: canManage, error: canManageError } = await client.rpc(
    "can_manage_provider_profile",
    { p_provider_id: profileId },
  )
  if (canManageError) throw new Error(`Falha ao conferir a ficha: ${canManageError.message}`)
  if (canManage !== true) throw new Error("Só o dono da ficha pode publicar fotos.")

  // AUTHZ-007: veto de conta antes do upload com service_role, pela sessão da
  // pessoa — o objeto não sobe se a linha seria recusada.
  const conta = await conferirEscritaDaConta(client)
  if (!conta.ok) {
    return {
      error:
        conta.motivo === "conta"
          ? "Sua conta não pode publicar fotos agora."
          : "Não foi possível conferir sua conta. Tente de novo em instantes.",
    }
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
  const path = `${profileId}/portfolio/${crypto.randomUUID()}.${extension}`
  let image: Buffer
  try {
    image = await sanitizeImage(file, 5242880)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível preparar a imagem." }
  }
  const serviceClient = createServiceClient()
  const { error: uploadError } = await serviceClient.storage
    .from("provider-photos")
    .upload(path, image, { contentType: file.type })
  if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`)

  // AUTHZ-007, rodada 2 — a compensação do objeto novo só é segura quando o
  // INSERT não commitou: rejeição SQL definitiva (SQLSTATE) ou falha antes
  // dele (a contagem). Resposta incerta (rede, timeout, HTTP sem código SQL)
  // mantém o objeto, porque a linha pode ter sido gravada; só a categoria
  // fixa vai pro log.
  const removerObjetoSemLinha = async (): Promise<void> => {
    const limpeza = await serviceClient.storage.from("provider-photos").remove([path])
    if (limpeza.error) {
      console.error("[prestador] objeto sem linha ficou no bucket:", limpeza.error.message)
    }
  }

  const { count, error: countError } = await client
    .from("provider_portfolio_photos")
    .select("*", { count: "exact", head: true })
    .eq("provider_id", profileId)
  if (countError) {
    // A contagem falha depois do upload e antes do INSERT: sem linha, o
    // objeto ficaria órfão — mesma compensação da rota do app (AUTHZ-007).
    await removerObjetoSemLinha()
    throw new Error(`Falha a contar o portfólio: ${countError.message}`)
  }

  let erroDaLinha: { message: string; code?: string } | null = null
  try {
    const { error } = await client.from("provider_portfolio_photos").insert({
      provider_id: profileId,
      photo_path: path,
      caption,
      position: count ?? 0,
    })
    erroDaLinha = error
  } catch {
    erroDaLinha = { message: "sem resposta do banco" }
  }
  if (erroDaLinha !== null && !isDefiniteSqlRejection(erroDaLinha)) {
    console.error("[prestador] resposta incerta ao gravar a linha da foto; objeto preservado")
    throw new Error("Não foi possível confirmar a foto. Recarregue antes de tentar de novo.")
  }
  if (erroDaLinha !== null) {
    // Rejeição definitiva: o INSERT não commitou, então sem a linha o objeto
    // fica órfão.
    await removerObjetoSemLinha()
    throw new Error(`Falha ao registrar a foto: ${erroDaLinha.message}`)
  }

  revalidatePath("/prestador/catalogo")
  revalidatePath("/negocio/catalogo")
  return undefined
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
  revalidatePath("/negocio/catalogo")
}

export async function deletePortfolioPhotoAction(formData: FormData): Promise<void> {
  const photoId = text(formData, "photoId")
  if (!photoId) throw new Error("photoId required")

  const { client } = await requireAuthClient()

  const { data: row, error: readError } = await client
    .from("provider_portfolio_photos")
    .select("photo_path, provider_id")
    .eq("id", photoId)
    .maybeSingle()
  if (readError) throw new Error(`Falha ao localizar a foto: ${readError.message}`)
  if (!row) return

  const providerId = row.provider_id as string
  const photoPath = row.photo_path as string

  // SEC-006 — o objeto foi gravado com service_role (owner nulo), então a
  // policy de DELETE do cliente não o alcança. A remoção reconfere a mesma
  // autorização e o mesmo prefixo de pasta da policy antes de apagar.
  const { data: canManage, error: manageError } = await client.rpc("can_manage_provider_profile", {
    p_provider_id: providerId,
  })
  if (manageError) throw new Error(`Falha ao conferir a ficha: ${manageError.message}`)
  if (canManage !== true) throw new Error("Só o dono da ficha pode remover fotos.")
  if (!photoPath.startsWith(`${providerId}/portfolio/`)) {
    throw new Error("A foto não pertence a esta ficha.")
  }

  const serviceClient = createServiceClient()
  const { error: storageError } = await serviceClient.storage
    .from("provider-photos")
    .remove([photoPath])
  // Falha de remoção no storage não bloqueia a exclusão da linha: a ficha não
  // pode ficar presa a um objeto órfão; o caminho some da listagem de todo jeito.
  void storageError

  const { error } = await client.from("provider_portfolio_photos").delete().eq("id", photoId)
  if (error) throw new Error(`Falha ao remover a foto: ${error.message}`)

  revalidatePath("/prestador/catalogo")
  revalidatePath("/negocio/catalogo")
}

// ── RECON-024: fila de pedidos, área de atendimento e conta ─────────────────

// A resposta usa o RPC canonico `send_conversation_message`, que deriva o
// remetente da sessao, grava a mensagem e move open -> in_conversation na
// MESMA transacao (ADR D1). O nome do RECON-024 (`respond_to_service_request`)
// nao existe mais: foi absorvido por ele na reconciliacao do RECON-044.
export async function respondToRequestAction(formData: FormData): Promise<void> {
  const requestId = text(formData, "requestId")
  const content = text(formData, "content") ?? ""
  if (!requestId) throw new Error("requestId required")

  const { client, userId } = await requireAuthClient()
  // A conversa sai do PEDIDO no banco, nunca do FormData (TROCA-005): o id
  // escondido do formulário não conduz mais a escrita para outra conversa.
  const resultado = await responderPedido(client, userId, requestId, content)
  if (!resultado.ok) throw new Error(resultado.mensagem)

  revalidatePath("/prestador")
  revalidatePath(`/prestador/pedidos/${requestId}`)
}

export async function closeRequestAction(formData: FormData): Promise<void> {
  const requestId = text(formData, "requestId")
  if (!requestId) throw new Error("requestId required")

  const { client, userId } = await requireAuthClient()
  const resultado = await encerrarPedido(client, userId, requestId)
  if (!resultado.ok) throw new Error("Não foi possível encerrar este pedido.")

  revalidatePath("/prestador")
  revalidatePath(`/prestador/pedidos/${requestId}`)
}

// Área de atendimento: liga/desliga o alcance gratuito da comunidade que
// atestou. Efeito real e verificável — com o alcance desligado,
// `can_see_provider` deixa de valer e a ficha sai da busca do membro.
export async function saveAttendanceAction(formData: FormData): Promise<void> {
  const active = formData.get("active") === "on"
  const { client, userId } = await requireAuthClient()

  const resultado = await salvarAtendimento(client, userId, active)
  if (!resultado.ok) throw new Error(resultado.mensagem)

  revalidatePath("/prestador")
  revalidatePath("/prestador/atendimento")
}

// Conta: telefone é OPCIONAL e opt-in (ADR-20260820, decisão 6). Salvar aqui
// altera o que a ficha pública mostra — o efeito é o do R41.
export async function saveAccountAction(formData: FormData): Promise<void> {
  const contactPhone = text(formData, "contactPhone")
  const contactIsPublic = formData.get("contactIsPublic") === "on"

  const { client, userId } = await requireAuthClient()
  const resultado = await salvarContaDoPrestador(client, userId, {
    telefone: contactPhone,
    telefonePublico: contactIsPublic,
  })
  if (!resultado.ok) throw new Error(resultado.mensagem)

  revalidatePath("/prestador")
  revalidatePath("/prestador/conta")
  revalidatePath("/prestador/ficha")
}
