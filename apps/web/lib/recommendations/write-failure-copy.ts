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
//
// F1 da auditoria de produção (rodada seguinte): a MESMA classe continuava
// aberta no formulário "Pedir indicação" de (shell)/recommendations/page.tsx —
// o verificador independente viu `column "x_interno_auditoria" does not exist`
// dentro do alerta de perigo, e o texto digitado sobrevivia à falha sem que
// causa nenhuma fosse registrada.
//
// Este arquivo é o ÚNICO lugar da frase de falha do fluxo de indicações, para
// escrita e para leitura. Ele nasceu como `write-failure-copy` porque a primeira
// rodada tratou só das escritas; a varredura da rota mostrou que o mesmo defeito
// vivia nas cargas (Explorar, Salvas, Guia, Pedidos). Criar um segundo módulo
// para as leituras seria inventar um segundo padrão para o mesmo problema — o
// que muda entre os dois é só o nome do evento no log.

import { log } from "../logger"

export const WRITE_FAILURE_COPY = {
  // DESIGN_SYSTEM §2.2 dá este caso como exemplo da voz "Diretos": a frase diz o
  // que falhou E a consequência (o texto digitado não se perde), antes de pedir
  // a retomada. "Tente novamente." fecha a frase porque nenhuma escrita deste
  // fluxo pode ficar sem próximo passo declarado.
  publicar_pedido:
    "Não foi possível publicar seu pedido. Seu texto continua aqui. Tente novamente.",
  responder_pedido: "Não foi possível enviar sua resposta. Tente novamente.",
  salvar_pedido: "Não foi possível salvar este pedido na sua lista. Tente novamente.",
  remover_pedido_salvo: "Não foi possível remover este pedido da sua lista. Tente novamente.",
  excluir_resposta: "Não foi possível excluir a resposta. Tente novamente.",
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
 * Cargas da rota de indicações. Mesmo contrato de `writeFailure`, com o evento
 * `recommendation_read_failed` no log — quem depura precisa distinguir "não
 * consegui ler" de "não consegui gravar" sem abrir o código.
 *
 * As frases que já existiam na tela entraram byte a byte iguais: trocar o texto
 * de um erro que já era de produto não faz parte de fechar o vazamento.
 */
export const READ_FAILURE_COPY = {
  // ErrorState já desenha o botão "Tentar novamente" — repetir no texto seria
  // pedir duas vezes a mesma ação.
  carregar_pedidos: "Não foi possível carregar os pedidos de indicação.",
  carregar_respostas_e_salvos: "Não foi possível carregar respostas e salvos.",
} as const

export type ReadOperation = keyof typeof READ_FAILURE_COPY

/**
 * Frase de produto da carga que falhou + registro da causa real no log.
 *
 * `serverMessage` nunca é retornado, só registrado. O nome do campo é o mesmo de
 * `writeFailure` e pelo mesmo motivo: `raw_message` está na lista de campos que
 * o logger troca por [REDACTED] (apps/web/lib/logger.ts), e usá-lo aqui apagaria
 * exatamente a causa que este caminho existe para preservar.
 */
export function readFailure(operation: ReadOperation, serverMessage: string): string {
  log.error("recommendation_read_failed", { operation, serverMessage })
  return READ_FAILURE_COPY[operation]
}
