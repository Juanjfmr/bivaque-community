import { expect, go, runProof, settle, snapshot, stored } from "./proof-harness.mjs"

// Rodada 37: conversa no celular com a pessoa na barra, o ⋮ na barra, aviso de segurança e caixa
// em pílula com o enviar dentro. No desktop a barra e a caixa continuam como antes.
const phone = (page) => page.viewportSize().width < 720
const shown = (page, sel) =>
  page.locator(sel).evaluateAll((els) =>
    els.some((e) => {
      const r = e.getBoundingClientRect()
      return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== "hidden"
    }),
  )
async function openChat(page) {
  await snapshot(page)
  await go(page, "conversa/t1")
  await settle(page)
}
async function typeAndSend(page, text) {
  await page.evaluate((v) => {
    const f = document.querySelector("#chat-input")
    f.value = v
    f.dispatchEvent(new Event("input", { bubbles: true }))
  }, text)
  await page.locator('[data-action="send-message"]:visible').first().click()
  await settle(page)
}
const msgs = async (page) => (await stored(page)).threads.find((t) => t.id === "t1").msgs.length

const checkpoints = {
  async "bar-shows-who-and-what"(page) {
    await openChat(page)
    if (!phone(page)) {
      expect(await shown(page, "#topbar .tb-desk-title"), "o desktop perdeu o título Conversa")
      expect(!(await shown(page, "#topbar .top-chat")), "pessoa repetida na barra do desktop")
      expect(await shown(page, "#main .chat-head"), "o desktop perdeu o cabeçalho")
      return
    }
    const bar = await page.locator("#topbar .top-chat").innerText()
    expect(/^PR\s+Paulo R\.\s+Berço com colchão$/.test(bar.trim()), `barra: ${bar}`)
    expect(!(await shown(page, "#main .chat-head")), "cabeçalho repetido na página")
    expect(
      (await page.locator("#chat-heading").count()) === 1,
      "título da conversa sumiu para leitor de tela",
    )
  },
  async "menu-moves-to-the-bar-on-phone"(page) {
    await openChat(page)
    const inBar = await shown(page, '#topbar [data-action="thread-menu"]')
    const inPage = await shown(page, '#main [data-action="thread-menu"]')
    expect(
      phone(page) ? inBar && !inPage : inPage && !inBar,
      `⋮ na barra ${inBar}, na página ${inPage}`,
    )
    await page.locator('[data-action="thread-menu"]:visible').first().click()
    await settle(page)
    expect(
      await page.evaluate(() =>
        [...document.querySelectorAll("#dialog, #create-menu, md-menu")].some(
          (e) => e.open || e.classList.contains("open"),
        ),
      ),
      "⋮ não abriu as opções",
    )
  },
  async "safety-note-opens-every-conversation"(page) {
    await openChat(page)
    expect(
      /Nunca pague adiantado/.test(await page.locator("#main .chat-safety").innerText()),
      "sem aviso de segurança",
    )
  },
  async "pill-composer-on-phone"(page) {
    await openChat(page)
    const f = await page.evaluate(() => {
      const el = document.querySelector("#chat-input")
      const send = document.querySelector('.compose-bar [data-action="send-message"]')
      const a = el.getBoundingClientRect()
      const b = send.getBoundingClientRect()
      return {
        label: el.getAttribute("label"),
        max: el.getAttribute("maxlength"),
        hint: el.getAttribute("supporting-text"),
        inside:
          b.left >= a.left &&
          b.right <= a.right + 1 &&
          b.top >= a.top - 1 &&
          b.bottom <= a.bottom + 1,
      }
    })
    if (!phone(page)) {
      expect(
        f.label === "Mensagem" && f.max === "2000" && f.hint,
        `desktop mudou: ${JSON.stringify(f)}`,
      )
      return
    }
    expect(!f.label && !f.max && !f.hint, `caixa com rótulo, limite ou dica: ${JSON.stringify(f)}`)
    expect(f.inside, "enviar fora da pílula")
  },
  async "phone-keeps-limit-and-sends"(page) {
    await openChat(page)
    const n = await msgs(page)
    await typeAndSend(page, "a".repeat(2001))
    expect((await msgs(page)) === n, "mensagem acima do limite foi enviada")
    expect(/2\.000/.test(await page.locator("#chat-status").innerText()), "sem aviso do limite")
    await typeAndSend(page, "Posso buscar às 10h?")
    expect((await msgs(page)) === n + 1, "mensagem comum não foi enviada")
  },
}

await runProof(checkpoints, "round37")
