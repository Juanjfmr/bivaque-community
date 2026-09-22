import type { ChannelAdapter, OutboxChannel, OutboxMessage } from "@bivaque/domain"

function unavailableAdapter(channel: OutboxChannel): ChannelAdapter {
  return {
    async send() {
      return {
        ok: false,
        error: `${channel} adapter is not configured`,
      }
    },
  }
}

// --- Resend email adapter -------------------------------------------------
//
// The D1 worker only marks a row `sent` when a real provider accepted it.
// Without RESEND_API_KEY the email channel stays unavailable and rows keep
// retrying — that is the honest behaviour (no pretend provider, no silent
// drop). With the key set, every due row is rendered from its `type` and
// delivered through the Resend HTTP API. RESEND_FROM_EMAIL is the verified
// sender; without it delivery fails loudly instead of inventing a sender.

interface RenderedEmail {
  subject: string
  text: string
}

function renderEmail(message: OutboxMessage): RenderedEmail {
  const payload = message.payload
  switch (message.type) {
    case "verification_decision":
      return payload["status"] === "approved"
        ? {
            subject: "Sua verificação foi aprovada",
            text:
              "Sua verificação foi aprovada e você já faz parte da comunidade. " +
              "Acesse o Bivaque para começar.",
          }
        : {
            subject: "Sua verificação não foi aprovada",
            text:
              "Infelizmente sua verificação não foi aprovada. " +
              "Você pode entrar em contato pelo e-mail de suporte para mais informações.",
          }
    case "verification_resolved":
      return {
        subject: "Atualização sobre sua verificação",
        text:
          "Sua verificação não pôde ser concluída automaticamente. " +
          "Entre em contato pelo e-mail de suporte para mais informações.",
      }
    case "event_reminder":
      return {
        subject: `Lembrete: ${typeof payload["title"] === "string" ? payload["title"] : "evento"}`,
        text: `Não esqueça do evento ${typeof payload["title"] === "string" ? payload["title"] : "que você confirmou"} — ele acontece em breve.`,
      }
    case "recommendation_reply":
      return {
        subject: "Você recebeu uma resposta",
        text: "Sua indicação recebeu uma resposta. Acesse o Bivaque para conferir.",
      }
    case "community_invite":
      return {
        subject: "Você recebeu um convite de comunidade",
        text: "Você foi convidado para uma comunidade. Acesse o Bivaque para aceitar.",
      }
    case "family_invite":
      return {
        subject: "Você recebeu um convite",
        text: "Alguém da sua família te convidou para a comunidade. Acesse o Bivaque para aceitar.",
      }
    case "provider_invite": {
      const path =
        typeof payload["invite_path"] === "string" &&
        payload["invite_path"].startsWith("/prestador-convite/")
          ? payload["invite_path"]
          : "/"
      const configuredOrigin = process.env["NEXT_PUBLIC_SITE_URL"]?.replace(/\/$/, "")
      const vercelHost = process.env["VERCEL_URL"]?.replace(/^https?:\/\//, "").replace(/\/$/, "")
      const origin =
        configuredOrigin ?? (vercelHost ? `https://${vercelHost}` : "http://127.0.0.1:3000")
      return {
        subject: "Você recebeu um convite para oferecer seus serviços",
        text:
          "Uma comunidade do Bivaque indicou você como prestador. " +
          `Confirme seu e-mail e aceite o convite em ${origin}${path}`,
      }
    }
    case "event_invite":
      return {
        subject: "Você recebeu um convite de evento",
        text: "Você foi convidado para um evento. Acesse o Bivaque para responder.",
      }
    default:
      return {
        subject: "Atualização do Bivaque",
        text: "Você tem uma atualização na sua comunidade. Acesse o Bivaque.",
      }
  }
}

function resendAdapter(): ChannelAdapter {
  return {
    async send(message: OutboxMessage) {
      const apiKey = process.env["RESEND_API_KEY"]
      const from = process.env["RESEND_FROM_EMAIL"]
      if (!apiKey) {
        return { ok: false, error: "email adapter is not configured (RESEND_API_KEY missing)" }
      }
      if (!from) {
        return { ok: false, error: "email adapter is not configured (RESEND_FROM_EMAIL missing)" }
      }

      const rendered = renderEmail(message)
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [message.recipient],
          subject: rendered.subject,
          text: rendered.text,
        }),
      })

      if (!response.ok) {
        return { ok: false, error: `resend delivery failed (${response.status})` }
      }

      return { ok: true }
    },
  }
}

export function createChannelAdapters(): Record<OutboxChannel, ChannelAdapter> {
  // Um canal so desde 18/09/2026. O 'whatsapp' saiu junto com o valor do enum:
  // era unavailableAdapter desde sempre — declarar um canal que o adaptador
  // recusa era a ambiguidade que mantinha o card aberto.
  return {
    email: process.env["RESEND_API_KEY"] ? resendAdapter() : unavailableAdapter("email"),
  }
}
