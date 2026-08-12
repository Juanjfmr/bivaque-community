// Accept only internal paths so the auth callback cannot redirect the freshly
// authenticated user to a hostile origin. `new URL(next, request.url)` honors
// the base only when the first argument is relative; an absolute URL or a
// protocol-relative `//host` would otherwise redirect outside the app and
// turn the magic-link flow into a phishing surface.

// Positives: "/", "/community", "/groups/abc?tab=feed", "/events/1#top".
// Negatives: "https://exemplo.invalid", "//exemplo.invalid",
//            "/\\exemplo.invalid", "javascript:alert(1)", "http:/exemplo.invalid",
//            "" (missing), anything that does not start with a single "/".
const SAFE_PATH = /^\/(?!\/)[^\\]*$/

export const DEFAULT_NEXT = "/"

export function sanitizeNext(value: string | null | undefined): string {
  if (typeof value !== "string") return DEFAULT_NEXT
  if (value.length === 0) return DEFAULT_NEXT
  if (!SAFE_PATH.test(value)) return DEFAULT_NEXT
  return value
}
