import { expect, go, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 28: o selo "verificado" abre a explicação do que a verificação confere e do que não
// confere (ADR-20260816-forma-da-admissao). Vale no anúncio e na página do negócio.
const dialogText = (page) => page.locator("#dialog").innerText()
async function expectSheet(page) {
  const text = await dialogText(page)
  expect(/O que o selo “verificado” significa/.test(text), "folha sem título")
  expect(/Portal da Transparência/.test(text), "sem a fonte da verificação")
  expect(/não confirma endereço/.test(text), "sem o que o selo não confirma")
  expect(/não é garantia de negócio/.test(text), "sem o limite do selo")
}

const checkpoints = {
  async "listing-badge-explains-and-returns-focus"(page) {
    await snapshot(page)
    await go(page, "anuncio/i1")
    const badge = page.locator('#main [data-action="verified-info"]')
    expect(/Perfil verificado/.test(await badge.innerText()), "selo sem o texto")
    expect(
      (await badge.getAttribute("aria-haspopup")) === "dialog",
      "selo sem aviso de que abre painel",
    )
    await badge.focus()
    await page.keyboard.press("Enter")
    await settle(page)
    await expectSheet(page)
    await page.locator('#dialog md-filled-button[data-action="close-dialog"]').click()
    await settle(page)
    expect(
      await page.evaluate(() => document.activeElement?.dataset?.action === "verified-info"),
      "foco não voltou ao selo",
    )
  },
  async "business-owner-line-explains"(page) {
    await snapshot(page)
    await go(page, "negocio/b4")
    await page.locator('#main .seller [data-action="verified-info"]').click()
    await settle(page)
    await expectSheet(page)
  },
}

await runProof(checkpoints, "round28")
