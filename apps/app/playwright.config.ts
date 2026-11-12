import { existsSync } from "node:fs"
import { join } from "node:path"
import { defineConfig } from "@playwright/test"

// Configuracao de e2e propria do app (onda 1b).
//
// Dois servidores. As baterias dos seis tamanhos do prototipo rodam no `vite dev`
// (porta 3200), porque o andaime de prova so existe em desenvolvimento
// (modo-de-prova.ts). O build publicado e servido pelo `vite preview` (porta
// 3201) e medido pelo projeto `publicado`: os specs `*.publicado.spec.ts` provam
// o que so vale no artefato que vai ao ar. O build vem antes (gate e CI).
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
const portaDoBuild = 3201
const SO_DO_BUILD = /.publicado.spec.ts$/

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
  webServer: [
    {
      command: "npx pnpm@11.18.0 dev",
      url: `http://127.0.0.1:${porta}/app/`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: `npx pnpm@11.18.0 exec vite preview --host 127.0.0.1 --port ${portaDoBuild} --strictPort`,
      url: `http://127.0.0.1:${portaDoBuild}/app/`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
  projects: [
    {
      name: "mobile-320",
      testIgnore: SO_DO_BUILD,
      use: {
        browserName: "chromium",
        viewport: { width: 320, height: 700 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile-360",
      testIgnore: SO_DO_BUILD,
      use: {
        browserName: "chromium",
        viewport: { width: 360, height: 740 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile-375",
      testIgnore: SO_DO_BUILD,
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile-430",
      testIgnore: SO_DO_BUILD,
      use: {
        browserName: "chromium",
        viewport: { width: 430, height: 932 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "tablet-768",
      testIgnore: SO_DO_BUILD,
      use: { browserName: "chromium", viewport: { width: 768, height: 1024 } },
    },
    {
      name: "desktop-1440",
      testIgnore: SO_DO_BUILD,
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "publicado",
      testMatch: SO_DO_BUILD,
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
        baseURL: `http://127.0.0.1:${portaDoBuild}`,
      },
    },
  ],
})
