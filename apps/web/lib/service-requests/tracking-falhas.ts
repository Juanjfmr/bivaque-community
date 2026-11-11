// PEDIDO-MENSAGEM-ERRO-CRU — a recusa do banco no acompanhamento do pedido,
// traduzida para a pessoa.
//
// O RPC levanta mensagens técnicas em inglês (`blocked`, `not a participant`,
// `message required`). Elas nunca vão para a tela: cada código conhecido tem a
// sua frase com uma saída real, e o detalhe fica só no log. É o mesmo desenho de
// `serviceRequestFailure` (request-form.ts), aplicado às três RPCs do detalhe.

/** O objeto do erro do PostgREST, reduzido ao que a tradução precisa ver. */
export type FalhaDoPedido = Readonly<{ code?: string; message?: string }>

/** A frase para a tela; `null` quando não é sessão — quem chama usa a frase. */
export type FalhaTraduzida = Readonly<{ frase: string; sessao: boolean }>

const SESSAO = "Sua sessão expirou. Entre de novo para continuar."

const PEDIDO_INDISPONIVEL =
  "Este pedido não está disponível para você — pode ter sido encerrado ou removido."

const SEM_PARTICIPACAO =
  "Você não participa deste pedido. Volte aos seus pedidos para escolher outro."

const CONVERSA_INDISPONIVEL =
  "Esta conversa não está disponível. Volte aos seus pedidos e abra o pedido de novo."

const BLOQUEADO = "Não é possível enviar: uma das pessoas bloqueou essa conversa."

const CONTA_INDISPONIVEL = "Não é possível continuar: uma das contas não está disponível agora."

const PEDIDO_ENCERRADO = "Este pedido já foi encerrado e não pode mais ser alterado."

const SEGURANCA = "Mensagem bloqueada: não compartilhe dados pessoais."

const DADOS_INVALIDOS = "Revise o texto: ele precisa ter entre 1 e 2.000 caracteres."

const DESCRICAO_INVALIDA = "Revise a descrição e o prazo do serviço."

const INDISPONIVEL = "Não foi possível confirmar agora. Seu texto continua aqui — tente de novo."

function falha(frase: string, sessao = false): FalhaTraduzida {
  return { frase, sessao }
}

/** A frase procura o marcador em qualquer ponto: o PostgREST pode prefixar. */
function contem(mensagem: string, ...marcadores: readonly string[]): boolean {
  return marcadores.some((marcador) => mensagem.includes(marcador))
}

/**
 * A recusa da RPC `send_conversation_message` (migration
 * 20260915101543_account_deletion.sql:391-438).
 */
export function falhaAoEnviarMensagem(falhou: FalhaDoPedido): FalhaTraduzida {
  const mensagem = falhou.message ?? ""
  if (contem(mensagem, "unauthenticated")) return falha(SESSAO, true)
  if (contem(mensagem, "blocked")) return falha(BLOQUEADO)
  if (contem(mensagem, "pii")) return falha(SEGURANCA)
  if (contem(mensagem, "account unavailable", "recipient unavailable"))
    return falha(CONTA_INDISPONIVEL)
  if (contem(mensagem, "conversation not found")) return falha(CONVERSA_INDISPONIVEL)
  if (contem(mensagem, "not a participant")) return falha(SEM_PARTICIPACAO)
  if (contem(mensagem, "message required", "message too long")) return falha(DADOS_INVALIDOS)
  return falha(INDISPONIVEL)
}

/**
 * A recusa da RPC `close_service_request`
 * (20260911105119_service_request_tracking.sql:230-268).
 */
export function falhaAoEncerrarPedido(falhou: FalhaDoPedido): FalhaTraduzida {
  const mensagem = falhou.message ?? ""
  if (contem(mensagem, "unauthenticated")) return falha(SESSAO, true)
  if (contem(mensagem, "request not found")) return falha(PEDIDO_INDISPONIVEL)
  if (contem(mensagem, "not a participant")) return falha(SEM_PARTICIPACAO)
  return falha("Não foi possível encerrar o pedido agora. Tente de novo em instantes.")
}

/**
 * A recusa da RPC `update_service_request`
 * (20260911105119_service_request_tracking.sql:275-329).
 */
export function falhaAoEditarPedido(falhou: FalhaDoPedido): FalhaTraduzida {
  const mensagem = falhou.message ?? ""
  if (contem(mensagem, "unauthenticated")) return falha(SESSAO, true)
  if (contem(mensagem, "request not found")) return falha(PEDIDO_INDISPONIVEL)
  if (contem(mensagem, "only the requester can edit")) return falha(SEM_PARTICIPACAO)
  if (contem(mensagem, "request not editable")) return falha(PEDIDO_ENCERRADO)
  if (contem(mensagem, "description required", "description too long", "when too long"))
    return falha(DESCRICAO_INVALIDA)
  return falha(INDISPONIVEL)
}
