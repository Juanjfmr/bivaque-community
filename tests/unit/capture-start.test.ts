import { afterEach, expect, it, vi } from "vitest"

const { launch } = vi.hoisted(() => ({ launch: vi.fn() }))
vi.mock("@playwright/test", () => ({ chromium: { launch } }))

afterEach(() => {
  launch.mockReset()
  vi.unstubAllEnvs()
})

it("forwards the map renderer flags with the configured browser", async () => {
  vi.stubEnv("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH", "test-browser")
  const { launchCaptureBrowser } = await import("../../scripts/bivaque-html/capture-support.mjs")
  await launchCaptureBrowser(["--use-gl=swiftshader", "--enable-webgl"])
  expect(launch).toHaveBeenCalledWith({
    executablePath: "test-browser",
    args: ["--use-gl=swiftshader", "--enable-webgl"],
  })
})

it("uses the managed browser when no executable override is configured", async () => {
  vi.stubEnv("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH", "")
  const { launchCaptureBrowser } = await import("../../scripts/bivaque-html/capture-support.mjs")
  await launchCaptureBrowser()
  expect(launch).toHaveBeenCalledWith({ args: [] })
})
