import { expect, go, KEY, reload, routeOf, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 45: listas longas em blocos de 24 (Imóveis, Desapegos e Negócios). O exemplo tem poucos
// anúncios: cada checkpoint multiplica desapegos ou negócios só neste navegador.
// noObserver: o observador de rolagem nunca dispara, para provar o botão de reserva sem o carregamento
// automático entrar junto quando o teste rola até ele.
async function withVolume(
  page,
  { items = 0, biz = 0, kind = "desapego", noObserver = false } = {},
) {
  await snapshot(page)
  if (noObserver)
    await page.addInitScript(() => {
      window.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return []
        }
      }
    })
  await page.evaluate(
    ([k, items, biz, kind]) => {
      const x = JSON.parse(localStorage.getItem(k))
      const base = x.items.find((i) => i.id === (kind === "imovel" ? "i2" : "i1"))
      for (let n = 0; n < items; n++)
        x.items.push({
          ...base,
          id: `vol-i${n}`,
          title: `Volume ${n + 1}`,
          saved: false,
          mine: false,
          createdAt: base.createdAt - (n + 1) * 6e4,
        })
      const b = x.biz.find((i) => !i.spon)
      for (let n = 0; n < biz; n++)
        x.biz.push({
          ...b,
          id: `vol-b${n}`,
          name: `Negócio ${n + 1}`,
          spon: false,
          saved: false,
          recN: 0,
        })
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, items, biz, kind],
  )
  await reload(page)
}
const cards = (page, id) => page.locator(`[data-paged="${id}"] > .photo-card`).count()
const foot = (page, id) => page.locator(`[data-paged-foot="${id}"] small`).innerText()

