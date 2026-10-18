import {
  expect,
  fill,
  go,
  routeOf,
  runProof,
  settle,
  snapshot,
  stored,
  toast,
} from "./proof-harness.mjs"

// Rodada 51: Cidades do Painel do Bivaque. A cidade que mais precisa de ajuda vem primeiro; o detalhe
// mostra embaixadores; convidar exige nome e entra na tabela; "Ver perguntas paradas" filtra a fila.
const cityNames = (page) =>
  page
    .locator("#main .ow-table tbody th .ow-link")
    .evaluateAll((els) => els.map((e) => e.textContent.trim()))
async function openCities(page) {
  await snapshot(page)
  await go(page, "dono/cidades")
  expect((await page.locator("#main h1").innerText()) === "Cidades", "título de Cidades")
}

const checkpoints = {
  async "worst-city-comes-first"(page) {
    await openCities(page)
    const names = await cityNames(page)
    expect(names[0] === "Natal" && names.at(-1) === "Rio de Janeiro", `ordem: ${names}`)
    expect(
      /Precisa de ajuda/.test(await page.locator("#main .ow-table tbody tr").first().innerText()),
      "sem o rótulo de saúde",
    )
  },
  async "detail-lists-ambassadors"(page) {
    await openCities(page)
    await page.locator('#main [data-action="owner-city-open"][data-value="Manaus"]').click()
    await settle(page)
    const text = await page.locator("#dialog").innerText()
    expect(/Luana M\./.test(text) && /66%/.test(text), `detalhe de Manaus: ${text.slice(0, 200)}`)
  },
  async "invite-needs-a-name-then-shows-in-the-table"(page) {
    await openCities(page)
    await page.locator('#main [data-action="owner-city-open"][data-value="Natal"]').click()
    await settle(page)
    await page.locator('#dialog [data-action="owner-invite"][data-value="Natal"]').click()
    await settle(page)
    expect(!(await stored(page)).owner?.invites?.length, "convidou sem nome")
    await fill(page, "owner-invite-name", "Marina Costa")
    await page.locator('#dialog [data-action="owner-invite"][data-value="Natal"]').click()
    await settle(page)
    const inv = (await stored(page)).owner.invites
    expect(
      inv.length === 1 && inv[0].city === "Natal" && inv[0].name === "Marina Costa",
      "convite não gravado",
    )
    expect(
      /Convite para Marina Costa ser embaixador em Natal registrado/.test(await toast(page)),
      `aviso: ${await toast(page)}`,
    )
    const natal = await page.locator("#main .ow-table tbody tr", { hasText: "Natal" }).innerText()
    expect(/\+1 convite/.test(natal), `tabela sem o convite: ${natal}`)
  },
  async "stale-questions-open-the-filtered-queue"(page) {
    await openCities(page)
    await page.locator('#main [data-action="owner-city-open"][data-value="Natal"]').click()
    await settle(page)
    await page.locator('#dialog [data-action="owner-city-stale"][data-value="Natal"]').click()
    await settle(page)
    const r = await routeOf(page)
    expect(r.name === "dono" && r.id === "filas", `rota: ${JSON.stringify(r)}`)
    const titles = await page
      .locator("#main .ow-q .t b")
      .evaluateAll((els) => els.map((e) => e.textContent))
    expect(
      titles.length === 1 && /perguntas sem resposta/.test(titles[0]),
      `fila filtrada: ${titles}`,
    )
  },
}

await runProof(checkpoints, "round51")
