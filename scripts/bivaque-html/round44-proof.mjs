import {
  expect,
  go,
  KEY,
  reload,
  routeOf,
  runProof,
  settle,
  snapshot,
  stored,
} from "./proof-harness.mjs"

// Rodada 44: busca em tela cheia. Recentes e sugestões em linhas (a seta completa sem buscar),
// "Explorar" abre a tela filtrada e, ao digitar, sugestões e atalhos por tipo vêm antes.
const phone = (page) => page.viewportSize().width < 720
async function withRecent(page, recent) {
  await snapshot(page)
  await page.evaluate(
    ([k, r]) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.recent = r
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, recent],
  )
  await reload(page)
  await go(page, "busca")
}
const section = (page, title) => page.locator("#search-results section", { hasText: title })

const checkpoints = {
  async "empty-search-shows-recent-explore-and-suggestions"(page) {
    await withRecent(page, ["pediatra pelo plano"])
    expect(await section(page, "Buscas recentes").count(), "sem buscas recentes")
    const tiles = await page.locator("#search-results .search-tile").count()
    expect(tiles >= 4, `poucos atalhos: ${tiles}`)
    expect(await section(page, "Sugestões").count(), "sem sugestões")
    expect(!(await page.locator("#search-results .empty").count()), "ilustração grande continua")
    const head = await page
      .locator("#main .search-head")
      .evaluate((h) => h.getBoundingClientRect().width > 2)
    expect(phone(page) ? !head : head, `título repetido: ${head}`)
  },
  async "arrow-completes-without-searching"(page) {
    await withRecent(page, [])
    await section(page, "Sugestões")
      .locator('[data-action="search-fill"][data-value="escola"]')
      .click()
    await settle(page)
    expect(
      (await page.locator("#search-query input").inputValue()) === "escola",
      "a seta não completou",
    )
    expect(!(await stored(page)).recent.includes("escola"), "a seta gravou como busca feita")
  },
  async "row-runs-and-clear-empties-recent"(page) {
    await withRecent(page, [])
    await section(page, "Sugestões")
      .locator('[data-action="recent-search"][data-value="escola"]')
      .click()
    await settle(page)
    expect((await stored(page)).recent.includes("escola"), "a linha não buscou")
    await page.locator("#search-query").evaluate((f) => {
      f.value = ""
      f.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await page.waitForTimeout(400)
    await page.locator('#search-results [data-action="clear-recent"]').click()
    await settle(page)
    expect(!(await stored(page)).recent.length, "Limpar não apagou")
    expect(!(await section(page, "Buscas recentes").count()), "seção de recentes ficou")
  },
  async "explore-opens-the-filtered-screen"(page) {
    await withRecent(page, [])
    const tile = page.locator('#search-results .search-tile[data-value^="biz|"]').first()
    const group = (await tile.getAttribute("data-value")).slice(4)
    await tile.click()
    await settle(page)
    expect((await routeOf(page)).name === "negocios", "atalho não abriu Negócios")
    const selected = await page
      .locator(`#main [data-action="biz-filter"][data-value="${group}"]`)
      .first()
      .evaluate(
        (e) =>
          e.selected === true ||
          e.hasAttribute("selected") ||
          e.getAttribute("aria-pressed") === "true",
      )
    expect(selected, `Negócios sem o filtro ${group}`)
    await go(page, "busca")
    await page.locator('#search-results .search-tile[data-value="imovel"]').click()
    await settle(page)
    expect((await routeOf(page)).name === "imoveis", "atalho de imóveis")
  },
  async "typing-suggests-before-results"(page) {
    await withRecent(page, [])
    await page.locator("#search-query input").fill("diar")
    await page.waitForTimeout(500)
    const first = page.locator("#search-results .search-suggest .search-row .grow").first()
    expect(
      /^diarista/.test((await first.innerText()).trim()),
      `primeira sugestão: ${await first.innerText()}`,
    )
    expect(await first.locator("b").count(), "parte digitada sem destaque")
    await page
      .locator('#search-results .search-suggest [data-action="search-type"][data-value="asks"]')
      .click()
    await settle(page)
    expect(
      (await page
        .locator('#main [data-action="search-type"][data-value="asks"]')
        .first()
        .getAttribute("selected")) !== null ||
        /Indicações e respostas/.test(await page.locator("#search-results").innerText()),
      "atalho por tipo não filtrou",
    )
  },
  // Revisão do lote: o destaque funciona sem acento e o título continua para leitor de tela.
  async "highlight-ignores-accents-and-title-stays-for-readers"(page) {
    await withRecent(page, [])
    await page.locator("#search-query input").fill("mecâni")
    await page.waitForTimeout(500)
    const first = page.locator("#search-results .search-suggest .search-row .grow").first()
    expect(
      /^mec[aâ]nic/i.test((await first.innerText()).trim()),
      `sugestão: ${await first.innerText()}`,
    )
    expect(
      /^mec[aâ]ni$/i.test(await first.locator("b").first().innerText()),
      `destaque: ${await first.innerHTML()}`,
    )
    const head = await page.evaluate(() => {
      const h = document.querySelector("#main .search-head")
      return h && getComputedStyle(h).display !== "none" && h.textContent.trim().length > 0
    })
    expect(head, "o título saiu também para leitor de tela")
  },
}

await runProof(checkpoints, "round44")
