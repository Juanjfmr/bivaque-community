import { expect, go, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 36: no celular, o título da barra só aparece quando o título grande da página passa por
// baixo dela. No desktop, na Início e nas telas sem título grande, a barra não muda.
const phone = (page) => page.viewportSize().width < 720
const bar = (page) =>
  page.evaluate(() => {
    const t = document.querySelector("#topbar .top-title, #topbar .brand-text")
    return {
      hides: document.querySelector("#topbar").classList.contains("title-hides"),
      docked: document.querySelector("#topbar").classList.contains("title-docked"),
      opacity: t ? getComputedStyle(t).opacity : null,
      text: t?.textContent,
    }
  })
async function scrollMain(page, y) {
  await page.evaluate((v) => {
    const m = document.querySelector("main")
    m.style.scrollBehavior = "auto"
    m.scrollTop = v
    m.dispatchEvent(new Event("scroll"))
  }, y)
  await settle(page)
}

const checkpoints = {
  async "list-title-docks-on-scroll"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    const before = await bar(page)
    if (!phone(page)) {
      expect(!before.hides && before.opacity === "1", "o desktop escondeu o título da barra")
      return
    }
    expect(
      before.hides && !before.docked && before.opacity === "0",
      `antes de rolar: ${JSON.stringify(before)}`,
    )
    await scrollMain(page, 400)
    const after = await bar(page)
    expect(after.docked && after.opacity === "1", `depois de rolar: ${JSON.stringify(after)}`)
    expect(after.text === "Imóveis", `título da barra: ${after.text}`)
    await scrollMain(page, 0)
    expect((await bar(page)).opacity === "0", "o título não saiu ao voltar ao topo")
  },
  async "root-tab-keeps-the-mark"(page) {
    // A partir de 720 px a marca fica na barra lateral, não na superior.
    if (!phone(page)) return
    await snapshot(page)
    await go(page, "comunidade")
    const b = await bar(page)
    expect(b.hides && b.text === "Comunidade", `aba raiz: ${JSON.stringify(b)}`)
    expect(
      await page.locator("#topbar .brand .brand-mark").first().isVisible(),
      "a marca sumiu da barra",
    )
  },
  async "home-and-details-keep-the-title"(page) {
    await snapshot(page)
    await go(page, "inicio")
    let b = await bar(page)
    expect(!b.hides && b.opacity === "1" && b.text === "Bivaque", `Início: ${JSON.stringify(b)}`)
    await go(
      page,
      "evento/" +
        (await page.evaluate(
          () => document.querySelector('[data-action="open-event"]')?.dataset.value,
        )),
    )
    b = await bar(page)
    expect(!b.hides && b.opacity === "1", `detalhe sem título grande: ${JSON.stringify(b)}`)
  },
}

await runProof(checkpoints, "round36")
