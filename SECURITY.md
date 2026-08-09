# Security Policy

## Scope

This repository hosts **Bivaque Community**, a private invite-only community product for verified federal military, Veterans, and military pensioners, piloted in Manaus. The Bivaque codebase and its deployment are in scope.

The following are **out of scope** for this policy — report them to their maintainers directly:

- Supabase, Vercel, the Portal da Transparência, and other third-party services integrated via this codebase.
- The local development seed in `supabase/seed.sql` and `apps/web/.env.local` — both are disposable by design.
- Vulnerabilities in dependencies without an exploitable path through Bivaque's own code or policies.

## Supported versions

Only the `main` branch receives security updates. Older commits and unmerged branches are not patched.

## Reporting a vulnerability

Do **not** open a public issue. Use one of:

- **GitHub Security Advisories** on this repository (preferred — keeps disclosure private and audit-trailed).
- Direct contact with the maintainer at the address in the repository's commit history.

Include:

- Description and impact (what an attacker gains).
- Reproduction steps — minimal, against a clean clone.
- Affected commit, branch, or deployed commit SHA.
- Any mitigations you have already considered.

## Response timeline

- Acknowledgement within **3 business days**.
- Triage verdict (accepted / won't fix / duplicate / out of scope) within **10 business days**.
- Coordinated disclosure window defaults to **90 days** from acknowledgement; we can shorten or extend on request.

## What we expect from researchers

- Good-faith research that respects user privacy and data integrity.
- No access to other users' data, no data destruction, no social engineering, no denial of service.
- Stop and contact us if you encounter other users' data during research.
- Give us a reasonable window to patch before any public write-up.

## Recognition

We credit reporters in the fix commit unless anonymity is requested. A "thank you" page is not maintained; the commit log is the record.

## Out of scope (won't fix / won't acknowledge here)

- Findings that require the attacker to already control a verified, invited member account.
- Findings in upstream dependencies without an exploitable path through Bivaque.
- Rate-limiting / DoS against the invite-only surface without demonstrated impact.
- UI/UX issues without a security consequence.
- Reports about features that the product map (`docs/journeys/MAP.md`) records as **explicitly excluded** (marketplace, ads, AI, video, native app, other cities) — those are not built and not built toward.
