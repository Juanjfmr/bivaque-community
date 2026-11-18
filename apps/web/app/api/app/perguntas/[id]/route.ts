import type { SupabaseClient } from "@supabase/supabase-js"
import type { NextRequest, NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"
import { lerNovaPergunta } from "../../../../../lib/recommendations/create"
import { ehUuid, interpretarErroDoBanco } from "../../eventos/_comum"
import { nomesDeAutores } from "../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

/**
 * A pergunta e a conversa dela (F04).
 *
 * O banco decide quem lê: a policy de SELECT de `recommendation_requests` deixa
 * a autoria e quem é da cidade; para qualquer outra pessoa a linha simplesmente
 * não existe. Por isso a resposta é 404 — um 403 diria "existe, mas você não
 * pode", que é justamente o que a RLS não conta.
 *
 * As respostas vêm de `list_question_replies` (migration 20261024110000): é o
 * caminho que devolve a resposta removida pela moderação como aviso, sem texto
 * e sem autor. Um SELECT direto esconderia a resposta removida inteira e a
 * conversa pareceria ter um buraco.
 *
 * `editada` é `edited_at`, e só ele: o gatilho do banco separa edição de
 * resolução, então um pedido antigo não aparece editado por ter sido resolvido.
 * O `verbete` é o que o Guia publicou a partir daquela resposta (F09 lote 2),
 * pelo mesmo recorte da tela antiga: `source_reply_id`, só aprovado, só id e
 * título.
 */
export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "pergunta-nao-encontrada" }, 404)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const pedido = await client
      .from("recommendation_requests")
      .select(
        "id,author_id,title,body,category,created_at,edited_at,is_resolved,resolved_reply_id,group_id,localities(city_name),groups(name)",
      )
      .eq("id", id)
      .maybeSingle()
    if (pedido.error) throw pedido.error
    if (!pedido.data) return responder(request, { erro: "pergunta-nao-encontrada" }, 404)

    const conversa = await client.rpc("list_question_replies", { p_request_id: id })
    if (conversa.error) {
      // P0002 é o portão da própria função: a pergunta não existe para quem lê.
      if (conversa.error.code === "P0002") {
        return responder(request, { erro: "pergunta-nao-encontrada" }, 404)
      }
      throw conversa.error
    }

    // Seguir respostas (F04): o mesmo registro de `recommendation_saves` que a
    // web antiga lê. A policy de SELECT já é só do próprio `user_id`.
    const salva = await client
      .from("recommendation_saves")
      .select("request_id")
      .eq("user_id", userId)
      .eq("request_id", id)
      .maybeSingle()
    if (salva.error) throw salva.error

    const linhas = conversa.data ?? []
    const autoresDasRespostas = linhas
      .filter((linha) => !linha.is_removed && typeof linha.author_id === "string")
      .map((linha) => linha.author_id)
    const nomes = await nomesDeAutores(client, [pedido.data.author_id, ...autoresDasRespostas])
    const verbetes = await verbetesDasRespostas(client, linhas)

    return responder(
      request,
      {
        pergunta: {
          id: pedido.data.id,
          titulo: pedido.data.title,
          corpo: pedido.data.body,
          categoria: pedido.data.category,
          criadaEm: pedido.data.created_at,
          editada: pedido.data.edited_at !== null,
          resolvida: pedido.data.is_resolved === true,
          resolvidaPorResposta: pedido.data.resolved_reply_id,
          propria: pedido.data.author_id === userId,
          autor: nomes.get(pedido.data.author_id) ?? "",
          autorId: pedido.data.author_id,
          cidade: pedido.data.localities?.city_name ?? "",
          // Origem dupla (RUN-178): a ficha nomeia o grupo em que a pergunta
          // também foi feita. A leitura do grupo é a RLS: sem ele, fica null.
          grupo:
            pedido.data.group_id === null
              ? null
              : { id: pedido.data.group_id, nome: pedido.data.groups?.name ?? "" },
          salva: salva.data !== null,
        },
        respostas: linhas.map((linha) => ({
          id: linha.id,
          // Resposta removida volta sem texto e sem autor — o aviso é a tela.
          corpo: linha.is_removed ? "" : linha.body,
          autor: linha.is_removed ? "" : (nomes.get(linha.author_id ?? "") ?? ""),
          autorId: linha.is_removed ? "" : (linha.author_id ?? ""),
          propria: !linha.is_removed && linha.author_id === userId,
          criadaEm: linha.created_at,
          // O tipo gerado diz `string`, mas a coluna é nula em quem nunca foi
          // editado: a marca só existe quando o banco gravou o instante.
          editada: !linha.is_removed && typeof linha.edited_at === "string",
          removida: linha.is_removed === true,
          verbete: linha.is_removed ? null : (verbetes.get(linha.id) ?? null),
        })),
      },
      200,
    )
  } catch (error) {
    log.error("app pergunta: read failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

/**
 * O verbete que nasceu de cada resposta (F09 lote 2), no recorte da tela antiga:
 * `arrival_guide_entries` por `source_reply_id`, só `status = 'approved'`, e só
 * id e título. A RLS de `arrival_guide_entries` é nacional para as aprovadas; a
 * lista de ids vem das respostas visíveis, então a consulta não alcança nada
 * fora desta conversa. Falha de leitura sobe: um erro virando "sem verbete"
 * esconderia o link de quem já o tem.
 */
async function verbetesDasRespostas(
  client: SupabaseClient<Database>,
  linhas: readonly Readonly<{ id: string; is_removed: boolean }>[],
): Promise<ReadonlyMap<string, { id: string; nome: string }>> {
  const ids = linhas.filter((linha) => !linha.is_removed).map((linha) => linha.id)
  if (ids.length === 0) return new Map()
  const { data, error } = await client
    .from("arrival_guide_entries")
    .select("id,name,source_reply_id")
    .in("source_reply_id", ids)
    .eq("status", "approved")
  if (error) throw error
  const verbetes = new Map<string, { id: string; nome: string }>()
  for (const linha of data ?? []) {
    if (linha.source_reply_id === null) continue
    verbetes.set(linha.source_reply_id, { id: linha.id, nome: linha.name })
  }
  return verbetes
}

/**
 * Editar a própria pergunta (F09 lote 2).
 *
 * A régua do texto é a da CRIAÇÃO, pelo mesmo módulo (`lerNovaPergunta`): o
 * título de 8 a 300 e o assunto até 60 são o que a pessoa vê ao perguntar, e a
 * edição não pode aceitar o que a criação recusa. A categoria que o módulo
 * sugere é descartada: editar não troca o tópico, e o grant da autoria só
 * alcança `title` e `body` (migration 20261024110000).
 *
 * Linha alheia e linha inexistente dão o mesmo 404 — o `author_id` da sessão
 * entra no filtro, como na tela antiga, e a policy repete a régua no banco.
 */
export async function PATCH(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "pergunta-nao-encontrada" }, 404)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, lido.status)
  const conteudo = lerNovaPergunta({
    titulo: lido.corpo["titulo"],
    assunto: lido.corpo["assunto"],
  })
  if (conteudo === null) {
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Revise o título e o assunto da pergunta." },
      400,
    )
  }

  const userId = auth.sessao.usuario.id
  try {
    const { data, error } = await auth.sessao.cliente
      .from("recommendation_requests")
      .update({ title: conteudo.title, body: conteudo.body })
      .eq("id", id)
      .eq("author_id", userId)
      .select("id,title,body,edited_at")
    if (error) {
      const falha = interpretarErroDoBanco(error.code, {
        recusado: "Sua conta não pode editar esta pergunta.",
        dados: "Revise o título e o assunto da pergunta.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw error
    }
    const linha = (data ?? [])[0]
    if (linha === undefined) return responder(request, { erro: "pergunta-nao-encontrada" }, 404)
    return responder(
      request,
      {
        pergunta: {
          id: linha.id,
          titulo: linha.title,
          corpo: linha.body,
          editada: linha.edited_at !== null,
        },
      },
      200,
    )
  } catch (error) {
    log.error("app pergunta: edit failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

/**
 * Excluir a própria pergunta. As respostas e o seguimento caem junto pelo
 * `on delete cascade` da FK — o mesmo que a tela antiga fazia. Mesma régua de
 * posse do PATCH, e o mesmo 404 para alheia e inexistente.
 */
export async function DELETE(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "pergunta-nao-encontrada" }, 404)
  const userId = auth.sessao.usuario.id
  try {
    const { data, error } = await auth.sessao.cliente
      .from("recommendation_requests")
      .delete()
      .eq("id", id)
      .eq("author_id", userId)
      .select("id")
    if (error) {
      const falha = interpretarErroDoBanco(error.code, {
        recusado: "Sua conta não pode excluir esta pergunta.",
        dados: "Não foi possível excluir esta pergunta.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw error
    }
    if ((data ?? []).length === 0) {
      return responder(request, { erro: "pergunta-nao-encontrada" }, 404)
    }
    return responder(request, { removido: true }, 200)
  } catch (error) {
    log.error("app pergunta: delete failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
