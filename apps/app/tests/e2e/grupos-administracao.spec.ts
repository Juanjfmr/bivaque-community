import { expect, test } from "@playwright/test"
import { simularGrupos } from "./grupos-ajuda"

for (const tema of ["claro", "escuro"]) {
  test(`administra pedidos e regras e compartilha no tema ${tema}`, async ({ page }) => {
    await simularGrupos(page, { membro: true })
    await page.emulateMedia({ colorScheme: tema === "escuro" ? "dark" : "light" })
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { value: undefined })
      Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => {} } })
    })
    let regras = "Regra anterior"
    let pedido = true
    await page.route(/\/api\/app\/grupos\/g-futebol(?:\/|\?|$)/, async (route) => {
      const url = new URL(route.request().url())
      const path = url.pathname
      if (path.endsWith("/pedidos/u1")) {
        pedido = false
        await route.fulfill({ status: 204 })
        return
      }
      if (path.endsWith("/pedidos")) {
        await route.fulfill({
          json: {
            pedidos: pedido ? [{ id: "u1", nome: "Ana", motivo: "Quero participar" }] : [],
            proximo: null,
          },
        })
        return
      }
      if (path.endsWith("/membros")) {
        await route.fulfill({
          json: {
            membros: [
              { id: "dono", nome: "Dona", papel: "owner" },
              { id: "u1", nome: "Ana", papel: "member" },
            ],
          },
        })
        return
      }
      if (path.endsWith("/regras")) {
        regras = route.request().postDataJSON().regras
        await route.fulfill({ status: 204 })
        return
      }
      if (path.endsWith("/g-futebol")) {
        await route.fulfill({
          json: {
            grupo: {
              id: "g-futebol",
              nome: "Futebol",
              descricao: "",
              regras,
              fechado: false,
              membro: true,
              pendente: false,
              admin: true,
              dono: true,
              membros: 2,
              fixada: null,
            },
            cidade: "Manaus",
            publicacoes: [],
            proximo: null,
          },
        })
        return
      }
      await route.fallback()
    })
    await page.goto("/app/grupo/g-futebol")
    await page.evaluate((valor) => {
      document.documentElement.dataset["tema"] = valor
    }, tema)
    await page.getByRole("button", { name: "Convidar" }).click()
    await expect(page.getByText("Link copiado.")).toBeVisible()
    await page.getByRole("button", { name: "Administrar grupo" }).click()
    await page.getByText("Pedidos de entrada").click()
    await page.getByRole("button", { name: "Aprovar" }).click()
    await expect(page.getByText("Pedido aprovado.")).toBeVisible()
    await page.getByLabel("Regras do grupo").fill("Nova regra")
    await page.getByRole("button", { name: "Salvar regras" }).click()
    await expect(page.getByText("Regras salvas.")).toBeVisible()
    await page.reload()
    await expect(page.getByLabel("Regras do grupo")).toHaveValue("Nova regra")
  })
}

test("membro não vê administração e recebe recusa ao abrir o endereço", async ({ page }) => {
  await simularGrupos(page, { membro: true })
  await page.goto("/app/grupo/g-pets")
  await expect(page.getByRole("button", { name: "Administrar grupo" })).toHaveCount(0)
  await page.goto("/app/grupo/g-pets/administrar")
  await expect(page.getByText("Você não administra este grupo.")).toBeVisible()
})
