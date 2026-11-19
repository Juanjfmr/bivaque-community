export function origensDaCsp(): string {
  return [process.env["NEXT_PUBLIC_SUPABASE_URL"], process.env["NEXT_PUBLIC_SENTRY_DSN"]]
    .flatMap((valor) => {
      if (!valor) return []
      try {
        const url = new URL(valor)
        return url.protocol === "https:" || url.protocol === "http:" ? [url.origin] : []
      } catch {
        return []
      }
    })
    .filter((origem, indice, origens) => origens.indexOf(origem) === indice)
    .join(" ")
}

export function cspDasPaginas(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${origensDaCsp()}`.trim(),
    `connect-src 'self' ${origensDaCsp()}`.trim(),
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ")
}
