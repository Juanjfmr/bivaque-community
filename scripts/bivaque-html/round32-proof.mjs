import { expect, go, KEY, reload, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 32: agenda agrupada por dia ("Hoje", "Amanhã", dia da semana) e filtro por público
// (chega, mora, sai) com a contagem em cada chip.
// Datas pelo relógio do navegador da prova (o contexto determinístico fixa o relógio).
const days = (page, list) =>
  page.evaluate(
    (ns) =>
      ns.map((n) => {
        const d = new Date()
        d.setDate(d.getDate() + n)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      }),
    list,
  )
async function setDates(page, offsets) {
  await snapshot(page)
  const dates = await days(page, offsets)
  await page.evaluate(
    ([k, ds]) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.events.forEach((e, i) => {
        if (ds[i]) e.date = ds[i]
      })
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, dates],
  )
  await reload(page)
  await go(page, "agenda")
}
const headers = (page) => page.locator("#main .agenda-date").allInnerTexts()

const checkpoints = {
  async "groups-by-day-with-friendly-labels"(page) {
    await setDates(page, [0, 1, 1, 9])
    const h = await headers(page)
    expect(h[0] === "Hoje" && h[1] === "Amanhã" && h.length === 3, `cabeçalhos: ${h.join(" | ")}`)
    expect(/^[A-ZÇ][a-zçáéíóú-]+(-feira)?, \d{1,2} de /.test(h[2]), `dia por extenso: ${h[2]}`)
    const second = await page
      .locator("#main .agenda-day")
      .nth(1)
      .locator('[data-action="open-event"].txt')
      .count()
    expect(second === 2, `dois encontros no mesmo dia, um cabeçalho: ${second}`)
  },
  async "audience-filter-with-counts"(page) {
    await snapshot(page)
    await go(page, "agenda")
    const events = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).events, KEY)
    const arriving = events
      .filter((e) => e.modes.includes("chegando"))
      .map((e) => e.id)
      .sort()
    const chip = page.locator('#main [data-action="agenda-filter"][data-value="chegando"]')
    expect(
      new RegExp(`· ${arriving.length}$`).test(await chip.getAttribute("label")),
      "chip sem a contagem",
    )
    await chip.click()
    await settle(page)
    const shown = await page
      .locator('#main .agenda-day [data-action="open-event"].txt')
      .evaluateAll((els) => els.map((e) => e.dataset.value).sort())
    expect(shown.join() === arriving.join(), `para quem chega: ${shown} × ${arriving}`)
  },
  async "past-events-stay-hidden"(page) {
    await setDates(page, [-2, 3])
    const ids = await page
      .locator('#main [data-action="open-event"].txt')
      .evaluateAll((els) => els.map((e) => e.dataset.value))
    expect(!ids.includes("e3"), "encontro passado na agenda")
  },
}

await runProof(checkpoints, "round32")
