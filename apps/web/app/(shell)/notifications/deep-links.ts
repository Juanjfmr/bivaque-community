// RECON-006 (prancha 54-web-retorno): classificação e destino de cada
// notificação. Os três deep-links quebrados do inventário §6 vivem aqui:
//
//   - invitation_accepted apontava para /profile?user={actor}, parâmetro que
//     /profile não lê; o perfil de terceiro real é /profile/[userId].
//   - report_resolved caía no default e não navegava, apesar de ter rótulo.
//   - admission_rejected não existia em nenhuma função: virava "nova
//     notificação" genérica e sem destino.
//
// Regra da casa: só se navega para rota que existe. Sem destino resolvível
// (ator apagado, denúncia sem alvo legível), a linha marca como lida e não
// navega — nunca se inventa um href.

export type NotificationRow = {
  id: string
  recipient_user_id: string
  actor_user_id: string | null
  type: string
  action: string
  target_type: string
  target_id: string
  read_at: string | null
  created_at: string
}

// Alvo da denúncia, lido da tabela `reports` (RLS reports_select_reporter_only,
// 20260802001600_reports.sql:124). A notificação report_resolved aponta para a
// LINHA DO REPORT, não para o conteúdo — o destino contextual só existe depois
// desta consulta.
export type ReportTarget = {
  target_type: string
  target_id: string
}

// Tipos cujo ator é um membro comum: o nome dele pode aparecer na linha.
// report_resolved e admission_rejected ficam de fora de propósito — o ator é o
// operador da moderação, e a identidade de quem modera não vaza para quem
// denunciou ou foi recusado (runbook §6). event_reminder também: é lembrete do
// sistema, não mensagem de uma pessoa. service_request idem: a notificação diz
// que o pedido foi encerrado porque a outra parte saiu, e nomear quem saiu
// revelaria a exclusão — por isso o ator é nulo no banco e o tipo fica fora
// daqui de propósito. Não "consertar" adicionando o case.
export const SERVICE_REQUEST_FIRST_REPLY = "provider_first_reply"

/**
 * A frase do aviso de primeira resposta quando o nome da ficha do prestador é
 * conhecido. O ator no banco é nulo (o prestador não tem perfil de membro), então
 * o nome vem da ficha, lido pelo pedido; sem ele, vale o rótulo neutro.
 */
export function serviceRequestReplyLabel(providerName: string | null): string {
  const name = providerName?.trim()
  return name ? `${name} respondeu seu pedido` : "Seu pedido recebeu uma resposta"
}

export function rendersWithActor(notification: NotificationRow): boolean {
  switch (notification.type) {
    case "comment":
    case "group_admission":
    case "invitation_accepted":
    case "event_rsvp":
    case "event_change":
    case "direct_message":
    case "recommendation_reply":
      return true
    default:
      return false
  }
}

