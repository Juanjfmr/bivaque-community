import { choose, fill, settle } from "./proof-harness.mjs"

// Rodada 27: o anúncio de imóvel novo é feito em etapas. Ajudantes das provas que publicam
// imóvel: preenchem cada etapa e avançam com "Continuar".
export const wizNext = async (page) => {
  await page.locator('#dialog [data-action="wiz-next"]').click()
  await settle(page)
}
export const wizCount = (page) => page.locator("#wiz-count").innerText()
export async function wizardProperty(page, data = {}) {
  const d = {
    ptype: "Apartamento",
    title: "Apartamento 2 quartos perto da base",
    hood: null,
    beds: "2",
    area: "68",
    parking: "",
    price: "2300",
    condo: "",
    avail: "",
    amen: [],
    desc: "Apartamento claro, perto de mercado e farmácia.",
    ...data,
  }
  await choose(page, "item-ptype", d.ptype)
  await fill(page, "item-title", d.title)
  await choose(page, "item-hood", d.hood ?? undefined)
  await fill(page, "item-beds", d.beds)
  await fill(page, "item-area", d.area)
  if (d.parking) await fill(page, "item-parking", d.parking)
  await wizNext(page)
  await fill(page, "item-price", d.price)
  if (d.condo) await fill(page, "item-condo", d.condo)
  if (d.avail) await fill(page, "item-avail", d.avail)
  await wizNext(page)
  for (const a of d.amen) await page.locator(`#item-amen md-filter-chip[data-value="${a}"]`).click()
  await fill(page, "item-desc", d.desc)
  await wizNext(page)
  await wizNext(page)
}
