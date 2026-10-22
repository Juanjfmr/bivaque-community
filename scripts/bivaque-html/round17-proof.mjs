import {
  action,
  expect,
  failStorage,
  go,
  KEY,
  reload,
  runProof,
  settle,
  snapshot,
  stored,
} from "./proof-harness.mjs"

// Rodada 17: central de avisos com abas, marcar todos, ícone por tipo e hoje/anteriores.
async function seed(page) {
  const s = await snapshot(page)
  await page.evaluate(
    ([k, city]) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.notices = [
        {
          id: "n-a",
          city,
          unread: true,
          text: "Nova proposta para seu pedido",
          go: ["pedido", "r1"],
          when: "Agora",
        },
        {
          id: "n-b",
          city,
          unread: true,
          text: "Marcos respondeu sua mensagem",
          go: ["conversa", "t1"],
          when: "Hoje",
        },
        {
          id: "n-c",
          city,
          unread: false,
          text: "Novo desapego perto de você",
          go: ["anuncio", "i1"],
          when: "Segunda",
        },
      ]
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, s.homeCity],
  )
  await reload(page)
  await go(page, "inicio")
  await action(page, "notices")
  await settle(page)
}
const rows = (page) =>
  page.locator("#dialog .notice-row").evaluateAll((els) =>
    els.map((e) => ({
      id: e.querySelector('[data-action="notice-open"]').dataset.value,
      unread: e.classList.contains("is-unread"),
      icon: e.querySelector(".notice-ico md-icon").textContent.trim(),
    })),
  )

