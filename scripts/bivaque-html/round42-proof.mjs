import { expect, go, reload, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 42: teclado certo em cada campo e vibração leve. O teclado é conferido no campo interno do
// Material (o inputmode repassado); a vibração, por um substituto de navigator.vibrate.
const inner = (page, sel) =>
  page.locator(sel).evaluate((el) => {
    const input = el.shadowRoot?.querySelector("input, textarea") || el
    return {
      mode: input.inputMode || input.getAttribute("inputmode"),
      auto: input.autocomplete || input.getAttribute("autocomplete"),
    }
  })
async function withVibrate(page) {
  await snapshot(page)
  await page.addInitScript(() => {
    window.__vibes = []
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: (ms) => window.__vibes.push(ms),
    })
  })
  await reload(page)
}
const vibes = (page) => page.evaluate(() => window.__vibes)

const checkpoints = {
  async "number-fields-open-the-number-keyboard"(page) {
    await snapshot(page)
    await go(page, "anuncio/i1")
    await page.locator('[data-action="item-offer"]:visible').first().click()
    await settle(page)
    expect((await inner(page, "#offer-amount")).mode === "numeric", "oferta sem teclado numérico")
    await page.keyboard.press("Escape")
    await settle(page)
    await go(page, "agenda")
    await page.locator('#main [data-action="create-event"]').first().click()
    await settle(page)
    expect(
      (await inner(page, "#event-max")).mode === "numeric",
      "vagas do encontro sem teclado numérico",
    )
  },
  async "general-rule-does-not-repeat-inputmode"(page) {
    await snapshot(page)
    await go(page, "anuncio/i1")
    await page.locator('[data-action="item-offer"]:visible').first().click()
    await settle(page)
    // A regra geral não repete o inputmode de quem já tem um (preço e condomínio usam decimal).
    const html = await page.evaluate(() => document.querySelector("#offer-amount").outerHTML)
    expect(
      (html.match(/inputmode=/g) || []).length === 1,
      `inputmode repetido: ${html.slice(0, 160)}`,
    )
  },
  async "search-shows-the-search-key"(page) {
    await snapshot(page)
    await go(page, "busca")
    expect((await inner(page, "#search-query")).mode === "search", "busca sem a tecla Buscar")
  },
  async "own-name-autofills"(page) {
    await snapshot(page)
    await go(page, "voce")
    await page.locator('[data-action="settings"]:visible').first().click()
    await settle(page)
    expect((await inner(page, "#profile-name")).auto === "name", "nome sem autopreenchimento")
  },
  async "save-vibrates-once"(page) {
    await withVibrate(page)
    await go(page, "imoveis")
    await page.evaluate(() => document.querySelector('#main [data-action="save-item"]').click())
    await settle(page)
    expect((await vibes(page)).length === 1, `salvar: ${await vibes(page)}`)
  },
  async "swipe-vibrates-when-it-arms"(page) {
    if (page.viewportSize().width >= 720) return
    await withVibrate(page)
    await go(page, "conversas")
    const box = await page.locator("#main .swipe-row .swipe-content").first().boundingBox()
    const y = box.y + box.height / 2
    const x = box.x + box.width * 0.6
    await page.mouse.move(x, y)
    await page.mouse.down()
    for (const dx of [20, 60, 120, 180, 230]) await page.mouse.move(x - dx, y)
    await page.mouse.up()
    await settle(page)
    expect((await vibes(page)).length === 1, `deslizar: ${await vibes(page)}`)
  },
}

await runProof(checkpoints, "round42")
