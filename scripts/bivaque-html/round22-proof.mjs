import {
  action,
  choose,
  expect,
  fill,
  go,
  KEY,
  reload,
  routeOf,
  runProof,
  settle,
  snapshot,
  stored,
} from "./proof-harness.mjs"

// Rodada 22: Desapegos e Imóveis são telas próprias com os filtros do seu mercado. Imóvel:
// tipo, total do mês, quartos, vagas, área e comodidades. Desapego: categoria, estado de uso,
// preço e retirada prevista.
const desktop = (page) => page.viewportSize().width >= 1024
const shownIds = (page) =>
  page
    .locator('#catalog-results [data-action="open-item"]')
    .evaluateAll((els) => els.map((e) => e.dataset.value))
const byId = async (page) => Object.fromEntries((await stored(page)).items.map((x) => [x.id, x]))
const total = (x) => (Number(x.numPrice) || 0) + (x.kind === "imovel" ? Number(x.condo) || 0 : 0)
async function openMore(page) {
  if (desktop(page)) return
  const toggle = page.locator('[data-action="catalog-more"]')
  if ((await toggle.evaluate((e) => e.ariaExpanded)) !== "true") await toggle.click()
}
async function chip(page, value) {
  await openMore(page)
  await page.locator(`#catalog-more md-filter-chip[data-value="${value}"]`).click()
  await settle(page)
}

