import { defineConfig } from "@playwright/test"
import base from "../../../playwright.config"

// Dedicated app port; never attach to the FIGMA-001 server/build on :3000.
export default defineConfig({
  ...base,
  testDir: ".",
  testMatch: "**/*.spec.ts",
  timeout: 180_000,
  workers: 1,
  retries: 0,
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:3012",
    trace: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: "pnpm --filter web start --hostname 127.0.0.1 --port 3012",
    url: "http://127.0.0.1:3012",
    reuseExistingServer: false,
    // Budget de partida a frio do `next start` (compilar/carregar o server
    // inteiro antes de responder /api/health). NÃO é folga de asserção: cada
    // `expect` tem o próprio timeout e nenhuma prova foi relaxada. O valor
    // anterior (30s) era atingido de forma intermitente em máquina carregada,
    // e um boot lento não é falha de produto.
    timeout: 120_000,
  },
})
