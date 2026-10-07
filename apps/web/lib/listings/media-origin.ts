// NextURL normalizes loopback hosts to localhost. Host retains the authority
// addressed by the browser; forwarded headers must not widen this boundary.
export function hasSameMediaOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  const host = request.headers.get("host")
  if (!origin || !host) return false
  try {
    const protocol = new URL(request.url).protocol
    const expected = new URL(`${protocol}//${host}`)
    return expected.host === host && origin === expected.origin
  } catch {
    return false
  }
}