const checkpoints = {
  async "separate-screens-by-kind"(page) {
    await snapshot(page)
    const items = await byId(page)
    for (const [hash, kind, title] of [
      ["imoveis", "imovel", "Imóveis"],
      ["desapegos", "desapego", "Desapegos"],
    ]) {
      await go(page, hash)
      expect((await page.locator("#main h1").innerText()) === title, `${hash}: título errado`)
      const ids = await shownIds(page)
      expect(ids.length >= 5, `${hash}: poucos anúncios (${ids.length})`)
      expect(
        ids.every((id) => items[id].kind === kind),
        `${hash}: misturou tipos`,
      )
      expect(
        !(await page.locator('#main [data-action="catalog-filter"]').count()),
        `${hash}: ainda tem a aba Tudo`,
      )
    }
    await go(page, "catalogo")
    expect(
      (await page.locator("#main h1").innerText()) === "Desapegos",
      "endereço antigo não abriu uma das telas",
    )
  },
  async "home-links-open-each-screen"(page) {
    await snapshot(page)
    await go(page, "inicio")
    await page.locator('#main [data-action="intent"][data-value="imovel"]').last().click()
    await settle(page)
    expect((await routeOf(page)).name === "imoveis", "Ver imóveis não abriu Imóveis")
    await go(page, "inicio")
    await page.locator('#main .section-links [data-action="intent"][data-value="desapego"]').click()
    await settle(page)
    expect((await routeOf(page)).name === "desapegos", "Ver desapegos não abriu Desapegos")
  },
  async "property-filters"(page) {
    await snapshot(page)
    const items = await byId(page)
    await go(page, "imoveis")
    await choose(page, "catalog-ptype", "Casa")
    let ids = await shownIds(page)
    expect(ids.length && ids.every((id) => items[id].ptype === "Casa"), `tipo Casa: ${ids}`)
    expect(
      /1 imóvel para alugar/.test(await page.locator("#catalog-count").innerText()),
      "contagem não atualizou",
    )
    // Recarregar zera os filtros (escolher a opção vazia do md-select não é confiável na prova).
    await reload(page)
    await go(page, "imoveis")
    await chip(page, "beds|3")
    ids = await shownIds(page)
    expect(ids.length && ids.every((id) => items[id].beds >= 3), `3+ quartos: ${ids}`)
    await chip(page, "amen|pool")
    ids = await shownIds(page)
    expect(
      ids.length && ids.every((id) => items[id].beds >= 3 && items[id].amen.includes("pool")),
      `3+ quartos e piscina: ${ids}`,
    )
    expect(
      /Mais filtros \(2\)/.test(await page.locator("#catalog-more-label").innerText()),
      "contador de filtros extras errado",
    )
    await chip(page, "area|100")
    await chip(page, "parking|2")
    ids = await shownIds(page)
    expect(
      ids.every((id) => items[id].area >= 100 && items[id].parking >= 2),
      `área e vagas: ${ids}`,
    )
  },
  async "property-sort-uses-monthly-total"(page) {
    await snapshot(page)
    const items = await byId(page)
    await go(page, "imoveis")
    await choose(page, "catalog-sort", "price-low")
    const totals = (await shownIds(page)).map((id) => total(items[id]))
    expect(
      totals.every((t, i) => i === 0 || t >= totals[i - 1]),
      `não ordenou pelo total do mês: ${totals}`,
    )
    const card = await page.locator("#catalog-results").innerText()
    expect(/com condomínio/.test(card), "cartão sem o total com condomínio")
  },
  async "item-filters"(page) {
    await snapshot(page)
    const items = await byId(page)
    await go(page, "desapegos")
    await choose(page, "catalog-cat", "Móveis")
    let ids = await shownIds(page)
    expect(ids.length && ids.every((id) => items[id].cat === "Móveis"), `categoria: ${ids}`)
    await chip(page, "cond|Usado")
    ids = await shownIds(page)
    expect(
      ids.every((id) => items[id].cond === "Usado"),
      `estado: ${ids}`,
    )
    await reload(page)
    await go(page, "desapegos")
    await chip(page, "pickup|now")
    ids = await shownIds(page)
    const today = new Date().toISOString().slice(0, 10)
    expect(
      ids.length && ids.every((id) => !items[id].pickup || items[id].pickup <= today),
      `já disponível incluiu retirada futura: ${ids}`,
    )
  },
  async "more-filters-by-width"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    const toggle = page.locator('[data-action="catalog-more"]')
    if (desktop(page)) {
      expect(await toggle.isHidden(), "botão Mais filtros no desktop")
      expect(
        await page.locator("#catalog-more").isVisible(),
        "filtros extras escondidos no desktop",
      )
      return
    }
    expect(await page.locator("#catalog-more").isHidden(), "filtros extras abertos de início")
    await toggle.click()
    expect((await toggle.evaluate((e) => e.ariaExpanded)) === "true", "aria-expanded não mudou")
    expect(await page.locator("#catalog-more").isVisible(), "Mais filtros não abriu")
  },
  async "editor-saves-market-fields"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    await action(page, "create-property")
    await fill(page, "item-title", "Casa com piscina no Tarumã")
    await fill(page, "item-price", "3000")
    await choose(page, "item-hood", "Tarumã")
    await choose(page, "item-ptype", "Casa")
    await fill(page, "item-beds", "3")
    await fill(page, "item-area", "150")
    await fill(page, "item-parking", "2")
    await page.locator('#item-amen md-filter-chip[data-value="pool"]').click()
    await fill(page, "item-desc", "Casa ampla com piscina e quintal.")
    await action(page, "submit-item")
    await settle(page)
    const mine = (await stored(page)).items.find((x) => x.title === "Casa com piscina no Tarumã")
    expect(
      mine?.ptype === "Casa" && mine.amen?.join() === "pool",
      `imóvel salvo sem tipo ou comodidade: ${JSON.stringify(mine && { p: mine.ptype, a: mine.amen })}`,
    )
    await settle(page)
    const text = await page.locator("#main").innerText()
    const chips = await page
      .locator("#main md-assist-chip")
      .evaluateAll((els) => els.map((e) => e.getAttribute("label")))
    expect(/Casa para alugar/.test(text), `detalhe sem o tipo: ${(await routeOf(page)).name}`)
    expect(chips.includes("Piscina"), `detalhe sem comodidades: ${chips}`)
    await go(page, "desapegos")
    await action(page, "create-item")
    await fill(page, "item-title", "Bicicleta aro 29")
    await fill(page, "item-price", "700")
    await choose(page, "item-hood", "Flores")
    await fill(page, "item-desc", "Bicicleta revisada, com capacete.")
    await action(page, "submit-item")
    await settle(page)
    expect(
      !(await stored(page)).items.some((x) => x.title === "Bicicleta aro 29"),
      "publicou desapego sem categoria e estado",
    )
    await choose(page, "item-cat", "Esporte e lazer")
    await choose(page, "item-cond", "Seminovo")
    await action(page, "submit-item")
    await settle(page)
    const bike = (await stored(page)).items.find((x) => x.title === "Bicicleta aro 29")
    expect(
      bike?.cat === "Esporte e lazer" && bike.cond === "Seminovo" && !bike.pickup,
      "desapego salvo errado",
    )
  },
  async "demo-migration-runs-once"(page) {
    await snapshot(page)
    await page.evaluate((k) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.items = x.items.filter((i) => i.id !== "i7")
      localStorage.setItem(k, JSON.stringify(x))
    }, KEY)
    await reload(page)
    await go(page, "imoveis")
    expect(!(await shownIds(page)).includes("i7"), "exemplo apagado voltou")
    await page.evaluate((k) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.listingDemoV = undefined
      x.items = x.items.filter((i) => !["i8", "i9"].includes(i.id))
      for (const i of x.items) if (i.id === "i2") i.ptype = undefined
      localStorage.setItem(k, JSON.stringify(x))
    }, KEY)
    await reload(page)
    await go(page, "imoveis")
    // A migração vale na memória; o armazenamento só é regravado na próxima alteração.
    const ids = await shownIds(page)
    expect(ids.includes("i8") && ids.includes("i9"), `dados antigos sem os exemplos novos: ${ids}`)
    const tag = await page.locator('#catalog-results [data-value="i2"] .pill').innerText()
    expect(tag === "Apartamento", `exemplo antigo sem atributos: ${tag}`)
  },
  async "back-from-listing-returns-to-its-screen"(page) {
    await snapshot(page)
    await go(page, "inicio")
    await go(page, "anuncio/i7")
    await page.evaluate(() => {
      history.replaceState({}, "", location.href)
    })
    await page.locator('#topbar [data-action="back"]').first().click()
    await settle(page)
    expect(
      (await routeOf(page)).name === "imoveis",
      `Voltar foi para ${(await routeOf(page)).name}`,
    )
  },
}

await runProof(checkpoints, "round22")
