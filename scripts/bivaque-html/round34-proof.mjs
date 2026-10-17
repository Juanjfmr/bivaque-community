import {
  expect,
  fill,
  go,
  reload,
  runProof,
  settle,
  snapshot,
  stored,
  toast,
} from "./proof-harness.mjs"

// Rodada 34: ao indicar um negócio, o número pulsa, oito pontos saem dele e o avatar novo entra;
// com movimento reduzido nada anima e o aviso de texto continua.
async function recommend(page, id) {
  await go(page, `negocio/${id}`)
  await page.locator('#main [data-action="recommend-biz"]').click()
  await settle(page)
  await fill(page, "recommend-why", "Atendimento rápido e preço combinado.")
  await page.locator('#dialog [data-action="submit-recommend"]').click()
}
const count = (page) => page.locator("#main .fact-proof [data-count-to]").innerText()

const checkpoints = {
  async "recommend-celebrates-with-motion"(page) {
    await snapshot(page)
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await reload(page)
    const before = (await stored(page)).biz.find((b) => b.id === "b1").recN
    await recommend(page, "b1")
    await page.waitForSelector(".burst i", { timeout: 2000 })
    expect((await page.locator(".burst i").count()) === 8, "explosão sem os oito pontos")
    await page.waitForTimeout(1200)
    expect(!(await page.locator(".burst").count()), "pontos ficaram na tela")
    expect((await count(page)) === String(before + 1), `contagem não subiu: ${await count(page)}`)
    expect(/Sua indicação foi adicionada/.test(await toast(page)), "sem o aviso de texto")
  },
  async "reduced-motion-has-no-burst"(page) {
    await snapshot(page)
    await page.evaluate(() => {
      window.__bursts = 0
      new MutationObserver((m) => {
        for (const r of m)
          for (const n of r.addedNodes) if (n.classList?.contains("burst")) window.__bursts++
      }).observe(document.body, { childList: true })
    })
    await recommend(page, "b1")
    await page.waitForTimeout(600)
    expect(!(await page.evaluate(() => window.__bursts)), "animou com movimento reduzido")
    expect(/Sua indicação foi adicionada/.test(await toast(page)), "sem o aviso de texto")
  },
  async "second-recommendation-does-not-celebrate"(page) {
    await snapshot(page)
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await reload(page)
    await recommend(page, "b1")
    await page.waitForTimeout(1200)
    await page.locator('#main [data-action="recommend-biz"]').click()
    await settle(page)
    expect(/já indicou/.test(await toast(page)), "indicou duas vezes")
    expect(!(await page.locator(".burst").count()), "comemorou a indicação repetida")
  },
}

await runProof(checkpoints, "round34")
