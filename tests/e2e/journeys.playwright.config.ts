import { defineConfig } from "@playwright/test"

// Runner local das jornadas simuladas (tests/e2e/journey-*.spec.ts). Não substitui a config da
// raiz — no CI estes specs rodam lá, no lote @stateful. Existe porque a máquina de
// desenvolvimento costuma ter outro checkout servindo a :3000, e o `reuseExistingServer` da raiz
// testaria o código errado sem avisar. Aqui não há `webServer`: sirva o build deste checkout
// (next start) numa porta própria e aponte JOURNEY_BASE_URL para ela.
//
// Uso:
//   JOURNEY_BASE_URL=http://127.0.0.1:3211 npx playwright test -c tests/e2e/journeys.playwright.config.ts
//   node scripts/visual/journey-report.mjs

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH

export default defineConfig({
  testDir: ".",
  testMatch: /(journey-.*|link-crawl)\.spec\.ts$/,
  outputDir: "../../test-results/journeys",
  reporter: [["list"]],
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  use: {
    baseURL: process.env.JOURNEY_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    ...(chromiumExecutablePath
      ? { launchOptions: { executablePath: chromiumExecutablePath } }
      : {}),
  },
  projects: [
    {
      name: "desktop-1440",
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 } },
    },
  ],
})
