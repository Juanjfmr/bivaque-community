import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../lib/app-api/rota-do-app"
import { signPhotoPaths } from "../../../../lib/listings/queries"
import { log } from "../../../../lib/logger"
import { type AnuncioBruto, baseDoAnuncio, cidadeDaSessao, ehUuid, SELECT_ANUNCIO } from "./_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LIMITE_PADRAO = 20
const LIMITE_MAXIMO = 50

type Ordem = "recent" | "price_asc" | "price_desc"

interface Filtros {
  tipo: "item" | "property"
  ordem: Ordem
  quartos: number | null
  valorMaxCents: number | null
  tipoImovel: "apartment" | "house" | null
  limite: number
  cursor: { campo: string; id: string } | null
}

/**
 * Instante do cursor, reescrito antes de entrar no filtro — o mesmo do F05, com
 * os microssegundos preservados.
 */
function instanteDoCursor(valor: string): string | null {
  const casado = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(\.\d{1,6})?(Z|[+-]00:00)$/.exec(valor)
  if (!casado) return null
  const [, dia, hora, fracao = ""] = casado
  const canonico = `${dia}T${hora}${fracao}Z`
  return Number.isFinite(Date.parse(canonico)) ? canonico : null
}

function inteiroEntre(bruto: string | null, min: number, max: number): number | null {
  if (bruto === null || !/^\d+$/.test(bruto)) return null
  const valor = Number(bruto)
  return valor >= min && valor <= max ? valor : null
}

/** Centavos de um valor em reais; o pedido exige inteiro estritamente positivo. */
function valorMaxEmCentavos(bruto: string | null): number | null {
  if (bruto === null || !/^\d+$/.test(bruto)) return null
  const reais = Number(bruto)
  return Number.isSafeInteger(reais) && reais > 0 ? reais * 100 : null
}