export function formatNotificationLabel(notification: NotificationRow): string {
  switch (notification.type) {
    case "comment":
      return "comentou na sua publicação"
    case "group_admission":
      return "aprovou sua entrada no grupo"
    case "invitation_accepted":
      return "aceitou seu convite de família"
    case "event_rsvp":
      return "confirmou presença no seu evento"
    case "event_change":
      return "atualizou um evento com sua presença"
    case "event_reminder":
      return "Lembrete: o encontro que você confirmou é amanhã"
    case "direct_message":
      return "enviou uma mensagem direta"
    case "recommendation_reply":
      // Two distinct actions share this type (20260821000011/12): the
      // request's own author vs. someone who saved it.
      return notification.action === "replied_to_saved"
        ? "respondeu a um pedido de indicação que você salvou"
        : "respondeu ao seu pedido de indicação"
    case "recommendation_request":
      // ADR-20260925-aviso-de-pedido: o mesmo tipo carrega quatro avisos, e a
      // action os separa. O título do pedido entra como assunto da linha.
      switch (notification.action) {
        case "unanswered":
          return "Este pedido ainda está sem resposta. Você conhece alguém?"
        case "resolve_prompt":
          return "Alguma resposta ajudou a resolver seu pedido?"
        case "digest":
          return "Há pedidos de indicação esperando resposta na sua cidade"
        default:
          return "Alguém da sua cidade pediu uma indicação"
      }
    case "report_resolved":
      // Confirma a análise, nunca o desfecho aplicado ao conteúdo (runbook §6:
      // "sem revelar a ação tomada"). Frase impessoal: o ator é o operador.
      return "Sua denúncia foi analisada"
    case "admission_rejected":
      // A recusa mostra orientação permitida, nunca motivo técnico privado
      // (spec R13). O estado completo fica em /onboarding/status.
      return "Sua participação não foi liberada"
    case "service_request":
      // ADR-20260922-aviso-da-primeira-resposta: o mesmo tipo carrega dois
      // avisos, e a action os separa. Sem esta distinção, uma resposta do
      // prestador apareceria como "pedido encerrado".
      if (notification.action === SERVICE_REQUEST_FIRST_REPLY) {
        return "Seu pedido recebeu uma resposta"
      }
      // Aviso NEUTRO: o pedido foi encerrado porque a outra parte não está mais
      // na plataforma. Não dizer que houve exclusão de conta — o motivo da saída
      // é dado pessoal de quem saiu, e contá-lo a terceiro é o que a LGPD veda.
      // A frase é impessoal de propósito: o ator é nulo (a conta não existe mais
      // como identidade navegável), e nomear quem saiu seria o mesmo vazamento
      // por outro caminho.
      return "O pedido em que você estava foi encerrado"
    default:
      return "nova notificação"
  }
}

// Destino da notificação. `reportTarget` é exigido apenas por report_resolved;
// quem chama resolve a linha do report antes (uma consulta, RLS reporter-only).
// null = nenhuma navegação é honesta para esta linha.
export function resolveNotificationHref(
  notification: NotificationRow,
  reportTarget: ReportTarget | null,
): string | null {
  switch (notification.type) {
    case "comment":
      return `/community?post=${notification.target_id}`
    case "group_admission":
      return `/groups/${notification.target_id}`
    case "invitation_accepted":
      // O perfil de terceiro é /profile/[userId]. Sem ator (linha de convite
      // órfã), não se navega para "/profile/" vazio nem para o próprio perfil.
      return notification.actor_user_id ? `/profile/${notification.actor_user_id}` : null
    case "event_rsvp":
    case "event_change":
    case "event_reminder":
      return `/events/${notification.target_id}`
    case "direct_message":
      return `/messages?conversation=${notification.target_id}`
    case "recommendation_reply":
      // O pedido tem um endereço só (ADR-20260925-memoria-de-indicacoes).
      return `/indicacoes/${notification.target_id}`
    case "recommendation_request":
      // O aviso do dia aponta para a cidade: a lista de pedidos sem resposta.
      return notification.action === "digest"
        ? "/community?vista=indicacoes"
        : `/indicacoes/${notification.target_id}`
    case "report_resolved":
      return resolveReportTargetHref(reportTarget)
    case "admission_rejected":
      // reject_pending_user (20260821000041): a pessoa vê o estado do pedido em
      // /onboarding/status — rota existente, construída na D2.
      return "/onboarding/status"
    case "service_request":
      // target_id é o pedido; /pedidos/[id] é a rota real do acompanhamento.
      return `/pedidos/${notification.target_id}`
    default:
      return null
  }
}

// Conteúdo denunciado → rota existente que o mostra. Alvos de `report_target_type`
// (20260802001600 + 20260821000031 + provider_profile da onda G).
// `comment` e `recommendation_reply` exigem um pulo extra até o pedido/post pai;
// quem chama fornece o id resolvido, ou aceita o destino de lista.
export function resolveReportTargetHref(target: ReportTarget | null): string | null {
  if (!target) return null
  switch (target.target_type) {
    case "post":
      return `/community?post=${target.target_id}`
    case "group":
      return `/groups/${target.target_id}`
    case "message":
      // A conversa específica não é endereçável a partir do id da mensagem sem
      // outra consulta; /messages é o destino real da caixa de entrada.
      return "/messages"
    case "recommendation_request":
      return `/indicacoes/${target.target_id}`
    case "provider_profile":
      return `/prestadores/${target.target_id}`
    default:
      return null
  }
}
