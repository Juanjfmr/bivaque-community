import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { MAX_PHOTO_BYTES } from "../../../../lib/listings/types"

/**
 * O que as rotas do Mercado compartilham: o formato de id que elas aceitam, a
 * cidade da sessão (a mesma pergunta do F05 — a cidade nunca vem do pedido), o
 * que uma recusa do banco significa e o mapeamento de uma linha de `listings`
 * para o objeto que a tela consome.
 */

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Id no formato que as rotas aceitam. Não é prova de existência. */
export function ehUuid(valor: string | undefined): valor is string {
  return typeof valor === "string" && UUID.test(valor)
}

export type CidadeDaSessao = Readonly<{ id: string; nome: string }>

/**
 * A cidade atual de quem está na sessão, ou `null` para quem ainda não tem
 * vínculo. Erro de leitura sobe: quem chama decide entre 503 e seguir.
 */
export async function cidadeDaSessao(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<CidadeDaSessao | null> {
  const { data, error } = await client
    .from("locality_memberships")
    .select("locality_id, localities(city_name)")
    .eq("user_id", userId)
    .eq("kind", "current")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (data === null) return null
  return { id: data.locality_id, nome: data.localities?.city_name ?? "" }
}

/**
 * A foto do corpo, no formato combinado com o app (`{tipo, conteudo}` base64).
 * `null` é "sem foto"; `"invalida"` é recusa da rota (400) antes de tocar o
 * banco. Criar e editar usam a mesma leitura — um formato, duas jornadas.
 */
export function lerFotoDoCorpo(
  valor: unknown,
): { readonly foto: File | null } | { readonly invalida: true } {
  if (valor === null || valor === undefined) return { foto: null }
  if (typeof valor !== "object" || Array.isArray(valor)) return { invalida: true }
  const corpo = valor as Record<string, unknown>
  const tipo = corpo["tipo"]
  const conteudo = corpo["conteudo"]
  if (
    typeof tipo !== "string" ||
    !["image/jpeg", "image/png", "image/webp"].includes(tipo) ||
    typeof conteudo !== "string" ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(conteudo) ||
    conteudo.length % 4 !== 0
  ) {
    return { invalida: true }
  }
  const bytes = Buffer.from(conteudo, "base64")
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PHOTO_BYTES) return { invalida: true }
  return { foto: new File([bytes], "foto", { type: tipo }) }
}

/**
 * O que uma recusa do banco significa para a rota. A mensagem do Postgres nunca
 * vai para a pessoa (é técnica, em inglês, e às vezes cita a política).
 *
 * - `42501` é RLS/permissão: recusa;
 * - `22023` é argumento inválido do Postgres: dado inválido;
 * - o resto é indisponibilidade.
 */
export type ErroDoBanco = Readonly<{
  status: 400 | 403 | 503
  corpo: Readonly<Record<string, unknown>>
}>

export function interpretarErroDoBanco(
  codigo: string | undefined,
  mensagens: Readonly<{ recusado: string; dados: string }>,
): ErroDoBanco {
  if (codigo === "42501") {
    return { status: 403, corpo: { erro: "recusado", mensagem: mensagens.recusado } }
  }
  if (codigo === "22023") {
    return { status: 400, corpo: { erro: "dados-invalidos", mensagem: mensagens.dados } }
  }
  return { status: 503, corpo: { erro: "escrita-indisponivel" } }
}

// Colunas que as telas do Mercado mostram. `property_details!inner` não é usado
// aqui: o `tipo` alterna entre item e imóvel, e um item legítimo não tem o
// satélite — o embed é left join e a ausência vira `null`, nunca um erro.
export const SELECT_ANUNCIO =
  "id, kind, title, description, price_cents, neighborhood, condition, category, " +
  "status, created_at, owner_user_id, address, localities(city_name), " +
  "property_details(deal, property_type, bedrooms, area_m2, condo_fee_cents, rent_cents, sale_price_cents), " +
  "listing_photos(id, path, position)"

export interface AnuncioBruto {
  id: string
  kind: "item" | "property"
  title: string
  description: string | null
  price_cents: number | null
  neighborhood: string | null
  condition: string | null
  category: string | null
  status: string
  created_at: string
  owner_user_id: string
  address: string | null
  localities: { city_name: string } | null
  property_details: {
    deal: "rent" | "sale"
    property_type: string
    bedrooms: number | null
    area_m2: number | null
    condo_fee_cents: number | null
    rent_cents: number | null
    sale_price_cents: number | null
  } | null
  listing_photos: { id: string; path: string; position: number }[] | null
}

export interface AnuncioDaLista {
  id: string
  tipo: "item" | "property"
  titulo: string
  descricao: string | null
  precoCents: number | null
  deal: "rent" | "sale" | null
  bairro: string | null
  cidade: string
  status: string
  condicao: string | null
  categoria: string | null
  quartos: number | null
  tipoImovel: string | null
  areaM2: number | null
  condoFeeCents: number | null
  criadoEm: string
}

/**
 * O preço que a tela mostra. Para item é `listings.price_cents`; para imóvel o
 * preço mora no satélite (`rent_cents` ou `sale_price_cents`, conforme o `deal`)
 * e `listings.price_cents` fica NULL — o valor presente em `price_cents` vence,
 * seja qual for o satélite.
 */
export function precoEfetivo(row: AnuncioBruto): number | null {
  if (row.price_cents !== null) return row.price_cents
  const detalhes = row.property_details
  if (detalhes === null) return null
  if (detalhes.deal === "rent") return detalhes.rent_cents
  if (detalhes.deal === "sale") return detalhes.sale_price_cents
  return null
}

/** A linha do banco nos campos que a lista e o detalhe têm em comum. */
export function baseDoAnuncio(row: AnuncioBruto): AnuncioDaLista {
  const detalhes = row.property_details
  return {
    id: row.id,
    tipo: row.kind,
    titulo: row.title,
    descricao: row.description,
    precoCents: precoEfetivo(row),
    deal: detalhes?.deal ?? null,
    bairro: row.neighborhood,
    cidade: row.localities?.city_name ?? "",
    status: row.status,
    condicao: row.condition,
    categoria: row.category,
    quartos: detalhes?.bedrooms ?? null,
    tipoImovel: detalhes?.property_type ?? null,
    areaM2: detalhes?.area_m2 ?? null,
    condoFeeCents: detalhes?.condo_fee_cents ?? null,
    criadoEm: row.created_at,
  }
}
