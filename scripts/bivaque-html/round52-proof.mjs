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

// Rodada 52: Negócios e planos e Pessoas e equipe. A receita bate com a visão geral, "Lembrar" fica
// registrado, a lista abre o negócio, e o convite de moderação exige nome.
const revenueOverview = (page) => page.locator("#main .ow-kpi-revenue .v b").innerText()
const revenueBusiness = (page) =>
  page.locator("#main .ow-mini div", { hasText: "Receita do mês" }).locator("b").innerText()

const checkpoints = {
  async "revenue-matches-the-overview"(page) {
    await snapshot(page)
    await go(page, "dono")
    const all = await revenueOverview(page)
    await page.locator('#main [data-action="owner-city"][data-value="Manaus"]').click()
    await settle(page)
    const manaus = await revenueOverview(page)
    await go(page, "dono/negocios")
    expect(
      (await revenueBusiness(page)) === manaus,
      `Manaus: ${manaus} × ${await revenueBusiness(page)}`,
    )
    await page.locator('#main [data-action="owner-city"][data-value="Todas"]').click()
    await settle(page)
    expect(
      (await revenueBusiness(page)) === all && all === "R$ 4.870",
      `todas: ${all} × ${await revenueBusiness(page)}`,
    )
  },
  async "remind-a-renewal"(page) {
    await snapshot(page)
    await go(page, "dono/negocios")
    await page.locator('#main [data-action="owner-remind"][data-value="b2"]').click()
    await settle(page)
    expect((await stored(page)).owner.reminded.b2, "lembrete não registrado")
    expect(
      /Lembrete de renovação enviado a Mudanças Rio Negro/.test(await toast(page)),
      `aviso: ${await toast(page)}`,
    )
    const row = await page.locator("#main .ow-q", { hasText: "Mudanças Rio Negro" }).innerText()
    expect(/Lembrete enviado/.test(row), `linha: ${row}`)
  },
  async "business-list-opens-the-page"(page) {
    const s = await snapshot(page)
    await go(page, "dono/negocios")
    const rows = await page.locator("#main .ow-table tbody tr").count()
    expect(rows === s.biz.filter((b) => b.city).length, `linhas: ${rows}`)
    await page.locator('#main .ow-table [data-action="open-biz"]').first().click()
    await settle(page)
    const r = await routeOf(page)
    expect(r.name === "negocio", `não abriu o negócio: ${JSON.stringify(r)}`)
    expect(
      !(await page.evaluate(() => document.body.classList.contains("owner-mode"))),
      "ficou no modo do console",
    )
  },
  async "team-load-and-moderator-invite"(page) {
    await snapshot(page)
    await go(page, "dono/filas")
    await page.locator('#main [data-action="owner-assign"]').first().click()
    await settle(page)
    await go(page, "dono/equipe")
    const me = await page.locator("#main .ow-q").first().innerText()
    expect(/Dono/.test(me) && /1 item na fila/.test(me), `sua carga: ${me}`)
    await page.locator('#main [data-action="owner-mod-invite"]').click()
    await settle(page)
    await page.locator('#dialog [data-action="owner-mod-send"]').click()
    await settle(page)
    expect(!(await stored(page)).owner.team?.length, "convidou sem nome")
    await fill(page, "owner-mod-name", "Beatriz Lima")
    await page.locator('#dialog [data-action="owner-mod-send"]').click()
    await settle(page)
    expect((await stored(page)).owner.team[0].name === "Beatriz Lima", "convite não gravado")
    expect(
      /Beatriz Lima/.test(await page.locator("#main").innerText()),
      "o convite não aparece na equipe",
    )
  },
  async "overview-change-opens-plans"(page) {
    await snapshot(page)
    await go(page, "dono")
    await page.locator('#main .ow-changes [data-action="owner-go"][data-value="negocios"]').click()
    await settle(page)
    const r = await routeOf(page)
    expect(r.id === "negocios", `O que mudou não levou aos planos: ${JSON.stringify(r)}`)
  },
}

await runProof(checkpoints, "round52")
