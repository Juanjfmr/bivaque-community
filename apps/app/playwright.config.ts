import { existsSync } from "node:fs"
import { join } from "node:path"
import { defineConfig } from "@playwright/test"

// Configuracao de e2e propria do app (onda 1b).
//
// Serve o app na porta 3200 (a mesma do `preview` do manifesto), com os seis
// tamanhos do prototipo. O andaime de prova so existe em desenvolvimento
// (modo-de-prova.ts), entao o servidor e o `vite dev`, nao o preview do build.
function chromiumInstalado(): string | undefined {
  const doAmbiente = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"]
  if (doAmbiente) return doAmbiente
  const shell = join(
    process.env["LOCALAPPDATA"] ?? "",
    "ms-playwright",
    "chromium_headless_shell-1248",
    "chrome-headless-shell-win64",
    "chrome-headless-shell.exe",
  )
  return existsSync(shell) ? shell : undefined
}

const chromium = chromiumInstalado()
const porta = 3200

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${porta}`,
    ...(chromium ? { launchOptions: { executablePath: chromium } } : {}),
  },
  webServer: {
    command: "npx pnpm@11.18.0 dev",
    url: `http://127.0.0.1:${porta}/app/`,
    reuseExistingServer: false,
    timeout: 180_000,
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
      use: { browserName: "chromium", viewport: { width: 768, height: 1024 } },
    },
    {
      name: "desktop-1440",
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 } },
    },
  ],
})
