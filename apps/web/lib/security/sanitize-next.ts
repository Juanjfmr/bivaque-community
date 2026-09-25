// Accept only internal paths so the auth callback cannot redirect the freshly
// authenticated user to a hostile origin. `new URL(next, request.url)` honors
// the base only when the first argument is relative; an absolute URL or a
// protocol-relative `//host` would otherwise redirect outside the app and
// turn the magic-link flow into a phishing surface.

// Positives: "/", "/community", "/groups/abc?tab=feed", "/events/1#top".
// Negatives: "https://exemplo.invalid", "//exemplo.invalid",
//            "/\\exemplo.invalid", "javascript:alert(1)", "http:/exemplo.invalid",
//            "" (missing), anything that does not start with a single "/".
// Control characters are rejected too: browsers strip TAB/CR/LF from URLs, so
// "/<TAB>/exemplo.invalid" would become the protocol-relative "//exemplo.invalid".
// biome-ignore lint/suspicious/noControlCharactersInRegex: the control range is the point.
const SAFE_PATH = /^\/(?!\/)[^\\\u0000-\u001f\u007f]*$/

export const DEFAULT_NEXT = "/"

export function sanitizeNext(value: string | null | undefined): string {
  if (typeof value !== "string") return DEFAULT_NEXT
  if (value.length === 0) return DEFAULT_NEXT
  if (!SAFE_PATH.test(value)) return DEFAULT_NEXT
  return value
}

// Coberta por tests/unit/security/sanitize-next.test.ts contra as pastas de rota
// reais: uma rota autenticada nova que fique fora daqui quebra o teste, em vez
// de mandar a pessoa para "/" depois do login.
export const POST_LOGIN_ALLOWED_PREFIXES = [
  "/inicio",
  "/explorar",
  "/publicacoes",
  "/invite",
  "/prestador-convite",
  "/guide",
  "/events",
  "/mercado",
  "/meus-anuncios",
  "/imoveis",
  "/recommendations",
  "/prestadores",
  "/prestador",
  "/communities",
  "/community",
  "/groups",
  "/profile",
  "/configuracoes",
  "/messages",
  "/notifications",
  "/pedidos",
  "/denuncias",
  "/ajuda",
  "/localidade",
  "/salvos",
  "/onboarding",
  "/admissions",
  "/reports",
  "/arrivals",
  "/guide-queue",
] as const

function isPostLoginAllowed(pathname: string): boolean {
  return POST_LOGIN_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function normalizePostLoginPath(value: string | null | undefined): string | null {
  const clean = sanitizeNext(value)
  if (clean === DEFAULT_NEXT) return DEFAULT_NEXT

  try {
    const parsed = new URL(clean, "https://bivaque.invalid")
    const decodedPathname = decodeURIComponent(parsed.pathname)
    if (decodedPathname.split("/").some((segment) => segment === "." || segment === "..")) {
      return null
    }
    if (!isPostLoginAllowed(parsed.pathname)) return null
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}

/**
 * Resolve os nomes legado e atual de destino sem permitir que a tela de login
 * devolva a pessoa para entrada, API, asset ou rota não autorizada. A query e
 * o fragmento são preservados; a comparação é por fronteira de segmento, não
 * por prefixo de string.
 */
export function resolvePostLoginDestination(values: Array<string | null | undefined>): string {
  for (const value of values) {
    const clean = normalizePostLoginPath(value)
    if (clean !== null && clean !== DEFAULT_NEXT) return clean
  }
  return DEFAULT_NEXT
}
