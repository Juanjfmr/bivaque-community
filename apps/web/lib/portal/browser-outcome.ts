import type { VerificationResult } from "./types"

// O que da verificação pode atravessar para o navegador
// (ADR-20260922-identidade-quando-portal-falha). A tela decide pelo `status` e pelo
// `errorCode`; o `reason` do erro temporário é diagnóstico do servidor ("Portal API key
// not configured") e fica no log. As outras variantes já não carregam motivo.
export type BrowserVerificationOutcome =
  | Exclude<VerificationResult, { status: "temporary_error" }>
  | {
      status: "temporary_error"
      errorCode?: Extract<VerificationResult, { status: "temporary_error" }>["errorCode"]
    }

export function withoutReason(outcome: VerificationResult): BrowserVerificationOutcome {
  if (outcome.status !== "temporary_error") return outcome
  return outcome.errorCode === undefined
    ? { status: "temporary_error" }
    : { status: "temporary_error", errorCode: outcome.errorCode }
}
