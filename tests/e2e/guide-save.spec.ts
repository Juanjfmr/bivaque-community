import { expect, test } from "@playwright/test"
import { signInAs } from "./helpers/session"

const GUIDE_ENTRY_ID = "a0000000-0000-4000-8000-000000000001"

test("referência do guia pode ser salva e removida", async ({ page }) => {
  await signInAs(page.context(), "membro-1@bivaque.example.invalid")
  await page.goto(`/guide/${GUIDE_ENTRY_ID}`, { waitUntil: "load" })

  const save = page.getByRole("button", { name: "Salvar", exact: true })
  if ((await save.count()) > 0) {
    await save.click()
    await expect(page.getByRole("button", { name: "Salvo", exact: true })).toBeVisible()
  }

  const saved = page.getByRole("button", { name: "Salvo", exact: true })
  await expect(saved).toBeVisible()
  await page.reload({ waitUntil: "load" })
  await expect(page.getByRole("button", { name: "Salvo", exact: true })).toBeVisible()

  await page.getByRole("button", { name: "Salvo", exact: true }).click()
  await expect(page.getByRole("button", { name: "Salvar", exact: true })).toBeVisible()
})
