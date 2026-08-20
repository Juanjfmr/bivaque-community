// Shared mask rule with the SQL function private.family_invite_email_hint:
// display at most two characters of the local part and two of the domain, then
// a mask. The mask identifies a pending invite in the list without letting
// anyone reconstruct the e-mail.
//
// Lives outside family-invite-section-actions.ts ("use server") because Next
// 16 requires every export of a "use server" file to be an async Server
// Action — a plain sync helper co-located there fails the production build
// with "Server Actions must be async functions" (found running onda T/F's
// closing E2E batch, unrelated to either wave's own code).
export function emailHint(email: string): string {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.indexOf("@")
  if (at <= 0 || at === trimmed.length - 1) return "***@***"
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  const visibleLocal = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2)
  const dot = domain.indexOf(".")
  const visibleDomain = domain.length <= 2 ? domain.slice(0, 1) : domain.slice(0, 2)
  const tld = dot > 2 ? domain.slice(dot) : ""
  return `${visibleLocal}***@${visibleDomain}***${tld}`
}
