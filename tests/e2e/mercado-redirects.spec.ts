// RUN-156 / F06 resíduo — as telas web de criar e editar desapego saíram; os
// endereços antigos passam a chegar ao app. Mesmo desenho do RUN-133: o redirect
// de configuração acontece antes do portão (apps/web/proxy.ts), então a prova
// roda sem sessão e o app responde com o próprio estado de sessão vencida. Se o
// endereço antigo ainda passasse pelo portão, a URL final seria /app/entrar.
//
// E2E da web depende do Next + Supabase local (CI); não roda neste worktree.

import { expect, test } from "@playwright/test"

// Id sintético: o spec mede o id no destino, não a existência do anúncio.
const ANUNCIO_ID = "41000000-0000-4000-8000-000000000051"
const BASE_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"

// Caminho antigo → destino no app. O app cria pela folha do Criar (não existe
// `/app/mercado/novo`) e edita dentro do anúncio, por isso a lista e o anúncio.
// RUN-164: o imóvel segue o mesmo molde — a folha de Imóveis publica e a
// gestão do anúncio edita.
const TROCAS = [
  ["/mercado?preco_min=10000&pagina=2", "/app/mercado"],
  ["/imoveis?q=centro&quartos=2&valor_max=4000", "/app/imoveis"],
  ["/meus-anuncios", "/app/meus-anuncios"],
  ["/mercado/novo?categoria=eletronicos", "/app/mercado"],
  [`/mercado/${ANUNCIO_ID}/editar?aba=fotos`, `/app/anuncio/${ANUNCIO_ID}`],
  ["/imoveis/novo", "/app/imoveis"],
  [`/imoveis/${ANUNCIO_ID}/editar`, `/app/anuncio/${ANUNCIO_ID}`],
] as const

test("telas antigas do mercado levam ao app, sem sessão, nas três larguras", async ({ page }) => {
  for (const [caminho, destino] of TROCAS) {
    const resposta = await fetch(`${BASE_URL}${caminho}`, { redirect: "manual" })
    expect(resposta.status, `status de ${caminho}`).toBe(307)
    const localizacao = new URL(resposta.headers.get("location") ?? "", BASE_URL)
    expect(localizacao.pathname, `destino de ${caminho}`).toBe(destino)
    // A query do caminho antigo chega inteira: nenhum filtro se perde na troca.
    expect([...localizacao.searchParams].sort(), `query de ${caminho}`).toEqual(
      [...new URL(caminho, BASE_URL).searchParams].sort(),
    )

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

test("as regras de criar e editar não capturam a lista nem o anúncio", async () => {
  for (const [caminho, destino] of [
    ["/mercado", "/app/mercado"],
    [`/mercado/${ANUNCIO_ID}`, `/app/anuncio/${ANUNCIO_ID}`],
    ["/imoveis", "/app/imoveis"],
    [`/imoveis/${ANUNCIO_ID}`, `/app/anuncio/${ANUNCIO_ID}`],
  ] as const) {
    const resposta = await fetch(`${BASE_URL}${caminho}`, { redirect: "manual" })
    expect(resposta.status, `status de ${caminho}`).toBe(307)
    expect(new URL(resposta.headers.get("location") ?? "", BASE_URL).pathname, caminho).toBe(
      destino,
    )
  }
  // Subcaminho que não é `editar` não vira anúncio (quem não casa segue o
  // caminho normal, o portão), e `novo/editar` não vira um anúncio "novo".
  for (const caminho of [
    `/mercado/${ANUNCIO_ID}/denunciar`,
    "/mercado/novo/editar",
    `/imoveis/${ANUNCIO_ID}/denunciar`,
    "/imoveis/novo/editar",
  ]) {
    const resposta = await fetch(`${BASE_URL}${caminho}`, { redirect: "manual" })
    const destino = new URL(resposta.headers.get("location") ?? "/", BASE_URL).pathname
    expect(destino.startsWith("/app/anuncio"), `destino de ${caminho}`).toBe(false)
  }
})

test("a lista de alertas de imóvel continua na web, sem redirect", async () => {
  const resposta = await fetch(`${BASE_URL}/imoveis/alertas`, { redirect: "manual" })
  expect(resposta.headers.get("location")).toBeNull()
})
