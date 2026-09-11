import { defineConfig } from "@playwright/test"

// Runner dos specs do lote RECON-032. Nao toca no playwright.config.ts da
// raiz (contratado por tests/scope): este checkout divide a maquina com tres
// executores paralelos e cada um serve o app na sua porta — aqui 3147, com o
// servidor jaca de pe (build + next start). Por isso nenhum `webServer` aqui:
// o da raiz aponta para a :3000, que e de outra sessao.

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH

export default defineConfig({
  testDir: ".",
  outputDir: "../../test-results",
  reporter: [["list"]],
  fullyParallel: false,
  workers: 1,
  // Este checkout divide a maquina com outros executores. Com a CPU saturada,
  // abrir pagina/contexto passa dos 30s padrao e o teste morre ANTES de
  // qualquer assercao — falso vermelho de infraestrutura, nao de fluxo. O teto
  // maior da folga sem afrouxar assercao nenhuma (os expect mantem o padrao).
  timeout: 90_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://127.0.0.1:3147",
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
