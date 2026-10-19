import { expect, go, KEY, reload, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 48: num bairro com muitos anúncios, a folha do bairro (celular) mostra 12 e termina em
// "Ver todos os N"; o diálogo do bairro (tablet e computador) vem em blocos. Mapa local, como na R41.
const STUB = `window.maplibregl={
 Map:class{constructor(o){this.c=o.container;this.h={};setTimeout(()=>this.h.load?.(),0)}
  on(e,f){this.h[e]=f;return this}addControl(){return this}remove(){}getContainer(){return this.c}resize(){}fitBounds(){}easeTo(){}
  getStyle(){return{layers:[]}}getLayoutProperty(){}setLayoutProperty(){}},
 Marker:class{constructor(o){this.el=o.element}setLngLat(){return this}addTo(m){m.c.appendChild(this.el);return this}},
 NavigationControl:class{}};`
const phone = (page) => page.viewportSize().width < 720
async function mapWith(page, many) {
  await snapshot(page)
  await page.evaluate(
    ([k, many]) => {
      const x = JSON.parse(localStorage.getItem(k))
      const base = x.items.find((i) => i.id === "i2")
      for (let n = 0; n < many; n++)
        x.items.push({
          ...base,
          id: `vol-i${n}`,
          title: `Apartamento ${n + 1}`,
          hood: "Ponta Negra",
          saved: false,
          mine: false,
        })
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, many],
  )
  await reload(page)
  await page.route("https://unpkg.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: route.request().url().endsWith(".css") ? "text/css" : "text/javascript",
      body: route.request().url().endsWith(".css") ? "" : STUB,
    }),
  )
  await go(page, "imoveis")
  await page.locator('#main [data-action="catalog-view"][data-value="map"]').click()
  await settle(page)
  await page.locator('#catalog-map .cmap-pin[data-value="Ponta Negra"]').click()
  await settle(page)
}

const checkpoints = {
  async "busy-hood-shows-12-and-see-all"(page) {
    await mapWith(page, 40)
    if (!phone(page)) {
      const n = await page.locator('#dialog [data-paged="hood-dialog"] > .photo-card').count()
      expect(n === 24, `diálogo do bairro: ${n}`)
      expect(
        /^Mostrando 24 de \d+ imóveis$/.test(
          await page.locator('#dialog [data-paged-foot="hood-dialog"] small').innerText(),
        ),
        "diálogo sem contagem",
      )
      return
    }
    await page.locator("#hood-panel .hp-grab").click()
    await settle(page)
    const n = await page.locator("#hood-panel .hp-cards .photo-card").count()
    expect(n === 12, `cartões na folha: ${n}`)
    const all = page.locator('#hood-panel .hp-all[data-action="map-hood-list"]')
    expect(
      /^Ver todos os \d+$/.test((await all.locator("b").innerText()).trim()),
      `cartão final: ${await all.locator("b").innerText()}`,
    )
    await all.click()
    await settle(page)
    expect(!(await page.locator("#hood-panel").count()), "a folha ficou aberta")
    expect(!(await page.locator("#catalog-map").count()), "Ver todos não voltou para a lista")
  },
  async "quiet-hood-has-no-see-all"(page) {
    await mapWith(page, 0)
    if (!phone(page)) {
      expect(!(await page.locator("#dialog .paged-foot").count()), "diálogo curto com contagem")
      return
    }
    await page.locator("#hood-panel .hp-grab").click()
    await settle(page)
    expect(
      !(await page.locator("#hood-panel .hp-all").count()),
      "bairro com poucos anúncios ganhou Ver todos",
    )
  },
}

await runProof(checkpoints, "round48", { allowExternal: ["https://unpkg.com/maplibre-gl@"] })
