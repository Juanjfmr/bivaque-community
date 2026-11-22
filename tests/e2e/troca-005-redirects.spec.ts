import { expect, test } from "@playwright/test"

/**
 * TROCA-005 fase 2 — as denúncias do membro, a área do prestador e o convite de
 * prestador saíram do site: o endereço antigo responde 307 para a tela fundida
 * no app, com ID e token preservados, e o visitante anônimo segue o portão até
 * a entrada do app sem ciclo.
 *
 * Espelha `grupos-redirect.spec.ts`: o 307 é lido antes do salto
 * (`maxRedirects: 0`) e a navegação real é medida na página.
 */

const ID = "41000000-0000-4000-8000-000000000051"
const TOKEN = "a".repeat(64)

test("as rotas antigas respondem 307 com ID, alvo e token preservados", async ({ request }) => {
  for (const [origem, destino] of [
    ["/denuncias?origem=aviso", "/app/ajuda?aba=denuncias&origem=aviso"],
    [`/denuncias/${ID}?origem=aviso`, `/app/ajuda?aba=denuncias&denuncia=${ID}&origem=aviso`],
    [`/denuncias/nova?tipo=post&id=${ID}`, `/app/ajuda?aba=denuncias&denunciar=post:${ID}`],
    ["/denuncias/nova?origem=aviso", "/app/ajuda?aba=denuncias&origem=aviso"],
    ["/prestador?origem=aviso", "/app/meu-negocio?origem=aviso"],
    ["/prestador/atendimento", "/app/meu-negocio?aba=pedidos"],
    ["/prestador/catalogo", "/app/meu-negocio?aba=catalogo"],
    ["/prestador/conta", "/app/meu-negocio?aba=conta"],
    ["/prestador/ficha", "/app/meu-negocio?aba=ficha"],
    [`/prestador/pedidos/${ID}`, `/app/meu-negocio?aba=pedidos&pedido=${ID}`],
    [`/prestador-convite/${TOKEN}`, `/app/entrar?prestador=${TOKEN}`],
  ] as const) {
    const resposta = await request.get(origem, { maxRedirects: 0 })
    expect(resposta.status(), origem).toBe(307)
    const localizacao = new URL(resposta.headers()["location"] ?? "", "http://127.0.0.1:3000")
    const esperado = new URL(destino, "http://127.0.0.1:3000")
    expect(localizacao.pathname, origem).toBe(esperado.pathname)
    for (const [chave, valor] of esperado.searchParams) {
      expect(localizacao.searchParams.get(chave), `${origem} → ${chave}`).toBe(valor)
    }
  }
})

test("o anônimo segue o portão até o app, sem ciclo", async ({ page }) => {
  for (const [origem, destino] of [
    ["/denuncias", "/app/ajuda"],
    [`/denuncias/${ID}`, "/app/ajuda"],
    ["/prestador", "/app/meu-negocio"],
  ] as const) {
    await page.goto(origem)
    // A casca do app manda quem não tem sessão para a entrada, carregando o
    // destino pedido — e não devolve a pessoa à rota antiga (o que seria ciclo).
    await page.waitForURL(/\/app\/entrar(?:\?|$)/)
    const atual = new URL(page.url())
    expect(atual.pathname.startsWith("/app/"), origem).toBe(true)
    expect(atual.pathname, origem).not.toBe(origem)
    expect(atual.searchParams.get("redirect") ?? "", origem).toContain(destino)
  }
})

// O convite fica FORA do laço acima: ele é o único destino que não carrega
// `redirect` e cujo parâmetro é credencial. A entrada lê `?prestador=`, põe o
// aceite em memória e apaga o token do endereço (M1 da correção 1); um `expect`
// de `redirect` aqui exigiria o token de volta na barra, que é justamente o que
// o desenho proíbe.
test("o convite de prestador termina no aceite da entrada, sem o token na URL", async ({
  page,
}) => {
  await page.goto(`/prestador-convite/${TOKEN}`)
  await page.waitForURL(/\/app\/entrar(?:\?|$)/)
  await expect.poll(() => new URL(page.url()).searchParams.has("prestador")).toBe(false)

  const atual = new URL(page.url())
  expect(atual.pathname).toBe("/app/entrar")
  expect(atual.searchParams.get("redirect")).toBeNull()
  expect(page.url()).not.toContain(TOKEN)

  // O aceite é um ESTADO da entrada, não uma tela nova: o painel do convite
  // aparece na mesma `/app/entrar` (para token válido, inválido ou já usado).
  await expect(page.locator('[data-tela="convite-de-prestador"]')).toBeVisible()
})
