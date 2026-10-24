import { expect, test } from "@playwright/test"
import { seedSession } from "../helpers/session"

test("o tema acompanha a preferência do sistema sem recarregar", async ({ page }) => {
  await seedSession(page.context())
  await page.emulateMedia({ colorScheme: "light" })
  await page.goto("/app#comunidade")
  const light = await page
    .locator("body")
    .evaluate((body) => getComputedStyle(body).backgroundColor)
  const url = page.url()
  await page.emulateMedia({ colorScheme: "dark" })
  await expect
    .poll(() => page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor))
    .not.toBe(light)
  expect(page.url()).toBe(url)
})
