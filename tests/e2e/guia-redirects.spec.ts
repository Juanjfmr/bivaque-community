import { expect, test } from "@playwright/test"

const BASE_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const VERBETE_ID = "a0000000-0000-4000-8000-000000000001"
const VERBETE = `/guide/${VERBETE_ID}`
const TROCAS = [
  ["/guide", "/app/guia"],
  ["/guide?q=escola&categoria=school", "/app/guia"],
  // F08: o verbete e o acompanhamento da correção são do app, com o id no destino.
  [VERBETE, `/app/guia/${VERBETE_ID}`],
  [`${VERBETE}/correcao`, `/app/guia/${VERBETE_ID}`],
] as const
// A única subrota que fica na web: sugerir um lugar novo está fora do escopo do
// lançamento, e a regra do verbete não captura "sugerir" como id.
const SUBCAMINHOS = ["/guide/sugerir"] as const

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

test("sugerir um lugar continua na web: a regra do verbete é de id", async () => {
  for (const caminho of SUBCAMINHOS) {
    const resposta = await fetch(`${BASE_URL}${caminho}`, { redirect: "manual" })
    const local = new URL(resposta.headers.get("location") ?? "", BASE_URL)
    // Sem sessão, a subrota cai no portão da web com o caminho de volta — nunca
    // na lista do app. É a prova negativa de que /guide/:id não captura /guide/sugerir.
    expect(local.pathname, caminho).toBe("/login")
    expect(local.searchParams.get("redirect"), caminho).toBe(caminho)
  }
})
