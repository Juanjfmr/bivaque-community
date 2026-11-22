// RUN-156 / F06 resíduo — as telas web de criar e editar desapego saíram; os
// endereços antigos passam a chegar ao app. Mesmo desenho do RUN-133: o redirect
// de configuração acontece antes do portão (apps/web/proxy.ts). Sem sessão,
// o app encaminha à entrada com o destino de retorno.
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
  ["/imoveis?q=centro&quartos=2&valor_max=4000", "/app/mercado?aba=imoveis"],
  ["/meus-anuncios", "/app/meus-anuncios"],
  [`/mercado/${ANUNCIO_ID}?origem=email`, `/app/anuncio/${ANUNCIO_ID}`],
  [`/imoveis/${ANUNCIO_ID}?origem=push`, `/app/anuncio/${ANUNCIO_ID}`],
  ["/mercado/novo?categoria=eletronicos", "/app/mercado"],
  [`/mercado/${ANUNCIO_ID}/editar?aba=fotos`, `/app/anuncio/${ANUNCIO_ID}`],
  ["/imoveis/novo", "/app/mercado?aba=imoveis"],
  // RUN-169: a gestão dos alertas de busca é do app, e a query segue na troca.
  ["/imoveis/alertas?aba=imoveis", "/app/imoveis/alertas"],
  [`/imoveis/${ANUNCIO_ID}/editar`, `/app/anuncio/${ANUNCIO_ID}`],
] as const

test("telas antigas do mercado levam ao app, sem sessão, nas três larguras", async ({ page }) => {
  for (const [caminho, destino] of TROCAS) {
    const resposta = await fetch(`${BASE_URL}${caminho}`, { redirect: "manual" })
    expect(resposta.status, `status de ${caminho}`).toBe(307)
    const localizacao = new URL(resposta.headers.get("location") ?? "", BASE_URL)
    const esperado = new URL(destino, BASE_URL)
    // NAV-002: o Mercado tem um endereço só; a aba de imóveis vai na query.
    const queryEsperada = [
      ...esperado.searchParams,
      ...new URL(caminho, BASE_URL).searchParams,
    ].sort()
    expect(localizacao.pathname, `destino de ${caminho}`).toBe(esperado.pathname)
    // A query do caminho antigo chega inteira: nenhum filtro se perde na troca.
    expect([...localizacao.searchParams].sort(), `query de ${caminho}`).toEqual(queryEsperada)

    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(caminho)
      await expect(page).toHaveURL(
        (url) => {
          if (url.pathname !== "/app/entrar") return false
          const retorno = new URL(url.searchParams.get("redirect") ?? "", BASE_URL)
          return (
            retorno.pathname === esperado.pathname &&
            JSON.stringify([...retorno.searchParams].sort()) === JSON.stringify(queryEsperada)
          )
        },
        { timeout: 30_000 },
      )
    }
  }
})

test("as regras de criar e editar não capturam a lista nem o anúncio", async () => {
  for (const [caminho, destino] of [
    ["/mercado", "/app/mercado"],
    [`/mercado/${ANUNCIO_ID}`, `/app/anuncio/${ANUNCIO_ID}`],
    ["/imoveis", "/app/mercado"],
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

// RUN-169: a lista de alertas de imóvel saiu da web. O endereço antigo chega à
// tela do app (provado no TROCAS, com a query) e não vira um anúncio "alertas".
test("a lista de alertas de imóvel é do app, não do detalhe do anúncio", async () => {
  const resposta = await fetch(`${BASE_URL}/imoveis/alertas`, { redirect: "manual" })
  const destino = new URL(resposta.headers.get("location") ?? "/", BASE_URL).pathname
  expect(destino.startsWith("/app/anuncio")).toBe(false)
  expect(destino).toBe("/app/imoveis/alertas")
})
