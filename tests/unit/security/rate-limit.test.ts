import {
  allowSlidingWindow,
  type BreakerStore,
  CircuitBreaker,
  type SlidingWindowStore,
} from "@bivaque/domain"
import { describe, expect, it } from "vitest"

class FakeSlidingWindowStore implements SlidingWindowStore {
  readonly buckets = new Map<string, number[]>()

  async record(key: string, now: number, minScore: number): Promise<number> {
    const remaining = (this.buckets.get(key) ?? []).filter((t) => t >= minScore)
    remaining.push(now)
    this.buckets.set(key, remaining)
    return remaining.length
  }
}

class FakeBreakerStore implements BreakerStore {
  private readonly map = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    return this.map.get(key) ?? null
  }

  async set(key: string, value: string): Promise<void> {
    this.map.set(key, value)
  }
}

describe("sliding window rate limit", () => {
  it("allows requests within the ceiling", async () => {
    const store = new FakeSlidingWindowStore()
    for (let i = 0; i < 3; i++) {
      expect(await allowSlidingWindow(store, "cpf:user-1", 3, 60_000, 1000 + i)).toBe(true)
    }
  })

  it("denies the request above the ceiling", async () => {
    const store = new FakeSlidingWindowStore()
    for (let i = 0; i < 3; i++) {
      await allowSlidingWindow(store, "cpf:user-1", 3, 60_000, 1000)
    }
    expect(await allowSlidingWindow(store, "cpf:user-1", 3, 60_000, 1001)).toBe(false)
  })

  it("slides the window instead of resetting at a fixed boundary", async () => {
    const store = new FakeSlidingWindowStore()
    for (let i = 0; i < 3; i++) {
      await allowSlidingWindow(store, "cpf:user-1", 3, 60_000, 0)
    }
    // Old entries are outside the window now, so a new request is allowed.
    expect(await allowSlidingWindow(store, "cpf:user-1", 3, 60_000, 61_000)).toBe(true)
  })
})

describe("Portal circuit breaker", () => {
  it("is closed by default", async () => {
    const breaker = new CircuitBreaker(new FakeBreakerStore(), "portal", 1000)
    expect(await breaker.isOpen(0)).toBe(false)
  })

  it("opens on trip and stays open within the suspension window", async () => {
    const breaker = new CircuitBreaker(new FakeBreakerStore(), "portal", 1000)
    await breaker.trip(0)
    expect(await breaker.isOpen(500)).toBe(true)
  })

  it("closes by time, not by attempt", async () => {
    const breaker = new CircuitBreaker(new FakeBreakerStore(), "portal", 1000)
    await breaker.trip(0)
    expect(await breaker.isOpen(1000)).toBe(false)
  })
})
