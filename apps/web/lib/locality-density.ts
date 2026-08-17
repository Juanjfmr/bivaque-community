/**
 * P0 Task 9: density threshold for an honest empty state.
 *
 * `BIVAQUE.md` §3.4 sets the rule of **30 to 40 weekly active members** before a feed
 * stops looking deserted. P0 Task 9 uses the lower bound as the threshold below which
 * a locality is treated as "just starting": the empty state copy reads "Você é dos
 * primeiros aqui" instead of "Nenhuma publicação ainda", because the second sentence
 * describes a quiet room, not a beginning.
 *
 * The metric is a **proxy** for now: `locality_memberships.count` per `locality_id`.
 * It is not the same as the §3.4 metric (weekly active members), because nothing else
 * knows about activity yet. When `profiles.last_active_at` lands, this helper should
 * switch to count of members active in the last 7 days. The threshold (30) is the
 * §3.4 lower bound, deliberately conservative — anything from 30 to 40 is the
 * "borderline" zone that §3.4 explicitly leaves ambiguous.
 *
 * **Decision 7 of `ADR-20260816-national-localities` is the hard constraint:** priority
 * is operational, not in code. There is no `if (localityId === Manaus) ...` anywhere
 * here, and there must not be: Manaus passing the threshold is a consequence of the
 * 300 members in the seed, not a rule about Manaus.
 */

export const STALE_LOCALITY_THRESHOLD = 30

export function isLocalityStale(memberCount: number | null): boolean {
  // A null count is treated as "not yet known" and **not** as stale — the calling
  // screen renders the standard empty state until the count arrives, then rerenders
  // into the honest one if the locality is below the threshold. This avoids a flicker
  // from "Nenhuma publicação" → "Você é dos primeiros aqui" on every page load.
  if (memberCount === null) return false
  return memberCount < STALE_LOCALITY_THRESHOLD
}
