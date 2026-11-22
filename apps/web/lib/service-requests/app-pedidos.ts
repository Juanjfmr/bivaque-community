import { PROVIDER_CATEGORY_LABELS } from "@bivaque/domain"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

type Cliente = SupabaseClient<Database>

/**
 * Os pedidos em que a pessoa é parte — como solicitante OU como dono do negócio
 * (F07, RUN-177). Quem decide o que cada um vê é a RLS de `service_requests`;
 * o filtro repete a mesma regra para a consulta não depender de o banco
 * "sobrar" linha. O lado da pessoa vai no payload (`lado`) para a tela saber
 * quais ações oferecer.
 *
 * A localização do pedido entra por duas colunas publicadas (RUN-179): `region`
 * (o bairro que o prestador vê) e a distância calculada pela RPC. As colunas
 * cruas — cep, latitude, longitude — não estão aqui de propósito: `authenticated`
 * não tem SELECT nelas, e o payload nunca as carrega.
 */
export type LadoDaFila = "recebidos" | "enviados"

export function consultaPedidos(client: Cliente, userId: string, lado?: LadoDaFila) {
  const consulta = client
    .from("service_requests")
    .select(
      "id,provider_id,requester_user_id,provider_user_id,category,description,when_text,status,region,created_at,updated_at,conversation_id,provider_profiles(display_name)",
    )
  // TROCA-005 — a fila de UM lado é do servidor: a página da aba não pode vir
  // cheia da outra fila para a tela descartar metade.
  if (lado === "recebidos") return consulta.eq("provider_user_id", userId)
  if (lado === "enviados") return consulta.eq("requester_user_id", userId)
  return consulta.or(`requester_user_id.eq.${userId},provider_user_id.eq.${userId}`)
}

type LinhaPedido = Pick<
  Database["public"]["Tables"]["service_requests"]["Row"],
  | "id"
  | "provider_id"
  | "requester_user_id"
  | "provider_user_id"
  | "category"
  | "description"
  | "when_text"
  | "status"
  | "region"
  | "created_at"
  | "updated_at"
  | "conversation_id"
> & {
  provider_profiles: { display_name: string } | null
}

export type LadoDoPedido = "solicitante" | "dono"

/**
 * A distância do ponto de vista de QUEM LÊ, em metros (arredondada à centena no
 * banco). A origem é a do perfil do chamador, tirada de `auth.uid()` dentro da
 * RPC — não existe parâmetro de origem. `null` é a resposta honesta para quem
 * não cadastrou origem, para o pedido sem coordenada e para quem não participa.
 */
export async function distanciaDoPedido(client: Cliente, id: string): Promise<number | null> {
  const { data, error } = await client.rpc("service_request_distance", { p_request_id: id })
  if (error) throw error
  if (data === null) return null
  if (typeof data !== "number") throw new Error("distância fora do contrato")
  return data
}

export function resumoDoPedido(linha: LinhaPedido, userId: string, distanciaMetros: number | null) {
  return {
    id: linha.id,
    negocioId: linha.provider_id,
    negocioNome: linha.provider_profiles?.display_name ?? "Negócio indisponível",
    categoriaNome: PROVIDER_CATEGORY_LABELS[linha.category],
    descricao: linha.description,
    quando: linha.when_text,
    situacao: linha.status,
    /** O bairro que o prestador vê; `null` no pedido sem CEP. */
    bairro: linha.region,
    distanciaMetros,
    criadoEm: linha.created_at,
    atualizadoEm: linha.updated_at,
    conversaId: linha.conversation_id,
    lado: (linha.requester_user_id === userId ? "solicitante" : "dono") as LadoDoPedido,
  }
}

export async function pedidoDoMembro(client: Cliente, userId: string, id: string) {
  const { data, error } = await consultaPedidos(client, userId).eq("id", id).maybeSingle()
  if (error) throw error
  if (data === null) return null
  return resumoDoPedido(data, userId, await distanciaDoPedido(client, id))
}

// ── a conversa do pedido (TROCA-005) ─────────────────────────────────────────
//
// O prestador responde e vê o estado GRAVADO. A conversa sai do pedido, não do
// corpo do pedido: o `conversation_id` é o do banco, então um id escolhido pelo
// cliente nunca conduz a escrita para outra conversa. O envio usa a RPC
// `send_conversation_message`, que deriva o remetente da sessão e move
// `open → in_conversation` na mesma transação.

export const CONTEUDO_MAX = 2000
/** A Folha mostra a conversa recente; um histórico enorme não vira resposta gigante. */
export const MENSAGENS_DO_PEDIDO_MAX = 50

export type MensagemDoPedido = Readonly<{
  id: string
  minha: boolean
  conteudo: string
  criadoEm: string
}>

