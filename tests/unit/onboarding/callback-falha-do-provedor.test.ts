import { describe, expect, it } from "vitest"
import { callbackFailureTarget } from "web/app/auth/callback/redirect-plan"

// RUN-004: a falha do Google/Apple não pode terminar no callback-error da web
// quando o fluxo começou na porta do app. A pessoa volta para `/app/entrar` com
// um marcador fixo, e a tela mostra a mensagem sem detalhe técnico.

describe("destino da falha do callback", () => {
  it("qualquer destino do app volta para a porta com o marcador", () => {
    expect(callbackFailureTarget("/app/entrar")).toBe("/app/entrar?erro=provedor")
    expect(callbackFailureTarget("/app/inicio?x=1")).toBe("/app/entrar?erro=provedor")
    expect(callbackFailureTarget("/app/comunidade")).toBe("/app/entrar?erro=provedor")
    expect(callbackFailureTarget("/app")).toBe("/app/entrar?erro=provedor")
  })

  it("confirmação de e-mail continua no painel expirado", () => {
    expect(callbackFailureTarget("/auth/confirmar-email")).toBe(
      "/auth/confirmar-email?estado=expirado",
    )
  })

  it("o resto continua no callback-error, sem detalhe sensível", () => {
    expect(callbackFailureTarget("/onboarding")).toBe("/auth/callback-error")
    expect(callbackFailureTarget("/")).toBe("/auth/callback-error")
  })
})
