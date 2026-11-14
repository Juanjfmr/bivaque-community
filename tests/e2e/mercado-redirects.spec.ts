import { expect, test } from "@playwright/test"

const BASE_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const TROCAS = [
  ["/mercado?preco_min=10000&pagina=2", "/app/mercado"],
  ["/imoveis?q=centro&quartos=2&valor_max=4000", "/app/imoveis"],
  ["/meus-anuncios", "/app/meus-anuncios"],
] as const

test("listas antigas do mercado levam ao app, sem sessão, nas três larguras", async ({ page }) => {
  for (const [caminho, destino] of TROCAS) {
    const resposta = await fetch(`${BASE_URL}${caminho}`, { redirect: "manual" })
    expect(resposta.status).toBe(307)
    expect(new URL(resposta.headers.get("location") ?? "", BASE_URL).pathname).toBe(destino)

    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(caminho)
      // Aterrissagem no app pelo pathname: as variantes com query chegam com os
      // params preservados (provado no TROCADAS), então não se ancora o fim da URL.
      expect(new URL(page.url()).pathname).toBe(destino)
      await expect(page.locator('[data-estado="sessao-vencida"]')).toBeVisible()
    }
  }
})
