import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { signPhotoPaths } from "../../../../../lib/listings/queries"
import { log } from "../../../../../lib/logger"
import {
  type AnuncioBruto,
  baseDoAnuncio,
  ehUuid,
  instanteDoCursor,
  inteiroNaFaixa,
  SELECT_ANUNCIO,
} from "../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LIMITE_PADRAO = 20
const LIMITE_MAXIMO = 50

interface Filtros {
  tipo: "item" | "property"
  limite: number
  cursor: { instante: string; listingId: string } | null
}

/** Lê e valida a query. `null` é "inválido" — a rota responde 400. */
function lerFiltros(url: URL): Filtros | null {
  const params = url.searchParams
  const tipo = params.get("tipo")
  if (tipo !== "item" && tipo !== "property") return null

  const brutoLimite = params.get("limite")
  const limite =
    brutoLimite === null ? LIMITE_PADRAO : inteiroNaFaixa(brutoLimite, 1, LIMITE_MAXIMO)
  if (limite === null) return null

  const brutoCursor = params.get("depois")
  let cursor: Filtros["cursor"] = null
  if (brutoCursor !== null) {
    const separador = brutoCursor.lastIndexOf("|")
    if (separador <= 0) return null
    const instante = instanteDoCursor(brutoCursor.slice(0, separador))
    const listingId = brutoCursor.slice(separador + 1)
    if (instante === null || !ehUuid(listingId)) return null
    cursor = { instante, listingId }
  }

  return { tipo, limite, cursor }
}

/**
 * Os anúncios que a pessoa salvou (LAN-F06), para a tela Salvos.
 *
 * A leitura parte de `listing_saves` com a sessão — a RLS (`listing_saves_select_owner`)
 * já devolve só as linhas do próprio `user_id`. O anúncio entra pelo `listings`
 * sob `private.can_read_listing`: o que deixou de ser legível (saiu do ar, ou a
 * pessoa perdeu o vínculo da cidade) simplesmente não vira item de tela, e não
 * é erro. A ordem é a do salvamento (mais recente primeiro), com o id do anúncio
 * como desempate do cursor; falha de leitura é 503, nunca lista vazia.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const filtros = lerFiltros(new URL(request.url))
  if (filtros === null) return responder(request, { erro: "corpo-invalido" }, 400)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    let query = client
      .from("listing_saves")
      .select("listing_id, created_at")
      .order("created_at", { ascending: false })
      .order("listing_id", { ascending: false })
    if (filtros.cursor !== null) {
      query = query.or(
        `created_at.lt."${filtros.cursor.instante}",and(created_at.eq."${filtros.cursor.instante}",listing_id.lt.${filtros.cursor.listingId})`,
      )
    }
    const salvas = await query.limit(filtros.limite)
    if (salvas.error) throw salvas.error

    const linhas = salvas.data ?? []
    let proximo: string | null = null
    if (linhas.length === filtros.limite) {
      const ultima = linhas.at(-1)
      if (ultima !== undefined) proximo = `${ultima.created_at}|${ultima.listing_id}`
    }

    const ids = linhas.map((linha) => linha.listing_id)
    if (ids.length === 0) return responder(request, { anuncios: [], proximo }, 200)

    // `kind` no servidor (a aba pedida) e a visibilidade pela RLS da tabela.
    const result = await client
      .from("listings")
      .select(SELECT_ANUNCIO)
      .in("id", ids)
      .eq("kind", filtros.tipo)
    if (result.error) throw result.error

    const rows = (result.data ?? []) as unknown as AnuncioBruto[]
    const primeiraFoto = new Map<string, string>()
    for (const row of rows) {
      const fotos = [...(row.listing_photos ?? [])].sort((a, b) => a.position - b.position)
      const primeira = fotos[0]
      if (primeira !== undefined) primeiraFoto.set(row.id, primeira.path)
    }
    const assinadas = await signPhotoPaths(client, Array.from(primeiraFoto.values()))

    const porId = new Map(rows.map((row) => [row.id, row]))
    const anuncios = ids.flatMap((id) => {
      const row = porId.get(id)
      if (row === undefined) return []
      const path = primeiraFoto.get(row.id)
      return [
        {
          ...baseDoAnuncio(row),
          foto: path === undefined ? null : (assinadas.get(path) ?? null),
          salvo: true,
        },
      ]
    })

    return responder(request, { anuncios, proximo }, 200)
  } catch (error) {
    log.error("app mercado: saved list failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
