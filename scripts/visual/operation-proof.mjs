// Targeted, read-only runtime proof for the operation shell (RECON-036).
// Uses the running candidate, never resets DB.
//
// Portado de codex/fidelidade-pranchas@7daf492 e adaptado ao shell desta
// branch, que difere da irmã em três pontos observáveis:
//  - o nav da operação chama-se "Operação" (lateral, ≥768) ou
//    "Operação (mobile)" (barra <768), não "Painel do operador";
//  - o alvo do skip link é #operacao-conteudo;
//  - "Sair da operação" chama supabase.auth.signOut() e vai para /login.
//    A irmã volta a /inicio preservando a sessão. A escolha entre as duas
//    semânticas é human_decision pendente do dono (RECON-036) — esta prova
//    afirma exatamente o que ESTE candidato faz, nada mais.
import { execFileSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { chromium, expect } from "@playwright/test"
import { fetchOperatorSession, fetchSession } from "./capture.mjs"

const baseURL = process.env["BIVAQUE_VISUAL_BASE_URL"] ?? "http://127.0.0.1:3107"
const output = process.env["BIVAQUE_OPERATION_PROOF_OUT"] ?? ".visual/operation-proof"
const member = await fetchSession({ email: "visual@bivaque.example.invalid" })
const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"]
const browser = await chromium.launch(executablePath ? { executablePath } : {})
const results = []

async function contextFor(width, auth) {
  const context = await browser.newContext({
    baseURL,
    viewport: { width, height: 900 },
    locale: "pt-BR",
  })
  if (auth)
    await context.addCookies([
      { name: "bivaque-consent-version", value: "2", url: baseURL },
      {
        name: auth.storageKey,
        value: `base64-${Buffer.from(JSON.stringify(auth.session)).toString("base64url")}`,
        url: baseURL,
      },
    ])
  return context
}

// Cada largura tem exatamente UM nav de operação visível: a lateral some abaixo
// de md e a barra mobile some de md pra cima. O seletivo acompanha o shell.
const navFor = (page, width) =>
  width < 768
    ? page.getByRole("navigation", { name: "Operação (mobile)", exact: true })
    : page.getByRole("navigation", { name: "Operação", exact: true })

try {
  for (const width of [375, 768, 1440]) {
    // Sessão de operador nova por largura: "Sair da operação" revoga a sessão
    // no servidor, e uma sessão compartilhada envenenaria os runs seguintes.
    const operator = await fetchOperatorSession()
    const context = await contextFor(width, operator)
    const page = await context.newPage()
    const pageErrors = []
    page.on("pageerror", (error) => pageErrors.push(error.message))
    try {
      await page.goto("/admissions")
      const nav = navFor(page, width)
      await expect(nav).toBeVisible()
      await expect(
        page.getByRole("heading", { name: "Fila de admissões", exact: true }),
      ).toBeVisible()
      // A marca existe em todas as larguras — abaixo de md era ela que sumia.
      await expect(page.getByRole("link", { name: "Bivaque, início", exact: true })).toBeVisible()
      // As quatro rotas de operador têm entrada; "Comunidades" é pendência
      // nomeada (aponta para o diretório do membro até existir fila própria).
      for (const label of ["Admissões", "Denúncias", "Guia de chegada", "Chegadas"]) {
        await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible()
      }
      await expect(nav.getByRole("link", { name: "Admissões", exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      )
      // A busca do cabeçalho é a busca global do produto: o formulário aponta
      // para /explorar com o parâmetro `search` que aquela página lê. Abaixo de
      // md o mesmo formulário está no DOM mas não é rendu — fiel ao shell.
      const searchForm = page.locator('form[action="/explorar"]')
      await expect(searchForm).toHaveCount(1)
      await expect(searchForm.locator('input[name="search"]')).toHaveCount(1)
      if (width >= 768) await expect(searchForm).toBeVisible()
      else await expect(searchForm).toBeHidden()
      // Next's development toolbar can precede the app in the tab sequence.
      for (let step = 0; step < 3; step += 1) {
        await page.keyboard.press("Tab")
        if (
          await page
            .getByRole("link", { name: "Pular para o conteúdo" })
            .evaluate((element) => element === document.activeElement)
        )
          break
      }
      await expect(
        page.getByRole("link", { name: "Pular para o conteúdo", exact: true }),
      ).toBeFocused()
      await page.keyboard.press("Enter")
      await expect(page.locator("#operacao-conteudo")).toBeFocused()
      await expect(page.getByRole("link", { name: "Notificações", exact: true })).toHaveAttribute(
        "href",
        "/notifications",
      )
      await nav.getByRole("link", { name: "Denúncias", exact: true }).click()
      await expect(
        page.getByRole("heading", { name: "Fila de denúncias", exact: true }),
      ).toBeVisible()
      await page.reload()
      await expect(nav.getByRole("link", { name: "Denúncias", exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      )
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1)
      await expect(page.getByText("Não foi possível carregar", { exact: false })).toHaveCount(0)
      const firstReport = page.locator('main a[href^="/reports/"]').first()
      await expect(firstReport).toBeVisible()
      await firstReport.click()
      await expect(page).toHaveURL(/\/reports\/[^/]+$/)
      await expect(nav.getByRole("link", { name: "Denúncias", exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      )
      await page.goBack()
      // Saída 1 — "Voltar ao Bivaque": devolve ao produto com a sessão viva, e
      // o retorno pelo histórico do navegador reencontra o shell.
      const voltar = page
        .getByRole("link", { name: "Voltar ao Bivaque", exact: true })
        .filter({ visible: true })
      await expect(voltar).toHaveCount(1)
      await voltar.click()
      await expect(page).toHaveURL(/\/inicio$/)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      await page.goBack()
      await expect(nav).toBeVisible()
      // Saída 2 — "Sair da operação": neste candidato encerra a sessão e cai
      // em /login (human_decision pendente — a prova afirma o comportamento
      // real, não a semântica da branch irmã). Depois disso a rota protegida
      // é negada de novo: sem sessão viva não há como reassumir o shell.
      const sair = page
        .getByRole("button", { name: "Sair da operação", exact: true })
        .filter({ visible: true })
      await expect(sair).toHaveCount(1)
      await sair.click()
      await expect(page).toHaveURL(/\/login/)
      await expect(
        page.getByRole("heading", { name: "Que bom ter você de volta.", exact: true }),
      ).toBeVisible()
      await page.goto("/admissions")
      await expect(page).not.toHaveURL(/\/admissions$/)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      )
      expect(overflow).toBe(false)
      expect(pageErrors).toEqual([])
      results.push({
        width,
        actor: "operator",
        email: "operador@bivaque.example.invalid",
        finalDestination: "/login (sessão encerrada por Sair da operação)",
        valid: true,
        checks: [
          "queue",
          "brand-all-widths",
          "four-operator-entries",
          "search-form-global-domain",
          "active-nav",
          "reload",
          "detail",
          "keyboard-skip",
          "voltar-preserves-session",
          "sair-signs-out-to-login",
          "no-overflow",
          "no-pageerror",
        ],
      })
    } catch (error) {
      results.push({ width, actor: "operator", valid: false, error: error.message })
    } finally {
      await context.close()
    }
  }
  for (const [actor, auth] of [
    ["member", member],
    ["visitor", null],
  ]) {
    const context = await contextFor(1440, auth)
    try {
      const page = await context.newPage()
      for (const path of ["/admissions", "/reports"]) {
        await page.goto(path)
        await expect(page).not.toHaveURL(new RegExp(`${path}$`))
        await expect(page.getByRole("navigation", { name: /^Operação/ })).toHaveCount(0)
        await expect(page.locator("#admissions-heading, #reports-heading")).toHaveCount(0)
      }
      results.push({
        actor,
        email: actor === "member" ? "visual@bivaque.example.invalid" : null,
        valid: true,
        checks: ["both-operator-routes-denied", "no-operator-content"],
      })
    } catch (error) {
      results.push({ actor, valid: false, error: error.message })
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}

mkdirSync(output, { recursive: true })
const valid = results.length === 5 && results.every((result) => result.valid)
// The revision alone lies whenever the work is uncommitted: it names the commit
// that does NOT contain the code just proven. Recording `dirty` is what stops a
// later reader from attributing this evidence to the baseline. It still does not
// prove the server was built from this tree — `baseURL` is the other half.
const revision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()
const dirty = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim().length > 0
writeFileSync(
  join(output, "report.json"),
  `${JSON.stringify({ valid, baseURL, revision, dirty, results }, null, 2)}\n`,
)
console.log(JSON.stringify({ valid, revision, dirty, results }, null, 2))
if (!valid) process.exitCode = 1
