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

// Rodada 14: paleta de busca e comandos do desktop (Ctrl+K ou ⌘K, e "/"). Celular e tablet
// não têm a paleta: lá a busca continua sendo a tela Buscar.
const desktop = (page) => page.viewportSize().width >= 1024
const isOpen = (page) =>
  page.evaluate(() => Boolean(document.querySelector("#palette:not([hidden])")))
async function open(page) {
  await page.locator("#main h1").first().click()
  await page.keyboard.press("Control+k")
  await settle(page)
}
const options = (page) =>
  page
    .locator("#palette-list .palette-option")
    .evaluateAll((els) =>
      els.map((e) => ({ text: e.innerText, selected: e.getAttribute("aria-selected") === "true" })),
    )

const checkpoints = {
  async "opens-only-on-desktop"(page) {
    await go(page, "inicio")
    await open(page)
    if (!desktop(page)) {
      expect(!(await isOpen(page)), "paleta abriu no celular/tablet")
      return
    }
    expect(await isOpen(page), "Ctrl+K não abriu a paleta")
    const focus = await page.evaluate(() => document.activeElement?.id)
    expect(focus === "palette-input", "foco não foi para a busca da paleta")
    const titles = await page.locator(".palette-title").allInnerTexts()
    expect(
      titles.some((t) => /ações/i.test(t)) && titles.some((t) => /ir para/i.test(t)),
      `seções vazias: ${titles.join(", ")}`,
    )
    await page.keyboard.press("Escape")
    await settle(page)
    expect(!(await isOpen(page)), "Esc não fechou a paleta")
    const back = await page.evaluate(() => document.activeElement?.closest?.("#main") !== null)
    expect(back, "foco não voltou para a página")
    expect(
      await page.evaluate(() => !document.querySelector("#main").inert),
      "página ficou inerte depois de fechar",
    )
  },
  async "groups-results-and-highlights"(page) {
    if (!desktop(page)) return
    await snapshot(page)
    await go(page, "inicio")
    await open(page)
    await page.keyboard.type("eletric")
    await settle(page)
    const titles = await page.locator(".palette-title").allInnerTexts()
    expect(
      titles.some((t) => /negócios/i.test(t)),
      `sem grupo Negócios: ${titles.join(", ")}`,
    )
    const marked = await page.locator("#palette-list mark").count()
    expect(marked, "termo buscado não destacado")
    const list = await options(page)
    expect(list[0]?.selected, "primeira opção não selecionada")
    expect(list.at(-1)?.text.includes("em tudo"), "sem a opção de buscar em tudo")
  },
  async "keyboard-opens-result"(page) {
    if (!desktop(page)) return
    await snapshot(page)
    await go(page, "inicio")
    await open(page)
    await page.keyboard.type("eletricista")
    await settle(page)
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("ArrowUp")
    await page.keyboard.press("Enter")
    await settle(page)
    expect((await routeOf(page)).name === "negocio", "Enter não abriu o negócio")
    expect(!(await isOpen(page)), "paleta ficou aberta depois de abrir o resultado")
  },
  async "search-everything-saves-recent"(page) {
    if (!desktop(page)) return
    await snapshot(page)
    await go(page, "inicio")
    await open(page)
    await page.keyboard.type("berço")
    await settle(page)
    await page.locator(".palette-all").click()
    await settle(page)
    expect((await routeOf(page)).name === "busca", "buscar em tudo não abriu a Buscar")
    expect((await stored(page)).recent?.[0] === "berço", "busca não entrou nas recentes")
    await open(page)
    expect(
      /berço/.test(await page.locator("#palette-list").innerText()),
      "recente não aparece na paleta",
    )
  },
  async "create-action-and-slash"(page) {
    if (!desktop(page)) return
    await snapshot(page)
    await go(page, "inicio")
    await page.locator("#main h1").first().click()
    await page.keyboard.press("/")
    await settle(page)
    expect(await isOpen(page), '"/" não abriu a paleta')
    await page.keyboard.type("contratar")
    await settle(page)
    await page.keyboard.press("Enter")
    await settle(page)
    expect(await page.locator("#dialog[open] #request-cat").count(), "Contratar serviço não abriu")
  },
  async "readonly-hides-create"(page) {
    if (!desktop(page)) return
    await snapshot(page)
    await go(page, "inicio")
    await open(page)
    await page.keyboard.type("anunciar")
    await settle(page)
    expect(
      /Anunciar desapego/.test(await page.locator("#palette-list").innerText()),
      "ação de criar sumiu na minha cidade",
    )
    await page.keyboard.press("Escape")
    await settle(page)
    await action(page, "city")
    await choose(page, "city-select", "Natal")
    await action(page, "apply-city")
    await go(page, "inicio")
    await open(page)
    await page.keyboard.type("anunciar")
    await settle(page)
    expect(
      !/Anunciar desapego/.test(await page.locator("#palette-list").innerText()),
      "ação de criar em cidade consultada",
    )
  },
  async "slash-ignored-in-fields"(page) {
    if (!desktop(page)) return
    await go(page, "inicio")
    await page.locator("#home-search").click()
    await settle(page)
    const field = page.locator("input:visible").first()
    expect(await field.count(), "tela Buscar sem campo para testar")
    await field.focus()
    await page.keyboard.press("/")
    await settle(page)
    expect(!(await isOpen(page)), '"/" dentro de um campo abriu a paleta')
  },
  async "toggle-meta-and-blocked-by-dialog"(page) {
    if (!desktop(page)) return
    await go(page, "inicio")
    await page.locator("#main h1").first().click()
    await page.keyboard.press("Meta+k")
    await settle(page)
    expect(await isOpen(page), "⌘K não abriu a paleta")
    await page.keyboard.press("Control+k")
    await settle(page)
    expect(!(await isOpen(page)), "segundo Ctrl+K não fechou a paleta")
    await action(page, "city")
    await page.keyboard.press("Control+k")
    await settle(page)
    expect(!(await isOpen(page)), "paleta abriu por cima de um diálogo")
  },
  async "focus-stays-and-back-closes"(page) {
    if (!desktop(page)) return
    await go(page, "negocios")
    await go(page, "inicio")
    await open(page)
    await page.keyboard.press("Shift+Tab")
    expect(
      await page.evaluate(() => document.activeElement?.id === "palette-input"),
      "Shift+Tab tirou o foco da paleta",
    )
    await page.locator(".palette-title").first().click()
    expect(
      await page.evaluate(() => document.activeElement?.id === "palette-input"),
      "clique no título tirou o foco do campo",
    )
    await page.keyboard.press("c")
    await settle(page)
    expect(
      await page.evaluate(() => document.querySelector("#create-menu").hidden),
      "C abriu o Criar por baixo da paleta",
    )
    await page.goBack()
    await settle(page)
    expect(!(await isOpen(page)), "Voltar do navegador não fechou a paleta")
    expect(
      await page.evaluate(
        () => !document.querySelector("#main").inert && !document.querySelector("#fab").inert,
      ),
      "fundo ficou inerte",
    )
  },
  async "highlight-survives-emoji-and-escapes-html"(page) {
    if (!desktop(page)) return
    const s = await snapshot(page)
    await page.evaluate(
      ([k, city]) => {
        const x = JSON.parse(localStorage.getItem(k))
        x.items.unshift({
          ...x.items[0],
          id: "i-emoji",
          city,
          title: "🛏️ Berço de madeira",
          status: "active",
          mine: false,
        })
        localStorage.setItem(k, JSON.stringify(x))
      },
      [KEY, s.homeCity],
    )
    await reload(page)
    await go(page, "inicio")
    await open(page)
    await page.keyboard.type("berco madeira")
    await settle(page)
    const marks = await page.locator("#palette-list [data-palette-index] mark").allInnerTexts()
    expect(
      marks.includes("Berço") && marks.includes("madeira"),
      `destaque deslocado: ${JSON.stringify(marks)}`,
    )
    await page.locator("#palette-input").fill('<img src=x onerror="window.__xss=1">')
    await settle(page)
    expect(
      await page.evaluate(() => !document.querySelector("#palette-list img") && !window.__xss),
      "busca injetou HTML",
    )
  },
  async "narrowing-closes-palette"(page) {
    if (!desktop(page)) return
    const size = page.viewportSize()
    await go(page, "inicio")
    await open(page)
    await page.setViewportSize({ width: 900, height: size.height })
    await settle(page)
    expect(!(await isOpen(page)), "paleta ficou aberta ao estreitar")
    await page.setViewportSize(size)
  },
}

await runProof(checkpoints, "round14")
