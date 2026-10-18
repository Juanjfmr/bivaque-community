import {
  choose,
  expect,
  go,
  routeOf,
  runProof,
  settle,
  snapshot,
  stored,
  toast,
} from "./proof-harness.mjs"

// Rodada 50: Filas do Painel do Bivaque. Navegação do console com a contagem, assumir, abertas e
// decididas, desfazer uma decisão e ordenar por prazo ou pelas mais recentes.
const titles = (page) =>
  page.locator("#main .ow-q .t b").evaluateAll((els) => els.map((e) => e.textContent))
// O id da denúncia leva o momento da primeira (Rodada 49, revisão): lê o id da própria tela.
const qid = (page, prefix) =>
  page
    .locator(`#main [data-action="owner-review"][data-value^="${prefix}"]`)
    .first()
    .getAttribute("data-value")
const phone = (page) => page.viewportSize().width < 720
async function openQueues(page) {
  await snapshot(page)
  await go(page, "dono")
  await page.locator('[data-action="owner-go"][data-value="filas"]:visible').first().click()
  await settle(page)
  const r = await routeOf(page)
  expect(r.name === "dono" && r.id === "filas", `rota das filas: ${JSON.stringify(r)}`)
}

const checkpoints = {
  async "console-nav-opens-queues-with-the-count"(page) {
    await openQueues(page)
    expect((await page.locator("#main h1").innerText()) === "Filas", "título das filas")
    const shown = (await titles(page)).length
    const nav = await page.evaluate(() => ({
      side: getComputedStyle(document.querySelector(".ow-nav")).display,
      top: getComputedStyle(document.querySelector(".ow-subnav")).display,
      badge: document.querySelector(".ow-badge")?.textContent,
    }))
    if (phone(page))
      expect(
        nav.side === "none" && nav.top !== "none",
        `navegação no celular: ${JSON.stringify(nav)}`,
      )
    else
      expect(
        nav.side !== "none" && nav.top === "none" && Number(nav.badge) === shown,
        `navegação no computador: ${JSON.stringify(nav)}`,
      )
  },
  async "assume-makes-you-responsible"(page) {
    await openQueues(page)
    await page.locator('#main [data-action="owner-assign"][data-value="verify:ov1"]').click()
    await settle(page)
    expect((await stored(page)).owner.assign["verify:ov1"] === "me", "não gravou o responsável")
    const row = page.locator("#main .ow-q", { hasText: "Carla R." })
    expect(/Você/.test(await row.innerText()), "a linha não mostra você como responsável")
    expect(!(await row.locator('[data-action="owner-assign"]').count()), "Assumir ficou na linha")
  },
  async "decided-list-and-undo-restore-the-listing"(page) {
    await openQueues(page)
    const id = await qid(page, "report:item|i1:")
    await page.locator(`#main [data-action="owner-review"][data-value="${id}"]`).click()
    await settle(page)
    await choose(page, "owner-reason", "golpe")
    await page.locator(`#dialog [data-action="owner-decide"][data-value="${id}~remove"]`).click()
    await settle(page)
    expect(
      (await stored(page)).items.find((x) => x.id === "i1").status === "removed",
      "não removeu",
    )
    await page.locator('#main [data-action="owner-status"][data-value="done"]').click()
    await settle(page)
    const done = await page.locator("#main .ow-q").innerText()
    expect(/Removido/.test(done) && /Golpe/.test(done), `decididas: ${done}`)
    await page.locator(`#main [data-action="owner-undo"][data-value="${id}"]`).click()
    await settle(page)
    const s = await stored(page)
    expect(
      s.items.find((x) => x.id === "i1").status === "active",
      "desfazer não devolveu o anúncio",
    )
    expect(!s.owner.decisions[id], "a decisão continuou registrada")
    expect(/voltou para a fila/.test(await toast(page)), `aviso: ${await toast(page)}`)
    await page.locator('#main [data-action="owner-status"][data-value="open"]').click()
    await settle(page)
    expect(
      (await titles(page)).some((t) => /Sofá retrátil/.test(t)),
      "a denúncia não voltou para a fila",
    )
  },
  async "sort-by-deadline-or-most-recent"(page) {
    await openQueues(page)
    const byDue = await titles(page)
    expect(/perguntas sem resposta/.test(byDue[0]), `primeiro por prazo: ${byDue[0]}`)
    await page.locator('#main [data-action="owner-sort"][data-value="recent"]').click()
    await settle(page)
    const recent = await titles(page)
    expect(/Carla R\./.test(recent[0]), `primeiro por mais recente: ${recent[0]}`)
  },
}

await runProof(checkpoints, "round50")
