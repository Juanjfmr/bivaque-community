import { expect, test } from "@playwright/test"

const BASE_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const VERBETE_ID = "a0000000-0000-4000-8000-000000000001"
const VERBETE = `/guide/${VERBETE_ID}`
const TROCAS = [
  ["/guide", "/app/guia"],
  ["/guide?q=escola&categoria=school", "/app/guia"],
  ["/guide/sugerir", "/app/guia"],
  // F08: o verbete e o acompanhamento da correção são do app, com o id no destino.
  [VERBETE, `/app/guia/${VERBETE_ID}`],
  [`${VERBETE}/correcao`, `/app/guia/${VERBETE_ID}`],
] as const

test("as telas antigas do Guia levam ao app, sem sessão, nas três larguras", async ({ page }) => {
  for (const [caminho, destino] of TROCAS) {
    const resposta = await fetch(`${BASE_URL}${caminho}`, { redirect: "manual" })
    expect(resposta.status).toBe(307)
    const local = new URL(resposta.headers.get("location") ?? "", BASE_URL)
    expect(local.pathname).toBe(destino)
    // O recorte do link chega junto: é o que o Guia do app semeia do endereço (LT-006).
    for (const [chave, valor] of new URL(caminho, BASE_URL).searchParams) {
      expect(local.searchParams.get(chave)).toBe(valor)
    }

    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(caminho)
      // Aterrissagem no app pelo pathname: as variantes com query chegam com os
      // params preservados (provado acima), então não se ancora o fim da URL.
      expect(new URL(page.url()).pathname).toBe(destino)
      await expect(page.locator('[data-estado="sessao-vencida"]')).toBeVisible()
    }
  }
})