export async function mensagensDoPedido(
  client: Cliente,
  userId: string,
  conversaId: string,
): Promise<readonly MensagemDoPedido[]> {
  const { data, error } = await client
    .from("dm_messages")
    .select("id,sender_id,content,created_at")
    .eq("conversation_id", conversaId)
    // As N mais recentes vêm do banco (descendente) e voltam em ordem de leitura.
    .order("created_at", { ascending: false })
    .limit(MENSAGENS_DO_PEDIDO_MAX)
  if (error) throw error
  return (data ?? []).reverse().map((linha) => ({
    id: linha.id,
    minha: linha.sender_id === userId,
    conteudo: linha.content,
    criadoEm: linha.created_at,
  }))
}

export type MotivoDaResposta =
  | "pedido-nao-encontrado"
  | "sem-conversa"
  | "conteudo-vazio"
  | "conteudo-longo"
  | "recusado"
  | "indisponivel"

export type ResultadoDaResposta =
  | {
      readonly ok: true
      readonly pedido: NonNullable<Awaited<ReturnType<typeof pedidoDoMembro>>>
      readonly mensagens: readonly MensagemDoPedido[]
    }
  | { readonly ok: false; readonly motivo: MotivoDaResposta; readonly mensagem: string }

export async function responderPedido(
  client: Cliente,
  userId: string,
  pedidoId: string,
  conteudo: string,
): Promise<ResultadoDaResposta> {
  const texto = conteudo.trim()
  if (texto.length === 0) {
    return {
      ok: false,
      motivo: "conteudo-vazio",
      mensagem: "Escreva uma resposta antes de enviar.",
    }
  }
  if (texto.length > CONTEUDO_MAX) {
    return {
      ok: false,
      motivo: "conteudo-longo",
      mensagem: `A resposta passa de ${CONTEUDO_MAX} caracteres.`,
    }
  }

  const pedido = await pedidoDoMembro(client, userId, pedidoId)
  if (pedido === null) {
    return {
      ok: false,
      motivo: "pedido-nao-encontrado",
      mensagem: "Este pedido não existe ou não é seu.",
    }
  }
  if (pedido.conversaId === null) {
    return {
      ok: false,
      motivo: "sem-conversa",
      mensagem: "Este pedido ainda não tem conversa para responder.",
    }
  }

  const { error } = await client.rpc("send_conversation_message", {
    p_conversation_id: pedido.conversaId,
    p_content: texto,
  })
  if (error) {
    if (error.code === "42501") {
      return {
        ok: false,
        motivo: "recusado",
        mensagem: "Só quem participa da conversa pode responder.",
      }
    }
    if (error.code === "P0002") {
      return { ok: false, motivo: "pedido-nao-encontrado", mensagem: "Este pedido não existe." }
    }
    return {
      ok: false,
      motivo: "indisponivel",
      mensagem: "Não foi possível enviar a resposta agora. Tente de novo.",
    }
  }

  const atualizado = await pedidoDoMembro(client, userId, pedidoId)
  if (atualizado === null) throw new Error("pedido sumiu depois da resposta")
  return {
    ok: true,
    pedido: atualizado,
    mensagens: await mensagensDoPedido(client, userId, pedido.conversaId),
  }
}

export type ResultadoDoEncerramento =
  | {
      readonly ok: true
      readonly pedido: NonNullable<Awaited<ReturnType<typeof pedidoDoMembro>>>
    }
  | {
      readonly ok: false
      readonly motivo: "pedido-nao-encontrado" | "situacao-final" | "indisponivel"
    }

export async function encerrarPedido(
  client: Cliente,
  userId: string,
  pedidoId: string,
): Promise<ResultadoDoEncerramento> {
  const pedido = await pedidoDoMembro(client, userId, pedidoId)
  if (pedido === null) return { ok: false, motivo: "pedido-nao-encontrado" }
  if (pedido.situacao === "closed") return { ok: true, pedido }
  if (pedido.situacao === "cancelled") return { ok: false, motivo: "situacao-final" }
  const { error } = await client.rpc("close_service_request", { p_request_id: pedidoId })
  if (error) return { ok: false, motivo: "indisponivel" }
  const atualizado = await pedidoDoMembro(client, userId, pedidoId)
  if (atualizado === null) return { ok: false, motivo: "pedido-nao-encontrado" }
  return { ok: true, pedido: atualizado }
}

/**
 * A recusa das RPCs de cancelar/encerrar traduzida para a porta. O texto do
 * Postgres não sai daqui; o estado final decidido no banco vira 409, não 500.
 */
export function falhaDaAcao(codigo: string | undefined): {
  status: 403 | 404 | 409 | 503
  erro: string
  mensagem: string
} {
  if (codigo === "42501")
    return {
      status: 403,
      erro: "recusado",
      mensagem: "Só quem participa do pedido pode fazer isso.",
    }
  if (codigo === "P0002")
    return { status: 404, erro: "pedido-nao-encontrado", mensagem: "Este pedido não existe." }
  if (codigo === "22023")
    return {
      status: 409,
      erro: "situacao-final",
      mensagem: "Este pedido já foi encerrado ou cancelado.",
    }
  return {
    status: 503,
    erro: "escrita-indisponivel",
    mensagem: "Não foi possível concluir agora. Tente novamente.",
  }
}
