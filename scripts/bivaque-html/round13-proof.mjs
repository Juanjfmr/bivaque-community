import {
  action,
  choose,
  expect,
  go,
  KEY,
  reload,
  routeOf,
  runProof,
  settle,
  snapshot,
  stored,
} from "./proof-harness.mjs"

// Rodada 13: Início do desktop (a partir de 1024 px), aprovada pelo usuário em 2026-10-15.
// Celular e tablet continuam com a Início original. Sem estrelas: o sinal é indicação.
const desktop = (page) => page.viewportSize().width >= 1024
const text = (page) => page.locator("#main").innerText()

const checkpoints = {
  async "layout-by-width"(page) {
    await go(page, "inicio")
    const h1 = await page.locator("#main h1").first().innerText()
    if (!desktop(page)) {
      expect(
        !(await page.locator(".home-desk").count()),
        "celular/tablet ganhou a Início do desktop",
      )
      // Rodada 35: o celular segue a organização do desktop, com a cidade no título.
      expect(/^O que você precisa em /.test(h1), `título do celular: ${h1}`)
      expect(await page.locator(".home-mob").count(), "celular sem a Início nova")
      return
    }
    expect(await page.locator(".home-desk .home-side").count(), "desktop sem coluna lateral")
    expect(/^O que você precisa em /.test(h1), `título do desktop: ${h1}`)
    expect((await page.locator(".home-desk .intent").count()) === 4, "desktop sem os 4 atalhos")
    const t = await text(page)
    expect(!/★|avalia/i.test(t), "desktop mostra estrelas ou avaliações")
    expect(/indicaç/.test(t), "serviços sem o sinal de indicação")
    expect(
      await page.locator('.home-desk [data-action="create-request"]').count(),
      "sem Precisa contratar",
    )
  },
  async "sponsored-labeled-and-actions-work"(page) {
    if (!desktop(page)) return
    const s = await snapshot(page)
    await go(page, "inicio")
    const spon = s.biz.find((b) => b.city === s.homeCity && b.spon && b.claimed !== false)
    if (spon) {
      const card = page.locator(`.home-biz [data-value="${spon.id}"]`)
      expect(/Patrocinado/.test(await card.innerText()), "patrocinado sem rótulo")
      expect(await card.isVisible(), "patrocinado escondido nesta largura")
    }
    await page.locator(".home-biz .card-link").first().click()
    await settle(page)
    expect((await routeOf(page)).name === "negocio", "cartão de serviço não abriu o negócio")
    await go(page, "inicio")
    await page.locator('.home-desk [data-action="create-request"]').click()
    await settle(page)
    expect(
      await page.locator("#dialog[open] #request-cat").count(),
      "Precisa contratar não abriu o pedido",
    )
  },
  async "next-event-vou-confirms"(page) {
    if (!desktop(page)) return
    await snapshot(page)
    await go(page, "inicio")
    const vou = page.locator(
      '.home-side [data-action="attend-post"], .home-side [data-action="attend-event"]',
    )
    if (!(await vou.count())) return
    const [kind, value] = await vou.first().evaluate((b) => [b.dataset.action, b.dataset.value])
    await vou.first().click()
    await settle(page)
    const s = await stored(page)
    const on =
      kind === "attend-event"
        ? s.events.find((e) => e.id === value)?.on
        : (() => {
            const [gid, pid] = value.split("|")
            return s.groups.find((g) => g.id === gid).posts.find((p) => p.id === pid).event.on
          })()
    expect(on, "Vou do próximo encontro não confirmou")
  },
  async "personal-notice-priority"(page) {
    if (!desktop(page)) return
    const s = await snapshot(page)
    await page.evaluate(
      ([k, city]) => {
        const x = JSON.parse(localStorage.getItem(k))
        x.asks.unshift({
          id: "q-minha",
          q: "Pediatra que atende pelo plano?",
          city,
          mine: true,
          who: "Você",
          status: "open",
          createdAt: Date.now(),
          answers: [{ id: "a1" }, { id: "a2" }],
        })
        localStorage.setItem(k, JSON.stringify(x))
      },
      [KEY, s.homeCity],
    )
    await reload(page)
    await go(page, "inicio")
    const notice = page.locator(".home-notice")
    expect(/Sua pergunta recebeu 2 respostas/.test(await notice.innerText()), "aviso da pergunta")
    await notice.click()
    await settle(page)
    expect((await routeOf(page)).name === "pergunta", "aviso não abriu a pergunta")
    // Sem pergunta respondida nem pedido com proposta, o aviso mostra os não lidos.
    await page.evaluate((k) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.asks = x.asks.filter((q) => q.id !== "q-minha")
      for (const n of x.notices) n.unread = false
      localStorage.setItem(k, JSON.stringify(x))
    }, KEY)
    await reload(page)
    await go(page, "inicio")
    expect(!(await page.locator(".home-notice").count()), "aviso sem nada novo")
  },
  async "arrival-card-follows-moment"(page) {
    if (!desktop(page)) return
    await snapshot(page)
    await go(page, "inicio")
    expect(
      /famílias estão chegando/.test(await page.locator(".home-arrival").innerText()),
      "quem mora não vê quem chega",
    )
    await page.evaluate((k) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.mode = "chegando"
      localStorage.setItem(k, JSON.stringify(x))
    }, KEY)
    await reload(page)
    await go(page, "inicio")
    expect(
      /Chegando a /.test(await page.locator(".home-arrival").innerText()),
      "quem chega não vê o guia",
    )
  },
  async "resize-switches-layout"(page) {
    if (!desktop(page)) return
    const size = page.viewportSize()
    await go(page, "inicio")
    await page.setViewportSize({ width: 800, height: size.height })
    await settle(page)
    expect(!(await page.locator(".home-desk").count()), "ao estreitar, ficou a Início do desktop")
    await page.setViewportSize(size)
    await settle(page)
    expect(await page.locator(".home-desk").count(), "ao alargar, não voltou a Início do desktop")
  },
  async "create-panel-opens-from-button"(page) {
    await go(page, "inicio")
    await page.locator("#fab").click()
    await page.locator("#create-menu.open").waitFor()
    await settle(page)
    const info = await page.evaluate(() => {
      const m = document.querySelector("#create-menu")
      const items = [...m.querySelectorAll("[data-action]")].map((b) => b.dataset.action)
      return {
        panel: m.classList.contains("create-panel"),
        items,
        focused: document.activeElement?.dataset?.action,
        fabVisible: getComputedStyle(document.querySelector("#fab")).opacity !== "0",
        inView: (() => {
          const r = m.getBoundingClientRect()
          return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight
        })(),
      }
    })
    if (!desktop(page)) {
      expect(!info.panel, "celular/tablet ganhou o painel do desktop")
      return
    }
    expect(info.panel && info.items.length === 7, `painel: ${JSON.stringify(info.items)}`)
    expect(info.focused === info.items[0], "foco não foi para a primeira opção")
    expect(!info.fabVisible, "o botão não se transformou no painel")
    expect(info.inView, "painel fora da tela")
    // Esc fecha e devolve o foco ao botão Criar.
    await page.keyboard.press("Escape")
    await page.locator("#create-menu").waitFor({ state: "hidden" })
    expect(
      await page.evaluate(() => document.activeElement?.id === "fab"),
      "foco não voltou ao botão Criar",
    )
    // O X fecha com o mouse.
    await page.locator("#fab").click()
    await page.locator("#create-menu.open").waitFor()
    await settle(page)
    await page.locator("#create-menu .cp-close").click()
    await page.locator("#create-menu").waitFor({ state: "hidden" })
  },
  async "create-panel-option-opens-flow"(page) {
    if (!desktop(page)) return
    await go(page, "inicio")
    await page.locator("#fab").click()
    await page.locator("#create-menu.open").waitFor()
    await settle(page)
    await page.locator('#create-menu [data-action="create-request"]').click()
    await settle(page)
    expect(
      await page.locator("#dialog[open] #request-cat").count(),
      "Contratar serviço do painel não abriu",
    )
  },
  async "shortcut-c-opens-create"(page) {
    await go(page, "inicio")
    await page.locator("#main h1").first().click()
    await page.keyboard.press("c")
    await settle(page)
    const open = await page.evaluate(() => !document.querySelector("#create-menu").hidden)
    if (!desktop(page)) {
      expect(!open, "atalho C abriu o Criar no celular/tablet")
      return
    }
    expect(open, "atalho C não abriu o Criar")
    await page.keyboard.press("Escape")
    await page.locator("#create-menu").waitFor({ state: "hidden" })
    // Digitando num campo, o C é só uma letra.
    await page.locator("#home-search").click()
    await settle(page)
    const field = page.locator("input:visible, textarea:visible").first()
    if (await field.count()) {
      await field.focus()
      await page.keyboard.press("c")
      await settle(page)
      expect(
        await page.evaluate(() => document.querySelector("#create-menu").hidden),
        "atalho C abriu o Criar dentro de um campo",
      )
    }
  },
  async "shortcut-c-respects-readonly"(page) {
    if (!desktop(page)) return
    await snapshot(page)
    await action(page, "city")
    await choose(page, "city-select", "Natal")
    await action(page, "apply-city")
    await go(page, "inicio")
    await page.locator("#main h1").first().click()
    await page.keyboard.press("c")
    await settle(page)
    expect(
      await page.evaluate(() => document.querySelector("#create-menu").hidden),
      "atalho C abriu o Criar vendo outra cidade",
    )
  },
  async "own-event-shows-edit"(page) {
    if (!desktop(page)) return
    const s = await snapshot(page)
    await page.evaluate(
      ([k, city]) => {
        const x = JSON.parse(localStorage.getItem(k))
        const d = new Date()
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        x.events.unshift({
          id: "e-meu",
          city,
          title: "Meu encontro",
          date: today,
          time: "19:00",
          place: "Centro",
          mine: true,
          going: 1,
          on: false,
        })
        localStorage.setItem(k, JSON.stringify(x))
      },
      [KEY, s.homeCity],
    )
    await reload(page)
    await go(page, "inicio")
    expect(
      !(await page.locator('.home-side [data-action="attend-event"][data-value="e-meu"]').count()),
      "Vou aparece no meu próprio encontro",
    )
    expect(
      await page.locator('.home-side [data-action="edit-event"][data-value="e-meu"]').count(),
      "meu encontro sem Editar",
    )
  },
  async "notice-priority-request-then-unread"(page) {
    if (!desktop(page)) return
    const s = await snapshot(page)
    await page.evaluate(
      ([k, city]) => {
        const x = JSON.parse(localStorage.getItem(k))
        for (const n of x.notices) n.unread = n.city === city
        x.requests = [
          {
            id: "r-aviso",
            city,
            cat: "Veículos",
            spec: "Mecânica",
            hood: "Centro",
            desc: "Pedido",
            when: { kind: "asap", date: null },
            photos: [],
            status: "open",
            createdAt: Date.now(),
            expiresAt: Date.now() + 864e5,
            proposals: [
              {
                id: "p1",
                bizId: "b1",
                status: "sent",
                price: { kind: "visit" },
                date: "2099-01-01",
                validUntil: "2099-01-02",
                duration: "1 dia",
                msg: "Olá, posso ir.",
              },
            ],
            who: "Eu",
            mine: true,
          },
        ]
        localStorage.setItem(k, JSON.stringify(x))
      },
      [KEY, s.homeCity],
    )
    await reload(page)
    await go(page, "inicio")
    expect(
      /Seu pedido recebeu 1 proposta/.test(await page.locator(".home-notice").innerText()),
      "pedido com proposta não veio antes dos avisos",
    )
    await page.evaluate((k) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.requests = []
      localStorage.setItem(k, JSON.stringify(x))
    }, KEY)
    await reload(page)
    await go(page, "inicio")
    expect(
      /aviso/.test(await page.locator(".home-notice").innerText()),
      "sem pedido, os avisos não lidos não apareceram",
    )
  },
  async "desktop-width-only-on-home"(page) {
    if (!desktop(page)) return
    await go(page, "negocios")
    expect(
      (await page.evaluate(() => getComputedStyle(document.querySelector("#page")).maxWidth)) ===
        "1120px",
      "a largura maior da Início vazou para outras páginas",
    )
  },
  async "narrowing-closes-create-panel"(page) {
    if (!desktop(page)) return
    const size = page.viewportSize()
    await go(page, "inicio")
    await page.locator("#fab").click()
    await page.locator("#create-menu.open").waitFor()
    await page.setViewportSize({ width: 900, height: size.height })
    await settle(page)
    expect(
      await page.evaluate(() => document.querySelector("#create-menu").hidden),
      "painel do desktop ficou aberto e sem estilo ao estreitar",
    )
    await page.setViewportSize(size)
  },
  async "resume-and-notices-list-on-desktop"(page) {
    if (!desktop(page)) return
    await snapshot(page)
    await go(page, "inicio")
    // O "último visto" é gravado ao abrir o cartão, não ao navegar pelo endereço.
    const card = page.locator('.home-desk [data-action="open-item"]').first()
    const id = await card.getAttribute("data-value")
    await card.click()
    await settle(page)
    await go(page, "inicio")
    expect(
      await page.locator(`.home-desk [data-action="resume"][data-value="item|${id}"]`).count(),
      "Início do desktop sem Continue de onde parou",
    )
    const notice = page.locator('.home-notice[data-action="notices"]')
    if (await notice.count()) {
      await notice.click()
      await settle(page)
      expect(
        await page.locator("#dialog[open]").count(),
        "aviso da Início não abriu a lista de avisos",
      )
    }
  },
  async "every-icon-exists-in-embedded-font"(page) {
    if (!desktop(page)) return
    await go(page, "inicio")
    await settle(page)
    // Mesma medida da Rodada 11: ícone ausente da fonte recortada vira letras (> 30 px).
    const wide = await page.evaluate(async () => {
      await document.fonts.ready
      const names = [
        ...new Set(
          [...document.querySelectorAll(".home-desk md-icon")].map((i) => i.textContent.trim()),
        ),
      ]
      return names.filter((n) => {
        const s = document.createElement("span")
        s.style.cssText =
          "font-family:'Material Symbols Rounded';font-size:24px;position:absolute;white-space:nowrap"
        s.textContent = n
        document.body.append(s)
        const w = s.getBoundingClientRect().width
        s.remove()
        return w > 30
      })
    })
    expect(!wide.length, `ícones fora da fonte: ${wide.join(", ")}`)
  },
}

await runProof(checkpoints, "round13")
