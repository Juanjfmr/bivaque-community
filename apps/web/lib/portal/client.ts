import { classifyPortalResponse } from "./classify"
import type { PortalApiResponse, VerificationResult } from "./types"

const PORTAL_BASE_URL = "https://api.portaldatransparencia.gov.br"

type PortalErrorCode =
  | "SCHEMA_DRIFT"
  | "HTTP_ERROR"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "INVALID_KEY"
  | "EMPTY_RESPONSE"

type PortalErrorResult = Extract<VerificationResult, { status: "temporary_error" }> & {
  errorCode: PortalErrorCode
}

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
      return []
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

export async function verifyCpf(
  cpf: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<VerificationResult> {
  if (!apiKey) {
    return temporaryError("Portal API key not configured", "INVALID_KEY")
  }

  const endpoint = `/api-de-dados/servidores?cpf=${encodeURIComponent(cpf.replace(/\D/g, ""))}`

  try {
    const response = await fetchFromPortal(endpoint, apiKey, signal)
    return classifyPortalResponse(response)
  } catch (error: unknown) {
    if (
      error !== null &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status: string }).status === "temporary_error"
    ) {
      return error as VerificationResult
    }

    return temporaryError(
      `Portal verification failed: ${error instanceof Error ? error.message : "unknown"}`,
      "HTTP_ERROR",
    )
  }
}
