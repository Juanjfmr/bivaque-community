import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../lib/app-api/rota-do-app"
import {
  buildEventCreatePayload,
  eventInputFromBody,
  validateEventForm,
} from "../../../../lib/events/event-form"
import { log } from "../../../../lib/logger"
import { caminhoDeCapaValido, cidadeDaSessao, ehUuid, interpretarErroDoBanco } from "./_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LIMITE_PADRAO = 20
const LIMITE_MAXIMO = 50

/**
 * Instante do cursor, reescrito antes de entrar no filtro.
 *
 * A âncora no fim é o que impede um valor com `"`, `,`, `(` ou `)` de virar
 * sintaxe do PostgREST: só passa o formato que o servidor emite. A saída é
 * reconstruída em UTC e **mantém os microssegundos** — `toISOString()` cortaria
 * para milissegundos, o `eq` do desempate nunca casaria e a virada da página
 * repetiria o último encontro.
 */
function instanteDoCursor(valor: string): string | null {
  const casado = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(\.\d{1,6})?(Z|[+-]00:00)$/.exec(valor)
  if (!casado) return null
  const [, dia, hora, fracao = ""] = casado
  const canonico = `${dia}T${hora}${fracao}Z`
  return Number.isFinite(Date.parse(canonico)) ? canonico : null
}

/** O cursor é opaco para quem chama: `comecaEm|id`, os dois campos da ordenação. */
function lerCursor(valor: string): { comecaEm: string; id: string } | null {
  const separador = valor.lastIndexOf("|")
  if (separador <= 0) return null
  const comecaEm = instanteDoCursor(valor.slice(0, separador))
  const id = valor.slice(separador + 1)
  if (comecaEm === null) return null
  return ehUuid(id) ? { comecaEm, id } : null
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const url = new URL(request.url)
  const brutoLimite = url.searchParams.get("limite")
  const limite = brutoLimite === null ? LIMITE_PADRAO : Number(brutoLimite)
  const brutoCursor = url.searchParams.get("depois")
  const cursor = brutoCursor === null ? null : lerCursor(brutoCursor)
  if (
    !Number.isInteger(limite) ||
    limite < 1 ||
    limite > LIMITE_MAXIMO ||
    (brutoCursor !== null && cursor === null)
  ) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const cidade = await cidadeDaSessao(client, userId)
    if (cidade === null) return responder(request, { eventos: [], proximo: null }, 200)

    let query = client
      .from("events")
      .select("id,title,venue,starts_at,status")
      .eq("locality_id", cidade.id)
      // Cancelado e concluído não entram na agenda — a mesma régua da web antiga
      // (`events/page.tsx`, RECON-007 A.2).
      .neq("status", "completed")
      .neq("status", "cancelled")
    // Keyset composto: dois encontros no mesmo horário não se perdem nem se
    // repetem na virada da página — o id desempata, na mesma ordem do `order`.
    query =
      cursor === null
        ? query.gte("starts_at", new Date().toISOString())
        : query.or(
            `starts_at.gt."${cursor.comecaEm}",and(starts_at.eq."${cursor.comecaEm}",id.gt.${cursor.id})`,
          )
    const result = await query
      .order("starts_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(limite)
    if (result.error) throw result.error

    const eventos = (result.data ?? []).map((row) => ({
      id: row.id,
      titulo: row.title,
      local: row.venue,
      comecaEm: row.starts_at,
      situacao: row.status,
    }))
    const ultimo = eventos.at(-1)
    const proximo =
      eventos.length === limite && ultimo !== undefined ? `${ultimo.comecaEm}|${ultimo.id}` : null
    // O nome da cidade vem daqui: a tela não pode anunciar a cidade da
    // demonstração enquanto lista os encontros do vínculo `current`.
    return responder(request, { eventos, proximo, cidade: cidade.nome }, 200)
  } catch (error) {
    log.error("app eventos: read failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Envie os dados do evento em JSON." },
      400,
    )
  }
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  const corpo = eventInputFromBody(lido.corpo)
  if (!corpo)
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Dados do evento inválidos." },
      400,
    )
  const mensagem = validateEventForm(corpo.input)
  if (mensagem) return responder(request, { erro: "dados-invalidos", mensagem }, 400)
  const userId = auth.sessao.usuario.id
  if (!caminhoDeCapaValido(corpo.input.coverPath, userId)) {
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "A capa precisa estar na sua pasta de fotos." },
      400,
    )
  }
  try {
    const client = auth.sessao.cliente
    const cidade = await cidadeDaSessao(client, userId)
    if (cidade === null) return responder(request, { erro: "sem-cidade" }, 403)
    const result = await client
      .from("events")
      .insert(
        buildEventCreatePayload(corpo.input, {
          organizerId: userId,
          localityId: cidade.id,
        }),
      )
      .select("id")
      .single()
    if (result.error) {
      const falha = interpretarErroDoBanco(result.error.code, {
        recusado: "Sua conta não pode criar encontros nesta cidade.",
        dados: "Revise os dados do encontro: algo não é aceito.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw result.error
    }
    if (!result.data) throw new Error("insert without result")
    return responder(request, { evento: { id: result.data.id } }, 201)
  } catch (error) {
    log.error("app eventos: create failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
