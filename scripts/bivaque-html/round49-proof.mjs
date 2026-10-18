import {
  action,
  choose,
  dialogKind,
  expect,
  go,
  routeOf,
  runProof,
  settle,
  snapshot,
  stored,
  toast,
} from "./proof-harness.mjs"

// Rodada 49: Painel do Bivaque (console do dono). Entra pelo menu do protótipo, fica fora da
// navegação do app, e a fila recebe a denúncia feita no app; decisões com consequência pedem motivo.
const queueTitles = (page) =>
  page.locator("#main .ow-q .t b").evaluateAll((els) => els.map((e) => e.textContent))
async function openConsole(page) {
  await snapshot(page)
  await go(page, "dono")
  expect((await routeOf(page)).name === "dono", "rota do painel")
}
async function review(page, id) {
  await page.locator(`#main [data-action="owner-review"][data-value="${id}"]`).click()
  await settle(page)
  expect((await dialogKind(page)) === "owner-review", `revisão de ${id} não abriu`)
}
const decide = (page, id, d) =>
  page.locator(`#dialog [data-action="owner-decide"][data-value="${id}~${d}"]`).click()

const checkpoints = {
  async "prototype-menu-opens-the-console-outside-the-app"(page) {
    await snapshot(page)
    await go(page, "voce")
    await action(page, "prototype")
    await page.locator('#dialog [data-action="owner-open"]').click()
    await settle(page)
    expect((await routeOf(page)).name === "dono", "o menu do protótipo não abriu o painel")
    const shell = await page.evaluate(() => ({
      mode: document.body.classList.contains("owner-mode"),
      nav: getComputedStyle(document.querySelector("#nav")).display,
      fab: getComputedStyle(document.querySelector("#fab")).display,
      h1: document.querySelector("#main h1")?.textContent,
    }))
    expect(
      shell.mode && shell.nav === "none" && shell.fab === "none",
      `navegação do app: ${JSON.stringify(shell)}`,
    )
    expect(/^Bom dia/.test(shell.h1), `título: ${shell.h1}`)
    expect(
      /Dados de exemplo/.test(await page.locator("#main").innerText()),
      "sem o aviso de exemplo",
    )
  },
  async "report-in-the-app-reaches-the-queue"(page) {
    await snapshot(page)
    await go(page, "anuncio/i3")
    await page.locator('[data-action="report"][data-value="item|i3"]:visible').first().click()
    await settle(page)
    await page.locator('#dialog [data-action="submit-report"]').click()
    await settle(page)
    expect((await dialogKind(page)) !== null, "registrou denúncia sem motivo")
    await choose(page, "report-reason", "spam")
    await page.locator('#dialog [data-action="submit-report"]').click()
    await settle(page)
    const s = await stored(page)
    expect(s.reports.length === 1 && s.reports[0].target === "i3", "denúncia não ficou registrada")
    expect(/Denúncia registrada/.test(await toast(page)), `aviso: ${await toast(page)}`)
    await go(page, "dono")
    expect(
      (await queueTitles(page)).some((t) => /Berço com colchão/.test(t)),
      "a denúncia não chegou à fila do dono",
    )
  },
  async "remove-needs-a-reason-then-leaves-the-lists"(page) {
    await openConsole(page)
    const id = "report:item|i1"
    await review(page, id)
    await decide(page, id, "remove")
    await settle(page)
    expect((await dialogKind(page)) === "owner-review", "removeu sem motivo")
    expect(!(await stored(page)).owner, "gravou decisão sem motivo")
    await choose(page, "owner-reason", "golpe")
    await decide(page, id, "remove")
    await settle(page)
    const s = await stored(page)
    expect(s.items.find((x) => x.id === "i1").status === "removed", "o anúncio não saiu")
    expect(s.owner.decisions[id]?.reason === "golpe", "decisão sem o motivo")
    expect(!(await queueTitles(page)).some((t) => /Sofá retrátil/.test(t)), "o item ficou na fila")
    await page.evaluate(() => {
      location.hash = "desapegos"
    })
    await settle(page)
    expect(
      !(await page.locator('#main [data-action="open-item"][data-value="i1"]').count()),
      "o anúncio removido continua na lista",
    )
  },
  async "verification-approves-from-the-side-panel"(page) {
    await openConsole(page)
    const before = (await queueTitles(page)).length
    await review(page, "verify:ov1")
    expect(/conferir/i.test(await page.locator("#dialog").innerText()), "painel sem o que conferir")
    await decide(page, "verify:ov1", "approve")
    await settle(page)
    expect(
      (await stored(page)).owner.decisions["verify:ov1"].d === "approve",
      "aprovação não gravada",
    )
    expect((await queueTitles(page)).length === before - 1, "a fila não diminuiu")
    expect((await stored(page)).owner.log[0].text.includes("aprovado"), "registro sem a decisão")
  },
  async "city-filter-narrows-hero-and-queue"(page) {
    await openConsole(page)
    await page.locator('#main [data-action="owner-city"][data-value="Natal"]').click()
    await settle(page)
    const hero = await page.locator("#main .ow-hero").innerText()
    expect(/25%/.test(hero) && /a Natal/.test(hero), `métrica principal em Natal: ${hero}`)
    const titles = await queueTitles(page)
    expect(
      titles.length === 1 && /perguntas sem resposta/.test(titles[0]),
      `fila de Natal: ${titles}`,
    )
  },
  async "calling-ambassadors-names-the-city-without-one"(page) {
    await openConsole(page)
    await review(page, "stale")
    await decide(page, "stale", "call")
    await settle(page)
    expect(/Natal ainda não tem embaixador/.test(await toast(page)), `aviso: ${await toast(page)}`)
  },
  async "back-to-the-app-restores-navigation"(page) {
    await openConsole(page)
    await page.locator('[data-action="owner-exit"]:visible').first().click()
    await settle(page)
    expect((await routeOf(page)).name === "voce", "Voltar ao app não voltou para Você")
    const nav = await page.evaluate(() => [
      document.body.classList.contains("owner-mode"),
      getComputedStyle(document.querySelector("#nav")).display,
    ])
    expect(!nav[0] && nav[1] !== "none", `navegação do app não voltou: ${nav}`)
  },
}

await runProof(checkpoints, "round49")
