import { allowSlidingWindow, CircuitBreaker, LIMITS, PORTAL_SUSPENSION_MS } from "@bivaque/domain"
import { UpstashBreakerStore, UpstashSlidingWindowStore } from "../limits"

export interface PortalVerificationGuard {
  allows(userId: string, now?: number): Promise<boolean>
  trip(now?: number): Promise<void>
}

export async function createPortalVerificationGuard(): Promise<PortalVerificationGuard | null> {
  const url = process.env["UPSTASH_REDIS_REST_URL"]
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"]
  if (!url || !token) return null

  const { Redis } = await import("@upstash/redis")
  const redis = new Redis({ url, token })

  const breaker = new CircuitBreaker(
    new UpstashBreakerStore(redis),
    "bivaque:breaker:portal",
    PORTAL_SUSPENSION_MS,
  )
  const store = new UpstashSlidingWindowStore(redis)

  return {
    async allows(userId, now = Date.now()) {
      if (await breaker.isOpen(now)) return false

      const portalAllowed = await allowSlidingWindow(
        store,
        "bivaque:limit:portal",
        LIMITS.portalCall.limit,
        LIMITS.portalCall.windowMs,
        now,
      )
      if (!portalAllowed) return false

      return allowSlidingWindow(
        store,
        `bivaque:limit:cpf:${userId}`,
        LIMITS.cpfQuery.limit,
        LIMITS.cpfQuery.windowMs,
        now,
      )
    },
    async trip(now = Date.now()) {
      await breaker.trip(now)
    },
  }
}
