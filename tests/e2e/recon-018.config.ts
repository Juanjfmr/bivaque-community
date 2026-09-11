import { defineConfig } from "@playwright/test"

// Config de execução local do lote RECON-018 em ambiente de executores
// paralelos: a raiz do repo fixa o servidor de E2E em :3000, e essa porta
// pertence a outra lane enquanto a onda rodar. Este arquivo só muda o
// transporte (servidor já de pé, porta própria) — specs e projetos são os
// mesmos três viewports do contrato. A suíte completa continua rodando pelo
// config raiz na integração, quando o ambiente for exclusivo.

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH

export default defineConfig({
  testDir: ".",
  testMatch: "recon-018-entrada.spec.ts",
  outputDir: "../../test-results/recon-018",
  reporter: [["list"]],
  use: {
    baseURL: process.env.APP_URL ?? "http://127.0.0.1:3137",
    locale: "pt-BR",
    ...(chromiumExecutablePath
      ? { launchOptions: { executablePath: chromiumExecutablePath } }
      : {}),
  },
  projects: [
    { name: "mobile-375", use: { viewport: { width: 375, height: 812 } } },
    { name: "tablet-768", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop-1440", use: { viewport: { width: 1440, height: 900 } } },
  ],
})
