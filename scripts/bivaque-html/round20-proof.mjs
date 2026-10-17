import {
  expect,
  fill,
  go,
  KEY,
  reload,
  runProof,
  settle,
  snapshot,
  stored,
} from "./proof-harness.mjs"

// Rodada 20: balões de conversa agrupados por pessoa e tempo, separador de dia, estado da
// última mensagem sua, reação local nas recebidas e entrada animada das mensagens novas.
const rows = (page) => page.locator("#message-list .msg-row")

// Conversa de anúncio com horários de ontem e de hoje; devolve o id.
async function fixture(page, msgs) {
  const s = await snapshot(page)
  const id = await page.evaluate(
    ([k, city, list]) => {
      const x = JSON.parse(localStorage.getItem(k))
      const t = x.threads.find((t) => t.city === city && !t.deleted && t.about.type === "item")
      const now = new Date()
      now.setHours(10, 0, 0, 0)
      const at = now.getTime()
      t.msgs = list.map(([me, text, offset, react]) => ({
        me,
        t: text,
        ...(offset === null ? {} : { at: at + offset }),
        ...(react ? { react } : {}),
      }))
      localStorage.setItem(k, JSON.stringify(x))
      return t.id
    },
    [KEY, s.homeCity, msgs],
  )
  await reload(page)
  await go(page, `conversa/${id}`)
  return id
}
const DAY = -864e5
const standard = [
  [true, "Oi! Ainda está disponível?", DAY],
  [false, "Está sim.", DAY + 60e3],
  [false, "Pode buscar sábado?", DAY + 90e3],
  [true, "Posso sim.", 0],
  [true, "Levo uma caixa.", 40e3],
]
const classes = (page) =>
  rows(page).evaluateAll((els) =>
    els.map((e) => ["first", "last"].filter((c) => e.classList.contains(c)).join("+") || "-"),
  )
const msgOf = async (page, id, i) => (await stored(page)).threads.find((t) => t.id === id).msgs[i]

