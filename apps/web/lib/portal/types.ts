export type EligibilityClass = "active_federal_military" | "veteran" | "military_pensioner"

export type VerificationStatus = "pending" | "verified" | "rejected" | "temporary_error"

export type FamilyInvitationStatus = "pending" | "accepted" | "revoked" | "expired"

export type VerificationResult =
  | {
      status: "verified"
      eligibilityClass: EligibilityClass
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
    }

export type PortalRawRecord = {
  [key: string]: unknown
}

export type PortalApiResponse = PortalRawRecord[]
