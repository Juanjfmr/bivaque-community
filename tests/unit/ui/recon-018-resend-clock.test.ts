import { describe, expect, it } from "vitest"
import {
  callbackFailureTarget,
  callbackSuccessTarget,
  shouldOpenRecoveryIntent,
  shouldRecordSignupConsent,
} from "web/app/auth/callback/redirect-plan"
import {
  computeResendCooldown,
  formatCountdown,
  RESEND_COOLDOWN_SECONDS,
} from "web/app/components/auth/resend-clock"

// RECON-018 — o contador de reenvio e as decisões do callback. O contrato
// exige que o limite venha do servidor e que nada prometa envio sem a
// confirmação dele; estes travam as funções puras que implementam isso.

describe("computeResendCooldown — o servidor manda", () => {
  it("usa o número do 429 do provedor, mesmo quando menor que a janela padrão", () => {
    const seconds = computeResendCooldown({
      lastResendAt: null,
      serverSeconds: 47,
      now: 1_000,
    })
    expect(seconds).toBe(47)
  })

  it("respeita zero explícito do servidor em vez de inflar para a janela padrão", () => {
    expect(computeResendCooldown({ lastResendAt: null, serverSeconds: 0, now: 1_000 })).toBe(0)
  })

  it("conta a janela padrão do provedor a partir do último aceite", () => {
    const now = 10_000_000
    const sentAt = now - 30_000
    expect(computeResendCooldown({ lastResendAt: sentAt, now })).toBe(RESEND_COOLDOWN_SECONDS - 30)
  })

  it("zera quando a janela já passou — reenvio volta a ser possível", () => {
    const now = 10_000_000
    expect(computeResendCooldown({ lastResendAt: now - 120_000, now })).toBe(0)
  })

  it("sem aceite nenhum e sem servidor não há espera a inventar", () => {
    expect(computeResendCooldown({ lastResendAt: null, now: 1_000 })).toBe(0)
  })
})

describe("formatCountdown — o rodapé da prancha 37", () => {
  it("formata MM:SS", () => {
    expect(formatCountdown(28)).toBe("00:28")
    expect(formatCountdown(65)).toBe("01:05")
    expect(formatCountdown(0)).toBe("00:00")
  })

  it("negativo nunca vira relógio quebrado", () => {
    expect(formatCountdown(-3)).toBe("00:00")
  })
})

describe("redirect-plan — destino do callback sem enumeração e sem loop", () => {
  it("link de confirmação vencido vai ao painel expirado da tela de confirmação", () => {
    expect(callbackFailureTarget("/auth/confirmar-email")).toBe(
      "/auth/confirmar-email?estado=expirado",
    )
  })

  it("falha de Google vai ao callback-error, sem estado de tela", () => {
    expect(callbackFailureTarget("/onboarding")).toBe("/auth/callback-error")
    expect(callbackFailureTarget("/auth/callback")).toBe("/auth/callback-error")
  })

  it("link de recuperação expirado permite pedir outro", () => {
    expect(callbackFailureTarget("/nova-senha")).toBe("/recuperar-senha?origem=link")
    expect(callbackFailureTarget("/nova-senha?flow=recovery")).toBe("/recuperar-senha?origem=link")
  })

  it("confirmação bem-sucedida entrega a resolução de destino ao proxy", () => {
    expect(callbackSuccessTarget("/auth/confirmar-email")).toBe("/")
    expect(callbackSuccessTarget("/inicio")).toBe("/inicio")
  })

  it("só registra aceite quando o intent server-side foi emitido", () => {
    expect(shouldRecordSignupConsent(true)).toBe(true)
    expect(shouldRecordSignupConsent(false)).toBe(false)
  })

  it("só abre recuperação quando o provador identifies o redirect como recovery", () => {
    expect(shouldOpenRecoveryIntent("recovery", "/nova-senha")).toBe(true)
    expect(shouldOpenRecoveryIntent("recovery", "/inicio")).toBe(false)
    expect(shouldOpenRecoveryIntent("signup", "/nova-senha")).toBe(false)
    expect(shouldOpenRecoveryIntent(null, "/nova-senha")).toBe(false)
  })
})
