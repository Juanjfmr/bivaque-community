import { expect, go, runProof, settle, snapshot, stored } from "./proof-harness.mjs"

// Rodada 39: o deslizar das conversas (que já existia, com Fixar e Apagar) ganha "Não lida/Lida";
// o menu ⋮ ganha a mesma ação; e a primeira visita no celular mostra que o gesto existe.
const phone = (page) => page.viewportSize().width < 720
const firstId = (page) =>
  page
    .locator('#main .swipe-row [data-action="open-thread"].txt')
    .first()
    .getAttribute("data-value")
const unread = async (page, id) => (await stored(page)).threads.find((t) => t.id === id).unread
async function drag(page, row) {
  const box = await row.boundingBox()
  const y = box.y + box.height / 2
  const x = box.x + box.width * 0.6
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (const dx of [20, 60, 120, 180, 230]) await page.mouse.move(x - dx, y)
  await page.mouse.up()
  await settle(page)
}

const checkpoints = {
  async "swipe-offers-unread-pin-delete"(page) {
    await snapshot(page)
    await go(page, "conversas")
    const labels = await page
      .locator("#main .swipe-row")
      .first()
      .locator(".swipe-actions button")
      .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))
    expect(
      labels.length === 3 && /^(Não lida|Lida)$/.test(labels[0]) && labels[2] === "Apagar",
      `ações: ${labels}`,
    )
  },
  async "swipe-marks-unread"(page) {
    if (!phone(page)) return
    await snapshot(page)
    await go(page, "conversas")
    const id = await firstId(page)
    const before = await unread(page, id)
    await drag(page, page.locator("#main .swipe-row .swipe-content").first())
    const tf = await page.evaluate(
      () => document.querySelector("#main .swipe-row .swipe-content")?.style.transform,
    )
    expect(/-/.test(tf || ""), `linha não abriu: ${tf}`)
    const action = page.locator("#main .swipe-row").first().locator('[data-action="thread-unread"]')
    await action.click()
    await settle(page)
    expect((await unread(page, id)) === !before, "deslizar não trocou lida/não lida")
  },
  async "menu-offers-the-same-action"(page) {
    await snapshot(page)
    await go(page, "conversas")
    const id = await firstId(page)
    const before = await unread(page, id)
    await page.locator(`#main [data-action="thread-menu"][data-value="${id}"]`).click()
    await settle(page)
    await page.locator('#dialog [data-action="thread-unread"]').click()
    await settle(page)
    expect((await unread(page, id)) === !before, "menu não trocou lida/não lida")
  },
  async "first-visit-shows-the-gesture-once"(page) {
    if (!phone(page)) return
    await snapshot(page)
    await page.evaluate(() => localStorage.removeItem("bivaque-swipe-hint"))
    await go(page, "conversas")
    expect(
      !(await page.evaluate(() => localStorage.getItem("bivaque-swipe-hint"))),
      "dica com movimento reduzido",
    )
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await go(page, "inicio")
    await go(page, "conversas")
    const anim = () =>
      page.evaluate(
        () =>
          document
            .querySelector("#main .swipe-row .swipe-content")
            ?.getAnimations()
            .filter((a) => a.id === "swipe-hint").length || 0,
      )
    expect((await anim()) > 0, "primeira visita sem a dica")
    await go(page, "inicio")
    await go(page, "conversas")
    expect((await anim()) === 0, "dica repetida")
  },
}

await runProof(checkpoints, "round39")
