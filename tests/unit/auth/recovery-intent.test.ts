import { describe, expect, it } from "vitest"
import {
  hasRecoveryIntent,
  isRecoveryNext,
  RECOVERY_INTENT_COOKIE,
  RECOVERY_INTENT_VALUE,
} from "web/lib/auth/recovery-intent"

describe("intent de recuperação de senha", () => {
  it("aceita somente o valor emitido pelo callback", () => {
    expect(hasRecoveryIntent(RECOVERY_INTENT_VALUE)).toBe(true)
  })

  it("rejeita cookie ausente, vazio ou adulterado", () => {
    expect(hasRecoveryIntent(undefined)).toBe(false)
    expect(hasRecoveryIntent("")).toBe(false)
    expect(hasRecoveryIntent("forjado")).toBe(false)
  })

  it("não transforma o cookie em autorização de outra conta", () => {
    expect(RECOVERY_INTENT_COOKIE).toBe("bivaque-recovery-intent")
  })

  it("reconhece somente a rota de nova senha", () => {
    expect(isRecoveryNext("/nova-senha")).toBe(true)
    expect(isRecoveryNext("/nova-senha?flow=recovery")).toBe(true)
    expect(isRecoveryNext("/inicio?flow=recovery")).toBe(false)
  })
})
