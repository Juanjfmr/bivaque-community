/**
 * Classificação dos erros do compositor (insert em `posts`).
 *
 * O compositor trata dois cenários materialmente diferentes:
 *
 *   1. Falha de transporte — o navegador nunca chegou a falar com o
 *      PostgREST (offline, DNS, abort, timeout). A interface precisa pedir
 *      à pessoa para verificar a conexão E manter o rascunho, porque a
 *      ação nunca chegou ao servidor — reescrever é destrutivo.
 *
 *   2. Falha de servidor — a request chegou ao PostgREST e foi rejeitada
 *      por RLS, validação, conflito, etc. O rascunho é descartável: a
 *      reescrita tem chance de dar o mesmo erro (especialmente em RLS,
 *      onde o problema é autorização), mas descartar destrói a
 *      experiência. Mantemos por padrão, mas não prometemos.
 *
 * A mensagem para o caso 2 é SEMPRE genérica e idêntica entre 42501
 * (RLS), 23505 (unique), 23503 (FK) e qualquer outro código — não
 * distinguimos "você não tem acesso" de "este recurso não existe" na
 * UI. Isto é anti-enumeração: um terceiro que escaneasse o banco não
 * pode inferir a topologia lendo o a fronteira. O `cause` continua
 * disponível para diagnóstico, mas nunca cruza a fronteira de render.
 *
 * Função pura: nenhum import de runtime. O consumidor decide o que
 * mostrar, o que logar e se reabre o modal.
 */

export type PublishErrorKind = "network" | "server"

export interface PublishErrorView {
  /** Discrimination key for tests, telemetry and copy branching. */
  kind: PublishErrorKind
  /** Stable, user-facing copy. Never the raw PostgREST error string. */
  message: string
  /** When true, the caller should keep the draft intact across retries. */
  preserveDraft: boolean
  /** Diagnostic-only detail. Must not be rendered as-is. */
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

/**
 * Classifies a thrown value from `supabase.from(...).insert(...)` (or a
 * manual fetch) into a stable PublishErrorView.
 *
 * `error` is whatever the client got back. The function is permissive: any
 * object that looks like a PostgrestError (has `message` and either a
 * numeric `code` like "42501" or an HTTP `status`) is treated as a server
 * rejection. Everything else that matches network signatures is transport.
 * Anything truly unknown is also treated as transport — the conservative
 * answer — and the diagnostic carries the original shape so logs can still
 * investigate.
 */
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

  // `code` é SQLSTATE Postgres; `status` é HTTP; `details`/`hint` só
  // aparecem em erros do PostgREST. Qualquer um é prova de que a request
  // chegou ao servidor — user-facing copy não distingue entre eles.
  const looksLikeServerError =
    (typeof probe.code === "string" && /^[0-9A-Z]{5}$/.test(probe.code)) ||
    typeof probe.status === "number" ||
    probe.details !== undefined ||
    probe.hint !== undefined

  if (looksLikeServerError) {
    return {
      kind: "server",
      message: SERVER_MESSAGE,
      // We do not know whether re-submitting will succeed (RLS won't change,
      // but a transient 503 might). Keep the draft by default.
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

  // Unknown shape: conservative = transport, keep draft.
  return {
    kind: "network",
    message: NETWORK_MESSAGE,
    preserveDraft: true,
    diagnostic: `publish-insert: unknown (name=${JSON.stringify(name)} message=${JSON.stringify(
      message,
    )})`,
  }
}
