import {
  action,
  expect,
  go,
  routeOf,
  runProof,
  settle,
  snapshot,
  stored,
  toast,
} from "./proof-harness.mjs"

// Rodada 25: alerta de busca salva. "Avise-me" só com filtros ativos; a lista fica em Você;
// abrir o alerta reaplica os filtros; o anúncio novo que cabe no alerta vira aviso na central.
const banner = (page) => page.locator("#main .falert")
const pets = (page) => page.locator('#main [data-action="catalog-toggle"][data-value="pets"]')
const alerts = async (page) => (await stored(page)).alerts || []
async function petsAlert(page) {
  await snapshot(page)
  await go(page, "imoveis")
  await pets(page).click()
  await settle(page)
  await page.locator('#main [data-action="search-alert"]').click()
  await settle(page)
}
// O painel do protótipo continua aberto depois de simular; fecha antes de seguir.
async function simulate(page) {
  await action(page, "prototype")
  await action(page, "simulate-alert")
  await settle(page)
  const message = await toast(page)
  await page.keyboard.press("Escape")
  await settle(page)
  return message
}
async function openList(page) {
  await go(page, "voce")
  await page.locator('#main [data-action="search-alerts"]').click()
  await settle(page)
}

const checkpoints = {
  async "banner-only-with-active-filters"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    expect(!(await banner(page).count()), "Avise-me sem nenhum filtro")
    await pets(page).click()
    await settle(page)
    expect(/Avise-me/.test(await banner(page).innerText()), "sem Avise-me com filtro ativo")
  },
  async "create-alert-and-undo"(page) {
    await petsAlert(page)
    const [al] = await alerts(page)
    expect(
      al?.kind === "imovel" && al.attrs.amen.join() === "pets" && al.notify,
      `alerta salvo errado: ${JSON.stringify(al)}`,
    )
    expect(/Imóveis · aceita pets/.test(al.label), `rótulo: ${al.label}`)
    expect(/Alerta ativo/.test(await banner(page).innerText()), "faixa não mostra o alerta ativo")
    expect(/Alerta criado/.test(await toast(page)), "sem confirmação")
    await page.locator('#snackbar [data-action="undo"]').click()
    await settle(page)
    expect(!(await alerts(page)).length, "desfazer não removeu o alerta")
  },
  async "same-search-any-order-is-one-alert"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    await pets(page).click()
    await settle(page)
    await page.locator('#main [data-action="catalog-toggle"][data-value="furnished"]').click()
    await settle(page)
    await page.locator('#main [data-action="search-alert"]').click()
    await settle(page)
    // Mesma busca escolhida na ordem inversa: reconhece o alerta, não oferece outro.
    await pets(page).click()
    await settle(page)
    await page.locator('#main [data-action="catalog-toggle"][data-value="furnished"]').click()
    await settle(page)
    await page.locator('#main [data-action="catalog-toggle"][data-value="furnished"]').click()
    await settle(page)
    await pets(page).click()
    await settle(page)
    expect(
      /Alerta ativo/.test(await banner(page).innerText()),
      "mesma busca em outra ordem virou alerta novo",
    )
    expect((await alerts(page)).length === 1, "alerta duplicado")
  },
  async "background-follows-alert-changes"(page) {
    await petsAlert(page)
    await page.locator('#main [data-action="search-alerts"]').click()
    await settle(page)
    await page.locator('#dialog [data-action="alert-delete"]').click()
    await settle(page)
    await page.keyboard.press("Escape")
    await settle(page)
    expect(/Avise-me/.test(await banner(page).innerText()), "faixa continuou dizendo alerta ativo")
  },
  async "manage-alerts-in-profile"(page) {
    await petsAlert(page)
    await go(page, "voce")
    expect(
      /1 alerta/.test(await page.locator('#main [data-action="search-alerts"]').innerText()),
      "Você sem a contagem de alertas",
    )
    await openList(page)
    const id = (await alerts(page))[0].id
    expect(
      /aceita pets/.test(await page.locator("#dialog .alert-row").innerText()),
      "lista sem o alerta",
    )
    await page.locator(`#dialog [data-action="alert-toggle"][data-value="${id}"]`).click()
    await settle(page)
    expect((await alerts(page))[0].notify === false, "pausar não salvou")
    expect(
      /pausados/.test(await page.locator("#dialog .alert-row").innerText()),
      "lista não mostra a pausa",
    )
    await page.locator(`#dialog [data-action="alert-delete"][data-value="${id}"]`).click()
    await settle(page)
    expect(!(await alerts(page)).length, "excluir não removeu")
    expect(
      /excluído/.test(await page.locator("#dialog").innerText()),
      "lista sem o aviso de exclusão",
    )
    await page.locator('#dialog [data-action="alert-undo"]').click()
    await settle(page)
    expect((await alerts(page)).length === 1, "desfazer a exclusão não restaurou")
    expect(await page.locator("#dialog .alert-row").count(), "alerta restaurado não voltou à lista")
  },
  async "opening-alert-reapplies-filters"(page) {
    await petsAlert(page)
    await go(page, "inicio")
    await page.locator('#main .section-links [data-action="intent"][data-value="imovel"]').click()
    await settle(page)
    expect(
      (await pets(page).getAttribute("aria-pressed")) === "false",
      "filtro não zerou pela Início",
    )
    await openList(page)
    await page.locator('#dialog [data-action="alert-open"]').click()
    await settle(page)
    expect((await routeOf(page)).name === "imoveis", "alerta não abriu Imóveis")
    expect(
      (await pets(page).getAttribute("aria-pressed")) === "true",
      "alerta não reaplicou os filtros",
    )
  },
  async "matching-listing-sends-notice"(page) {
    await petsAlert(page)
    const before = (await stored(page)).items.length
    await simulate(page)
    const s = await stored(page)
    const item = s.items[0]
    expect(
      s.items.length === before + 1 &&
        item.kind === "imovel" &&
        item.amen.includes("pets") &&
        !item.mine,
      "anúncio de exemplo não cabe no alerta",
    )
    const notice = s.notices[0]
    expect(
      notice.unread && /aceita pets/.test(notice.text) && notice.go.join() === `anuncio,${item.id}`,
      `aviso errado: ${JSON.stringify(notice)}`,
    )
    await go(page, "imoveis")
    expect(
      (await page
        .locator(`#catalog-results [data-action="open-item"][data-value="${item.id}"]`)
        .count()) === 1,
      "anúncio novo não aparece na busca do alerta",
    )
  },
  async "paused-or-missing-alert-does-not-notify"(page) {
    await snapshot(page)
    const notices = (await stored(page)).notices.length
    expect(/Crie um alerta/.test(await simulate(page)), "simulou sem alerta")
    await petsAlert(page)
    await openList(page)
    await page.locator('#dialog [data-action="alert-toggle"]').click()
    await settle(page)
    await page.keyboard.press("Escape")
    await settle(page)
    expect(/avisos ligados/.test(await simulate(page)), "alerta pausado disparou")
    expect((await stored(page)).notices.length === notices, "gerou aviso sem alerta ligado")
  },
}

await runProof(checkpoints, "round25")
