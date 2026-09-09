export { classifyPortalResponse } from "./classify"
export type { VerificationAttempt } from "./client"
export { temporaryError, verifyCpf, verifyCpfWithErrorCode } from "./client"
export type { PortalVerificationGuard } from "./guard"
export { createPortalVerificationGuard } from "./guard"
export type { PortalHealthStatus } from "./probe"
export { classifyPortalProbe, probePortal } from "./probe"
export { PORTAL_PII_KEYS, redactCpf, redactPortalPayload } from "./redact"
export type {
  EligibilityClass,
  FamilyInvitationStatus,
  PortalApiResponse,
  PortalErrorCode,
  PortalRawRecord,
  VerificationResult,
  VerificationStatus,
} from "./types"
