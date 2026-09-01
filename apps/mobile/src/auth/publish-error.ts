/**
 * Classificacao dos erros do compositor (insert em `posts`) no mobile.
 *
 * Porta do apps/web/lib/composer/publish-error.ts (commit efab5a9, fatia W1
 * do golden slice web). A logica e' identica para nao divergir entre web
 * e mobile — copy generica anti-enumeracao §4.3, mesma discriminacao
 * network vs server, mesmo principio "unknown e' conservativamente transport".
 *
 * Por que uma copia e nao um import compartilhado: o web e o mobile
 * sao builds separados (Next.js vs Expo/Metro), com targets TypeScript
 * diferentes (DOM + React 19 + @supabase/ssr vs RN 0.81 + @supabase/supabase-js).
 * Manter uma copia por build e mais barato do que construir um pacote
 * de contracts so para essa funcao. Quando a web divergir da mobile,
 * a mudanca tem que ser feita nos dois lados — mas isso e' raro e
 * coberto por S5 (golden slice nativa parity).
 */

export type PublishErrorKind = "network" | "server"

export interface PublishErrorView {
  kind: PublishErrorKind
  message: string
  preserveDraft: boolean
  diagnostic: string
}

const SERVER_MESSAGE = "Não foi possível criar a publicação"
const NETWORK_MESSAGE = "Verifique sua conexão e tente de novo"

const NETWORK_NAME_PATTERNS = ["TypeError", "AbortError", "NetworkError"]

const NETWORK_MESSAGE_PATTERNS = [
  "Failed to fetch",
  "Network request failed",
  "fetch failed",
  "NetworkError when attempting",
  "Load failed",
  "aborted",
  "timed out",
  "timeout",
]

interface ShapeProbe {
  name?: unknown
  message?: unknown
  code?: unknown
  status?: unknown
  details?: unknown
  hint?: unknown
}

export function classifyPublishError(error: unknown): PublishErrorView {
  if (error === null || error === undefined) {
    return {
      kind: "network",
      message: NETWORK_MESSAGE,
      preserveDraft: true,
      diagnostic: "publish-insert: null/undefined",
    }
  }

  if (typeof error !== "object") {
    return {
      kind: "network",
      message: NETWORK_MESSAGE,
      preserveDraft: true,
      diagnostic: `publish-insert: non-object (${typeof error})`,
    }
  }

  const probe = error as ShapeProbe
  const name = typeof probe.name === "string" ? probe.name : ""
  const message = typeof probe.message === "string" ? probe.message : ""

  // `code` e' SQLSTATE Postgres; `status` e' HTTP; `details`/`hint` so
  // aparecem em erros do PostgREST. Qualquer um e' prova de que a request
  // chegou ao servidor — copy user-facing nao distingue entre eles.
  const looksLikeServerError =
    (typeof probe.code === "string" && /^[0-9A-Z]{5}$/.test(probe.code)) ||
    typeof probe.status === "number" ||
    probe.details !== undefined ||
    probe.hint !== undefined

  if (looksLikeServerError) {
    return {
      kind: "server",
      message: SERVER_MESSAGE,
      preserveDraft: true,
      diagnostic: `publish-insert: server error code=${String(probe.code ?? "-")} status=${String(
        probe.status ?? "-",
      )} message=${JSON.stringify(message)}`,
    }
  }

  const isNetworkByName = NETWORK_NAME_PATTERNS.some((pattern) =>
    name.toLowerCase().includes(pattern.toLowerCase()),
  )
  const isNetworkByMessage = NETWORK_MESSAGE_PATTERNS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase()),
  )

  if (isNetworkByName || isNetworkByMessage) {
    return {
      kind: "network",
      message: NETWORK_MESSAGE,
      preserveDraft: true,
      diagnostic: `publish-insert: transport (name=${JSON.stringify(name)} message=${JSON.stringify(
        message,
      )})`,
    }
  }

  // Forma desconhecida: conservativo = transport, mantem rascunho.
  return {
    kind: "network",
    message: NETWORK_MESSAGE,
    preserveDraft: true,
    diagnostic: `publish-insert: unknown (name=${JSON.stringify(name)} message=${JSON.stringify(
      message,
    )})`,
  }
}