const checkpoints = {
  async "groups-by-person-time-and-day"(page) {
    await fixture(page, [...standard, [false, "Combinado.", 20 * 60e3]])
    const days = await page.locator("#message-list .chat-day").allInnerTexts()
    expect(days.join() === "Ontem,Hoje", `separadores: ${days.join() || "nenhum"}`)
    const c = await classes(page)
    expect(
      c.join() === "first+last,first,last,first,last,first+last",
      `grupos errados: ${c.join()}`,
    )
    const times = await rows(page).evaluateAll((els) =>
      els.map((e) => /\d\d:\d\d/.test(e.querySelector(".bubble small")?.textContent || "")),
    )
    expect(
      times.join() === "true,false,true,false,true,true",
      `hora fora do fim do grupo: ${times}`,
    )
  },
  async "old-messages-without-time-show-no-time"(page) {
    await fixture(page, [
      [true, "Sem horário 1", null],
      [false, "Sem horário 2", null],
      [false, "Sem horário 3", null],
    ])
    expect(!(await page.locator("#message-list .chat-day").count()), "dia inventado")
    const text = await page.locator("#message-list").innerText()
    expect(!/\d\d:\d\d/.test(text), "hora inventada para mensagem sem horário")
    expect((await classes(page)).join() === "first+last,first,last", "agrupou sem horário errado")
  },
  async "status-only-on-last-own-message"(page) {
    await fixture(page, standard)
    const flags = await rows(page).evaluateAll((els) =>
      els.map((e) => /Salva no aparelho/.test(e.textContent)),
    )
    expect(flags.join() === "false,false,false,false,true", `estado em lugar errado: ${flags}`)
    await fixture(page, [...standard, [false, "Combinado.", 60e3]])
    expect(
      !/Salva no aparelho/.test(await page.locator("#message-list").innerText()),
      "estado continua depois da resposta",
    )
  },
  async "react-toggle-persists-and-restores-focus"(page) {
    const id = await fixture(page, standard)
    expect(
      !(await page.locator("#message-list .msg-row.me .msg-react").count()),
      "dá para reagir à própria mensagem",
    )
    const trigger = page.locator('.msg-react[aria-controls="react-pick-1"]')
    await trigger.click()
    expect((await trigger.getAttribute("aria-expanded")) === "true", "seletor não abriu")
    expect(
      await page.evaluate(() => document.activeElement?.closest("#react-pick-1") !== null),
      "foco não foi para o seletor",
    )
    await page.keyboard.press("Escape")
    expect(await page.locator("#react-pick-1").isHidden(), "Esc não fechou o seletor")
    expect(
      await page.evaluate(
        () => document.activeElement?.getAttribute("aria-controls") === "react-pick-1",
      ),
      "foco não voltou para Reagir",
    )
    await trigger.click()
    await page.locator('#react-pick-1 [aria-label="Amei"]').click()
    await settle(page)
    expect((await msgOf(page, id, 1)).react === "❤️", "reação não foi salva")
    expect(
      (await page.locator("#react-1").getAttribute("aria-label")) === "Sua reação: Amei. Remover",
      "reação não aparece no balão",
    )
    expect(await page.locator("#react-pick-1").isHidden(), "seletor ficou aberto")
    await reload(page)
    await go(page, `conversa/${id}`)
    expect(await page.locator("#react-1").isVisible(), "reação sumiu depois de recarregar")
    await page.locator("#react-1").click()
    await settle(page)
    expect(!(await msgOf(page, id, 1)).react, "reação não foi removida")
    expect(await page.locator("#react-1").isHidden(), "chip continua depois de remover")
  },
  async "reaction-blocked-when-profile-unverified"(page) {
    const id = await fixture(page, standard)
    await page.evaluate((k) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.profile.verified = false
      localStorage.setItem(k, JSON.stringify(x))
    }, KEY)
    await reload(page)
    await go(page, `conversa/${id}`)
    await page.locator('.msg-react[aria-controls="react-pick-1"]').click()
    await settle(page)
    expect(await page.locator("#react-pick-1").isHidden(), "seletor abriu sem perfil verificado")
    expect(
      /verificado/.test(await page.locator("#chat-status").innerText()),
      "sem explicar por que não dá para reagir",
    )
    expect(!(await msgOf(page, id, 1)).react, "salvou reação sem perfil verificado")
  },
  async "picker-closes-on-outside-click-and-tab"(page) {
    await fixture(page, standard)
    const trigger = page.locator('.msg-react[aria-controls="react-pick-1"]')
    await trigger.click()
    // Rodada 37: no celular o cabeçalho da conversa sai da vista; o aviso de segurança é área neutra.
    await page.locator("#main .chat-safety").click()
    expect(await page.locator("#react-pick-1").isHidden(), "clique fora não fechou o seletor")
    await trigger.click()
    for (let i = 0; i < 4; i++) await page.keyboard.press("Tab")
    await page.keyboard.press("Tab")
    expect(await page.locator("#react-pick-1").isHidden(), "sair com Tab não fechou o seletor")
    expect((await trigger.getAttribute("aria-expanded")) === "false", "gatilho continua expandido")
  },
  async "esc-reaches-palette-opened-over-picker"(page) {
    // A busca por atalho de teclado existe a partir de 1024 px.
    if (page.viewportSize().width < 1024) return
    await fixture(page, standard)
    await page.locator('.msg-react[aria-controls="react-pick-1"]').click()
    await page.keyboard.press("Control+k")
    await settle(page)
    const open = () =>
      page.evaluate(() => Boolean(document.querySelector("#palette:not([hidden])")))
    expect(await open(), "a busca não abriu por cima do seletor")
    await page.keyboard.press("Escape")
    await settle(page)
    expect(!(await open()), "o primeiro Esc não fechou a busca aberta por cima do seletor")
  },
  async "invalid-stored-reaction-and-time-are-ignored"(page) {
    const s = await snapshot(page)
    const id = await page.evaluate(
      ([k, city]) => {
        const x = JSON.parse(localStorage.getItem(k))
        const t = x.threads.find((t) => t.city === city && !t.deleted && t.about.type === "item")
        t.msgs = [
          { me: false, t: "Reação estranha", at: "ontem", react: "<b>x</b>" },
          { me: true, t: "Resposta", at: Number.NaN },
        ]
        localStorage.setItem(k, JSON.stringify(x))
        return t.id
      },
      [KEY, s.homeCity],
    )
    await reload(page)
    await go(page, `conversa/${id}`)
    const text = await page.locator("#message-list").innerText()
    expect(!/Invalid|NaN/.test(text), `horário corrompido apareceu: ${text}`)
    expect(await page.locator("#react-0").isHidden(), "reação inválida apareceu")
    expect(!(await page.locator("#message-list b").count()), "reação salva entrou como HTML")
  },
  async "new-messages-enter-animated-once"(page) {
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await fixture(page, standard)
    expect(
      !(await page.locator("#message-list .msg-row.enter").count()),
      "histórico animou ao abrir",
    )
    await fill(page, "chat-input", "Mensagem nova")
    await page.locator("#chat-input textarea").press("Enter")
    await settle(page)
    const enter = await rows(page).evaluateAll((els) =>
      els.map((e) => e.classList.contains("enter")),
    )
    expect(enter.join() === "false,false,false,false,false,true", `entrada errada: ${enter}`)
    const anim = await page
      .locator("#message-list .msg-row.enter .bubble")
      .evaluate((e) => getComputedStyle(e).animationName)
    expect(anim === "msg-in", `sem animação de entrada: ${anim}`)
    const flags = await rows(page).evaluateAll((els) =>
      els.map((e) => /Salva no aparelho/.test(e.textContent)),
    )
    expect(flags.at(-1) && flags.filter(Boolean).length === 1, "estado não passou para a nova")
  },
  async "reduced-motion-has-no-entry-animation"(page) {
    await fixture(page, standard)
    await fill(page, "chat-input", "Mensagem nova")
    await page.locator("#chat-input textarea").press("Enter")
    await settle(page)
    const anim = await page
      .locator("#message-list .msg-row.enter .bubble")
      .evaluate((e) => getComputedStyle(e).animationName)
    expect(anim === "none", `animou com movimento reduzido: ${anim}`)
  },
  async "message-text-is-escaped"(page) {
    await fixture(page, [[false, '<img src=x onerror="window.__pwned=1">', 0]])
    expect(
      !(await page.locator("#message-list img").count()) &&
        !(await page.evaluate(() => window.__pwned)),
      "texto da mensagem entrou como HTML",
    )
  },
}

await runProof(checkpoints, "round20")