const checkpoints = {
  async "long-list-starts-with-24-and-a-count"(page) {
    await withVolume(page, { items: 80 })
    await go(page, "desapegos")
    const total = await page.evaluate(() =>
      Number(/(\d+) desapegos/.exec(document.querySelector("#main").innerText)?.[1]),
    )
    expect(
      (await cards(page, "catalog-desapego")) === 24,
      `primeiro bloco: ${await cards(page, "catalog-desapego")}`,
    )
    expect(
      (await foot(page, "catalog-desapego")) === `Mostrando 24 de ${total} desapegos`,
      `contagem: ${await foot(page, "catalog-desapego")}`,
    )
    expect(
      await page.locator('[data-action="list-more"][data-value="catalog-desapego"]').count(),
      "sem o botão de reserva",
    )
  },
  async "button-appends-without-redraw-and-moves-focus"(page) {
    await withVolume(page, { items: 80, noObserver: true })
    await go(page, "desapegos")
    await page.evaluate(() => {
      document.querySelector('[data-paged="catalog-desapego"] > .photo-card').dataset.mark = "1"
    })
    await page.locator('[data-action="list-more"][data-value="catalog-desapego"]').click()
    await settle(page)
    expect(
      (await cards(page, "catalog-desapego")) === 48,
      `depois do botão: ${await cards(page, "catalog-desapego")}`,
    )
    expect(
      await page.locator('[data-paged="catalog-desapego"] > .photo-card[data-mark="1"]').count(),
      "a lista foi redesenhada",
    )
    const focus = await page.evaluate(() => {
      const card = document.activeElement?.closest(".photo-card")
      return card ? [...card.parentElement.children].indexOf(card) : -1
    })
    expect(focus === 24, `foco depois do botão: ${focus}`)
  },
  async "scrolling-near-the-end-loads-the-next-block"(page) {
    await withVolume(page, { items: 80 })
    await go(page, "desapegos")
    await page.locator('[data-paged-foot="catalog-desapego"]').scrollIntoViewIfNeeded()
    await page.waitForFunction(
      () => document.querySelectorAll('[data-paged="catalog-desapego"] > .photo-card').length >= 48,
      null,
      { timeout: 4000 },
    )
    expect(!(await page.locator(".paged-skel").count()), "cartões de espera ficaram na tela")
  },
  async "back-from-an-item-keeps-the-block"(page) {
    await withVolume(page, { items: 80, noObserver: true })
    await go(page, "desapegos")
    await page.locator('[data-action="list-more"][data-value="catalog-desapego"]').click()
    await settle(page)
    await page
      .locator('[data-paged="catalog-desapego"] > .photo-card')
      .nth(30)
      .locator(".card-link")
      .click()
    await settle(page)
    expect((await routeOf(page)).name === "anuncio", "não abriu o anúncio")
    await page.goBack()
    await settle(page)
    expect(
      (await cards(page, "catalog-desapego")) >= 48,
      `voltar perdeu o bloco: ${await cards(page, "catalog-desapego")}`,
    )
    const seen = await page
      .locator('[data-paged="catalog-desapego"] > .photo-card')
      .nth(30)
      .evaluate((e) => {
        const r = e.getBoundingClientRect()
        return r.bottom > 0 && r.top < innerHeight
      })
    expect(seen, "voltar não devolveu a posição")
  },
  async "changing-a-filter-starts-again"(page) {
    await withVolume(page, { items: 80, kind: "imovel", noObserver: true })
    await go(page, "imoveis")
    await page.locator('[data-action="list-more"][data-value="catalog-imovel"]').click()
    await settle(page)
    await page.evaluate(() => {
      location.hash = "desapegos"
    })
    await settle(page)
    await go(page, "imoveis")
    expect((await cards(page, "catalog-imovel")) === 48, "trocar de tela perdeu o bloco")
    await page.locator('#main [data-action="catalog-toggle"]').first().click()
    await settle(page)
    const n = await cards(page, "catalog-imovel")
    expect(n <= 24, `filtro novo não recomeçou: ${n}`)
  },
  async "end-of-list-shows-the-total-and-an-action"(page) {
    await withVolume(page, { items: 30, noObserver: true })
    await go(page, "desapegos")
    await page.locator('[data-action="list-more"][data-value="catalog-desapego"]').click()
    await settle(page)
    const t = await foot(page, "catalog-desapego")
    expect(/^Você viu os \d+ desapegos$/.test(t), `fim: ${t}`)
    expect(!(await page.locator('[data-action="list-more"]').count()), "botão ficou no fim")
    expect(
      await page.locator('#main .paged-end [data-action="catalog-pill"][data-value="all"]').count(),
      "fim sem ação para quem não achou",
    )
  },
  async "businesses-come-in-blocks"(page) {
    await withVolume(page, { biz: 60 })
    await go(page, "negocios")
    const n = await page.locator('[data-paged="biz"] > .photo-card').count()
    expect(n === 24, `negócios no primeiro bloco: ${n}`)
    expect(
      /^Mostrando 24 de \d+ negócios$/.test(await foot(page, "biz")),
      `contagem: ${await foot(page, "biz")}`,
    )
    await page.locator("#biz-search input").fill("Frio Norte")
    await page.waitForTimeout(400)
    expect(
      !(await page.locator('[data-paged-foot="biz"]:not(.is-end)').count()),
      "busca curta continuou em blocos",
    )
  },
  async "short-lists-stay-as-they-were"(page) {
    await snapshot(page)
    for (const h of ["desapegos", "imoveis", "negocios"]) {
      await go(page, h)
      expect(
        !(await page.locator("#main .paged-foot, #main .paged-end").count()),
        `${h} ganhou fim de bloco com poucos itens`,
      )
    }
  },
  // Revisão do lote: a antecedência vale dentro do #main, os gestos chegam ao bloco novo e o leitor
  // de tela ouve a nova contagem.
  async "loads-before-the-end-is-visible"(page) {
    await withVolume(page, { items: 80 })
    await go(page, "desapegos")
    await page.evaluate(() => {
      const main = document.querySelector("#main")
      const foot = document.querySelector('[data-paged-foot="catalog-desapego"]')
      const top =
        foot.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop
      main.scrollTop = top - main.clientHeight - 300
    })
    await page.waitForFunction(
      () => document.querySelectorAll('[data-paged="catalog-desapego"] > .photo-card').length >= 48,
      null,
      { timeout: 4000 },
    )
  },
  async "new-block-gets-gestures-and-announces"(page) {
    await withVolume(page, { items: 80, noObserver: true })
    await go(page, "desapegos")
    await page.locator('[data-action="list-more"][data-value="catalog-desapego"]').click()
    await settle(page)
    const lp = await page
      .locator('[data-paged="catalog-desapego"] > .photo-card')
      .nth(30)
      .locator(".card-link")
      .getAttribute("data-long-press")
    expect(lp === "1", "cartão do bloco novo sem o menu de segurar")
    const live = await page.locator('[data-paged-live="catalog-desapego"]').innerText()
    expect(/^Mostrando 48 de \d+ desapegos$/.test(live), `região viva: ${live}`)
  },
}

await runProof(checkpoints, "round45")
