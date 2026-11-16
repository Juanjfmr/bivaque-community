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
export function consultaPedidos(client: Cliente, userId: string) {
  return client
    .from("service_requests")
    .select(
      "id,provider_id,requester_user_id,provider_user_id,category,description,when_text,status,region,created_at,updated_at,conversation_id,provider_profiles(display_name)",
    )
    .or(`requester_user_id.eq.${userId},provider_user_id.eq.${userId}`)
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
