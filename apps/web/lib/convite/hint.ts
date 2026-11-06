// Shared mask rule with the SQL function private.family_invite_email_hint:
// display at most two characters of the local part and two of the domain, then
// a mask. The mask identifies a pending invite in the list without letting
// anyone reconstruct the e-mail.
//
// Lives in `lib/convite` because both the old Server Action and
// `/api/app/voce/familia` (RUN-018) must mask the same way: one rule, two
// doors. The old path `app/(shell)/profile/family-invite-email-hint.ts`
// re-exports it.
export function emailHint(email: string): string {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.indexOf("@")
  if (at <= 0 || at === trimmed.length - 1) return "***@***"
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  const visibleLocal = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2)
  // O ÚLTIMO ponto, não o primeiro: com `indexOf` o rótulo de
  // 'familiar@bivaque.example.invalid' virava 'bi***.example.invalid' e o CHECK
  // da tabela (`^[^@\s]{1,2}\*{3}@[^@\s]{1,2}\*{3}\.[a-z]{2,}$`) recusava o
  // convite — medido em runtime em 15/09/2026, e valia para qualquer domínio de
  // dois níveis ('@exemplo.com.br').
  const dot = domain.lastIndexOf(".")
  const visibleDomain = domain.length <= 2 ? domain.slice(0, 1) : domain.slice(0, 2)
  const tld = dot > 2 ? domain.slice(dot) : ""
  return `${visibleLocal}***@${visibleDomain}***${tld}`
}
