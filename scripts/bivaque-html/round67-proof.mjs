import { action, expect, go, KEY, reload, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 67: filtro "Distância de mim" (a partir do bairro do perfil, só na cidade onde a pessoa mora) e
// bairros da cidade com busca; filtro e Mapa em qualquer cidade com base de bairros, nunca com os bairros
// de Manaus no lugar. Anúncios de outras cidades entram pelo armazenamento (o protótipo só tem exemplos
// em Manaus).
async function patchState(page, code) {
  await snapshot(page)
  await page.evaluate(
    ([k, src]) => {
      const s = JSON.parse(localStorage.getItem(k))
      new Function("s", `{${src}}`)(s)
      localStorage.setItem(k, JSON.stringify(s))
    },
    [KEY, code],
  )
  await reload(page)
}
const panel = (page) => page.locator("#filter-panel").innerText()
const results = (page) => page.locator("#catalog-results").innerText()
const pillText = (page) =>
  page.locator('#main [data-action="catalog-pill"][data-value="hood"]').innerText()
async function openHood(page) {
  await action(page, "catalog-pill", "hood")
  await page.locator("#filter-panel[open]").waitFor()
}
const setDist = (page, km) =>
  page.locator(`#filter-panel [data-f="set"][data-field="dist"][data-v="${km}"]`).click()
const setHood = (page, h) =>
  page.locator(`#filter-panel [data-f="set"][data-field="hoods"][data-v="${h}"]`).click()
async function apply(page) {
  await page.locator("#fp-apply").click()
  await settle(page)
}
// Desapegos em Natal: Lagoa Nova, Tirol e um bairro fora da base.
const NATAL = `const t=s.items.find(i=>i.id==='i11');
 s.items.push({...t,id:'n67a',city:'Natal',hood:'Lagoa Nova',title:'Mesa de jantar 4 lugares',mine:false,createdAt:Date.now()},
  {...t,id:'n67b',city:'Natal',hood:'Tirol',title:'Bicicleta infantil aro 16',mine:false,createdAt:Date.now()},
  {...t,id:'n67c',city:'Natal',hood:'Vila Rica',title:'Ventilador de coluna',mine:false,createdAt:Date.now()});`

const checkpoints = {
  async "distance-from-the-profile-hood-in-manaus"(page) {
    await patchState(page, "s.profile.hood='Parque 10'")
    await go(page, "imoveis")
    await openHood(page)
    const text = await panel(page)
    expect(/Distância de mim/.test(text), "falta a distância")
    expect(/A partir do seu bairro, Parque 10\./.test(text), "falta o ponto de partida")
    await setDist(page, 3)
    await apply(page)
    const r3 = await results(page)
    expect(
      /Casa 3 quartos com quintal/.test(r3) && /Flat mobiliado no Adrianópolis/.test(r3),
      `3 km tirou bairros perto: ${r3.slice(0, 300)}`,
    )
    expect(
      !/Kitnet mobiliada no Centro/.test(r3) && !/Casa em condomínio, 4 quartos/.test(r3),
      "3 km deixou Centro ou Tarumã",
    )
    expect(/Até 3 km/.test(await pillText(page)), `pílula: ${await pillText(page)}`)
    // 1 km: só Parque 10 (e Flores, a menos de 1 km)
    await openHood(page)
    await setDist(page, 1)
    await apply(page)
    const r1 = await results(page)
    expect(
      /Casa 3 quartos com quintal/.test(r1) && !/Flat mobiliado no Adrianópolis/.test(r1),
      "1 km",
    )
    // Qualquer volta tudo
    await openHood(page)
    await setDist(page, 0)
    await apply(page)
    expect(/Kitnet mobiliada no Centro/.test(await results(page)), "Qualquer não voltou tudo")
    const back = await pillText(page)
    expect(
      /^Bairro/.test(back.trim()) && !/km/.test(back),
      `pílula não voltou: ${JSON.stringify(back)}`,
    )
  },

  async "no-profile-hood-explains-and-visiting-hides-distance"(page) {
    await patchState(page, "s.profile.hood=''")
    await go(page, "imoveis")
    await openHood(page)
    const text = await panel(page)
    expect(/Informe seu bairro em Configurações/.test(text), "sem bairro: falta a explicação")
    expect(
      !(await page.locator('#filter-panel [data-field="dist"]').count()),
      "distância sem bairro",
    )
    await page.keyboard.press("Escape")
    await settle(page)
    // conhecendo outra cidade, não há distância (o bairro do perfil é de Manaus)
    await patchState(page, `s.profile.hood='Parque 10';${NATAL}`)
    await go(page, "inicio?cidade=Natal")
    await go(page, "desapegos")
    await openHood(page)
    expect(!/Distância de mim/.test(await panel(page)), "distância em cidade visitada")
  },

  async "hood-filter-search-and-map-in-natal"(page) {
    await patchState(page, `s.homeCity='Natal';s.city='Natal';s.profile.hood='Lagoa Nova';${NATAL}`)
    await go(page, "inicio?cidade=Natal")
    await go(page, "desapegos")
    expect(
      (await page.locator('[data-action="catalog-view"]').count()) === 2,
      "Natal sem Lista/Mapa",
    )
    await openHood(page)
    const text = await panel(page)
    expect(
      /Lagoa Nova/.test(text) && /Tirol/.test(text) && /Vila Rica/.test(text),
      "bairros de Natal",
    )
    expect(!/Planalto|Adrianópolis|Parque 10|Tarumã/.test(text), "Natal oferece bairros de Manaus")
    // a busca esconde os chips que não batem
    await page.locator("#fp-hood-q").fill("tir")
    const visible = await page
      .locator('#filter-panel [data-field="hoods"]:visible')
      .evaluateAll((els) => els.map((e) => e.dataset.v))
    expect(visible.length === 1 && visible[0] === "Tirol", `busca: ${visible}`)
    await setHood(page, "Tirol")
    await apply(page)
    const r = await results(page)
    expect(/Bicicleta infantil aro 16/.test(r) && !/Mesa de jantar/.test(r), "filtro por bairro")
    expect(/Tirol/.test(await pillText(page)), "pílula sem o bairro")
    // distância a partir de Lagoa Nova: Tirol fica a mais de 3 km; o bairro fora da base não entra
    await openHood(page)
    await setHood(page, "Tirol")
    await setDist(page, 3)
    await apply(page)
    const d = await results(page)
    expect(
      /Mesa de jantar/.test(d) && !/Bicicleta infantil/.test(d) && !/Ventilador/.test(d),
      `distância em Natal: ${d.slice(0, 300)}`,
    )
    // mapa: lista de bairros de Natal
    await openHood(page)
    await setDist(page, 0)
    await apply(page)
    // sem rede: o MapLibre não carrega e a lista de bairros abaixo do mapa continua valendo
    await page.route("https://unpkg.com/**", (route) => route.abort())
    await action(page, "catalog-view", "map")
    const hoods = await page
      .locator('#main [data-action="map-hood"]')
      .evaluateAll((els) => els.map((e) => e.dataset.value))
    expect(
      hoods.includes("Lagoa Nova") && hoods.includes("Tirol") && !hoods.includes("Planalto"),
      `mapa: ${hoods}`,
    )
  },
}

await runProof(checkpoints, "round67", { allowExternal: ["https://unpkg.com/maplibre-gl@"] })
