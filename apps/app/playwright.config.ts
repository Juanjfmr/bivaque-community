import { existsSync } from "node:fs"
import { join } from "node:path"
import { defineConfig } from "@playwright/test"

// Configuração de e2e própria do app (onda 1b).
//
// Serve o build de `vite preview` na porta 3200 (a mesma do `preview` do
// manifesto), com os três tamanhos do protótipo. O Chromium que esta versão do
// Playwright espera pode não estar baixado na máquina de desenvolvimento; o
// headless shell já instalado serve (ver LICOES.md, seção do Playwright), e a
// variável de ambiente do host sempre prevalece.
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
  // Os specs compartilham a mesma origem e o mesmo build; paralelizar o
  // histórico do navegador entre eles só produz intermitência.
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${porta}`,
    ...(chromium ? { launchOptions: { executablePath: chromium } } : {}),
  },
  webServer: {
    // Só serve: o build é do gate do coordenador, feito antes da prova. Assim a
    // prova nunca mede um build velho nem o build de outra frente na porta.
    command: "npx pnpm@11.18.0 preview",
    url: `http://127.0.0.1:${porta}/app/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "mobile-375",
      use: { browserName: "chromium", viewport: { width: 375, height: 812 } },
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
