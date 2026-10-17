import {
  action,
  choose,
  expect,
  fill,
  go,
  routeOf,
  runProof,
  settle,
  snapshot,
  stored,
} from "./proof-harness.mjs"
import { wizardProperty, wizCount, wizNext } from "./wizard-helpers.mjs"

// Rodada 27: imóvel novo em 5 etapas, cada uma validada antes de seguir, com revisão (prévia do
// cartão e "Editar" por parte). Editar um imóvel e anunciar desapego continuam numa página só.
const visible = (page, action) =>
  page
    .locator(`#dialog [data-action="${action}"]`)
    .evaluate((e) => getComputedStyle(e).display !== "none")
async function openWizard(page) {
  await snapshot(page)
  await go(page, "imoveis")
  await page.locator('#main [data-action="create-property"]').click()
  await settle(page)
}
const mine = async (page, title) => (await stored(page)).items.find((x) => x.title === title)

const checkpoints = {
  async "starts-at-step-one"(page) {
    await openWizard(page)
    expect(
      (await wizCount(page)) === "Etapa 1 de 5 · O imóvel",
      `contagem: ${await wizCount(page)}`,
    )
    expect(await page.locator("#item-beds").isVisible(), "passo 1 sem quartos")
    expect(!(await page.locator("#item-price").isVisible()), "aluguel aparece antes da hora")
    expect(
      !(await visible(page, "wiz-prev")) && !(await visible(page, "submit-item")),
      "Voltar ou Publicar no passo 1",
    )
  },
  async "continue-validates-the-step"(page) {
    await openWizard(page)
    await wizNext(page)
    expect(/Etapa 1 de 5/.test(await wizCount(page)), "avançou com o passo vazio")
    await wizardProperty(page)
    expect(
      /Etapa 5 de 5 · Revisão/.test(await wizCount(page)),
      `não chegou à revisão: ${await wizCount(page)}`,
    )
    expect(await visible(page, "submit-item"), "sem Publicar na revisão")
  },
  async "invalid-condo-blocks-step-two"(page) {
    await openWizard(page)
    await choose(page, "item-ptype", "Casa")
    await fill(page, "item-title", "Casa com valor de condomínio inválido")
    await choose(page, "item-hood")
    await fill(page, "item-beds", "2")
    await fill(page, "item-area", "80")
    await wizNext(page)
    await fill(page, "item-price", "2000")
    await fill(page, "item-condo", "-500")
    await wizNext(page)
    expect(/Etapa 2 de 5/.test(await wizCount(page)), "avançou com condomínio negativo")
  },
  async "back-keeps-values"(page) {
    await openWizard(page)
    await choose(page, "item-ptype", "Casa")
    await fill(page, "item-title", "Casa com quintal no Parque 10")
    await choose(page, "item-hood")
    await fill(page, "item-beds", "3")
    await fill(page, "item-area", "140")
    await wizNext(page)
    expect(/Etapa 2 de 5/.test(await wizCount(page)), "passo 1 completo não avançou")
    await page.locator('#dialog [data-action="wiz-prev"]').click()
    await settle(page)
    expect(
      (await page.locator("#item-title input").inputValue()) === "Casa com quintal no Parque 10",
      "Voltar perdeu o que foi digitado",
    )
  },
  async "review-preview-and-edit-jump"(page) {
    await openWizard(page)
    await wizardProperty(page, { ptype: "Casa", price: "2500", condo: "300", amen: ["pets"] })
    const review = await page.locator("#wiz-review").innerText()
    expect(/R\$\s?2\.800/.test(review), `revisão sem o total do mês: ${review.slice(0, 200)}`)
    expect(/Aceita pets/.test(review), "revisão sem as comodidades")
    expect(
      (await page.locator("#wiz-review .wiz-preview .pill").innerText()) === "Casa",
      "prévia sem o tipo",
    )
    await page.locator('#wiz-review [data-action="wiz-go"][data-value="2"]').click()
    await settle(page)
    expect(/Etapa 2 de 5/.test(await wizCount(page)), "Editar não voltou ao passo do valor")
  },
  async "publish-from-review"(page) {
    await openWizard(page)
    await wizardProperty(page, {
      title: "Flat no Adrianópolis com academia",
      ptype: "Flat ou studio",
      amen: ["gym"],
    })
    await page.locator('#dialog [data-action="submit-item"]').click()
    await settle(page)
    const item = await mine(page, "Flat no Adrianópolis com academia")
    expect(
      item?.ptype === "Flat ou studio" && item.amen.join() === "gym" && item.kind === "imovel",
      "imóvel salvo errado",
    )
    expect((await routeOf(page)).name === "anuncio", "não abriu o anúncio publicado")
  },
  async "draft-mid-wizard-reopens-in-wizard"(page) {
    await openWizard(page)
    await wizardProperty(page, { title: "Kitnet mobiliada para rascunho" })
    await page.locator('#dialog [data-action="save-draft"]').click()
    await settle(page)
    const draft = (await stored(page)).drafts.find(
      (d) => d.title === "Kitnet mobiliada para rascunho",
    )
    expect(
      draft?.kind === "imovel" && draft.ptype === "Apartamento",
      "rascunho sem os campos do imóvel",
    )
    await page.locator(`[data-action="open-draft"][data-value="${draft.id}"]`).click()
    await settle(page)
    expect(await page.locator("#dialog .wiz").count(), "rascunho de imóvel não abriu nas etapas")
    expect(
      (await page.locator("#item-title input").inputValue()) === "Kitnet mobiliada para rascunho",
      "rascunho não trouxe os valores",
    )
  },
  async "editing-and-desapego-stay-single-page"(page) {
    await openWizard(page)
    await wizardProperty(page, { title: "Apartamento para editar depois" })
    await page.locator('#dialog [data-action="submit-item"]').click()
    await settle(page)
    await action(page, "edit-item")
    expect(!(await page.locator("#dialog .wiz").count()), "editar abriu em etapas")
    expect(await page.locator("#item-price").isVisible(), "editar sem todos os campos")
    await page.keyboard.press("Escape")
    await settle(page)
    await go(page, "desapegos")
    await page.locator('#main [data-action="create-item"]').click()
    await settle(page)
    expect(!(await page.locator("#dialog .wiz").count()), "desapego abriu em etapas")
  },
}

await runProof(checkpoints, "round27")
