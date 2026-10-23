import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { InviteForm } from "web/app/(preauth)/convite/invite-form"
import { ACCOUNT_STEP_FIELDS, CODE_STEP_FIELDS, stageError } from "web/lib/convite/form-error"

vi.mock("web/app/(preauth)/convite/actions", () => ({
  previewInviteAction: vi.fn(),
  acceptInviteAction: vi.fn(),
}))

// PORT-006 (lote 4 da entrada) — onde a falha aparece na tela do convite.
//
// O P2 da revisão: na etapa da conta, um erro com `field: "code"` não era
// renderizado por campo nenhum — `code` só existe na etapa anterior — e a
// pessoa tentava de novo sem saber o motivo. Agora todo erro sem campo visível
// na etapa cai na área de erro dela (`EntryError`, role="alert").
//
// A decisão vive numa função pura, testada aqui com as listas que o próprio
// componente usa; o markup abaixo prova que a área de erro existe e é a mesma
// nos dois estados.

describe("erro na etapa certa", () => {
  it("na etapa do código, o erro do campo fica no campo", () => {
    expect(stageError("Código inválido.", "code", CODE_STEP_FIELDS)).toBeNull()
  })

  it("na etapa da conta, um erro de `code` aparece na área da etapa", () => {
    // É exatamente o caso do P2: a conta falhou ao aceitar o convite e o campo
    // do código não está mais na tela.
    expect(stageError("Sua conta foi criada, mas o convite...", "code", ACCOUNT_STEP_FIELDS)).toBe(
      "Sua conta foi criada, mas o convite...",
    )
  })

  it("na etapa da conta, os erros dos campos dela ficam nos campos", () => {
    for (const field of ACCOUNT_STEP_FIELDS) {
      expect(stageError("mensagem", field, ACCOUNT_STEP_FIELDS)).toBeNull()
    }
  })

  it("erro sem campo, ou de campo desconhecido, nunca some", () => {
    expect(stageError("falha inesperada", null, ACCOUNT_STEP_FIELDS)).toBe("falha inesperada")
    expect(stageError("falha inesperada", "consent", CODE_STEP_FIELDS)).toBe("falha inesperada")
  })

  it("sem erro, a área fica vazia", () => {
    expect(stageError(null, null, ACCOUNT_STEP_FIELDS)).toBeNull()
  })
})

describe("markup do formulário", () => {
  it("a área de erro existe já na primeira etapa, com role=alert", () => {
    const html = renderToStaticMarkup(createElement(InviteForm, { initialCode: "" }))

    expect(html).toContain('class="en-err"')
    expect(html).toContain('role="alert"')
    expect(html).toContain("Entre pelo convite.")
  })
})
