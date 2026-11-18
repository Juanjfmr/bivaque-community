import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  canResolveRequest,
  replyResolution,
} from "../../../apps/web/lib/recommendations/resolution"

// RECON-035 + lote 5 (ADR-20261023, seção 2) — a resposta que resolveu e a
// resolução sem resposta. Desde 25/09/2026 a conversa do pedido é a tela de
// detalhe das indicações (ADR-20260925-memoria-de-indicacoes); o rótulo da marca
// continua "Ajudou a resolver", e os rótulos do estado passaram a ser "Resolvida"
// (com resposta marcada) e "Resolvida por quem perguntou" (sem resposta).

const root = join(import.meta.dirname, "..", "..", "..")
const indicationsLib = join(root, "apps", "web", "lib", "indications", "indications.ts")

describe("resolution marker (RECON-035)", () => {
  it("marks only the reply the asker chose", () => {
    const view = { is_resolved: true, resolved_reply_id: "reply-a" }
    expect(replyResolution(view, "reply-a")).toBe("marked")
    expect(replyResolution(view, "reply-b")).toBe("resolved_without_reply")
  })

  it("reports an open request with no mark as open", () => {
    expect(replyResolution({ is_resolved: false, resolved_reply_id: null }, "reply-a")).toBe("open")
  })

  it("um ponteiro sem a pergunta resolvida NAO e a resposta que resolveu", () => {
    // O estado impossivel {is_resolved: false, resolved_reply_id: "reply-a"}
    // (achado 3 da revisao de 23/10/2026) nao pode aparecer como marcado.
    expect(replyResolution({ is_resolved: false, resolved_reply_id: "reply-a" }, "reply-a")).toBe(
      "open",
    )
  })

  it("reports resolved-without-a-mark separately", () => {
    expect(replyResolution({ is_resolved: true, resolved_reply_id: null }, "reply-a")).toBe(
      "resolved_without_reply",
    )
  })

  it("reserves resolution control for the request author", () => {
    expect(canResolveRequest({ author_id: "member-one" }, "member-one")).toBe(true)
    expect(canResolveRequest({ author_id: "member-one" }, "member-two")).toBe(false)
  })

  it("mantem os rotulos", () => {
    const lib = readFileSync(indicationsLib, "utf8")
    expect(lib).toContain("Resolvida por quem perguntou")
    expect(lib).toContain('return "Resolvida"')
  })
})
