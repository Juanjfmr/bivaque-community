import { expect, go, routeOf, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 38: anúncio e negócio no celular com a foto até o topo e a barra transparente por cima,
// que volta ao normal quando a foto passa por baixo dela. Outras telas e o desktop não mudam.
const phone = (page) => page.viewportSize().width < 720
const state = (page) =>
  page.evaluate(() => {
    const bar = document.querySelector("#topbar")
    const hero = document.querySelector("#main .detail-hero").getBoundingClientRect()
    return {
      immersive: document.body.classList.contains("immersive"),
      solid: bar.classList.contains("bar-solid"),
      bg: getComputedStyle(bar).backgroundColor,
      title: getComputedStyle(bar.querySelector(".top-title")).opacity,
      heroTop: Math.round(hero.top),
      heroWide: Math.abs(hero.width - document.querySelector("main").clientWidth) <= 1,
    }
  })
async function scrollMain(page, y) {
  await page.evaluate((v) => {
    const m = document.querySelector("main")
    m.style.scrollBehavior = "auto"
    m.scrollTop = v
    m.dispatchEvent(new Event("scroll"))
  }, y)
  await settle(page)
}

const checkpoints = {
  async "listing-photo-reaches-the-top"(page) {
    await snapshot(page)
    await go(page, "anuncio/i2")
    const s = await state(page)
    if (!phone(page)) {
      expect(!s.immersive && s.heroTop > 60, `desktop mudou: ${JSON.stringify(s)}`)
      return
    }
    expect(s.immersive && s.heroTop === 0 && s.heroWide, `foto: ${JSON.stringify(s)}`)
    expect(
      s.bg === "rgba(0, 0, 0, 0)" && s.title === "0",
      `barra sobre a foto: ${JSON.stringify(s)}`,
    )
    await scrollMain(page, 600)
    const after = await state(page)
    expect(
      after.solid && after.title === "1" && after.bg !== "rgba(0, 0, 0, 0)",
      `depois de rolar: ${JSON.stringify(after)}`,
    )
  },
  async "business-photo-reaches-the-top"(page) {
    if (!phone(page)) return
    await snapshot(page)
    await go(page, "negocio/b4")
    const s = await state(page)
    expect(s.immersive && s.heroTop === 0, `negócio: ${JSON.stringify(s)}`)
  },
  async "back-still-works-over-the-photo"(page) {
    if (!phone(page)) return
    await snapshot(page)
    await go(page, "imoveis")
    await page.locator('#main [data-action="open-item"][data-value="i2"]').first().click()
    await settle(page)
    expect((await routeOf(page)).name === "anuncio", "não abriu o anúncio")
    await page.locator('#topbar [data-action="back"]').click()
    await settle(page)
    expect((await routeOf(page)).name === "imoveis", `voltar levou a ${(await routeOf(page)).name}`)
    expect(
      !(await page.evaluate(() => document.body.classList.contains("immersive"))),
      "a barra ficou transparente fora do detalhe",
    )
  },
}

await runProof(checkpoints, "round38")
