export function origensDaCsp(): string {
  const valor = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  if (!valor) return ""
  try {
    const url = new URL(valor)
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : ""
  } catch {
    return ""
  }
}

function csp(script: string): string {
  return [
    "default-src 'self'",
    script,
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

export function cspDasPaginas(nonce: string): string {
  return csp(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`)
}

export function cspDoApp(): string {
  return csp("script-src 'self'")
}
