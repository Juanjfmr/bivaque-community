// Targeted, read-only runtime proof. Uses the running candidate, never resets DB.
import { execFileSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { chromium, expect } from "@playwright/test"
import { fetchSession } from "./capture.mjs"

const baseURL = process.env["BIVAQUE_VISUAL_BASE_URL"] ?? "http://127.0.0.1:3107"
const output = process.env["BIVAQUE_OPERATION_PROOF_OUT"] ?? ".visual/operation-proof"
const operator = await fetchSession({ email: "operador@bivaque.example.invalid" })
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

try {
  for (const width of [375, 768, 1440]) {
    const context = await contextFor(width, operator)
    const page = await context.newPage()
    const pageErrors = []
    page.on("pageerror", (error) => pageErrors.push(error.message))
    try {
      await page.goto("/admissions")
      const nav = page.getByRole("navigation", { name: "Painel do operador", exact: true })
      await expect(nav).toBeVisible()
      await expect(
        page.getByRole("heading", { name: "Fila de admissões", exact: true }),
      ).toBeVisible()
      await expect(nav.getByRole("link", { name: "Admissões", exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      )
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
      await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeFocused()
      await page.keyboard.press("Enter")
      await expect(page.locator("#operation-content")).toBeFocused()
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
      for (const label of ["Voltar ao Bivaque", "Sair da operação"]) {
        await page.getByRole("link", { name: label, exact: true }).click()
        await expect(page).toHaveURL(/\/inicio$/)
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
        await page.goBack()
        await expect(nav).toBeVisible()
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      )
      expect(overflow).toBe(false)
      expect(pageErrors).toEqual([])
      results.push({
        width,
        actor: "operator",
        valid: true,
        checks: [
          "queue",
          "active-nav",
          "reload",
          "detail",
          "keyboard-skip",
          "both-exits-preserve-session",
          "browser-back",
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
        await expect(
          page.getByRole("navigation", { name: "Painel do operador", exact: true }),
        ).toHaveCount(0)
        await expect(page.locator("#admissions-heading, #reports-heading")).toHaveCount(0)
      }
      results.push({
        actor,
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
