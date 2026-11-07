import { expect, it } from "vitest"
import {
  type AvisoDoBanco,
  destinoDoAviso,
  rotuloDoAviso,
} from "web/lib/notifications/destino-do-app"

const base: AvisoDoBanco = {
  id: "notice",
  tipo: "verification_decision",
  acao: "approved",
  alvoTipo: "user",
  alvoId: "member",
  atorId: null,
  lida: false,
  criadaEm: "2026-11-07T00:00:00Z",
}
it("aprovação e recusa levam à entrada com mensagem própria", () => {
  expect(rotuloDoAviso(base)).toContain("aprovada")
  expect(rotuloDoAviso({ ...base, acao: "rejected" })).toContain("não foi aprovado")
  expect(destinoDoAviso(base)).toBe("/app/entrar/analise")
})

it("aviso ao autor informa decisão sem levar a uma denúncia privada", () => {
  const notice = { ...base, tipo: "moderation_decision", acao: "hide" }
  expect(rotuloDoAviso(notice)).toBe(
    "A moderação analisou um conteúdo seu. O conteúdo foi ocultado.",
  )
  expect(destinoDoAviso(notice)).toBe("/app/voce")
})
