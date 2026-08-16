import { classifyPortalResponse } from "./classify"
import type { PortalApiResponse, VerificationResult } from "./types"

const PORTAL_BASE_URL = "https://api.portaldatransparencia.gov.br"

export type PortalErrorCode =
  | "SCHEMA_DRIFT"
  | "HTTP_ERROR"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "INVALID_KEY"
  | "EMPTY_RESPONSE"

type PortalErrorResult = Extract<VerificationResult, { status: "temporary_error" }> & {
  errorCode: PortalErrorCode
}

const PENDING_ERROR_CODES: ReadonlySet<PortalErrorCode> = new Set([
  "TIMEOUT",
  "HTTP_ERROR",
  "RATE_LIMITED",
])

export function temporaryError(reason: string, errorCode: PortalErrorCode): PortalErrorResult {
  return { status: "temporary_error", reason, errorCode }
}

async function fetchFromPortal(
  endpoint: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<PortalApiResponse> {
  const url = `${PORTAL_BASE_URL}${endpoint}`

  const headers: Record<string, string> = {
    "chave-api-dados": apiKey,
    Accept: "application/json",
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)

  try {
    const linkedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal

    const response = await fetch(url, { headers, signal: linkedSignal })

    if (response.status === 401) {
      throw temporaryError("Portal API key rejected", "INVALID_KEY")
    }

    if (response.status === 429) {
      throw temporaryError("Portal rate limited", "RATE_LIMITED")
    }

    if (!response.ok) {
      throw temporaryError(`Portal HTTP ${response.status}`, "HTTP_ERROR")
    }

    const data: unknown = await response.json()

    if (!Array.isArray(data)) {
      throw temporaryError("Portal response schema drift", "SCHEMA_DRIFT")
    }

    return data as PortalApiResponse
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw temporaryError("Portal request timed out", "TIMEOUT")
    }
    if (
      error !== null &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status: string }).status === "temporary_error"
    ) {
      throw error
    }
    throw temporaryError(
      `Portal request failed: ${error instanceof Error ? error.message : "unknown"}`,
      "HTTP_ERROR",
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

export interface VerificationAttempt {
  result: VerificationResult
  errorCode?: PortalErrorCode
}

export async function verifyCpfWithErrorCode(
  cpf: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<VerificationAttempt> {
  if (!apiKey) {
    const result = temporaryError("Portal API key not configured", "INVALID_KEY")
    return { result, errorCode: "INVALID_KEY" }
  }

  const endpoint = `/api-de-dados/servidores?cpf=${encodeURIComponent(cpf.replace(/\D/g, ""))}`

  try {
    const result = classifyPortalResponse(await fetchFromPortal(endpoint, apiKey, signal))
    return { result }
  } catch (error: unknown) {
    if (
      error !== null &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status: string }).status === "temporary_error"
    ) {
      const errorCode = (error as { errorCode?: PortalErrorCode }).errorCode
      if (errorCode !== undefined && PENDING_ERROR_CODES.has(errorCode)) {
        return { result: { status: "pending" }, errorCode }
      }
      if (errorCode !== undefined) {
        return { result: error as VerificationResult, errorCode }
      }
      return { result: error as VerificationResult }
    }

    const result = temporaryError(
      `Portal verification failed: ${error instanceof Error ? error.message : "unknown"}`,
      "HTTP_ERROR",
    )
    return { result, errorCode: "HTTP_ERROR" }
  }
}

export async function verifyCpf(
  cpf: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<VerificationResult> {
  const attempt = await verifyCpfWithErrorCode(cpf, apiKey, signal)
  return attempt.result
}
