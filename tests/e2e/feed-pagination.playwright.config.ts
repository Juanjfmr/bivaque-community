import { defineConfig } from "@playwright/test"

// Runner da rodada 2 do FEED-PAGINACAO-CURSOR contra o servidor JÁ DE PÉ na
// :3210 (build + `next start`), no mesmo padrão de
// `tests/e2e/recon-032.playwright.config.ts`.
//
// Por que não o `playwright.config.ts` da raiz: ele tem `webServer` apontando
// para a :3000, que é de outra sessão nesta máquina — e `reuseExistingServer`
// só reaproveita o que já está escutando. Rodar os specs do feed por ele
// subiria um SEGUNDO servidor na :3000.
//
// Uso:
//   PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:3210 APP_URL=http://127.0.0.1:3210 \
//     npx playwright test --config tests/e2e/feed-pagination.playwright.config.ts
//
// Os três viewports são os mesmos da raiz: a paginação é medida em 375, 768 e
// 1440, e dois-localities.spec.ts quebra nos três se a sequência não paginar.

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://127.0.0.1:3210"

export default defineConfig({
  testDir: ".",
  outputDir: "../../test-results",
  reporter: [["list"]],
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    ...(chromiumExecutablePath ? { launchOptions: { executablePath: chromiumExecutablePath } } : {}),
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