// D1 Task 1 — rate limiting and the Portal circuit breaker (D46, §7.9).
// One mechanism for all four limits. The storage is abstracted so the unit
// tests never touch Redis; apps/web wires the Upstash-backed store.

export interface SlidingWindowStore {
  /** Record `now` (epoch ms) in `key`, prune entries older than `minScore`, and return the count remaining. */
  record(key: string, now: number, minScore: number): Promise<number>
}

export async function allowSlidingWindow(
  store: SlidingWindowStore,
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<boolean> {
  const count = await store.record(key, now, now - windowMs)
  return count <= limit
}

export interface BreakerStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
}

export class CircuitBreaker {
  constructor(
    private readonly store: BreakerStore,
    private readonly key: string,
    private readonly openDurationMs: number,
  ) {}

  /** Open if the suspension window has not elapsed; close by time, never by attempt. */
  async isOpen(now = Date.now()): Promise<boolean> {
    const openUntil = await this.store.get(this.key)
    if (openUntil === null) return false
    if (now >= Number(openUntil)) {
      await this.store.set(this.key, "", 0)
      return false
    }
    return true
  }

  async trip(now = Date.now()): Promise<void> {
    const ttlSeconds = Math.max(1, Math.ceil(this.openDurationMs / 1000))
    await this.store.set(this.key, String(now + this.openDurationMs), ttlSeconds)
  }
}

export const PORTAL_SUSPENSION_MS = 8 * 60 * 60 * 1000

// The four limits. Portal is global and stays well below the 180/min cap so a
// burst never trips the 8-hour token suspension (§7.9). Member invite is the
// D15 acquisition quota; the family invite's "five active" is a separate
// business rule, not a rate limit.
export const LIMITS = {
  cpfQuery: { limit: 3, windowMs: 60 * 60 * 1000 },
  memberInvite: { limit: 5, windowMs: 60 * 60 * 1000 },
  profileRead: { limit: 60, windowMs: 60 * 60 * 1000 },
  portalCall: { limit: 120, windowMs: 60 * 1000 },
} as const