const checkpoints = {
  async "tabs-groups-and-icons"(page) {
    await seed(page)
    const chips = await page
      .locator("#dialog md-filter-chip")
      .evaluateAll((c) => c.map((x) => x.getAttribute("label")))
    expect(chips.join("|") === "Todos (3)|Não lidos (2)", `abas: ${chips.join("|")}`)
    const groups = await page.locator("#dialog .notice-group").allInnerTexts()
    expect(groups.join("|").toLowerCase() === "hoje|anteriores", `grupos: ${groups.join("|")}`)
    const list = await rows(page)
    const icons = Object.fromEntries(list.map((r) => [r.id, r.icon]))
    expect(
      icons["n-a"] === "request_quote" && icons["n-b"] === "chat_bubble" && icons["n-c"] === "sell",
      `ícones por tipo: ${JSON.stringify(icons)}`,
    )
    expect(list.filter((r) => r.unread).length === 2, "não lidos sem destaque")
    await action(page, "notices-tab", "unread")
    await settle(page)
    expect((await rows(page)).map((r) => r.id).join() === "n-a,n-b", "aba Não lidos mostra lidos")
  },
  async "mark-all-read"(page) {
    await seed(page)
    await action(page, "notices-read-all")
    await settle(page)
    const s = await stored(page)
    expect(
      s.notices.every((n) => !n.unread),
      "nem todos ficaram lidos",
    )
    expect(
      /lidos/.test(await page.locator("#notice-status").innerText()),
      "sem retorno de marcar todos",
    )
    expect(
      !(await page.locator('#dialog [data-action="notices-read-all"]').count()),
      "botão continua sem nada não lido",
    )
    await action(page, "notices-tab", "unread")
    await settle(page)
    expect(
      /Tudo em dia/.test(await page.locator("#dialog").innerText()),
      "aba Não lidos vazia sem Tudo em dia",
    )
  },
  async "mark-all-storage-failure-keeps-unread"(page) {
    await seed(page)
    await failStorage(page)
    await action(page, "notices-read-all")
    await settle(page)
    expect(
      /Não foi possível/.test(await page.locator("#notice-status").innerText()),
      "falha de gravação sem aviso",
    )
    await page.keyboard.press("Escape")
    await settle(page)
    await action(page, "notices")
    await settle(page)
    const unread = (await rows(page)).filter((r) => r.unread).length
    expect(unread === 2, `estado em memória perdeu os não lidos: ${unread}`)
  },
  async "every-icon-exists-in-embedded-font"(page) {
    await seed(page)
    const wide = await page.evaluate(async () => {
      await document.fonts.ready
      const names = [
        ...new Set(
          [...document.querySelectorAll("#dialog md-icon")].map((i) => i.textContent.trim()),
        ),
      ]
      return names.filter((n) => {
        const s = document.createElement("span")
        s.style.cssText =
          "font-family:'Material Symbols Outlined';font-size:24px;position:absolute;white-space:nowrap"
        s.textContent = n
        document.body.append(s)
        const w = s.getBoundingClientRect().width
        s.remove()
        return w > 30
      })
    })
    expect(!wide.length, `ícones fora da fonte: ${wide.join(", ")}`)
  },
  async "other-city-stays-unread-and-html-is-text"(page) {
    const s = await snapshot(page)
    await page.evaluate(
      ([k, city]) => {
        const x = JSON.parse(localStorage.getItem(k))
        x.notices = [
          {
            id: "n-home",
            city,
            unread: true,
            html: '<b>Ana</b> <img src=x onerror="window.__xss=1"> respondeu',
            go: ["pergunta", "q1"],
            when: "Hoje",
          },
          {
            id: "n-far",
            city: "Natal",
            unread: true,
            text: "Aviso de outra cidade",
            go: ["negocios"],
            when: "Hoje",
          },
        ]
        localStorage.setItem(k, JSON.stringify(x))
      },
      [KEY, s.homeCity],
    )
    await reload(page)
    await go(page, "inicio")
    await action(page, "notices")
    await settle(page)
    expect(
      await page.evaluate(
        () => !document.querySelector("#dialog .notice-row img") && !window.__xss,
      ),
      "aviso com HTML injetou elemento",
    )
    expect(
      /Ana\s+respondeu/.test(await page.locator("#dialog .notice-row").first().innerText()),
      "texto do aviso sumiu",
    )
    await action(page, "notices-read-all")
    await settle(page)
    const st = await stored(page)
    expect(
      st.notices.find((n) => n.id === "n-far").unread,
      "aviso de outra cidade foi marcado como lido",
    )
  },
  async "focus-returns-after-tab-and-mark-all"(page) {
    await seed(page)
    await page.locator('#dialog md-filter-chip[data-value="unread"]').click()
    await settle(page)
    const afterTab = await page.evaluate(() => document.activeElement?.dataset?.value)
    expect(afterTab === "unread", `foco depois de trocar de aba: ${afterTab}`)
    await action(page, "notice-read", "n-a")
    await settle(page)
    const afterRead = await page.evaluate(
      () => document.activeElement?.closest?.("#dialog") !== null,
    )
    expect(afterRead, "foco saiu do diálogo ao marcar um aviso na aba Não lidos")
    await action(page, "notices-read-all")
    await settle(page)
    const afterAll = await page.evaluate(
      () => document.activeElement?.closest?.("#dialog") !== null,
    )
    expect(afterAll, "foco saiu do diálogo ao marcar todos")
  },
  async "returning-from-notice-reopens-all"(page) {
    await seed(page)
    await action(page, "notices-tab", "unread")
    await settle(page)
    await action(page, "notice-open", "n-b")
    await settle(page)
    await action(page, "back")
    await settle(page)
    const ids = (await rows(page)).map((r) => r.id)
    expect(ids.includes("n-b"), `ao voltar, o aviso aberto sumiu da lista: ${ids.join(",")}`)
  },
  async "all-type-icons-exist"(page) {
    const s = await snapshot(page)
    const types = [
      "conversa",
      "anuncio",
      "negocios",
      "pedido",
      "pergunta",
      "agenda",
      "grupo",
      "outro",
    ]
    await page.evaluate(
      ([k, city, list]) => {
        const x = JSON.parse(localStorage.getItem(k))
        x.notices = list.map((t, i) => ({
          id: `n-${i}`,
          city,
          unread: i % 2 === 0,
          text: `Aviso ${t}`,
          go: [t, "x"],
          when: "Hoje",
        }))
        localStorage.setItem(k, JSON.stringify(x))
      },
      [KEY, s.homeCity, types],
    )
    await reload(page)
    await go(page, "inicio")
    await action(page, "notices")
    await settle(page)
    const wide = await page.evaluate(async () => {
      await document.fonts.ready
      const names = [
        ...new Set(
          [...document.querySelectorAll("#dialog md-icon")].map((i) => i.textContent.trim()),
        ),
      ]
      return names.filter((n) => {
        const el = document.createElement("span")
        el.style.cssText =
          "font-family:'Material Symbols Outlined';font-size:24px;position:absolute;white-space:nowrap"
        el.textContent = n
        document.body.append(el)
        const w = el.getBoundingClientRect().width
        el.remove()
        return w > 30
      })
    })
    expect(!wide.length, `ícones de tipo fora da fonte: ${wide.join(", ")}`)
  },
}

await runProof(checkpoints, "round17")
