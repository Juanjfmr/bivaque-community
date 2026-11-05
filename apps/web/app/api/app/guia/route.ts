import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../lib/app-api/rota-do-app"
import {
  cursorDaEntrada,
  ehCategoriaDoGuia,
  LIMITE_MAXIMO_DO_GUIA,
  LIMITE_PADRAO_DO_GUIA,
  lerCursor,
  termoAceito,
  termoDeBusca,
} from "../../../../lib/guide/app-guia"
import { log } from "../../../../lib/logger"
import { cidadeDaSessao } from "../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * O diretório da cidade de quem está na sessão (F08 / ADR-20261105).
 *
 * A cidade vem do vínculo `current`, nunca do pedido: mandar `locality_id` na
 * query não muda a lista. Só entra o que está aprovado — a RLS impõe e o filtro
 * repete, pela mesma razão do F05.
 *
 * Falha de leitura é 503, nunca lista vazia: "sua cidade não tem guia" e "o
 * banco não respondeu" são coisas diferentes.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const url = new URL(request.url)

  const brutoLimite = url.searchParams.get("limite")
  const limite = brutoLimite === null ? LIMITE_PADRAO_DO_GUIA : Number(brutoLimite)
  const brutoCursor = url.searchParams.get("depois")
  const cursor = brutoCursor === null ? null : lerCursor(brutoCursor)
  const brutaCategoria = url.searchParams.get("categoria")
  const brutoTermo = url.searchParams.get("q")
  if (
    !Number.isInteger(limite) ||
    limite < 1 ||
    limite > LIMITE_MAXIMO_DO_GUIA ||
    (brutoCursor !== null && cursor === null) ||
    (brutaCategoria !== null && !ehCategoriaDoGuia(brutaCategoria)) ||
    !termoAceito(brutoTermo)
  ) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }

  const termo = termoDeBusca(brutoTermo)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const cidade = await cidadeDaSessao(client, userId)
    if (cidade === null) return responder(request, { entradas: [], proximo: null }, 200)

    let query = client
      .from("arrival_guide_entries")
      .select("id,category,name,description,website_url,phone")
      .eq("locality_id", cidade.id)
      .eq("status", "approved")
    if (brutaCategoria !== null && ehCategoriaDoGuia(brutaCategoria)) {
      query = query.eq("category", brutaCategoria)
    }
    if (termo !== "") {
      query = query.or(`name.ilike."%${termo}%",description.ilike."%${termo}%"`)
    }
    // Keyset composto: duas entradas com o mesmo nome não se repetem na virada.
    query =
      cursor === null
        ? query
        : query.or(`name.gt."${cursor.nome}",and(name.eq."${cursor.nome}",id.gt.${cursor.id})`)
    const result = await query
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .limit(limite)
    if (result.error) throw result.error

    const linhas = result.data ?? []
    const ids = linhas.map((linha) => linha.id)
    const salvas = new Set<string>()
    if (ids.length > 0) {
      const saves = await client.from("guide_entry_saves").select("entry_id").in("entry_id", ids)
      if (saves.error) throw saves.error
      for (const linha of saves.data ?? []) salvas.add(linha.entry_id)
    }

    const entradas = linhas.map((linha) => ({
      id: linha.id,
      categoria: linha.category,
      nome: linha.name,
      descricao: linha.description,
      site: linha.website_url,
      telefone: linha.phone,
      salvo: salvas.has(linha.id),
    }))
    const ultima = entradas.at(-1)
    const proximo =
      entradas.length === limite && ultima !== undefined
        ? cursorDaEntrada(ultima.nome, ultima.id)
        : null
    return responder(request, { entradas, proximo, cidade: cidade.nome }, 200)
  } catch (error) {
    log.error("app guia: read failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
