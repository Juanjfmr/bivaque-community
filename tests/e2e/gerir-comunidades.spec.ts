import { expect, test } from "@playwright/test"
import { signInAs } from "./helpers/session"

const ID = "71000000-0000-4000-8000-000000000001"

test("dono encontra as portas da comunidade", async ({ page, context }) => {
  await signInAs(context, "dono-vila@bivaque.example.invalid")
  await page.goto("/app/comunidade")
  const ponte = page.getByRole("link", { name: "Gerenciar comunidades" })
  await expect(ponte).toHaveAttribute("href", "/gerir-comunidades")
  await ponte.click()
  await expect(page.getByRole("heading", { name: "Gerenciar comunidades" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Convidar membros" })).toHaveAttribute(
    "href",
    `/communities/${ID}/invite`,
  )
  await expect(page.getByRole("link", { name: "Indicar prestador" })).toHaveAttribute(
    "href",
    `/communities/${ID}/indicar-prestador`,
  )
  await expect(page.getByRole("link", { name: "Administrar comunidade" })).toHaveAttribute(
    "href",
    `/communities/${ID}/admin`,
  )
})

test("membro aprovado encontra as portas sem acesso de administração", async ({
  page,
  context,
}) => {
  await signInAs(context, "membro-1@bivaque.example.invalid")
  await page.goto("/gerir-comunidades")
  await expect(page.getByRole("link", { name: "Convidar membros" })).toHaveAttribute(
    "href",
    `/communities/${ID}/invite`,
  )
  await expect(page.getByRole("link", { name: "Indicar prestador" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Administrar comunidade" })).toHaveCount(0)
})

test("visitante é encaminhado à entrada com o destino", async ({ request }) => {
  const resposta = await request.get("/gerir-comunidades", { maxRedirects: 0 })
  expect(resposta.status()).toBe(307)
  const destino = new URL(resposta.headers()["location"] ?? "", "http://localhost")
  expect(destino.pathname).toBe("/login")
  expect(destino.searchParams.get("redirect")).toBe("/gerir-comunidades")
})
