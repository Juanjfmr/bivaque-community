import { expect, go, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 21: filtros de escolha única com uma pílula que desliza do filtro anterior para o novo.
// O chip escolhido continua marcado (check e aria) e, sem JavaScript, mantém o próprio fundo.
const ROW = (action) => `#main .filter-row[data-seg="${action}"]`

// Distância entre a pílula e o chip escolhido (px), e se o fundo do chip foi liberado.
const pillFit = (page, action) =>
  page.evaluate((sel) => {
    const row = document.querySelector(sel)
    const ind = row?.querySelector(".seg-ind")
    const chip = row?.querySelector("md-filter-chip[selected]")
    if (!ind || !chip) return null
    const a = ind.getBoundingClientRect()
    const b = chip.getBoundingClientRect()
    return {
      off: Math.max(
        Math.abs(a.left - b.left),
        Math.abs(a.width - b.width),
        Math.abs(a.top - b.top),
      ),
      ready: row.classList.contains("seg-ready"),
      visible: getComputedStyle(ind).opacity === "1",
    }
  }, ROW(action))
// Clica num filtro e amostra a posição da pílula a cada quadro por ~0,6 s.
async function slide(page, action, value) {
  await page.evaluate(
    ([sel, v]) => {
      window.__seg = []
      const tick = () => {
        const ind = document.querySelector(`${sel} .seg-ind`)
        if (ind) window.__seg.push(ind.getBoundingClientRect().left)
        if (window.__seg.length < 40) requestAnimationFrame(tick)
      }
      document.querySelector(`${sel} md-filter-chip[data-value="${v}"]`).click()
      requestAnimationFrame(tick)
    },
    [ROW(action), value],
  )
  await page.waitForTimeout(900)
  return page.evaluate(() => window.__seg)
}

const SCREENS = [
  ["catalogo", "catalog-filter"],
  ["negocios", "biz-filter"],
  ["comunidade", "question-filter"],
]

const checkpoints = {
  async "pill-sits-on-selected-filter"(page) {
    await snapshot(page)
    for (const [hash, action] of SCREENS) {
      await go(page, hash)
      await settle(page)
      const f = await pillFit(page, action)
      expect(f, `${hash}: filtro sem pílula`)
      expect(f.ready && f.visible, `${hash}: pílula não apareceu`)
      expect(f.off <= 1.5, `${hash}: pílula fora do filtro escolhido (${f.off.toFixed(1)} px)`)
    }
  },
  async "pill-slides-from-previous-filter"(page) {
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await snapshot(page)
    await go(page, "catalogo")
    await settle(page)
    const start =
      (await pillFit(page, "catalog-filter")) &&
      (await page.locator(`${ROW("catalog-filter")} .seg-ind`).boundingBox()).x
    const xs = await slide(page, "catalog-filter", "imovel")
    const end = (
      await page.locator(`${ROW("catalog-filter")} md-filter-chip[selected]`).boundingBox()
    ).x
    const between = xs.filter((x) => x > Math.min(start, end) + 4 && x < Math.max(start, end) - 4)
    expect(between.length >= 2, `a pílula pulou sem deslizar: ${xs.map(Math.round).join(",")}`)
    const f = await pillFit(page, "catalog-filter")
    expect(f.off <= 1.5, `a pílula não terminou no filtro novo (${f.off.toFixed(1)} px)`)
  },
  async "reduced-motion-jumps-without-sliding"(page) {
    await snapshot(page)
    await go(page, "catalogo")
    await settle(page)
    const xs = await slide(page, "catalog-filter", "desapego")
    const end = (
      await page.locator(`${ROW("catalog-filter")} md-filter-chip[selected]`).boundingBox()
    ).x
    const moving = xs.filter((x) => Math.abs(x - end) > 1.5)
    expect(moving.length <= 2, `deslizou com movimento reduzido: ${xs.map(Math.round).join(",")}`)
  },
  async "selection-semantics-unchanged"(page) {
    await snapshot(page)
    await go(page, "catalogo")
    await settle(page)
    await page.locator(`${ROW("catalog-filter")} md-filter-chip[data-value="imovel"]`).click()
    await settle(page)
    const chips = await page
      .locator(`${ROW("catalog-filter")} md-filter-chip`)
      .evaluateAll((els) => els.map((e) => `${e.dataset.value}:${e.selected}`))
    expect(chips.join() === "all:false,desapego:false,imovel:true", `seleção errada: ${chips}`)
    expect(
      (await page.locator(`${ROW("catalog-filter")} .seg-ind`).getAttribute("aria-hidden")) ===
        "true",
      "pílula lida pelo leitor de tela",
    )
    expect(/Imóveis/.test(await page.locator("#main h1").innerText()), "filtro não filtrou")
  },
  async "pill-follows-resize"(page) {
    await snapshot(page)
    await go(page, "negocios")
    await settle(page)
    const { width, height } = page.viewportSize()
    await page.setViewportSize({ width: width >= 1024 ? 1100 : 340, height })
    await page.waitForTimeout(500)
    const f = await pillFit(page, "biz-filter")
    expect(f.off <= 1.5, `pílula ficou para trás ao redimensionar (${f.off.toFixed(1)} px)`)
  },
}

await runProof(checkpoints, "round21")
