import { describe, expect, it } from "vitest"
import { canOperateAdmissions } from "web/lib/security/admissions-authz"

const OPERATOR = "11111111-1111-1111-1111-111111111111"
const MEMBER = "22222222-2222-2222-2222-222222222222"

// O buraco que este teste tranca: reprocessUserAction resolvia o caller com
// readOperatorIdFromCookies (que só diz "existe alguém logado") e chamava
// verification_reconcile_step com service_role. O RPC não tem parâmetro de
// caller e não consegue reconferir, então qualquer conta autenticada
// reprocessava a verificação de qualquer UUID.
describe("canOperateAdmissions", () => {
  describe("positives", () => {
    it("allows an authenticated caller that is an operator", () => {
      expect(canOperateAdmissions({ callerId: OPERATOR, callerIsOperator: true })).toBe(true)
    })
  })

  describe("negatives — an authenticated session is not authorisation", () => {
    it("denies an authenticated member that is not an operator", () => {
      expect(canOperateAdmissions({ callerId: MEMBER, callerIsOperator: false })).toBe(false)
    })

    it("denies when there is no session at all", () => {
      expect(canOperateAdmissions({ callerId: null, callerIsOperator: false })).toBe(false)
    })

    it("denies an empty caller id even if the operator flag came back true", () => {
      expect(canOperateAdmissions({ callerId: "", callerIsOperator: true })).toBe(false)
    })

    it("denies a whitespace-only caller id", () => {
      expect(canOperateAdmissions({ callerId: "   ", callerIsOperator: true })).toBe(false)
    })

    it("denies when the operator RPC answered for nobody", () => {
      expect(canOperateAdmissions({ callerId: null, callerIsOperator: true })).toBe(false)
    })
  })
})
