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
 * Cada tipo do enum `public.notification_type` tem aqui um destino aceito por
 * `apps/app/lib/dados/avisos.ts:destinoEmRota` ou a tela segura — nunca 404,
 * nunca endereço montado com dado não validado (RUN-027).
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
  if (aviso.tipo === "account_suspension")
    return aviso.acao === "applied"
      ? "Sua conta está suspensa para novas ações. Procure a Ajuda para recorrer."
      : "Sua suspensão foi encerrada. Você pode voltar a participar."
  if (aviso.tipo === "moderation_decision") {
    const decisao =
      aviso.acao === "dismiss" ? "mantido" : aviso.acao === "hide" ? "ocultado" : "removido"
    return `A moderação analisou um conteúdo seu. O conteúdo foi ${decisao}.`
  }
  if (aviso.tipo === "verification_decision")
    return aviso.acao === "approved"
      ? "Sua verificação foi aprovada. Continue a entrada no Bivaque."
      : "Seu documento não foi aprovado. Consulte a situação da sua entrada."
  // Tipos que `formatNotificationLabel` não conhece: o app não devolve
  // "nova notificação" para um aviso que tem frase própria.
  if (aviso.tipo === "support_answered") return "Respondemos o seu chamado"
  if (aviso.tipo === "listing_alert") return "Um anúncio novo bate com o que você procura"
  return formatNotificationLabel(comoLinhaDaWeb(aviso))
}

/**
 * Alvo da denúncia que o app abre (linha `reports` do próprio denunciante,
 * conferida por `alvos-visiveis.ts`: só entra se a tela que o abre ainda o lê).
 */
export type AlvoDaDenuncia = Readonly<{ alvoTipo: string; alvoId: string }>

/**
 * Tipos de alvo de denúncia que têm tela no app e cuja visibilidade a rota
 * confere antes de abrir. Os demais (comentário, mensagem) vão para a tela segura.
 */
export const ALVOS_DE_DENUNCIA_ABERTOS: ReadonlySet<string> = new Set([
  "post",
  "group",
  "recommendation_request",
])

/** Tela segura quando o tipo não tem jornada no app. */
export const DESTINO_SEGURO = "/app/voce"

function destinoPorAlvo(alvoTipo: string, alvoId: string): string {
  switch (alvoTipo) {
    case "post":
      return `/app/publicacao/${alvoId}`
    case "group":
      return `/app/grupo/${alvoId}`
    case "event":
      return `/app/evento/${alvoId}`
    case "conversation":
      return `/app/conversa/${alvoId}`
    case "recommendation_request":
      return `/app/pergunta/${alvoId}`
    case "service_request":
      return `/app/pedido/${alvoId}`
    // A resposta do suporte tem jornada: os chamados da pessoa.
    case "support_ticket":
      return "/app/chamados"
    case "listing":
      return `/app/anuncio/${alvoId}`
    default:
      return DESTINO_SEGURO
  }
}

/**
 * `alvoDaDenuncia` é só o alvo que a leitura confirmou visível (ou `null`). Quem
 * chama não passa alvo apagado: a tela segura é o que sobra quando não há o que abrir.
 */
export function destinoDoAviso(
  aviso: AvisoDoBanco,
  alvoDaDenuncia: AlvoDaDenuncia | null = null,
): string {
  // A situação da entrada é a mesma tela para o documento aprovado/negado e
  // para a recusa da entrada (RUN-027; antes, a recusa caía em Você).
  if (aviso.tipo === "verification_decision" || aviso.tipo === "admission_rejected") {
    return "/app/entrar/analise"
  }
  // Os quatro avisos de pedido de indicação usam o mesmo tipo; o resumo do dia
  // aponta para a lista da cidade, não para um pedido.
  if (aviso.tipo === "recommendation_request" && aviso.acao === "digest") {
    return "/app/comunidade"
  }
  // O convite de família aceito: o app não tem jornada própria de família —
  // ela vive na tela Você. Decisão RUN-027, registrada no relatório.
  if (aviso.tipo === "invitation_accepted") return DESTINO_SEGURO
  // A denúncia aponta para a linha do report, que não é tela no app. Abre o
  // conteúdo denunciado só se ele ainda é lido (conferido na rota); apagado,
  // oculto, sem alvo ou tipo sem tela endereçável, a tela segura. A frase é
  // impessoal: nada aqui revela quem denunciou nem a ação tomada.
  if (aviso.tipo === "report_resolved") {
    return alvoDaDenuncia !== null && ALVOS_DE_DENUNCIA_ABERTOS.has(alvoDaDenuncia.alvoTipo)
      ? destinoPorAlvo(alvoDaDenuncia.alvoTipo, alvoDaDenuncia.alvoId)
      : DESTINO_SEGURO
  }
  return destinoPorAlvo(aviso.alvoTipo, aviso.alvoId)
}
