import { expect, go, routeOf, runProof, settle } from "./proof-harness.mjs"

// Rodada 08: movimento arrojado. Os contextos da prova pedem movimento reduzido; aqui cada
// checkpoint liga o movimento (exceto o de movimento reduzido) para exercitar o voo da foto.
const motionOn = (page) => page.emulateMedia({ reducedMotion: "no-preference" })
const clones = (page) => page.locator(".motion-flight").count()
const firstCard = async (page, route, action) => {
  await go(page, route)
  const card = page.locator(`#main .photo-card [data-action="${action}"]`).first()
  return { card, id: await card.getAttribute("data-value") }
}
const settled = async (page) => {
  await page.waitForTimeout(1100)
  return page.evaluate(() => ({
    clones: document.querySelectorAll(".motion-flight").length,
    hidden: [...document.querySelectorAll("#page img")].filter((i) => i.style.opacity === "0")
      .length,
    running: document.getAnimations().filter((a) => a.playState === "running").length,
  }))
}

const checkpoints = {
  async "card-to-detail-flight"(page) {
    await motionOn(page)
    const { card, id } = await firstCard(page, "catalogo", "open-item")
    await card.click()
    await page.waitForTimeout(60)
    expect((await clones(page)) === 1, "foto não voou do cartão para o detalhe")
    const r = await routeOf(page)
    expect(r.name === "anuncio" && r.id === id, "não abriu o anúncio certo")
    const end = await settled(page)
    expect(
      !end.clones && !end.hidden && !end.running,
      `animação não terminou limpa: ${JSON.stringify(end)}`,
    )
    expect(await page.locator("#hero-image").isVisible(), "foto do detalhe não ficou visível")
  },
  async "detail-back-flight-and-focus"(page) {
    await motionOn(page)
    const { card, id } = await firstCard(page, "catalogo", "open-item")
    await card.click()
    await settled(page)
    await page.locator('[data-action="back"]:visible').first().click()
    await page.waitForTimeout(60)
    expect((await clones(page)) === 1, "foto não voltou para o cartão")
    const end = await settled(page)
    expect((await routeOf(page)).name === "catalogo", "voltar não retornou ao catálogo")
    expect(!end.clones && !end.hidden, `volta não terminou limpa: ${JSON.stringify(end)}`)
    expect(
      await page.evaluate((v) => document.activeElement?.dataset?.value === v, id),
      "foco não voltou ao cartão de origem",
    )
  },
  async "back-flight-lands-on-card"(page) {
    await motionOn(page)
    const { card, id } = await firstCard(page, "catalogo", "open-item")
    await card.click()
    await settled(page)
    await page.locator('[data-action="back"]:visible').first().click()
    // Perto do fim do voo (560 ms), a cópia precisa estar sobre a foto do cartão de origem.
    // O instante vem do relógio da animação: o voo só começa depois de a lista redesenhar, e
    // esse atraso varia com a carga da máquina (falhava também no HEAD, 3 em 18 contextos).
    await page
      .waitForFunction(
        () => {
          const a = document.querySelector(".motion-flight")?.getAnimations()[0]
          return a && a.currentTime >= 470
        },
        null,
        { polling: "raf", timeout: 5000 },
      )
      .catch(() => {})
    const gap = await page.evaluate((v) => {
      const clone = document.querySelector(".motion-flight")
      const img = document.querySelector(`#main [data-action="open-item"][data-value="${v}"] img`)
      if (!clone || !img) return null
      const a = clone.getBoundingClientRect()
      const b = img.getBoundingClientRect()
      return Math.max(Math.abs(a.left - b.left), Math.abs(a.top - b.top))
    }, id)
    expect(gap !== null, "sem voo de volta para medir")
    expect(gap <= 8, `foto pousou ${gap}px fora do cartão`)
  },
  async "business-flight"(page) {
    await motionOn(page)
    const { card } = await firstCard(page, "negocios", "open-biz")
    await card.click()
    await page.waitForTimeout(60)
    const flew = await clones(page)
    const end = await settled(page)
    expect((await routeOf(page)).name === "negocio", "não abriu o negócio")
    expect(
      flew <= 1 && !end.clones && !end.hidden,
      `negócio não terminou limpo: ${JSON.stringify(end)}`,
    )
  },
  async "rapid-clicks-leave-no-residue"(page) {
    await motionOn(page)
    for (let i = 0; i < 3; i++) {
      const { card } = await firstCard(page, "catalogo", "open-item")
      await card.click()
      await page.waitForTimeout(90)
      await page.locator('[data-action="back"]:visible').first().click()
      await page.waitForTimeout(90)
    }
    const end = await settled(page)
    expect((await routeOf(page)).name === "catalogo", "navegação rápida perdeu a rota")
    expect(!end.clones && !end.hidden, `restos após cliques rápidos: ${JSON.stringify(end)}`)
  },
  async "tab-stagger-finishes"(page) {
    await motionOn(page)
    await go(page, "inicio")
    await page.locator('[data-action="nav"][data-value="comunidade"]:visible').first().click()
    await settle(page)
    const end = await settled(page)
    const faded = await page.evaluate(
      () =>
        [...document.querySelectorAll("#page .photo-card, #page .list-row")].filter(
          (e) => Number(getComputedStyle(e).opacity) < 0.99,
        ).length,
    )
    expect(!end.running && !faded, `cascata não terminou: ${faded} cartões esmaecidos`)
  },
  async "reduced-motion-stays-instant"(page) {
    const { card } = await firstCard(page, "catalogo", "open-item")
    await card.click()
    await page.waitForTimeout(40)
    const flying = await clones(page)
    const running = await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === "running").length,
    )
    expect(
      !flying && !running,
      `animou com movimento reduzido: voo ${flying}, animações ${running}`,
    )
  },
}

await runProof(checkpoints, "round08")
