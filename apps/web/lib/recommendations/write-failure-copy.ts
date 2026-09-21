// ITEM 9 da auditoria de produção (DS-006): o fluxo de indicações mostrava o
// texto CRU do servidor — o verificador funcional viu literalmente
// `column "x_interno" does not exist` num alerta visível. Quem lê isso não tem
// o que fazer com a informação, e o aceite pede que a falha de envio preserve a
// entrada e ofereça recuperação **em português**.
//
// Aqui cada operação de escrita tem UMA frase de produto, e a causa real
// continua existindo para quem depura: `log.error` do projeto (o mesmo caminho
// do resto do app) registra a operação e a mensagem crua do servidor. Mensagem
// genérica que engole a causa trocaria um defeito por outro.
//
// Mesmo desenho de apps/web/lib/portal/verification-copy.ts: nenhum texto de
// infraestrutura chega à UI, e o registro do motivo fica fora da tela.

import { log } from "../logger"

export const WRITE_FAILURE_COPY = {
  responder_pedido: "Não foi possível enviar sua resposta. Tente novamente.",
  salvar_pedido: "Não foi possível salvar este pedido na sua lista. Tente novamente.",
  remover_pedido_salvo: "Não foi possível remover este pedido da sua lista. Tente novamente.",
  editar_pedido: "Não foi possível salvar as alterações do pedido. Tente novamente.",
  excluir_pedido: "Não foi possível excluir o pedido. Tente novamente.",
  editar_resposta: "Não foi possível salvar as alterações da resposta. Tente novamente.",
  excluir_resposta: "Não foi possível excluir a resposta. Tente novamente.",
  resolver_pedido: "Não foi possível marcar o pedido como resolvido. Tente novamente.",
  marcar_resposta: "Não foi possível marcar a resposta como resolvida. Tente novamente.",
  limpar_marca: "Não foi possível remover a marca de resolvido. Tente novamente.",
  reabrir_pedido: "Não foi possível reabrir o pedido. Tente novamente.",
} as const

export type WriteOperation = keyof typeof WRITE_FAILURE_COPY

/**
 * Frase de produto da falha + registro da causa real no log do projeto.
 *
 * O retorno é o que vai para a tela; `serverMessage` nunca é retornado, só
 * registrado. O campo se chama `serverMessage` de propósito: o logger já redige
 * nomes sensíveis (CPF, documento, endereço) e `raw_message` está na lista de
 * campos que ele substitui por [REDACTED] — usá-lo apagaria justamente a causa
 * que este caminho existe para preservar.
 */
export function writeFailure(operation: WriteOperation, serverMessage: string): string {
  log.error("recommendation_write_failed", { operation, serverMessage })
  return WRITE_FAILURE_COPY[operation]
}

/**
 * Operação de resolução a partir da chave que a tela já usa no estado do botão
 * (`mark:<pedido>:<resposta>` | `clear:<pedido>` | `reopen:<pedido>`), para a
 * mensagem dizer qual das três ações falhou.
 */
export function resolutionOperation(actionKey: string): WriteOperation {
  if (actionKey.startsWith("mark:")) return "marcar_resposta"
  if (actionKey.startsWith("clear:")) return "limpar_marca"
  return "reabrir_pedido"
}
