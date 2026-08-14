import {
  type BreakerStore,
  CircuitBreaker,
  LIMITS,
  PORTAL_SUSPENSION_MS,
  type SlidingWindowStore,
} from "@bivaque/domain"
import type { Redis } from "@upstash/redis"

export class UpstashSlidingWindowStore implements SlidingWindowStore {
  constructor(private readonly redis: Redis) {}

  async record(key: string, now: number, minScore: number): Promise<number> {
    const member = `${now}:${Math.random().toString(36).slice(2)}`
    await this.redis.zadd(key, { score: now, member })
    await this.redis.zremrangebyscore(key, 0, minScore)
    const count = await this.redis.zcard(key)
    // Window plus a margin so the key self-expires instead of lingering.
    await this.redis.expire(key, 120)
    return count
  }
}

export class UpstashBreakerStore implements BreakerStore {
  constructor(private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get<string>(key)
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
      await this.redis.del(key)
      return
    }
    await this.redis.set(key, value, { ex: ttlSeconds })
  }
}

/** The Portal breaker closes by time (8h suspension), never by attempt. */
export function createPortalBreaker(redis: Redis): CircuitBreaker {
  return new CircuitBreaker(
    new UpstashBreakerStore(redis),
    "bivaque:breaker:portal",
    PORTAL_SUSPENSION_MS,
  )
}

export function createLimiterStore(redis: Redis): SlidingWindowStore {
  return new UpstashSlidingWindowStore(redis)
}

/** Limits are wired in D2 and the invite/profile/portal code paths; the four ceilings live in LIMITS. */
export const RATE_LIMIT_CEILINGS = LIMITS
