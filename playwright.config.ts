import { defineConfig } from "@playwright/test"

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results",
  // Uma retentativa na CI, nenhuma localmente.
  //
  // A suíte roda três projetos de viewport em paralelo contra UM único Postgres,
  // e várias specs mutam estado compartilhado da mesma localidade — por isso
  // reports-member-flow chama dismissStaleOpenReports() antes de começar e
  // group-admin-cycle:113 documenta precisar ser idempotente. Com retries em 0,
  // uma única corrida perdida entre specs reprovava o run inteiro.
  //
  // Medido, não suposto: entre os commits 4c59562 e d86b0b4 — cujo diff não
  // toca nenhum dos caminhos envolvidos — o conjunto de falhas mudou de três
  // (group-admin-cycle em 375 e 768, reports-member-flow em 1440) para uma
  // (group-admin-cycle em 375). reports-member-flow força o próprio viewport
  // em 1280x800 nos três projetos, ou seja, renderiza idêntico e mesmo assim
  // falhou em um só: resultado diferente com renderização idêntica é estado,
  // não código.
  //
  // Isto é anteparo, não cura. A correção real é isolar o estado por worker
  // (banco por worker, ou describe.serial nas specs que mutam dados
  // compartilhados) e está registrada no card MVP-00-E2E-FUNCTIONAL. Uma falha
  // que sobrevive à retentativa é real e deve ser tratada como tal.
  retries: process.env.CI ? 1 : 0,
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
