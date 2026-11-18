import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { cidadeDaSessao, ehUuid } from "../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

/**
 * A consulta de outra cidade no app (CIDADE-169), porta da tela
 * `/app/cidade/<id>`.
 *
 * A leitura é a aprovada pelo dono em 25/09/2026
 * (`docs/decisions/ADR-20260925-consulta-outra-cidade.md`, migration
 * `20260925161111_consulta_outra_cidade.sql`, provada em
 * `supabase/tests/consulta-outra-cidade.sql`): qualquer membro verificado,
 * pela RLS da própria sessão, lê o catálogo de cidades, as referências
 * APROVADAS do Guia, os encontros de alcance cidade e os anúncios ATIVOS de
 * alcance cidade de qualquer cidade. Publicar, confirmar presença e responder
 * continuam exigindo pertencer à cidade — esta rota não escreve nada.
 *
 * O que ela devolve é o agregado do `city-consult` da web
 * (`apps/web/app/(shell)/cidade/[id]/city-consult.tsx`: guia aprovado,
 * encontros, desapegos, imóveis), sem comunidades, sem perguntas e sem a
 * vitrine de prestadores — a consulta web nunca exibiu nenhuma delas. Cada
 * SELECT repete os filtros do canal da vertical
 * (o antigo `(shell)/inicio/hub-loaders.ts`, removido no F02-001, `lib/listings/queries.ts`,
 * `lib/listings/highlights.ts`): mesmas tabelas, mesmos status, mesma janela.
 *
 * O `id` é do catálogo (`localities.id`) ou o literal `atual`, e `atual` é
 * resolvido do vínculo `kind = 'current'` da SESSÃO — nunca de nome, query ou
 * qualquer coisa que o pedido escolha. Formato inválido e cidade fora do
 * catálogo são o mesmo 404; falta de sessão é 401 pela porta comum.
 */

/** Horizonte de "próximos encontros": a mesma janela do Início. */
const HORIZONTE_DE_DIAS = 14
const DIA_MS = 24 * 60 * 60 * 1000
/** O Guia aparece com 8 na consulta (`GUIDE_SHOWN` do web). */
const GUIA_NA_CONSULTA = 8
const LISTAS_NA_CONSULTA = 8

type Alvo = { readonly tipo: "atual" } | { readonly tipo: "cidade"; readonly id: string }

/** `atual` ou UUID do catálogo; qualquer outra coisa não é endereço de cidade. */
function alvoDaConsulta(valor: string): Alvo | null {
  if (valor === "atual") return { tipo: "atual" }
  return ehUuid(valor) ? { tipo: "cidade", id: valor } : null
}

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  const alvo = alvoDaConsulta(id)
  if (alvo === null) return responder(request, { erro: "cidade-nao-encontrada" }, 404)
  try {
    const client = auth.sessao.cliente
    const atual = await cidadeDaSessao(client, auth.sessao.usuario.id)
    const cidadeId = alvo.tipo === "atual" ? (atual?.id ?? null) : alvo.id
    if (cidadeId === null) return responder(request, { erro: "cidade-nao-encontrada" }, 404)

    const cidade = await client
      .from("localities")
      .select("id, city_name, state_code")
      .eq("id", cidadeId)
      .maybeSingle()
    if (cidade.error) throw cidade.error
    if (cidade.data === null) return responder(request, { erro: "cidade-nao-encontrada" }, 404)

    const agora = new Date()
    const [guia, encontros, desapegos, imoveis] = await Promise.all([
      client
        .from("arrival_guide_entries")
        .select("id, name, category")
        .eq("locality_id", cidadeId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(GUIA_NA_CONSULTA),
      client
        .from("events")
        .select("id, title, venue, starts_at")
        .eq("locality_id", cidadeId)
        .eq("status", "upcoming")
        .gte("starts_at", agora.toISOString())
        .lt("starts_at", new Date(agora.getTime() + HORIZONTE_DE_DIAS * DIA_MS).toISOString())
        .order("starts_at", { ascending: true })
        .limit(LISTAS_NA_CONSULTA),
      client
        .from("listings")
        .select("id, title, price_cents, neighborhood")
        .eq("kind", "item")
        .eq("status", "active")
        .eq("locality_id", cidadeId)
        .order("created_at", { ascending: false })
        .limit(LISTAS_NA_CONSULTA),
      client
        .from("listings")
        .select("id, title, neighborhood")
        .eq("kind", "property")
        .eq("status", "active")
        .eq("locality_id", cidadeId)
        .order("created_at", { ascending: false })
        .limit(LISTAS_NA_CONSULTA),
    ])
    if (guia.error || encontros.error || desapegos.error || imoveis.error) {
      throw new Error("leitura indisponível")
    }

    return responder(
      request,
      {
        cidade: {
          id: cidade.data.id,
          nome: cidade.data.city_name,
          uf: cidade.data.state_code,
        },
        // A cidade da pessoa é dado da sessão: o CTA de mudança e o "Voltar"
        // dependem dela, e o app não tem por que adivinhar.
        atual: atual === null ? null : { id: atual.id, nome: atual.nome },
        minha: atual?.id === cidade.data.id,
        guia: (guia.data ?? []).map((linha) => ({
          id: linha.id,
          nome: linha.name,
          categoria: linha.category,
        })),
        encontros: (encontros.data ?? []).map((linha) => ({
          id: linha.id,
          titulo: linha.title,
          comecaEm: linha.starts_at,
          local: linha.venue,
        })),
        desapegos: (desapegos.data ?? []).map((linha) => ({
          id: linha.id,
          titulo: linha.title,
          precoCents: linha.price_cents,
          bairro: linha.neighborhood,
        })),
        imoveis: (imoveis.data ?? []).map((linha) => ({
          id: linha.id,
          titulo: linha.title,
          bairro: linha.neighborhood,
        })),
      },
      200,
    )
  } catch {
    // Sem eco do erro do banco: a mensagem do Postgres nunca chega à pessoa.
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
