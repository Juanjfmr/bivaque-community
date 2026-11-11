import { defineConfig } from "@playwright/test"

/**
 * Prova isolada da prévia vNext, servida pelo Vite DEV.
 * O Playwright de produto usa o build de produção e nunca monta esta prévia.
 */
export default defineConfig({
  testDir: "./tests/lab",
  outputDir: "test-results-vnext",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3200",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3200/app/previa/vnext?v=a",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "mobile-320",
      use: {
        browserName: "chromium",
        viewport: { width: 320, height: 700 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile-360",
      use: {
        browserName: "chromium",
        viewport: { width: 360, height: 740 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile-375",
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile-430",
      use: {
        browserName: "chromium",
        viewport: { width: 430, height: 932 },
        isMobile: true,
        hasTouch: true,
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
