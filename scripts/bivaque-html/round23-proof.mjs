import { expect, go, routeOf, runProof, settle, snapshot, stored } from "./proof-harness.mjs"
import { wizardProperty } from "./wizard-helpers.mjs"

// Rodada 23: filtros em pílulas (maquete aprovada em 2026-10-16). A pílula mostra o valor
// escolhido; o painel conta os resultados antes de aplicar; fechar descarta; Voltar fecha só o
// painel; cada tela guarda os próprios filtros; ordenar fica junto da contagem.
const desktop = (page) => page.viewportSize().width >= 1024
const panel = (page) => page.locator("#filter-panel")
const isOpen = (page) => page.evaluate(() => Boolean(document.querySelector("#filter-panel")?.open))
const pill = (page, key) => page.locator(`#main [data-action="catalog-pill"][data-value="${key}"]`)
const shownIds = (page) =>
  page
    .locator('#catalog-results [data-action="open-item"]')
    .evaluateAll((els) => els.map((e) => e.dataset.value))
const byId = async (page) => Object.fromEntries((await stored(page)).items.map((x) => [x.id, x]))
const total = (x) => (Number(x.numPrice) || 0) + (x.kind === "imovel" ? Number(x.condo) || 0 : 0)
const day = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
async function open(page, key) {
  await pill(page, key).click()
  await page.waitForTimeout(300)
  expect(await isOpen(page), `painel ${key} não abriu`)
}
async function set(page, field, v) {
  await panel(page).locator(`[data-f="set"][data-field="${field}"][data-v="${v}"]`).click()
  await page.waitForTimeout(120)
}
async function apply(page) {
  await panel(page).locator('[data-f="apply"]').click()
  await settle(page)
}
const applyText = (page) => panel(page).locator('[data-f="apply"]').innerText()

