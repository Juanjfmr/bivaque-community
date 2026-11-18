import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@bivaque/domain"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

// F07 (RUN-177) — a ficha do negócio PRÓPRIO pela porta do app.
//
// Uma ficha, um dono: toda consulta aqui filtra por `owner_user_id` da sessão.
// A RLS decide (can_manage_provider_profile), mas o filtro é explícito porque a
// chave da rota é "a minha ficha", não um id que o cliente escolhe. Leitura da
// ficha e das linhas de catálogo usa o cliente da SESSÃO; só a gravação no
// bucket de fotos usa `service_role`, porque a SEC-006 removeu o INSERT de
// imagem para `authenticated` — e a autorização é reconferida antes.

type Cliente = SupabaseClient<Database>

export type LinhaDaFicha = Readonly<{
  id: string
  display_name: string
  category: ProviderCategory
  bio: string | null
}>

export type ServicoDoNegocio = Readonly<{
  id: string
  titulo: string
  descricao: string | null
}>

export type FotoDoNegocio = Readonly<{
  id: string
  url: string
  legenda: string | null
}>

/** A ficha como o app a lê: sem caminho de mídia, sem dono, sem alcance. */
export type NegocioDoDono = Readonly<{
  id: string
  nome: string
  categoria: ProviderCategory
  categoriaNome: string
  descricao: string | null
  servicos: readonly ServicoDoNegocio[]
  fotos: readonly FotoDoNegocio[]
}>

export async function fichaDoDono(client: Cliente, userId: string): Promise<LinhaDaFicha | null> {
  const { data, error } = await client
    .from("provider_profiles")
    .select("id,display_name,category,bio")
    .eq("owner_user_id", userId)
    .maybeSingle()
  if (error) throw error
  return (data as LinhaDaFicha | null) ?? null
}

/** A ficha inteira (com catálogo e portfólio) ou `null` para quem ainda não tem. */
export async function negocioDoDono(
  client: Cliente,
  userId: string,
): Promise<NegocioDoDono | null> {
  const ficha = await fichaDoDono(client, userId)
  if (ficha === null) return null
  const [servicos, fotos] = await Promise.all([
    servicosDaFicha(client, ficha.id),
    fotosDaFicha(client, ficha.id),
  ])
  return {
    id: ficha.id,
    nome: ficha.display_name,
    categoria: ficha.category,
    categoriaNome: PROVIDER_CATEGORY_LABELS[ficha.category],
    descricao: ficha.bio,
    servicos,
    fotos,
  }
}

export async function servicosDaFicha(
  client: Cliente,
  providerId: string,
): Promise<readonly ServicoDoNegocio[]> {
  const { data, error } = await client
    .from("provider_catalog_items")
    .select("id,title,description")
    .eq("provider_id", providerId)
    .order("position")
  if (error) throw error
  return ((data ?? []) as { id: string; title: string; description: string | null }[]).map(
    (linha) => ({ id: linha.id, titulo: linha.title, descricao: linha.description }),
  )
}

/**
 * As fotos com URL assinada curta (ADR §3.2: mídia nunca sai como caminho).
 * Falha de assinatura é falha de leitura, não uma ficha sem foto.
 */
export async function fotosDaFicha(
  client: Cliente,
  providerId: string,
): Promise<readonly FotoDoNegocio[]> {
  const { data, error } = await client
    .from("provider_portfolio_photos")
    .select("id,photo_path,caption")
    .eq("provider_id", providerId)
    .order("position")
  if (error) throw error
  const fotos: FotoDoNegocio[] = []
  for (const linha of (data ?? []) as {
    id: string
    photo_path: string
    caption: string | null
  }[]) {
    const assinada = await client.storage
      .from("provider-photos")
      .createSignedUrl(linha.photo_path, 300)
    if (assinada.error || !assinada.data?.signedUrl)
      throw assinada.error ?? new Error("Mídia indisponível")
    fotos.push({ id: linha.id, url: assinada.data.signedUrl, legenda: linha.caption })
  }
  return fotos
}

/**
 * Move uma linha uma posição e reescreve a ordem 0..n-1 da ficha inteira — a
 * mesma semântica da ação do prestador, agora limitada às linhas DESTA ficha
 * (a ação antiga reordenava a tabela global).
 */
export async function moverLinha(
  client: Cliente,
  tabela: "provider_catalog_items" | "provider_portfolio_photos",
  providerId: string,
  id: string,
  direcao: "cima" | "baixo",
): Promise<boolean> {
  const { data, error } = await client
    .from(tabela)
    .select("id")
    .eq("provider_id", providerId)
    .order("position")
  if (error) throw error
  const ids = ((data ?? []) as { id: string }[]).map((linha) => linha.id)
  const atual = ids.indexOf(id)
  if (atual < 0) return false
  const alvo = direcao === "cima" ? atual - 1 : atual + 1
  if (alvo < 0 || alvo >= ids.length) return true
  const movido = ids[atual]
  const vizinho = ids[alvo]
  if (movido === undefined || vizinho === undefined) return true
  ids[atual] = vizinho
  ids[alvo] = movido
  for (const [posicao, linhaId] of ids.entries()) {
    const { error: erroDaOrdem } = await client
      .from(tabela)
      .update({ position: posicao })
      .eq("id", linhaId)
    if (erroDaOrdem) throw erroDaOrdem
  }
  return true
}

/** Falha de escrita do negócio traduzida — o texto do Postgres nunca sai daqui. */
export function falhaDoNegocio(codigo: string | undefined): {
  status: 400 | 403 | 404 | 409 | 503
  erro: string
  mensagem: string
} {
  if (codigo === "42501")
    return {
      status: 403,
      erro: "recusado",
      mensagem: "Sua conta não pode gerenciar uma página de negócio agora.",
    }
  if (codigo === "22023" || codigo === "23514")
    return {
      status: 400,
      erro: "dados-invalidos",
      mensagem: "Revise o nome, a categoria e a descrição da página.",
    }
  return {
    status: 503,
    erro: "escrita-indisponivel",
    mensagem: "Não foi possível salvar agora. Seus dados continuam preenchidos; tente novamente.",
  }
}
