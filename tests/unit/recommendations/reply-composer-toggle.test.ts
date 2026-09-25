import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// DS-006 (achado 3, prancha 80): `Responder` ABRE e FECHA a composição de UM
// pedido. Antes havia um textarea sempre visível por pedido — e um único estado
// de texto compartilhado entre todos, então digitar em um pedido apagava o
// rascunho dos outros. O rótulo de fechamento do ciclo (`Ajudou a resolver`) é
// decisão do dono no ADR-20260909 e NÃO muda aqui.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

const source = read("apps", "web", "app", "components", "bivaque", "recommendation-requests.tsx")
const e2e = read("tests", "e2e", "recommendation-reply-notify.spec.ts")

const TODAY = "$" + "{"
const REPLY_LABEL = `aria-label={\`Responder a ${TODAY}request.title}\`}`

describe("Responder abre e fecha (DS-006)", () => {
  it("o botão é um abre/fecha com estado acessível, não o submit", () => {
    expect(source).toContain("aria-expanded={openReplyId === request.id}")
    // O botão aponta para a composição daquele pedido: id={`reply-composer-<id>`}.
    expect(source).toContain("aria-controls={`reply-composer-")
    expect(source).toContain("id={`reply-composer-")
    expect(source).toContain("onPress={() => toggleReplyComposer(request.id)}")
    // Um único clique alterna: abre quando está fechado, fecha quando está aberto.
    expect(source).toContain(
      "setOpenReplyId((previous) => (previous === requestId ? null : requestId))",
    )
  })

  it("o formulário daquele pedido só existe montado quando está aberto", () => {
    const conditional = source.indexOf("{openReplyId === request.id ? (")
    const textarea = source.indexOf(REPLY_LABEL)
    expect(conditional).toBeGreaterThan(-1)
    expect(textarea).toBeGreaterThan(conditional)
    // Não há segundo textarea de resposta no arquivo.
    expect(
      source.match(new RegExp(REPLY_LABEL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")),
    ).toHaveLength(1)
  })

  it("o texto é por pedido, não um estado compartilhado", () => {
    expect(source).toContain("useState<Record<string, string>>({})")
    expect(source).toContain('value={replyDrafts[request.id] ?? ""}')
    expect(source).toContain(
      "setReplyDraft(request.id, (event.target as HTMLTextAreaElement).value)",
    )
    // O padrão antigo (um texto para todos) não volta.
    expect(source).not.toContain("const [replyText, setReplyText]")
    expect(source).not.toContain('value={replyingId === request.id ? replyText : ""}')
    expect(source).not.toMatch(/\bsetReplyText\(/)
    expect(source).not.toMatch(/\breplyText\.trim\(\)/)
  })

  it("o envio tem nome próprio e não se confunde com o abre/fecha", () => {
    expect(source).toContain('"Enviar resposta"')
    expect(source).toContain("onPress={() => handleReply(request.id)}")
    // O toggle e o envio são botões distintos; "Responder" nomeia só o toggle.
    expect(source.match(/aria-expanded=/g)).toHaveLength(1)
  })

  it("Escape fecha a composição sem publicar", () => {
    expect(source).toContain('event.key === "Escape"')
    expect(source).toContain("closeReplyComposer()")
  })

  it("o rótulo de fechamento do ADR continua intacto", () => {
    expect(source).toContain("Ajudou a resolver")
    expect(source).toContain("Resolvida pela autora")
  })

  it("o e2e de resposta acompanha a nova sequência sem perder a prova", () => {
    const open = e2e.indexOf('getByRole("button", { name: "Responder", exact: true }).click()')
    const fill = e2e.indexOf("await replyBox.fill(")
    const send = e2e.indexOf(
      'getByRole("button", { name: "Enviar resposta", exact: true }).click()',
    )
    expect(open).toBeGreaterThan(-1)
    expect(fill).toBeGreaterThan(open)
    expect(send).toBeGreaterThan(fill)
    // A prova continua sendo a mesma: a autora vê que responderam.
    expect(e2e).toContain("respondeu ao seu pedido de indicação")
    expect(e2e).toContain("Ajudou a resolver")
  })
})
