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
import {
  buildEventUpdatePayload,
  EVENTO_CANCELADO,
  eventInputFromBody,
  intencaoDoPatch,
  validateEventForm,
} from "../../../../../lib/events/event-form"
import { log } from "../../../../../lib/logger"
import { caminhoDeCapaValido, cidadeDaSessao, ehUuid, interpretarErroDoBanco } from "../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

// O encontro de outra cidade abre como VISITANTE (decisão do dono de 25/09,
// migration 20260925161111): ler é de qualquer membro, confirmar presença e
// perguntar continuam de quem é da cidade. Por isso o detalhe não é 404 para
// quem é de fora — ele diz de que cidade é o encontro e o que a pessoa pode
// fazer ali. O número de confirmados não vai para o visitante: a RLS nega a
// leitura de `event_rsvps`, e um zero aqui seria a mentira "ninguém confirmou".
//
// A capa não sai como caminho do bucket: mídia só por URL assinada de vida
// curta, e esta tela não desenha capa nenhuma, então não sai nada.

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "evento-nao-encontrado" }, 404)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const result = await client
      .from("events")
      .select(
        "id,title,description,venue,starts_at,ends_at,status,organizer_id,locality_id,localities(city_name)",
      )
      .eq("id", id)
      .maybeSingle()
    if (result.error) throw result.error
    if (!result.data) return responder(request, { erro: "evento-nao-encontrado" }, 404)

    const cidade = await cidadeDaSessao(client, userId)
    const visitante = cidade === null || cidade.id !== result.data.locality_id
    const date = result.data.starts_at.slice(0, 10)

    let presenca: { confirmados: number; minha: string | null } | null = null
    if (!visitante) {
      const [contagem, minha] = await Promise.all([
        client
          .from("event_rsvps")
          .select("event_id", { count: "exact", head: true })
          .eq("event_id", id)
          .eq("occurrence_date", date)
          .eq("status", "going"),
        client
          .from("event_rsvps")
          .select("status")
          .eq("event_id", id)
          .eq("user_id", userId)
          .eq("occurrence_date", date)
          .maybeSingle(),
      ])
      if (contagem.error || minha.error) throw contagem.error ?? minha.error
      presenca = { confirmados: contagem.count ?? 0, minha: minha.data?.status ?? null }
    }

    return responder(
      request,
      {
        evento: {
          id: result.data.id,
          titulo: result.data.title,
          descricao: result.data.description,
          local: result.data.venue,
          comecaEm: result.data.starts_at,
          terminaEm: result.data.ends_at,
          situacao: result.data.status,
          cidade: result.data.localities?.city_name ?? "",
        },
        presenca,
        souOrganizador: result.data.organizer_id === userId,
        visitante,
      },
      200,
    )
  } catch (error) {
    log.error("app evento: read failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export async function PATCH(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "evento-nao-encontrado" }, 404)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Envie os dados do evento em JSON." },
      400,
    )
  }
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  const intencao = intencaoDoPatch(lido.corpo)
  if (intencao === "invalido")
    return responder(
      request,
      {
        erro: "dados-invalidos",
        mensagem: "Este endereço só cancela o encontro: o resto dos dados muda na edição.",
      },
      400,
    )
  if (intencao === "cancelar") {
    return cancelarEncontro(request, auth.sessao.cliente, id, auth.sessao.usuario.id)
  }
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
    const current = await client.from("events").select("id,organizer_id").eq("id", id).maybeSingle()
    if (current.error) throw current.error
    if (!current.data) return responder(request, { erro: "evento-nao-encontrado" }, 404)
    if (current.data.organizer_id !== userId)
      return responder(request, { erro: "nao-organiza" }, 403)
    const result = await client
      .from("events")
      .update(buildEventUpdatePayload(corpo.input, corpo.temCapa))
      .eq("id", id)
      .eq("organizer_id", userId)
      .select("id")
      .single()
    // A RLS recusou depois da checagem de autoria (ex.: vínculo de cidade que
    // deixou de valer): é recusa, não indisponibilidade. Check violado é dado
    // inválido. A mensagem do Postgres nunca chega à pessoa.
    if (result.error) {
      const falha = interpretarErroDoBanco(result.error.code, {
        recusado: "Só quem organiza pode mudar este encontro.",
        dados: "Revise os dados do encontro: algo não é aceito.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw result.error
    }
    if (!result.data) throw new Error("update without result")
    return responder(request, { evento: { id: result.data.id } }, 200)
  } catch (error) {
    log.error("app evento: update failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}

/**
 * O ramo exclusivo do cancelamento (RUN-167): grava `status = cancelled` e mais
 * nada. É o que a `cancelEventAction` da web antiga fazia antes de a tela sair
 * (375c336d), agora no contrato do ADR §5.
 *
 * A posse é do banco (`events_update_organizer`) e a checagem de autoria antes
 * do update é o que dá o 403 sem confirmar existência além do necessário — a
 * RLS recusaria a mesma coisa, com erro que esta rota não saberia traduzir. Já
 * cancelado é o mesmo estado: não reescreve (o trigger de aviso não tem o que
 * anunciar) e devolve 200, para a tela poder repetir sem susto.
 */
async function cancelarEncontro(
  request: NextRequest,
  client: SupabaseClient<Database>,
  id: string,
  userId: string,
): Promise<NextResponse> {
  try {
    const current = await client
      .from("events")
      .select("id,organizer_id,status")
      .eq("id", id)
      .maybeSingle()
    if (current.error) throw current.error
    if (!current.data) return responder(request, { erro: "evento-nao-encontrado" }, 404)
    if (current.data.organizer_id !== userId)
      return responder(request, { erro: "nao-organiza" }, 403)
    if (current.data.status === EVENTO_CANCELADO)
      return responder(request, { evento: { id: current.data.id } }, 200)

    const result = await client
      .from("events")
      .update({ status: EVENTO_CANCELADO })
      .eq("id", id)
      .eq("organizer_id", userId)
      .select("id")
      .single()
    if (result.error) {
      const falha = interpretarErroDoBanco(result.error.code, {
        recusado: "Só quem organiza pode cancelar este encontro.",
        dados: "Este encontro não pode ser cancelado.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw result.error
    }
    if (!result.data) throw new Error("cancel without result")
    return responder(request, { evento: { id: result.data.id } }, 200)
  } catch (error) {
    log.error("app evento: cancel failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}
