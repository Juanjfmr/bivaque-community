import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { InviteAccountStep, InviteForm } from "web/app/(preauth)/convite/invite-form"
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
// A segunda correção apontou o mesmo defeito em `consent`: o checkbox do
// Material não tem área de erro, então listá-lo entre os campos da etapa
// escondia a recusa de consentimento do mesmo jeito. A lista agora tem só os
// campos que EXIBEM o próprio erro, e o markup prova os dois lados: o que vai
// para o campo e o que vai para a área da etapa.

const PREVIEW = {
  ok: true as const,
  expiresAt: "2026-10-30T12:00:00+00:00",
  inviteeEmailHint: "ma***@ex***.invalid",
  inviterName: "Member One",
}

function accountStep(error: string | null, errorField: string | null): string {
  return renderToStaticMarkup(
    createElement(InviteAccountStep, {
      busy: false,
      draft: { consent: false, email: "", name: "", password: "" },
      error,
      errorField,
      onChange: () => undefined,
      onSubmit: () => undefined,
      preview: PREVIEW,
    }),
  )
}

// O texto que o leitor de tela anuncia: o conteúdo da linha com role="alert".
// Procurar a mensagem no HTML inteiro não distinguiria a área de erro do
// atributo `error-text` de um campo — que é exatamente a confusão que produziu
// o defeito.
function alertArea(html: string): string {
  const marker = 'role="alert">'
  const start = html.indexOf(marker)
  expect(start).toBeGreaterThan(-1)
  return html.slice(start + marker.length, html.indexOf("</p>", start))
}

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

  it("a recusa de consentimento não é escondida como se o checkbox a mostrasse", () => {
    // O checkbox não tem `error`/`error-text`: se `consent` estivesse na lista
    // dos campos da etapa, a mensagem não apareceria em lugar nenhum.
    expect(ACCOUNT_STEP_FIELDS).not.toContain("consent")
    expect(stageError("Aceite os termos.", "consent", ACCOUNT_STEP_FIELDS)).toBe(
      "Aceite os termos.",
    )
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

describe("markup da etapa da conta", () => {
  it("o erro do código, que já saiu da tela, aparece na área de erro da etapa", () => {
    const message = "Sua conta foi criada, mas o convite não pôde ser aceito agora."
    const html = accountStep(message, "code")

    expect(alertArea(html)).toBe(message)
    expect(html).not.toContain('error-text="Sua conta foi criada')
  })

  it("a recusa de consentimento aparece na área de erro da etapa", () => {
    const message =
      "Para aceitar o convite, aceite a Política de privacidade e o Código de conduta."
    const html = accountStep(message, "consent")

    expect(alertArea(html)).toBe(message)
    // O checkbox não mostra erro: nada de `error-text` com esta frase.
    expect(html).not.toContain(`error-text="${message}"`)
  })

  it("o erro genérico, sem campo, aparece na área de erro da etapa", () => {
    const message = "Não foi possível concluir o convite agora. Tente novamente."
    const html = accountStep(message, null)

    expect(alertArea(html)).toBe(message)
  })

  it("o erro de um campo da etapa fica no campo, e a área da etapa fica vazia", () => {
    // Prova negativa dos três casos acima: a área da etapa não é um lugar onde
    // todo erro cai — ela só recebe o que não tem campo para mostrar.
    const html = accountStep("Ao menos 8 caracteres, com letras e números.", "password")

    expect(alertArea(html)).toBe("")
    expect(html).toContain('error-text="Ao menos 8 caracteres, com letras e números."')
  })
})
