import { destinoDoAviso } from "../notifications/destino-do-app"

/**
 * O texto da notificação na tela bloqueada (ADR-20261107, item 4).
 *
 * Título fixo "Bivaque" e uma frase fixa por tipo de aviso. Nada de nome, foto,
 * trecho de conteúdo ou qualquer dado de outra pessoa: a tela bloqueada é
 * visível para quem estiver perto do aparelho. O detalhe só existe dentro do
 * app, depois de entrar.
 *
 * O destino é o mesmo deep link do F09 (`destinoDoAviso`): uma regra só para o
 * toque no app e para o toque na notificação. Tipo sem jornada cai na tela
 * segura.
 */

export const TITULO_DO_PUSH = "Bivaque"

export type ConteudoDoPush = Readonly<{
  title: string
  body: string
  destino: string
}>

function frasePorTipo(tipo: string, acao: string): string {
  switch (tipo) {
    case "comment":
      return "Responderam a sua publicação."
    case "group_post":
      return "Alguém publicou no seu grupo."
    case "direct_message":
      return "Você recebeu uma mensagem."
    case "event_rsvp":
      return "Alguém respondeu ao seu encontro."
    case "event_change":
      return "Um encontro que você acompanha mudou."
    case "event_reminder":
      return "Um encontro que você confirmou acontece em breve."
    case "recommendation_request":
      return acao === "digest"
        ? "Há pedidos de indicação esperando resposta."
        : "Alguém pediu uma indicação."
    case "recommendation_reply":
      return "Responderam a sua pergunta."
    case "service_request":
      return "Você tem uma novidade em um pedido."
    case "support_answered":
      return "A equipe respondeu o seu chamado."
    case "report_resolved":
      return "Sua denúncia foi analisada."
    case "moderation_decision":
      return "A moderação analisou um conteúdo seu."
    case "verification_decision":
      return "Sua verificação foi analisada."
    case "account_suspension":
      return "Sua conta mudou de situação."
    case "group_admission":
      return "Sua entrada no grupo foi aprovada."
    case "invitation_accepted":
      return "Um convite foi aceito."
    case "product_news":
      return "Novidades do Bivaque."
    case "listing_alert":
      return "Um anúncio que você acompanha mudou."
    default:
      return "Você tem uma atualização no Bivaque."
  }
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : ""
}

/**
 * Monta o corpo enviado ao provedor. Lê só referências do aviso — tipo, ação e
 * alvo — e nunca o ator, o nome ou o conteúdo. É este objeto que o teste de
 * privacidade inspeciona.
 */
export function conteudoDoPush(
  tipo: string,
  payload: Readonly<Record<string, unknown>>,
): ConteudoDoPush {
  const destino = destinoDoAviso({
    id: "",
    tipo,
    acao: texto(payload["action"]),
    alvoTipo: texto(payload["target_type"]),
    alvoId: texto(payload["target_id"]),
    atorId: null,
    lida: false,
    criadaEm: "",
  })

  return {
    title: TITULO_DO_PUSH,
    body: frasePorTipo(tipo, texto(payload["action"])),
    destino,
  }
}