/** Lê e valida a query. `null` é "inválido" — a rota responde 400. */
function lerFiltros(url: URL): Filtros | null {
  const params = url.searchParams
  const tipo = params.get("tipo")
  if (tipo !== "item" && tipo !== "property") return null

  const brutoOrdem = params.get("ordem")
  const ordem: Ordem = brutoOrdem === null ? "recent" : (brutoOrdem as Ordem)
  if (ordem !== "recent" && ordem !== "price_asc" && ordem !== "price_desc") return null

  // Filtros de imóvel só existem com `tipo=property`; presentes com `tipo=item`
  // é pedido contraditório, recusado antes de tocar o banco.
  const temQuartos = params.get("quartos")
  const temValorMax = params.get("valor_max")
  const temTipoImovel = params.get("tipo_imovel")
  if (tipo === "item" && (temQuartos !== null || temValorMax !== null || temTipoImovel !== null)) {
    return null
  }

  const quartos = temQuartos === null ? null : inteiroEntre(temQuartos, 0, 10)
  if (temQuartos !== null && quartos === null) return null

  const brutoValor = params.get("valor_max")
  let valorMaxCents: number | null = null
  if (brutoValor !== null) {
    valorMaxCents = valorMaxEmCentavos(brutoValor)
    if (valorMaxCents === null) return null
  }

  let tipoImovel: "apartment" | "house" | null = null
  if (temTipoImovel !== null) {
    if (temTipoImovel === "apartamento") tipoImovel = "apartment"
    else if (temTipoImovel === "casa") tipoImovel = "house"
    else return null
  }

  const brutoLimite = params.get("limite")
  const limite = brutoLimite === null ? LIMITE_PADRAO : inteiroEntre(brutoLimite, 1, LIMITE_MAXIMO)
  if (limite === null) return null

  const brutoCursor = params.get("depois")
  let cursor: { campo: string; id: string } | null = null
  if (brutoCursor !== null) {
    const separador = brutoCursor.lastIndexOf("|")
    if (separador <= 0) return null
    const campo = brutoCursor.slice(0, separador)
    const id = brutoCursor.slice(separador + 1)
    if (!ehUuid(id)) return null
    if (ordem === "recent") {
      const instante = instanteDoCursor(campo)
      if (instante === null) return null
      cursor = { campo: instante, id }
    } else {
      // O cursor de preço carrega os centavos; só o formato do servidor passa.
      if (!/^\d+$/.test(campo)) return null
      cursor = { campo, id }
    }
  }

  return { tipo, ordem, quartos, valorMaxCents, tipoImovel, limite, cursor }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const filtros = lerFiltros(new URL(request.url))
  if (filtros === null) return responder(request, { erro: "corpo-invalido" }, 400)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const cidade = await cidadeDaSessao(client, userId)
    if (cidade === null) {
      return responder(request, { anuncios: [], proximo: null, cidade: null }, 200)
    }

    let query = client
      .from("listings")
      .select(SELECT_ANUNCIO)
      .eq("kind", filtros.tipo)
      .eq("status", "active")
      .eq("locality_id", cidade.id)

    if (filtros.quartos !== null && filtros.quartos > 0) {
      query = query.gte("property_details.bedrooms", filtros.quartos)
    }
    // shortcut: preço efetivo de imóvel está no satélite; quando a tela passar a filtrar no servidor, casar por precoEfetivo (coluna gerada exigiria migration)
    if (filtros.valorMaxCents !== null) query = query.lte("price_cents", filtros.valorMaxCents)
    if (filtros.tipoImovel !== null) {
      query = query.eq("property_details.property_type", filtros.tipoImovel)
    }

    if (filtros.ordem === "recent") {
      query = query.order("created_at", { ascending: false }).order("id", { ascending: false })
      if (filtros.cursor !== null) {
        query = query.or(
          `created_at.lt."${filtros.cursor.campo}",and(created_at.eq."${filtros.cursor.campo}",id.lt.${filtros.cursor.id})`,
        )
      }
    } else {
      // Sem preço não há ordenação por preço; nulos ficam fora (ver nota no ADR).
      query = query
        .not("price_cents", "is", null)
        .order("price_cents", { ascending: filtros.ordem === "price_asc" })
        .order("id", { ascending: false })
      if (filtros.cursor !== null) {
        const op = filtros.ordem === "price_asc" ? "gt" : "lt"
        query = query.or(
          `price_cents.${op}.${filtros.cursor.campo},and(price_cents.eq.${filtros.cursor.campo},id.lt.${filtros.cursor.id})`,
        )
      }
    }

    const result = await query.limit(filtros.limite)
    if (result.error) throw result.error

    const rows = (result.data ?? []) as unknown as AnuncioBruto[]
    // A primeira foto de cada anúncio vira a capa; sem assinar, nenhum caminho
    // cru do bucket sai da rota.
    const primeiraFoto = new Map<string, string>()
    for (const row of rows) {
      const fotos = [...(row.listing_photos ?? [])].sort((a, b) => a.position - b.position)
      const primeira = fotos[0]
      if (primeira !== undefined) primeiraFoto.set(row.id, primeira.path)
    }
    const assinadas = await signPhotoPaths(client, Array.from(primeiraFoto.values()))

    const anuncios = rows.map((row) => {
      const path = primeiraFoto.get(row.id)
      return {
        ...baseDoAnuncio(row),
        foto: path === undefined ? null : (assinadas.get(path) ?? null),
      }
    })

    let proximo: string | null = null
    if (rows.length === filtros.limite) {
      const ultimo = rows.at(-1)
      if (ultimo !== undefined) {
        proximo =
          filtros.ordem === "recent"
            ? `${ultimo.created_at}|${ultimo.id}`
            : `${ultimo.price_cents}|${ultimo.id}`
      }
    }

    return responder(request, { cidade: cidade.nome, proximo, anuncios }, 200)
  } catch (error) {
    log.error("app mercado: list failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
