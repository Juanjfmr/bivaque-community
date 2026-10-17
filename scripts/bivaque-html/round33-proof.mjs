import {
  action,
  expect,
  go,
  runProof,
  settle,
  skipPushAsk,
  snapshot,
  stored,
} from "./proof-harness.mjs"

// Rodada 33: avisos empilhados. O aviso mais novo fica em #snackbar; um aviso anterior com
// desfazer ainda valendo sobe para a pilha (no máximo dois) com o próprio desfazer. Criar alerta
// abre a folha dos avisos (Rodada 43): os checkpoints com alerta a dispensam antes.
const stack = (page) => page.locator("#toast-stack .snackbar")
async function alertWith(page, amen) {
  await page.locator(`#main [data-action="catalog-toggle"][data-value="${amen}"]`).click()
  await settle(page)
  await page.locator('#main [data-action="search-alert"]').click()
  await settle(page)
}

const checkpoints = {
  async "undoable-toast-moves-up-with-its-undo"(page) {
    await skipPushAsk(page)
    await go(page, "imoveis")
    await alertWith(page, "pets")
    await alertWith(page, "furnished")
    expect(
      /Alerta criado/.test(await page.locator("#snackbar").innerText()),
      "aviso novo fora do #snackbar",
    )
    expect((await stack(page).count()) === 1, "aviso anterior com desfazer não subiu")
    expect((await stored(page)).alerts.length === 2, "alertas não criados")
    await stack(page).locator('[data-action="undo"]').click()
    await settle(page)
    const alerts = (await stored(page)).alerts
    expect(
      alerts.length === 1 && alerts[0].attrs.amen.length === 2,
      "desfazer da pilha desfez o alerta errado",
    )
    // Desfazer avisa "Alerta removido"; o aviso mais novo, que ainda tem desfazer, sobe para a pilha.
    expect(
      /Alerta removido/.test(await page.locator("#snackbar").innerText()),
      "sem aviso do desfazer",
    )
    expect((await stack(page).count()) === 1, "pilha errada depois de desfazer")
  },
  async "stack-keeps-at-most-two"(page) {
    await skipPushAsk(page)
    await go(page, "imoveis")
    await alertWith(page, "pets")
    await alertWith(page, "furnished")
    await alertWith(page, "pets")
    // Quarto alerta: mesmos atalhos com um teto de preço.
    await page.locator('#main [data-action="catalog-pill"][data-value="price"]').click()
    await settle(page)
    await page.locator('#filter-panel [data-f="quick"][data-v="3000"]').click()
    await page.locator('#filter-panel [data-f="apply"]').click()
    await settle(page)
    await page.locator('#main [data-action="search-alert"]').click()
    await settle(page)
    expect((await stored(page)).alerts.length === 4, "quatro alertas não criados")
    expect((await stack(page).count()) === 2, `pilha com ${await stack(page).count()} avisos`)
  },
  async "plain-toast-is-replaced-not-stacked"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    await page.evaluate(() => document.querySelector('#main [data-action="save-item"]').click())
    await settle(page)
    await page.evaluate(() =>
      document.querySelectorAll('#main [data-action="save-item"]')[1].click(),
    )
    await settle(page)
    expect(!(await stack(page).count()), "aviso sem desfazer foi para a pilha")
  },
  async "hover-pauses-the-timer"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    await alertWith(page, "pets")
    await page.locator("#snackbar").hover()
    expect(await page.locator("#snackbar.is-paused").count(), "passar o mouse não pausou")
    await page.mouse.move(5, 5)
    expect(!(await page.locator("#snackbar.is-paused").count()), "tirar o mouse não retomou")
  },
  async "time-bar-respects-motion"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    await alertWith(page, "pets")
    const still = await page
      .locator("#snackbar .toast-time")
      .evaluate((e) => getComputedStyle(e).display)
    expect(still === "none", "barra de tempo com movimento reduzido")
    await page.emulateMedia({ reducedMotion: "no-preference" })
    const moving = await page
      .locator("#snackbar .toast-time")
      .evaluate((e) => getComputedStyle(e).animationName)
    expect(moving === "toast-time", `sem barra de tempo: ${moving}`)
  },
  // Revisão do lote C: o desfazer do aviso mais novo mostra a confirmação e não empilha o desfeito.
  async "undo-shows-its-confirmation"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    await alertWith(page, "pets")
    await page.locator('#snackbar [data-action="undo"]').click()
    await settle(page)
    expect(!(await stored(page)).alerts.length, "desfazer não removeu o alerta")
    expect(
      (await page.locator("#snackbar.show").count()) &&
        /Alerta removido/.test(await page.locator("#snackbar").innerText()),
      "confirmação do desfazer escondida",
    )
    expect(!(await stack(page).count()), "aviso desfeito foi para a pilha")
  },
  // Revisão do lote C: recomeçar do zero apaga os desfazer antigos.
  async "reset-clears-old-undos"(page) {
    await skipPushAsk(page)
    await go(page, "imoveis")
    await alertWith(page, "pets")
    await alertWith(page, "furnished")
    await action(page, "prototype")
    await action(page, "reset-prototype")
    await page.locator("#confirm-dialog md-filled-button").last().click()
    await page.waitForFunction(() =>
      /reiniciado/.test(document.querySelector("#snackbar")?.innerText),
    )
    await settle(page)
    expect(!(await stack(page).count()), "desfazer antigo sobreviveu ao recomeço")
  },
  // Bateria do lote C: aviso sem desfazer não pausa sob o mouse (cobria o enviar das Conversas).
  async "plain-toast-does-not-pause"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    await page.evaluate(() => document.querySelector('#main [data-action="save-item"]').click())
    await settle(page)
    await page.locator("#snackbar").hover()
    expect(!(await page.locator("#snackbar.is-paused").count()), "aviso simples pausou")
  },
}

await runProof(checkpoints, "round33")
