import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  type AvisoDoBanco,
  DESTINO_SEGURO,
  destinoDoAviso,
  rotuloDoAviso,
} from "web/lib/notifications/destino-do-app"
import { destinoEmRota } from "../../../apps/app/lib/dados/avisos"

/**
 * RUN-027: todo valor do enum `public.notification_type` que o banco grava tem
 * rótulo próprio (nunca "nova notificação") e destino que o app aceita —
 * `destinoEmRota` ou a tela segura. O enum é lido das migrations: um valor
 * novo sem fixture aqui quebra o gate, não a caixa da pessoa.
 */

const DIRETORIO = fileURLToPath(new URL("../../../supabase/migrations/", import.meta.url))

function tiposDoEnum(): string[] {
  const valores: string[] = []
  for (const arquivo of readdirSync(DIRETORIO).filter((nome) => nome.endsWith(".sql")).sort()) {
    const texto = readFileSync(`${DIRETORIO}${arquivo}`, "utf8")
    const criado = /create\s+type\s+public\.notification_type\s+as\s+enum\s*\(([\s\S]*?)\);/.exec(
      texto,
    )
    if (criado?.[1] !== undefined) {
      for (const m of criado[1].matchAll(/'([^']+)'/g)) valores.push(m[1])
    }
    for (const m of texto.matchAll(
      /alter\s+type\s+public\.notification_type\s+add\s+value\s+(?:if\s+not\s+exists\s+)?'([^']+)'/g,
    ))
      valores.push(m[1])
  }
  return [...new Set(valores)]
}

const ALVO = "90000000-0000-4000-8000-000000000001"

/** A linha como cada trigger/RPC do banco escreve em `public.notifications`. */
const FIXURAS: Readonly<Record<string, Readonly<{ acao: string; alvoTipo: string }>>> = {
  comment: { acao: "created", alvoTipo: "post" },
  group_admission: { acao: "approved", alvoTipo: "group" },
  group_post: { acao: "created", alvoTipo: "group" },
  invitation_accepted: { acao: "accepted", alvoTipo: "family_invitation" },
  event_rsvp: { acao: "rsvped", alvoTipo: "event" },
  event_change: { acao: "changed", alvoTipo: "event" },
  event_reminder: { acao: "upcoming", alvoTipo: "event" },
  direct_message: { acao: "created", alvoTipo: "conversation" },
  recommendation_reply: { acao: "replied", alvoTipo: "recommendation_request" },
  recommendation_request: { acao: "created", alvoTipo: "recommendation_request" },
  service_request: { acao: "cancelled", alvoTipo: "service_request" },
  listing_alert: { acao: "created", alvoTipo: "listing" },
  report_resolved: { acao: "resolved", alvoTipo: "report" },
  admission_rejected: { acao: "rejected", alvoTipo: "user" },
  support_answered: { acao: "answered", alvoTipo: "support_ticket" },
  verification_decision: { acao: "approved", alvoTipo: "user" },
  moderation_decision: { acao: "hide", alvoTipo: "user" },
  account_suspension: { acao: "applied", alvoTipo: "user" },
}

function aviso(tipo: string): AvisoDoBanco {
  const fixura = FIXURAS[tipo]
  expect(fixura, `novo tipo ${tipo} sem fixture neste teste`).toBeDefined()
  return {
    id: "notice",
    tipo,
    acao: fixura?.acao ?? "created",
    alvoTipo: fixura?.alvoTipo ?? "desconhecido",
    alvoId: ALVO,
    atorId: null,
    lida: false,
    criadaEm: "2026-11-07T00:00:00.000Z",
  }
}

describe("todo tipo de aviso do banco tem rótulo e destino no app (RUN-027)", () => {
  const tipos = tiposDoEnum()

  it("percorre o enum inteiro — nenhum tipo ficou de fora da lista", () => {
    expect(tipos.length).toBeGreaterThanOrEqual(18)
    expect(tipos).toContain("invitation_accepted")
    expect(tipos).toContain("report_resolved")
    expect(tipos).toContain("admission_rejected")
  })

  it.each(tipos)("%s tem rótulo próprio", (tipo) => {
    const rotulo = rotuloDoAviso(aviso(tipo))
    expect(rotulo.length, tipo).toBeGreaterThan(0)
    expect(rotulo, tipo).not.toBe("nova notificação")
  })

  it.each(tipos)("%s tem destino que o app aceita", (tipo) => {
    const destino = destinoDoAviso(aviso(tipo))
    const aceito = destino === DESTINO_SEGURO || destinoEmRota(destino) !== null
    expect(aceito, `${tipo} → ${destino}`).toBe(true)
  })
})

describe("os três destinos da RUN-027", () => {
  it("convite de família aceito abre Você: o app não tem jornada de família", () => {
    const convite = aviso("invitation_accepted")
    expect(destinoDoAviso(convite)).toBe(DESTINO_SEGURO)
    expect(rotuloDoAviso(convite)).toContain("convite de família")
  })

  it("entrada recusada tem rótulo próprio e abre a situação da entrada", () => {
    const recusa = aviso("admission_rejected")
    expect(rotuloDoAviso(recusa)).toContain("não foi liberada")
    expect(destinoDoAviso(recusa)).toBe("/app/entrar/analise")
    expect(destinoEmRota(destinoDoAviso(recusa))).toEqual({
      nome: "entrar",
      parametros: { estado: "analise" },
    })
  })

  it("denúncia analisada abre o conteúdo denunciado quando o alvo é conhecido", () => {
    const denuncia = aviso("report_resolved")
    expect(rotuloDoAviso(denuncia)).toContain("denúncia foi analisada")
    expect(destinoDoAviso(denuncia)).toBe(DESTINO_SEGURO)
    expect(destinoDoAviso(denuncia, { alvoTipo: "post", alvoId: ALVO })).toBe(
      `/app/publicacao/${ALVO}`,
    )
    expect(destinoDoAviso(denuncia, { alvoTipo: "group", alvoId: ALVO })).toBe(
      `/app/grupo/${ALVO}`,
    )
    expect(destinoDoAviso(denuncia, { alvoTipo: "recommendation_request", alvoId: ALVO })).toBe(
      `/app/pergunta/${ALVO}`,
    )
    // Alvo sem tela correspondente no app (mensagem, comentário, prestador):
    // tela segura, nunca endereço inventado.
    for (const alvoTipo of ["message", "comment", "provider_profile", "recommendation_reply"]) {
      expect(destinoDoAviso(denuncia, { alvoTipo, alvoId: ALVO }), alvoTipo).toBe(DESTINO_SEGURO)
    }
  })

  it("a frase da denúncia não nomeia ninguém", () => {
    const denuncia = { ...aviso("report_resolved"), atorId: ALVO }
    expect(rotuloDoAviso(denuncia)).toBe("Sua denúncia foi analisada")
    expect(destinoDoAviso(denuncia)).not.toContain("ator")
  })
})
