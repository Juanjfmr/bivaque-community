import { expect, test } from "@playwright/test"

// LANDING-CTA-ANTES-DO-REGISTRO: o CTA da landing é um `<a href>` no HTML do
// servidor, então a página navega sem JavaScript e no primeiro toque, antes de
// qualquer componente ser registrado no cliente.
//
// O CTA do topo, a barra fixa e a folha do menu só aparecem quando a ilha de
// comportamento roda: sem JavaScript eles ficam escondidos e não são tocáveis
// em navegador nenhum. A prova delas aqui é a marcação servida (as cinco âncoras iguais no
// HTML); o toque nas cinco, com JavaScript ligado, está em landing-v8.spec.ts.
const SIZES = [
  [375, 812],
  [768, 1024],
  [1440, 900],
] as const

const CTAS = 5

// Só uma vez: as larguras são abertas dentro do teste.
const onlyDesktop = (testInfo: { project: { name: string } }) => {
  test.skip(
    testInfo.project.name !== "desktop-1440",
    "as três larguras são abertas no próprio teste",
  )
}

test("serve cada Criar conta como âncora, sem depender do Material no cliente", async ({
  request,
}, testInfo) => {
  onlyDesktop(testInfo)
  // Given um cliente HTTP puro, como o rastreador de busca ou a prévia do link
  const response = await request.get("/")
  expect(response.status()).toBe(200)
  const html = await response.text()

  // Then as cinco âncoras já vêm prontas no HTML do servidor
  const anchors = html.match(/<a[^>]*class="ld-cta-btn"[^>]*>/g) ?? []
  expect(anchors, "todo Criar conta é um <a href> no HTML").toHaveLength(CTAS)
  for (const anchor of anchors) expect(anchor).toContain('href="/signup"')
  expect(html.match(/>Criar conta</g), "o rótulo vem no HTML").toHaveLength(CTAS)

  // And nenhum CTA depende de componente do Material, que só navega depois de
  // registrado no cliente
  expect(html).not.toContain("<md-filled-button")
})

test("navega no primeiro toque, com JavaScript desligado, em 375/768/1440", async ({
  browser,
}, testInfo) => {
  onlyDesktop(testInfo)
  test.setTimeout(120_000)

  for (const [width, height] of SIZES) {
    // Given a landing servida e o JavaScript desligado no navegador
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width, height },
    })
    const page = await context.newPage()
    await page.goto("/")
    await expect(page.locator("#landing")).toBeVisible()

    // Then os cinco CTAs estão no DOM como links para o cadastro
    const anchors = await page.locator("a.ld-cta-btn").evaluateAll((nodes) =>
      nodes.map((node) => ({
        href: node.getAttribute("href"),
        label: (node.textContent ?? "").replace(/\s+/g, " ").trim(),
      })),
    )
    expect(anchors, `${width}px`).toHaveLength(CTAS)
    for (const anchor of anchors) {
      expect(anchor.href, `${width}px`).toBe("/signup")
      expect(anchor.label, `${width}px`).toBe("Criar conta")
    }

    // When a pessoa toca o CTA da dobra
    await page.locator("#ld-hero-cta").click()
    await expect(page).toHaveURL(/\/app\/entrar$/)

    // And depois toca o da chamada final
    await page.goto("/")
    await page.locator("#fim .ld-cta-btn").scrollIntoViewIfNeeded()
    await page.locator("#fim .ld-cta-btn").click()
    await expect(page).toHaveURL(/\/app\/entrar$/)

    await context.close()
    testInfo.annotations.push({ type: "largura", description: `${width}px` })
  }
})
