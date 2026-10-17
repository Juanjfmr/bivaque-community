import { expect, go, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 31: mapa de bairros. O MapLibre real vem do unpkg; aqui ele é trocado por um
// substituto local que registra mapa, marcadores e nomes, para a prova não depender de internet.
// A captura com a rede de verdade fica em round31-shots.mjs.
const MAP_JS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"
const STUB = `window.maplibregl={
 Map:class{constructor(o){window.__maps=(window.__maps||0)+1;window.__map={opts:o,markers:[],layers:[],removed:false};this.c=o.container;this.h={};setTimeout(()=>this.h.load?.(),0)}
  on(e,f){this.h[e]=f;return this}addControl(){return this}getContainer(){return this.c}resize(){}remove(){window.__map.removed=true}
  getStyle(){return{layers:[{id:'place',type:'symbol'},{id:'water',type:'fill'}]}}
  getLayoutProperty(id){return id==='place'?['get','name:en']:undefined}
  setLayoutProperty(id,k,v){window.__map.layers.push([id,k,JSON.stringify(v)])}},
 Marker:class{constructor(o){this.el=o.element}setLngLat(l){this.l=l;return this}
  addTo(m){m.c.appendChild(this.el);this.el.setAttribute('aria-label','Map marker');window.__map.markers.push(this.el);return this}},
 NavigationControl:class{}};`
async function stubMap(page, { fail = false } = {}) {
  await page.route("https://unpkg.com/**", (route) =>
    fail
      ? route.abort()
      : route.fulfill({
          status: 200,
          contentType: route.request().url().endsWith(".css") ? "text/css" : "text/javascript",
          body: route.request().url().endsWith(".css") ? "" : STUB,
        }),
  )
}
async function openMap(page, opts) {
  await snapshot(page)
  await stubMap(page, opts)
  await go(page, "imoveis")
  await page.locator('#main [data-action="catalog-view"][data-value="map"]').click()
  await settle(page)
}
const pins = (page) =>
  page
    .locator("#catalog-map .cmap-pin")
    .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))

const checkpoints = {
  // Revisão do lote C: salvar na folha do bairro atualiza o botão e não remonta o mapa.
  async "saving-in-sheet-keeps-the-map"(page) {
    await openMap(page)
    await page.locator('#catalog-map .cmap-pin[data-value="Ponta Negra"]').click()
    await settle(page)
    const before = await page.evaluate(() => window.__maps)
    await page.locator('#dialog [data-action="save-item"][data-value="i2"]').click()
    await settle(page)
    // O Material leva o aria-pressed do host para o botão interno: lê a propriedade.
    const pressed = await page
      .locator('#dialog [data-action="save-item"][data-value="i2"]')
      .evaluate((b) => [b.ariaPressed, b.getAttribute("aria-pressed"), b.innerHTML.slice(0, 120)])
    expect(
      pressed[0] === "true" || pressed[1] === "true",
      `botão da folha não acompanhou o salvar: ${JSON.stringify(pressed)}`,
    )
    expect((await page.evaluate(() => window.__maps)) === before, "mapa remontado ao salvar")
    expect(await page.locator("#catalog-map .cmap-pin").count(), "marcadores sumiram")
  },
  async "map-loads-only-when-asked"(page) {
    const asked = []
    page.on("request", (r) => r.url().startsWith("https://unpkg.com") && asked.push(r.url()))
    await snapshot(page)
    await stubMap(page)
    await go(page, "imoveis")
    expect(
      (await page
        .locator('#main [data-action="catalog-view"][data-value="list"]')
        .getAttribute("aria-pressed")) === "true",
      "não começou na lista",
    )
    expect(!asked.length, "carregou o mapa sem a pessoa pedir")
    await page.locator('#main [data-action="catalog-view"][data-value="map"]').click()
    await settle(page)
    expect(
      asked.some((u) => u === MAP_JS),
      "não carregou o MapLibre ao abrir o mapa",
    )
    const opts = await page.evaluate(() => window.__map?.opts.style)
    expect(opts === "https://tiles.openfreemap.org/styles/liberty", `estilo do mapa: ${opts}`)
  },
  async "one-pin-per-neighbourhood-with-readable-label"(page) {
    await openMap(page)
    const labels = await pins(page)
    expect(labels.length >= 5, `poucos bairros no mapa: ${labels}`)
    expect(
      labels.every((l) => /^[A-ZÀ-Ú][\p{L} 0-9]+: \d+ imóve(l|is)$/u.test(l)),
      `rótulos: ${labels.join(" | ")}`,
    )
    const names = await page.evaluate(() => window.__map.layers)
    expect(
      names.some(([id, , v]) => id === "place" && v.includes("name:pt")),
      "nomes do mapa sem português",
    )
  },
  async "filters-change-the-pins"(page) {
    await openMap(page)
    await page.locator('#main [data-action="catalog-toggle"][data-value="pets"]').click()
    await settle(page)
    const labels = await pins(page)
    expect(
      labels.length === 2 &&
        labels.some((l) => l.startsWith("Parque 10")) &&
        labels.some((l) => l.startsWith("Tarumã")),
      `com aceita pets: ${labels.join(" | ")}`,
    )
  },
  async "pin-opens-neighbourhood-and-list-filter"(page) {
    await openMap(page)
    await page.locator('#catalog-map .cmap-pin[data-value="Ponta Negra"]').click()
    await settle(page)
    expect(
      /^Ponta Negra · 1 imóvel/.test(await page.locator("#dialog").innerText()),
      "folha do bairro",
    )
    expect(
      await page.locator('#dialog [data-action="open-item"][data-value="i2"]').count(),
      "folha sem o anúncio do bairro",
    )
    await page.locator('#dialog [data-action="map-hood-list"]').click()
    await settle(page)
    expect(
      (await page
        .locator('#main [data-action="catalog-view"][data-value="list"]')
        .getAttribute("aria-pressed")) === "true",
      "não voltou para a lista",
    )
    expect(
      (
        await page.locator('#main [data-action="catalog-pill"][data-value="hood"]').innerText()
      ).startsWith("Ponta Negra"),
      "filtro de bairro não aplicado",
    )
    expect(await page.evaluate(() => window.__map.removed), "mapa não foi desmontado")
  },
  async "offline-falls-back-to-neighbourhood-chips"(page) {
    await openMap(page, { fail: true })
    expect(
      /precisa de internet/.test(await page.locator("#cmap-status").innerText()),
      "sem aviso quando o mapa não carrega",
    )
    await page.locator('#main .cmap-list [data-action="map-hood"]').first().click()
    await settle(page)
    expect(
      await page.evaluate(() => document.querySelector("#dialog").open),
      "bairros não funcionam sem o mapa",
    )
  },
}

await runProof(checkpoints, "round31", { allowExternal: ["https://unpkg.com/maplibre-gl@"] })
