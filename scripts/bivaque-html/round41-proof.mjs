import { expect, go, KEY, reload, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 41: no celular, a folha do bairro fica sobre o mapa com três alturas e o mapa continua
// tocável; as folhas comuns encolhem a página de trás. No desktop, a folha do bairro é o diálogo.
// O MapLibre é trocado por um substituto local, como na prova da Rodada 31.
const STUB = `window.maplibregl={
 Map:class{constructor(o){this.c=o.container;this.h={};setTimeout(()=>this.h.load?.(),0)}
  on(e,f){this.h[e]=f;return this}addControl(){return this}remove(){}getContainer(){return this.c}resize(){}
  getStyle(){return{layers:[]}}getLayoutProperty(){}setLayoutProperty(){}},
 Marker:class{constructor(o){this.el=o.element}setLngLat(){return this}addTo(m){m.c.appendChild(this.el);return this}},
 NavigationControl:class{}};`
const phone = (page) => page.viewportSize().width < 720
async function openMap(page) {
  await snapshot(page)
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
}
const pin = (page, hood) => page.locator(`#catalog-map .cmap-pin[data-value="${hood}"]`)
const panel = (page) =>
  page.evaluate(() => {
    const el = document.querySelector("#hood-panel")
    return el
      ? {
          stop: el.dataset.stop,
          h: Math.round(el.getBoundingClientRect().height),
          title: el.querySelector("h2")?.textContent,
        }
      : null
  })

const checkpoints = {
  async "phone-panel-keeps-the-map"(page) {
    await openMap(page)
    await pin(page, "Ponta Negra").click()
    await settle(page)
    if (!phone(page)) {
      expect(!(await panel(page)), "o desktop ganhou a folha sobre o mapa")
      expect(
        await page.evaluate(() => document.querySelector("#dialog").open),
        "o desktop perdeu o diálogo do bairro",
      )
      return
    }
    const p = await panel(page)
    expect(
      p?.stop === "low" && p.title === "Ponta Negra" && p.h < 300,
      `folha: ${JSON.stringify(p)}`,
    )
    expect(
      !(await page.evaluate(() => document.querySelector("#dialog").open)),
      "abriu o diálogo por cima do mapa",
    )
    expect(await page.locator("#hood-panel .hp-row").count(), "folha baixa sem a linha compacta")
    const on = await pin(page, "Ponta Negra").evaluate((e) => [
      e.classList.contains("on"),
      getComputedStyle(e).scale,
    ])
    expect(on[0] && on[1] !== "none", `marcador sem destaque: ${on}`)
  },
  async "another-pin-switches-the-hood"(page) {
    if (!phone(page)) return
    await openMap(page)
    await pin(page, "Ponta Negra").click()
    await settle(page)
    const other = await page.evaluate(() =>
      [...document.querySelectorAll("#catalog-map .cmap-pin")]
        .map((e) => e.dataset.value)
        .find((v) => v !== "Ponta Negra"),
    )
    await pin(page, other).click()
    await settle(page)
    expect((await panel(page))?.title === other, `outro marcador não trocou o bairro: ${other}`)
    expect(
      !(await pin(page, "Ponta Negra").evaluate((e) => e.classList.contains("on"))),
      "o marcador anterior continuou em destaque",
    )
  },
  async "three-stops-by-tap-and-drag"(page) {
    if (!phone(page)) return
    await openMap(page)
    await pin(page, "Ponta Negra").click()
    await settle(page)
    await page.locator("#hood-panel .hp-grab").click()
    await settle(page)
    let p = await panel(page)
    expect(
      p.stop === "half" && (await page.locator("#hood-panel .photo-card").count()),
      `metade: ${JSON.stringify(p)}`,
    )
    await page.locator("#hood-panel .hp-grab").click()
    await settle(page)
    expect((await panel(page)).stop === "full", "não chegou à tela cheia")
    // Arrastar o topo para baixo, devagar, até perto da folha baixa.
    const box = await page.locator("#hood-panel .hp-head").boundingBox()
    const x = box.x + 40
    const y = box.y + 10
    await page.mouse.move(x, y)
    await page.mouse.down()
    for (let i = 1; i <= 12; i++) await page.mouse.move(x, y + i * 40)
    await page.mouse.up()
    await settle(page)
    p = await panel(page)
    expect(p?.stop === "low", `arrastar para baixo: ${JSON.stringify(p)}`)
    const low = await page.locator("#hood-panel .hp-head").boundingBox()
    await page.mouse.move(low.x + 40, low.y + 10)
    await page.mouse.down()
    for (let i = 1; i <= 5; i++) await page.mouse.move(low.x + 40, low.y + 10 + i * 40)
    await page.mouse.up()
    await settle(page)
    expect(!(await panel(page)), "arrastar a folha baixa para baixo não fechou")
  },
  async "panel-follows-filters-and-leaves-with-the-map"(page) {
    if (!phone(page)) return
    await openMap(page)
    await pin(page, "Ponta Negra").click()
    await settle(page)
    await page.keyboard.press("Escape")
    await settle(page)
    expect(!(await panel(page)), "Esc não fechou a folha")
    await pin(page, "Ponta Negra").click()
    await settle(page)
    await page.locator('#hood-panel [data-action="map-hood-list"]').click()
    await settle(page)
    expect(!(await panel(page)), "a folha ficou na lista")
    expect(
      !(await page.evaluate(() => document.body.classList.contains("hood-open"))),
      "a página ficou com o espaço da folha",
    )
  },
  async "sheet-shrinks-the-page-behind-on-phone"(page) {
    await snapshot(page)
    await go(page, "conversas")
    await page.locator('#main [data-action="thread-menu"]').first().click()
    await settle(page)
    const on = await page.evaluate(() => [
      document.body.classList.contains("sheet-depth"),
      getComputedStyle(document.querySelector("#app-shell")).transform,
    ])
    if (phone(page)) expect(on[0] && on[1] !== "none", `página de trás: ${on}`)
    else expect(!on[0] && on[1] === "none", `desktop encolheu: ${on}`)
    await page.keyboard.press("Escape")
    await settle(page)
    expect(
      !(await page.evaluate(() => document.body.classList.contains("sheet-depth"))),
      "a página não voltou ao fechar",
    )
  },
  // Revisão do lote: arrastar com o dedo não engole o toque seguinte.
  async "touch-drag-then-tap-works"(page) {
    if (!phone(page)) return
    await openMap(page)
    await pin(page, "Ponta Negra").click()
    await settle(page)
    await page.evaluate(async () => {
      const head = document.querySelector("#hood-panel .hp-head")
      const r = head.getBoundingClientRect()
      const x = r.left + 40
      const fire = (type, y) =>
        head.dispatchEvent(
          new PointerEvent(type, {
            pointerId: 7,
            pointerType: "touch",
            clientX: x,
            clientY: y,
            bubbles: true,
          }),
        )
      fire("pointerdown", r.top + 10)
      for (let i = 1; i <= 6; i++) {
        fire("pointermove", r.top + 10 - i * 30)
        await new Promise((ok) => setTimeout(ok, 30))
      }
      fire("pointerup", r.top + 10 - 180)
    })
    await settle(page)
    const mid = (await panel(page))?.stop
    expect(mid && mid !== "low", `arrastar para cima: ${mid}`)
    await page.locator("#hood-panel .hp-grab").click()
    await settle(page)
    expect((await panel(page))?.stop !== mid, "o toque depois do arrasto foi engolido")
  },
  async "back-closes-the-panel-before-the-map"(page) {
    if (!phone(page)) return
    await openMap(page)
    await pin(page, "Ponta Negra").click()
    await settle(page)
    await page.goBack()
    await settle(page)
    expect(!(await panel(page)), "o Voltar do sistema não recolheu a folha")
    expect(await page.locator("#catalog-map").count(), "o Voltar do sistema saiu do mapa")
    await pin(page, "Ponta Negra").click()
    await settle(page)
    await page.locator('#topbar [data-action="back"]').click()
    await settle(page)
    expect(!(await panel(page)), "o voltar da barra não recolheu a folha")
    expect(await page.locator("#catalog-map").count(), "o voltar da barra saiu do mapa")
    await pin(page, "Ponta Negra").click()
    await settle(page)
    await page.locator('#hood-panel [data-action="hood-panel-close"]').click()
    await settle(page)
    await page.goBack()
    await settle(page)
    expect(
      !(await page.locator("#catalog-map").count()),
      "fechar pelo X deixou uma entrada sobrando no histórico",
    )
  },
  async "redraw-keeps-the-cards-scroll"(page) {
    if (!phone(page)) return
    await snapshot(page)
    await page.evaluate((k) => {
      const x = JSON.parse(localStorage.getItem(k))
      const base = x.items.find((i) => i.id === "i2")
      for (let n = 0; n < 5; n++)
        x.items.push({ ...base, id: `i2x${n}`, title: `${base.title} ${n}` })
      localStorage.setItem(k, JSON.stringify(x))
    }, KEY)
    await reload(page)
    await openMap(page)
    await pin(page, "Ponta Negra").click()
    await settle(page)
    await page.locator("#hood-panel .hp-grab").click()
    await settle(page)
    const left = await page.evaluate(() => {
      const c = document.querySelector("#hood-panel .hp-cards")
      c.scrollLeft = 400
      return c.scrollLeft
    })
    expect(left > 100, `cartões sem rolagem para testar: ${left}`)
    await page.locator('#hood-panel [data-action="save-item"]').nth(2).click()
    await settle(page)
    const after = await page.evaluate(
      () => document.querySelector("#hood-panel .hp-cards").scrollLeft,
    )
    expect(Math.abs(after - left) < 2, `salvar perdeu a rolagem: ${left} → ${after}`)
  },
}

await runProof(checkpoints, "round41", { allowExternal: ["https://unpkg.com/maplibre-gl@"] })
