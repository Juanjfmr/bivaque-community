import {
  formatNotificationLabel,
  type NotificationRow,
} from "../../app/(shell)/notifications/deep-links"

/**
 * O aviso do banco e o seu destino dentro do app (F09).
 *
 * A frase continua sendo a da web antiga (`formatNotificationLabel`): uma regra
 * só, duas portas. O que muda é o destino — a caixa antiga navegava para
 * `/community`, `/groups`, `/events`; dentro do app o endereço é `/app/...`.
 *
 * Regra da casa, herdada de `deep-links.ts`: só se navega para rota que existe.
 * Tipo sem jornada no app (denúncia analisada, admissão recusada, convite de
 * família) cai na tela segura mais próxima — Você —, nunca em 404.
 */

export type AvisoDoBanco = Readonly<{
  id: string
  tipo: string
  acao: string
  alvoTipo: string
  alvoId: string
  atorId: string | null
  lida: boolean
  criadaEm: string
}>

/** A forma que a frase da web antiga espera. */
function comoLinhaDaWeb(aviso: AvisoDoBanco): NotificationRow {
  return {
    id: aviso.id,
    recipient_user_id: "",
    actor_user_id: aviso.atorId,
    type: aviso.tipo,
    action: aviso.acao,
    target_type: aviso.alvoTipo,
    target_id: aviso.alvoId,
    read_at: aviso.lida ? aviso.criadaEm : null,
    created_at: aviso.criadaEm,
  }
}

export function rotuloDoAviso(aviso: AvisoDoBanco): string {
  return formatNotificationLabel(comoLinhaDaWeb(aviso))
}

/** Tela segura quando o tipo não tem jornada no app. */
export const DESTINO_SEGURO = "/app/voce"

export function destinoDoAviso(aviso: AvisoDoBanco): string {
  // Os quatro avisos de pedido de indicação usam o mesmo tipo; o resumo do dia
  // aponta para a lista da cidade, não para um pedido.
  if (aviso.tipo === "recommendation_request" && aviso.acao === "digest") {
    return "/app/comunidade"
  }

  switch (aviso.alvoTipo) {
    case "post":
      return `/app/publicacao/${aviso.alvoId}`
    case "group":
      return `/app/grupo/${aviso.alvoId}`
    case "event":
      return `/app/evento/${aviso.alvoId}`
    case "conversation":
      return `/app/conversa/${aviso.alvoId}`
    case "recommendation_request":
      return `/app/pergunta/${aviso.alvoId}`
    case "service_request":
      return `/app/pedido/${aviso.alvoId}`
    // A resposta do suporte tem jornada: os chamados da pessoa.
    case "support_ticket":
      return "/app/chamados"
    case "listing":
      return `/app/anuncio/${aviso.alvoId}`
    default:
      return DESTINO_SEGURO
  }
}
