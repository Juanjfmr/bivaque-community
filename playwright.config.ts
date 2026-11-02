import { defineConfig } from "@playwright/test"

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH

export default defineConfig({
  testDir: "./tests/e2e",
  // Só no CI: uma nova tentativa para a suíte da web antiga, que cai em testes diferentes a
  // cada execução quando o Supabase local perde a conexão (CI-E2E-UPSTREAM-INSTAVEL). O
  // relatório marca o caso como "flaky"; a causa segue aberta no quadro.
  retries: process.env["CI"] ? 1 : 0,
  outputDir: "test-results",
  reporter: [["html", { open: "never", outputFolder: "playwright-report" }], ["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    ...(chromiumExecutablePath
      ? { launchOptions: { executablePath: chromiumExecutablePath } }
      : {}),
  },
  webServer: {
    command: "pnpm --filter web build && pnpm --filter web start --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    // The Next production build does not fit the 60s default on a cold
    // Windows filesystem; CI runs the same build with cache and benefits
    // from the same headroom.
    timeout: 300_000,
  },
  projects: [
    {
      name: "mobile-375",
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: "tablet-768",
      use: {
        browserName: "chromium",
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "desktop-1440",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
})
