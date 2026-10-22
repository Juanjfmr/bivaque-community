import { afterEach, expect, it, vi } from "vitest"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

it("starts the already built candidate in CI", async () => {
  vi.stubEnv("CI", "true")
  const { default: config } = await import("../../playwright.config")
  expect(config.webServer).toMatchObject({
    command: "pnpm --filter web start --hostname 127.0.0.1 --port 3000",
    reuseExistingServer: false,
  })
})

it("builds before starting an independent local E2E run", async () => {
  vi.stubEnv("CI", "")
  const { default: config } = await import("../../playwright.config")
  expect(config.webServer).toMatchObject({
    command: "pnpm --filter web build && pnpm --filter web start --hostname 127.0.0.1 --port 3000",
  })
})