const checkpoints = {
  async "pill-shows-chosen-value"(page) {
    await snapshot(page)
    const items = await byId(page)
    await go(page, "imoveis")
    await open(page, "price")
    await panel(page).locator('[data-f="quick"][data-v="3000"]').click()
    await apply(page)
    expect(!(await isOpen(page)), "painel não fechou ao aplicar")
    expect(
      /Até R\$\s?3\.000/.test(await pill(page, "price").innerText()),
      "pílula não mostra o valor",
    )
    expect(/1/.test(await pill(page, "all").innerText()), "pílula Filtros sem o número de ativos")
    const ids = await shownIds(page)
    expect(ids.length && ids.every((id) => total(items[id]) <= 3000), `total acima do teto: ${ids}`)
    expect(
      (await page.locator("#catalog-count").innerText()).startsWith(`${ids.length} `),
      "contagem diferente dos cartões",
    )
  },
  async "live-count-then-discard-on-close"(page) {
    await snapshot(page)
    const items = await byId(page)
    await go(page, "imoveis")
    const before = await shownIds(page)
    await open(page, "beds")
    await set(page, "beds", 3)
    const expected = Object.values(items).filter(
      (x) => x.kind === "imovel" && x.status === "active" && x.city === "Manaus" && x.beds >= 3,
    ).length
    expect(
      (await applyText(page)) === `Ver ${expected} ${expected === 1 ? "imóvel" : "imóveis"}`,
      `contagem ao vivo errada: ${await applyText(page)} (esperado ${expected})`,
    )
    await panel(page).locator('[data-f="close"]').click()
    await settle(page)
    expect((await shownIds(page)).join() === before.join(), "fechar sem aplicar mudou a lista")
    expect(
      await page.evaluate(() => document.activeElement?.dataset?.value === "beds"),
      "foco não voltou para a pílula",
    )
    await open(page, "beds")
    await set(page, "beds", 3)
    await page.keyboard.press("Escape")
    await settle(page)
    expect(!(await isOpen(page)), "Esc não fechou")
    expect((await shownIds(page)).join() === before.join(), "Esc aplicou o filtro")
  },
  async "all-filters-combine"(page) {
    await snapshot(page)
    const items = await byId(page)
    await go(page, "imoveis")
    await open(page, "all")
    await set(page, "ptypes", "Casa")
    await set(page, "amen", "pets")
    await apply(page)
    const ids = await shownIds(page)
    expect(
      ids.length &&
        ids.every((id) => items[id].ptype === "Casa" && items[id].amen.includes("pets")),
      `casa com pets: ${ids}`,
    )
    expect(/2/.test(await pill(page, "all").innerText()), "contagem de filtros ativos")
    expect((await pill(page, "ptype").innerText()).includes("Casa"), "pílula Tipo sem o valor")
    expect(
      (await page
        .locator('#main [data-action="catalog-toggle"][data-value="pets"]')
        .getAttribute("aria-pressed")) === "true",
      "atalho Aceita pets não reflete o filtro",
    )
  },
  async "availability-matches-arrival"(page) {
    await snapshot(page)
    const items = await byId(page)
    await go(page, "imoveis")
    await open(page, "avail")
    await set(page, "avail", "now")
    await apply(page)
    let ids = await shownIds(page)
    expect(
      ids.length && ids.every((id) => !items[id].avail || items[id].avail <= day(0)),
      `disponível agora incluiu data futura: ${ids}`,
    )
    await open(page, "avail")
    await panel(page).locator("#fp-date").fill(day(20))
    await panel(page).locator("#fp-date").dispatchEvent("change")
    await page.waitForTimeout(150)
    await apply(page)
    ids = await shownIds(page)
    expect(
      ids.every((id) => !items[id].avail || items[id].avail <= day(20)),
      `até a data incluiu disponibilidade posterior: ${ids}`,
    )
    expect(ids.length > 0, "data escolhida sem resultados")
  },
  async "toggle-pills-filter-in-one-tap"(page) {
    await snapshot(page)
    const items = await byId(page)
    await go(page, "imoveis")
    const t = page.locator('#main [data-action="catalog-toggle"][data-value="furnished"]')
    await t.click()
    await settle(page)
    const ids = await shownIds(page)
    expect(
      ids.length && ids.every((id) => items[id].amen.includes("furnished")),
      `mobiliado: ${ids}`,
    )
    expect(
      (await page
        .locator('#main [data-action="catalog-toggle"][data-value="furnished"]')
        .getAttribute("aria-pressed")) === "true",
      "atalho sem aria-pressed",
    )
  },
  async "each-screen-keeps-its-filters"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    await open(page, "price")
    await panel(page).locator('[data-f="quick"][data-v="3000"]').click()
    await apply(page)
    await go(page, "desapegos")
    expect(
      /^Preço/.test(await pill(page, "price").innerText()) &&
        !/Até/.test(await pill(page, "price").innerText()),
      "preço de imóveis vazou para desapegos",
    )
    expect((await shownIds(page)).length >= 7, "desapegos filtrados pelo teto de imóveis")
  },
  async "sort-next-to-count"(page) {
    await snapshot(page)
    const items = await byId(page)
    await go(page, "imoveis")
    await pill(page, "sort").click()
    await page.waitForTimeout(250)
    await panel(page).locator('[data-f="sort"][data-v="price-low"]').click()
    await settle(page)
    const totals = (await shownIds(page)).map((id) => total(items[id]))
    expect(
      totals.every((t, i) => i === 0 || t >= totals[i - 1]),
      `não ordenou: ${totals}`,
    )
    expect(/Menor total/.test(await pill(page, "sort").innerText()), "rótulo da ordem não mudou")
  },
  async "back-closes-only-the-panel"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    await open(page, "beds")
    await page.goBack()
    await settle(page)
    expect(!(await isOpen(page)), "Voltar não fechou o painel")
    expect((await routeOf(page)).name === "imoveis", "Voltar saiu de Imóveis")
    await open(page, "beds")
    await apply(page)
    expect((await routeOf(page)).name === "imoveis", "aplicar mudou de página")
  },
  async "panel-shape-by-width-and-shortcuts-blocked"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    await open(page, "price")
    const one = await panel(page).getAttribute("class")
    expect(one.includes(desktop(page) ? "pop" : "sheet"), `formato do painel: ${one}`)
    if (desktop(page)) {
      await page.keyboard.press("c")
      await page.keyboard.press("Control+k")
      await settle(page)
      expect(
        await page.evaluate(
          () =>
            document.querySelector("#create-menu").hidden &&
            !document.querySelector("#palette:not([hidden])"),
        ),
        "atalho abriu menu por baixo do painel",
      )
    }
    await page.keyboard.press("Escape")
    await settle(page)
    await open(page, "all")
    const all = await panel(page).getAttribute("class")
    expect(all.includes(desktop(page) ? "drawer" : "full"), `formato de Filtros: ${all}`)
  },
  async "item-market-filters"(page) {
    await snapshot(page)
    const items = await byId(page)
    await go(page, "desapegos")
    await open(page, "all")
    await set(page, "cats", "Móveis")
    await set(page, "cond", "Usado")
    await apply(page)
    let ids = await shownIds(page)
    expect(
      ids.length && ids.every((id) => items[id].cat === "Móveis" && items[id].cond === "Usado"),
      `móveis usados: ${ids}`,
    )
    await open(page, "all")
    await panel(page).locator('[data-f="clear"]').first().click()
    await set(page, "pickup", "now")
    await apply(page)
    ids = await shownIds(page)
    expect(
      ids.length && ids.every((id) => !items[id].pickup || items[id].pickup <= day(0)),
      `retirada imediata: ${ids}`,
    )
  },
  async "typed-date-keeps-focus-and-counts"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    await open(page, "avail")
    const before = await applyText(page)
    const [y, m, d] = day(20).split("-")
    await panel(page).locator("#fp-date").click()
    await page.keyboard.type(`${d}${m}${y}`)
    await page.keyboard.press("Tab")
    await page.waitForTimeout(150)
    expect(await isOpen(page), "painel fechou ao digitar a data")
    expect(
      (await panel(page).locator("#fp-date").inputValue()) === day(20),
      `data digitada não ficou: ${await panel(page).locator("#fp-date").inputValue()}`,
    )
    expect(
      (await panel(page).locator('[data-field="avail"][aria-pressed="true"]').count()) === 0,
      "chip de período continuou marcado com a data escolhida",
    )
    expect(typeof before === "string", "sem contagem")
  },
  async "popover-stays-inside-the-window"(page) {
    if (!desktop(page)) return
    await page.setViewportSize({ width: page.viewportSize().width, height: 420 })
    await snapshot(page)
    await go(page, "imoveis")
    await open(page, "hood")
    const r = await panel(page).boundingBox()
    expect(r.y >= 0 && r.y + r.height <= 420, `painel fora da janela: ${r.y}+${r.height}`)
    expect(await panel(page).locator('[data-f="apply"]').isVisible(), "botão Ver fora de alcance")
  },
  async "home-entry-starts-without-old-filters"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    await page.locator('#main [data-action="catalog-toggle"][data-value="pets"]').click()
    await settle(page)
    await go(page, "inicio")
    await page.locator('#main .section-links [data-action="intent"][data-value="imovel"]').click()
    await settle(page)
    expect(
      (await page
        .locator('#main [data-action="catalog-toggle"][data-value="pets"]')
        .getAttribute("aria-pressed")) === "false",
      "filtro antigo continuou ao entrar pela Início",
    )
  },
  async "editor-saves-availability"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    await page.locator('#main [data-action="create-property"]').click()
    await settle(page)
    await wizardProperty(page, {
      title: "Apartamento perto da Base",
      price: "2100",
      hood: "Flores",
      beds: "2",
      area: "65",
      avail: day(25),
      desc: "Dois quartos, perto da Base Aérea.",
    })
    await page.locator('#dialog [data-action="submit-item"]').click()
    await settle(page)
    const mine = (await stored(page)).items.find((x) => x.title === "Apartamento perto da Base")
    expect(mine?.avail === day(25), `disponibilidade não salva: ${mine?.avail}`)
    expect(
      /Disponível a partir de/.test(await page.locator("#main").innerText()),
      "detalhe sem disponibilidade",
    )
  },
}

await runProof(checkpoints, "round23")
