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
const detailPath = join(
  root,
  "apps",
  "web",
  "app",
  "components",
  "indications",
  "indication-detail.tsx",
)
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

  it("reports resolved-without-a-mark separately", () => {
    expect(replyResolution({ is_resolved: true, resolved_reply_id: null }, "reply-a")).toBe(
      "resolved_without_reply",
    )
  })

  it("reserves resolution control for the request author", () => {
    expect(canResolveRequest({ author_id: "member-one" }, "member-one")).toBe(true)
    expect(canResolveRequest({ author_id: "member-one" }, "member-two")).toBe(false)
  })

  it("writes through the server RPCs, never a direct table update", () => {
    const source = readFileSync(detailPath, "utf8")
    expect(source).toContain("mark_recommendation_reply_resolved")
    expect(source).toContain("mark_recommendation_resolved")
    expect(source).toContain("reopen_recommendation")
    expect(source).toContain("callResolutionRpc")
    expect(source).not.toMatch(/\.update\(\s*\{[^}]*resolved_reply_id/)
  })

  it("reads the marker and uses the owner's labels", () => {
    const source = readFileSync(detailPath, "utf8")
    expect(source).toContain("resolved_reply_id")
    expect(source).toContain("Ajudou a resolver")
    expect(source).toContain("resolutionLabel")
    const lib = readFileSync(indicationsLib, "utf8")
    expect(lib).toContain("Resolvida por quem perguntou")
    expect(lib).toContain('return "Resolvida"')
  })

  it("gates every resolution control behind isAuthor", () => {
    const source = readFileSync(detailPath, "utf8")
    // A fileira de ações da resposta só existe para quem perguntou; dentro
    // dela, marcar e reabrir se excluem.
    expect(source).toContain("{isAuthor ? (")
    expect(source).toContain("{!marked ? (")
    expect(source).toContain("{marked ? (")
    expect(source).toContain("isAuthor && request.is_resolved")
  })
})
