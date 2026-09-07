export type EligibilityClass = "active_federal_military" | "veteran" | "military_pensioner"

export type VerificationStatus = "pending" | "verified" | "rejected" | "temporary_error"

export type FamilyInvitationStatus = "pending" | "accepted" | "revoked" | "expired"

export type PortalErrorCode =
  | "SCHEMA_DRIFT"
  | "HTTP_ERROR"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "INVALID_KEY"
  | "EMPTY_RESPONSE"

export type VerificationResult =
  | {
      status: "verified"
      eligibilityClass: EligibilityClass
      // P0 Task 5: o nome civil atravessa a fronteira do payload em memória,
      // para preencher o campo do passo pós-elegibilidade. NUNCA é persistido
      // aqui — o que persiste é a declaração da pessoa (D11). Só o nome
      // atravessa; OM, posto e situação continuam proibidos (AGENTS.md:205).
      suggestedName?: string
    }
  | {
      status: "rejected"
    }
  | {
      status: "pending"
    }
  | {
      status: "temporary_error"
      reason: string
      errorCode?: PortalErrorCode
    }

export type PortalRawRecord = {
  [key: string]: unknown
}

export type PortalApiResponse = PortalRawRecord[]