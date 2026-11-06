import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../lib/app-api/rota-do-app"
import { log } from "../../../../lib/logger"
import { lerNovaPergunta } from "../../../../lib/recommendations/create"
import { cidadeDaSessao, interpretarErroDoBanco } from "../eventos/_comum"
import { nomesDeAutores } from "./_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LIMITE_PADRAO = 20
const LIMITE_MAXIMO = 50

/**
 * Os filtros da tela viram os argumentos de `list_indications`, no servidor:
 * "Para ajudar" é pergunta aberta de outra pessoa, "Resolvidas" é resolvida, e
 * "Minhas" é a autoria de quem lê. `null` é "não filtra".
 */
const FILTROS = {
  ajuda: { p_resolved: false, p_mine: false },
  resolvidas: { p_resolved: true, p_mine: null },
  minhas: { p_resolved: null, p_mine: true },
} as const

type NomeDoFiltro = keyof typeof FILTROS
const FILTRO_PADRAO: NomeDoFiltro = "ajuda"

function ehFiltro(valor: string): valor is NomeDoFiltro {
  return Object.hasOwn(FILTROS, valor)
}

/**
 * A memória de perguntas da cidade da sessão (F04), pela mesma porta da web
 * antiga: `list_indications` (migration 20260926004501, reescrita em
 * 20261022130513 e 20261024110000). Ela já exclui o que QUEM LÊ ocultou e
 * ordena no servidor — a tela não reordena nem filtra por conta própria.
 *
 * A paginação é por deslocamento, porque é o que a função aceita: `depois` é a
 * posição da próxima página, opaca para quem chama (a tela só devolve o que
 * recebeu). Página cheia sugere que há mais; página curta é o fim.
 *
 * Falha de leitura do banco é 503, nunca lista vazia: um banco fora
 * renderizado como "ninguém perguntou nada" esconde o erro no meio da tela.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const url = new URL(request.url)

  const brutoFiltro = url.searchParams.get("filtro")
  const filtro = brutoFiltro === null ? FILTRO_PADRAO : brutoFiltro
  const brutoDepois = url.searchParams.get("depois")
  const depois = brutoDepois === null ? 0 : Number(brutoDepois)
  const brutoLimite = url.searchParams.get("limite")
  const limite = brutoLimite === null ? LIMITE_PADRAO : Number(brutoLimite)
  if (
    !ehFiltro(filtro) ||
    !Number.isInteger(depois) ||
    depois < 0 ||
    !Number.isInteger(limite) ||
    limite < 1 ||
    limite > LIMITE_MAXIMO
  ) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }

  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const cidade = await cidadeDaSessao(client, userId)
    if (cidade === null) {
      return responder(request, { perguntas: [], proximo: null, cidade: "", resolvidas: 0 }, 200)
    }

    const regra = FILTROS[filtro]
    // O número do cabeçalho ("indicações resolvidas") não sai da página: a
    // função de lista não devolve total. A contagem é da cidade que a sessão
    // alcança, sob RLS, e só é pedida na primeira página.
    // shortcut: não desconta o que a pessoa ocultou nem soma pergunta de grupo
    // da cidade; upgrade quando a RPC devolver o total (ou quando a contagem
    // virar parte da memória de indicações).
    const contagem =
      depois === 0
        ? await client
            .from("recommendation_requests")
            .select("id", { count: "exact", head: true })
            .eq("locality_id", cidade.id)
            .eq("is_resolved", true)
        : { data: null, count: null, error: null }
    if (contagem.error) throw contagem.error

    const { data, error } = await client.rpc("list_indications", {
      p_locality_id: cidade.id,
      p_limit: limite,
      p_offset: depois,
      ...(regra.p_resolved === null ? {} : { p_resolved: regra.p_resolved }),
      ...(regra.p_mine === null ? {} : { p_mine: regra.p_mine }),
    })
    if (error) throw error

    const linhas = data ?? []
    // A função de lista não devolve a autoria (de propósito: ela é da memória,
    // não de um perfil). A tela precisa dela para dizer "Você" e para não
    // anunciar o nome de outra pessoa no lugar errado — então a página é lida
    // pela mesma sessão, sob RLS, e os nomes vêm de `profiles`.
    const ids = linhas.map((linha) => linha.id)
    const autores = new Map<string, string>()
    if (ids.length > 0) {
      const pedidos = await client
        .from("recommendation_requests")
        .select("id,author_id")
        .in("id", ids)
      if (pedidos.error) throw pedidos.error
      for (const pedido of pedidos.data ?? []) autores.set(pedido.id, pedido.author_id)
    }
    const nomes = await nomesDeAutores(client, [...autores.values()])

    const perguntas = linhas.map((linha) => {
      const autorId = autores.get(linha.id) ?? ""
      return {
        id: linha.id,
        titulo: linha.title,
        categoria: linha.category,
        criadaEm: linha.created_at,
        resolvida: linha.is_resolved === true,
        respostas: linha.reply_count,
        propria: autorId !== "" && autorId === userId,
        autor: nomes.get(autorId) ?? "",
      }
    })
    return responder(
      request,
      {
        perguntas,
        proximo: linhas.length === limite ? String(depois + limite) : null,
        cidade: cidade.nome,
        resolvidas: contagem.count ?? 0,
      },
      200,
    )
  } catch (error) {
    log.error("app perguntas: read failed", {
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
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }
  const lido = await lerCorpoJson(request)
  const pergunta = lido.ok ? lerNovaPergunta(lido.corpo) : null
  if (!pergunta) return responder(request, { erro: "dados-invalidos" }, 400)
  try {
    const client = auth.sessao.cliente
    const userId = auth.sessao.usuario.id
    const cidade = await cidadeDaSessao(client, userId)
    if (!cidade) return responder(request, { erro: "sem-cidade" }, 403)
    const result = await client
      .from("recommendation_requests")
      .insert({
        ...pergunta,
        author_id: userId,
        locality_id: cidade.id,
      })
      .select("id")
      .single()
    if (result.error) {
      const falha = interpretarErroDoBanco(result.error.code, {
        recusado: "Sua conta não pode perguntar nesta cidade.",
        dados: "Revise os dados da pergunta.",
      })
      return responder(request, falha.corpo, falha.status)
    }
    if (!result.data) throw new Error("insert without result")
    return responder(request, { pergunta: { id: result.data.id } }, 201)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
