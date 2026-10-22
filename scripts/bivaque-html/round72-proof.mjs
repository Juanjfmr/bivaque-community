import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  choose,
  confirmOk,
  expect,
  fill,
  go,
  routeOf,
  runProof,
  settle,
  snapshot,
} from "./proof-harness.mjs"

// Rodada 72: correções da revisão do Codex sobre as rodadas 70 e 71. O menu Criar deixa de ser todo em
// Brasa, o cartão de compartilhamento guarda a paleta numa constante só, a entrada e a ajuda voltam ao
// canto de 12 px, o símbolo oficial entra em todos os cabeçalhos da entrada, a folha do menu prende o
// foco, a barra fixa escondida sai do teclado e "Fale com a gente" ganha alvo de 44 px.
const VALID_CPF = "529.982.247-25"

// O desenho oficial do símbolo (apps/web/public/brand/bivaque-symbol.svg), sem espaços, para comparar
// com o que a tela desenha.
const squash = (d) => String(d || "").replace(/\s+/g, "")
const OFFICIAL = (() => {
  const svg = readFileSync(
    resolve(import.meta.dirname, "../../apps/web/public/brand/bivaque-symbol.svg"),
    "utf8",
  )
  const d = (id) => squash(svg.match(new RegExp(`id="${id}"[^>]*?\\sd="([^"]+)"`))?.[1])
  return { body: d("bivaque-symbol-body"), threshold: d("bivaque-threshold") }
})()

// ---- cor e contraste (fórmula da WCAG) ----
function parseColor(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase()
  const hex = text.match(/^#([0-9a-f]{3,8})$/)
  if (hex) {
    const digits = hex[1]
    const full =
      digits.length === 3 || digits.length === 4 ? [...digits].map((d) => d + d).join("") : digits
    const parts = [0, 2, 4, 6].map((i) =>
      i < full.length ? Number.parseInt(full.slice(i, i + 2), 16) : undefined,
    )
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] === undefined ? 1 : parts[3] / 255 }
  }
  const rgb = text.match(/^rgba?\(([^)]+)\)$/)
  if (rgb) {
    const parts = rgb[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number)
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] === undefined ? 1 : parts[3] }
  }
  // color-mix(in srgb, ...) é devolvido como color(srgb r g b / a), com canais de 0 a 1.
  const srgb = text.match(/^color\(srgb ([^)]+)\)$/)
  if (srgb) {
    const parts = srgb[1]
      .split(/[\s/]+/)
      .filter(Boolean)
      .map(Number)
    return {
      r: parts[0] * 255,
      g: parts[1] * 255,
      b: parts[2] * 255,
      a: parts[3] === undefined ? 1 : parts[3],
    }
  }
  throw new Error(`cor não reconhecida: ${value}`)
}
const sorted = (a, b) => {
  const channel = (v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const one = 0.2126 * channel(a.r) + 0.7152 * channel(a.g) + 0.0722 * channel(a.b)
  const other = 0.2126 * channel(b.r) + 0.7152 * channel(b.g) + 0.0722 * channel(b.b)
  return one > other ? [one, other] : [other, one]
}
const contrast = (a, b) => {
  const [light, dark] = sorted(parseColor(a), parseColor(b))
  return (light + 0.05) / (dark + 0.05)
}
const sameColor = (a, b) => {
  const one = parseColor(a)
  const other = parseColor(b)
  return (
    Math.round(one.r) === Math.round(other.r) &&
    Math.round(one.g) === Math.round(other.g) &&
    Math.round(one.b) === Math.round(other.b)
  )
}
const ratio = (value) => Math.round(value * 100) / 100
// Compõe uma cor com alfa sobre um fundo opaco e devolve rgb(): é a cor que a pessoa vê. Revisão de
// confirmação do Codex: sem isso, texto com opacity reduzida passava com o contraste da cor cheia.
const over = (top, alpha, bottom) => {
  const t = parseColor(top)
  const b = parseColor(bottom)
  const a = (t.a ?? 1) * alpha
  const mix = (x, y) => Math.round(x * a + y * (1 - a))
  return `rgb(${mix(t.r, b.r)}, ${mix(t.g, b.g)}, ${mix(t.b, b.b)})`
}

async function tokens(page, names) {
  return page.evaluate((list) => {
    const root = getComputedStyle(document.documentElement)
    const probe = document.createElement("span")
    probe.style.position = "fixed"
    probe.style.left = "-9999px"
    document.body.append(probe)
    const values = {}
    for (const name of list) {
      probe.style.backgroundColor = `var(${name})`
      values[name] = {
        raw: root.getPropertyValue(name).trim(),
        color: getComputedStyle(probe).backgroundColor,
      }
    }
    probe.remove()
    return { theme: document.documentElement.dataset.theme, values }
  }, names)
}

const computed = (page, selector, property) =>
  page
    .locator(selector)
    .first()
    .evaluate((el, prop) => getComputedStyle(el)[prop], property)

// O preenchimento dos botões do Material mora no shadow root; devolve a primeira camada opaca.
const backgroundColorDeep = (page, selector) =>
  page
    .locator(selector)
    .first()
    .evaluate((host) => {
      const queue = [host]
      while (queue.length) {
        const el = queue.shift()
        if (el !== host) {
          const bg = getComputedStyle(el).backgroundColor
          if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg
        }
        if (el.shadowRoot) queue.push(...el.shadowRoot.children)
        queue.push(...el.children)
      }
      return getComputedStyle(host).backgroundColor
    })

// Rolagem dentro de #main: o body tem overflow:hidden, então o topo não é o scrollY da janela.
async function scrollTo(page, y) {
  await page.evaluate((value) => {
    document.querySelector("#main").scrollTop = value
  }, y)
  await settle(page)
}

const isNarrow = (page) => page.evaluate(() => innerWidth <= 860)

// Quem saiu vê a landing: o mesmo caminho das provas da R53 (Você → Sair → confirmar).
async function signOut(page) {
  await snapshot(page)
  await go(page, "voce")
  await page.locator('#main [data-action="sign-out"]').click()
  await settle(page)
  await confirmOk(page)
  await settle(page)
  expect((await routeOf(page)).name === "entrar", "Sair não levou à landing")
}

const clickMain = async (page, action, value = "") => {
  await page
    .locator(`#main [data-action="${action}"]${value ? `[data-value="${value}"]` : ""}`)
    .first()
    .click()
  await settle(page)
}

// A entrada até o passo 3 (cidade e data), como as provas da R56.
async function signupToCity(page, name = "Carla Teste", email = "carla.teste@exemplo.com") {
  if ((await routeOf(page)).id !== "conta") {
    await page.locator("#ld-hero-cta").click()
    await settle(page)
  }
  await fill(page, "en-name", name)
  await fill(page, "en-email", email)
  await fill(page, "en-pass", "senha1234")
  await page.locator("#en-consent").click()
  await clickMain(page, "entry-signup")
  await fill(page, "en-cpf", VALID_CPF)
  await clickMain(page, "entry-cpf")
  expect((await routeOf(page)).id === "cidade", "o CPF confirmado não abriu o passo 3")
}

const radius = (page, selector) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).borderRadius)

// A cor de fundo que a pessoa vê atrás de uma opção do menu: a camada pintada dentro do botão (o
// Material pinta o fundo no shadow root) ou, sem ela, a primeira camada opaca acima.
async function optionBackground(page, index) {
  return page.evaluate((i) => {
    const item = [...document.querySelectorAll("#create-menu .create-menu-action")].filter(
      (el) => el.getClientRects().length,
    )[i]
    const opaque = (bg) => {
      const match = String(bg).match(/^rgba?\(([^)]+)\)$/)
      if (!match) return false
      const parts = match[1]
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map(Number)
      return (parts[3] ?? 1) >= 0.95
    }
    // Só o shadow root do botão do Material guarda o fundo; nos filhos do light DOM estão o ícone e o
    // texto, e o quadrado colorido do ícone não é o fundo atrás do texto.
    const queue = item.shadowRoot ? [...item.shadowRoot.children] : []
    while (queue.length) {
      const el = queue.shift()
      const bg = getComputedStyle(el).backgroundColor
      if (opaque(bg)) return bg
      if (el.shadowRoot) queue.push(...el.shadowRoot.children)
      queue.push(...el.children)
    }
    for (let node = item; node; node = node.parentElement) {
      const bg = getComputedStyle(node).backgroundColor
      if (opaque(bg)) return bg
    }
    return getComputedStyle(document.body).backgroundColor
  }, index)
}

const menuTexts = (page) =>
  page.evaluate(() => {
    // A opacidade efetiva do texto: o produto das opacidades do elemento até a opção.
    const opacityOf = (el, stop) => {
      let value = 1
      for (let node = el; node && node !== stop.parentElement; node = node.parentElement)
        value *= Number(getComputedStyle(node).opacity)
      return value
    }
    return [...document.querySelectorAll("#create-menu .create-menu-action")]
      .filter((el) => el.getClientRects().length)
      .map((el) => {
        const title = el.querySelector(".cp-txt b") || el.querySelector(".create-menu-label")
        const sub = el.querySelector(".cp-txt small") || el.querySelector(".create-menu-sub")
        const style = getComputedStyle(el)
        return {
          material: Boolean(el.shadowRoot),
          title: (title?.innerText || "").split("\n")[0].trim(),
          titleColor: title ? getComputedStyle(title).color : "",
          titleOpacity: title ? opacityOf(title, el) : 1,
          subText: sub ? sub.innerText.trim() : "",
          subColor: sub ? getComputedStyle(sub).color : "",
          subOpacity: sub ? opacityOf(sub, el) : 1,
          // A camada de estado do Material no toque (a mais forte; o hover usa 0,08).
          pressedLayer:
            style.getPropertyValue("--md-filled-tonal-button-pressed-state-layer-color").trim() ||
            getComputedStyle(document.documentElement)
              .getPropertyValue("--md-sys-color-on-secondary-container")
              .trim(),
          pressedOpacity:
            Number(
              style.getPropertyValue("--md-filled-tonal-button-pressed-state-layer-opacity").trim(),
            ) || 0.12,
        }
      })
  })

const checkpoints = {
  async "create-menu-neutral"(page) {
    await go(page, "inicio")
    await settle(page)
    const brasa = (await tokens(page, ["--bv-brasa"])).values["--bv-brasa"].color
    const fab = await backgroundColorDeep(page, "#fab")
    expect(sameColor(fab, brasa), `o botão Criar não está em Brasa: ${fab}`)

    await page.locator("#fab").click()
    await settle(page)
    await page.waitForFunction(() => {
      const menu = document.getElementById("create-menu")
      return menu && !menu.hidden && menu.classList.contains("open")
    })

    const texts = await menuTexts(page)
    expect(texts.length > 0, "o menu Criar abriu sem opções")
    for (let index = 0; index < texts.length; index++) {
      const option = texts[index]
      const background = await optionBackground(page, index)
      expect(
        !sameColor(background, brasa),
        `a opção "${option.title}" tem fundo Brasa (${background})`,
      )
      // Em repouso e na interação (a interação não pode derrubar o contraste). No botão do Material a
      // camada de estado é um pseudo-elemento do ripple: compõe a de toque (a mais forte) pelos
      // tokens. No painel do desktop o hover troca o próprio fundo: passa o ponteiro e mede.
      let pressed
      if (option.material) pressed = over(option.pressedLayer, option.pressedOpacity, background)
      else {
        await page.locator("#create-menu .create-menu-action:visible").nth(index).hover()
        await page.waitForTimeout(250)
        pressed = await optionBackground(page, index)
        await page.mouse.move(0, 0)
      }
      for (const [state, bg] of [
        ["em repouso", background],
        ["na interação", pressed],
      ]) {
        const title = contrast(over(option.titleColor, option.titleOpacity, bg), bg)
        expect(title >= 4.5, `o título de "${option.title}" tem ${ratio(title)}:1 ${state} (${bg})`)
        if (!option.subText) continue
        const sub = contrast(over(option.subColor, option.subOpacity, bg), bg)
        expect(sub >= 4.5, `o subtítulo de "${option.title}" tem ${ratio(sub)}:1 ${state} (${bg})`)
      }
    }
  },

  async "share-palette"() {
    const file = resolve(
      import.meta.dirname,
      "../../prototypes/bivaque-html/src/features/listings/share-card.js",
    )
    const source = readFileSync(file, "utf8")
    // Só o objeto da constante (sem chaves internas) sai da fiscalização; o desenho continua nela.
    const palette = source.match(/const SHARE_PALETTE\s*=\s*\{([^{}]*)\}/)
    expect(palette, "share-card.js não tem a constante SHARE_PALETTE")
    for (const color of ["#F2F0EB", "#253033", "#B84A3A"])
      expect(new RegExp(color, "i").test(palette[1]), `a paleta do cartão não tem ${color}`)
    const rest = source.replace(palette[0], "")
    expect(/shareCardBlob/.test(rest), "a fiscalização perdeu o desenho do cartão")
    const loose = rest.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g)
    expect(!loose, `cor solta no desenho: ${loose ? loose.join(", ") : ""}`)
  },

  async "entry-shapes"(page) {
    // O chamado em Meus chamados (o cartão .ticket).
    await go(page, "contato")
    await settle(page)
    await fill(page, "support-text", "Preciso de ajuda com o meu cadastro.")
    await clickMain(page, "support-send")
    expect(
      (await page.locator(".ticket").count()) > 0,
      "enviar o chamado não abriu um cartão .ticket",
    )
    expect((await radius(page, ".ticket")) === "12px", `ticket: ${await radius(page, ".ticket")}`)

    // A Ajuda (o cartão .help-card).
    await go(page, "ajuda")
    await settle(page)
    expect((await page.locator(".help-card").count()) > 0, "a Ajuda não tem .help-card")
    expect(
      (await radius(page, ".help-card")) === "12px",
      `help-card: ${await radius(page, ".help-card")}`,
    )

    // O campo de data do passo 3 da entrada.
    await signOut(page)
    await signupToCity(page)
    expect((await page.locator("#en-date").count()) > 0, "o passo 3 não tem o campo de data")
    expect(
      (await radius(page, "#en-date")) === "12px",
      `data de chegada: ${await radius(page, "#en-date")}`,
    )
  },

  async "entry-symbol"(page) {
    await signOut(page)
    const headers = [
      ["cadastro", "entrar/conta"],
      ["convite", "entrar/convite"],
      ["login", "entrar/login"],
      ["privacidade", "privacidade"],
      ["ajuda", "ajuda"],
    ]
    for (const [label, hash] of headers) {
      await go(page, hash)
      await settle(page)
      const symbol = await page.evaluate(() => {
        const svg = document.querySelector("#main header.en-top svg.brand-mark")
        return svg
          ? {
              viewBox: svg.getAttribute("viewBox"),
              paths: [...svg.querySelectorAll("path")].map((p) => ({
                d: p.getAttribute("d"),
                fill: getComputedStyle(p).fill,
              })),
              letter: document.querySelector("#main header.en-top .en-mark")?.textContent || "",
            }
          : null
      })
      expect(symbol, `o cabeçalho de ${label} não tem o símbolo oficial`)
      expect(symbol.viewBox === "0 0 100 100", `viewBox de ${label}: ${symbol.viewBox}`)
      expect(symbol.paths.length === 2, `símbolo de ${label} com ${symbol.paths.length} caminhos`)
      // O desenho é o do SVG oficial, sem redesenho, e as cores são as do tema.
      const [body, threshold] = symbol.paths
      expect(squash(body.d) === OFFICIAL.body, `o corpo do símbolo de ${label} não é o oficial`)
      expect(
        squash(threshold.d) === OFFICIAL.threshold,
        `a abertura do símbolo de ${label} não é a oficial`,
      )
      const dark = (await tokens(page, [])).theme === "dark"
      const want = dark ? ["#FFFFFF", "#FFFFFF"] : ["#253033", "#B84A3A"]
      expect(
        sameColor(body.fill, want[0]) && sameColor(threshold.fill, want[1]),
        `cores do símbolo de ${label}: ${body.fill}, ${threshold.fill}`,
      )
      expect(
        symbol.letter === "",
        `o cabeçalho de ${label} ainda mostra a letra "${symbol.letter}"`,
      )
    }
    const letters = await page.evaluate(() =>
      [...document.querySelectorAll(".en-mark")].map((el) => el.textContent.trim()),
    )
    expect(!letters.length, `sobrou .en-mark com "${letters.join(", ")}"`)

    // As boas-vindas fecham a entrada e usam o mesmo cabeçalho.
    await go(page, "entrar/conta")
    await settle(page)
    await fill(page, "en-name", "Carla Teste")
    await fill(page, "en-email", "carla.teste@exemplo.com")
    await fill(page, "en-pass", "senha1234")
    await page.locator("#en-consent").click()
    await clickMain(page, "entry-signup")
    await fill(page, "en-cpf", VALID_CPF)
    await clickMain(page, "entry-cpf")
    await choose(page, "en-city", "Manaus")
    await page.locator("#en-date").fill("2026-12-01")
    await clickMain(page, "entry-finish")
    expect(
      (await routeOf(page)).id === "boas-vindas",
      "concluir a entrada não abriu as boas-vindas",
    )
    const welcome = await page.evaluate(() => {
      const svg = document.querySelector("#main header.en-top svg.brand-mark")
      return {
        viewBox: svg?.getAttribute("viewBox") || "",
        paths: [...(svg?.querySelectorAll("path") || [])].map((p) => ({
          d: p.getAttribute("d"),
          fill: getComputedStyle(p).fill,
        })),
        letter: document.querySelector(".en-mark")?.textContent || "",
      }
    })
    expect(welcome.viewBox === "0 0 100 100", `símbolo das boas-vindas: ${welcome.viewBox}`)
    expect(welcome.letter === "", `as boas-vindas ainda mostram a letra "${welcome.letter}"`)
    // Confirmação do Codex: as boas-vindas também conferem desenho e cores, como os outros cabeçalhos.
    expect(
      welcome.paths.length === 2,
      `símbolo das boas-vindas com ${welcome.paths.length} caminhos`,
    )
    expect(
      squash(welcome.paths[0].d) === OFFICIAL.body &&
        squash(welcome.paths[1].d) === OFFICIAL.threshold,
      "o símbolo das boas-vindas não é o oficial",
    )
    const welcomeDark = (await tokens(page, [])).theme === "dark"
    const welcomeWant = welcomeDark ? ["#FFFFFF", "#FFFFFF"] : ["#253033", "#B84A3A"]
    expect(
      sameColor(welcome.paths[0].fill, welcomeWant[0]) &&
        sameColor(welcome.paths[1].fill, welcomeWant[1]),
      `cores do símbolo das boas-vindas: ${welcome.paths[0].fill}, ${welcome.paths[1].fill}`,
    )
    // Os atalhos das boas-vindas (.en-tile) também entram no canto de 12 px do achado 3.
    expect((await page.locator(".en-tile").count()) > 0, "as boas-vindas não têm .en-tile")
    expect(
      (await radius(page, ".en-tile")) === "12px",
      `en-tile: ${await radius(page, ".en-tile")}`,
    )
  },

  async "landing-focus-trap"(page) {
    await signOut(page)
    const button = page.locator("#ld-top [data-ld-menu]")
    // O ramo é decidido pela largura, não pela visibilidade do botão: um celular que perdesse o botão
    // do menu cairia no ramo do desktop e escaparia do teste de foco.
    if (!(await isNarrow(page))) {
      expect(!(await button.isVisible()), "no desktop o botão do menu apareceu")
      // No desktop não existe folha: o menu do topo é a navegação por âncoras, sempre à vista.
      expect(
        await page.locator("#ld-top .ld-nav").isVisible(),
        "no desktop nem o botão do menu nem a navegação por âncoras aparecem",
      )
      expect(!(await page.locator("#ld-sheet").isVisible()), "a folha do menu apareceu no desktop")
      return
    }
    // A folha abre com a barra fixa à vista (além do CTA do topo): é o caso em que um observador
    // pode reativá-la por baixo da folha. Subir um pouco traz o topo de volta, que some ao descer.
    await scrollTo(page, 1300)
    await page.waitForFunction(() =>
      document.getElementById("ld-bar")?.classList.contains("ld-show"),
    )
    await scrollTo(page, 1200)
    await page.waitForFunction(
      () => !document.getElementById("ld-top")?.classList.contains("ld-hide"),
    )
    await button.click()
    await settle(page)
    expect((await button.getAttribute("aria-expanded")) === "true", "o botão não abriu a folha")

    const inert = await page.evaluate(() =>
      ["#ld-top", "#ld-main", ".ld-footer", "#ld-bar"].map((selector) => ({
        selector,
        inert: document.querySelector(selector)?.inert ?? false,
      })),
    )
    for (const part of inert)
      expect(part.inert, `${part.selector} continuou ativo com a folha aberta`)

    const focusables = await page.evaluate(
      () =>
        [
          ...document.querySelectorAll(
            "#ld-sheet a[href], #ld-sheet button, #ld-sheet md-filled-button",
          ),
        ].filter((el) => el.getClientRects().length).length,
    )
    expect(focusables >= 8, `itens focáveis na folha: ${focusables}`)

    // O foco fica na folha e anda por ela: um foco preso num único botão também reprova.
    const where = () =>
      page.evaluate(() => {
        const sheet = document.getElementById("ld-sheet")
        const el = document.activeElement
        return {
          inside: sheet.contains(el),
          key: el
            ? `${el.tagName}|${el.textContent.trim().slice(0, 40)}|${el.dataset.action || ""}`
            : "",
        }
      })
    expect((await where()).inside, "o foco não entrou na folha")
    for (const key of ["Tab", "Shift+Tab"]) {
      const seen = new Set()
      for (let step = 0; step < focusables + 2; step++) {
        await page.keyboard.press(key)
        const now = await where()
        expect(now.inside, `${key} saiu da folha no passo ${step + 1}`)
        seen.add(now.key)
      }
      expect(
        seen.size >= focusables,
        `${key} passou por ${seen.size} de ${focusables} itens da folha`,
      )
    }

    // Uma atualização dos observadores com a folha aberta (a janela muda de altura) não pode
    // devolver a barra fixa ao teclado: o isolamento vale enquanto a folha estiver aberta.
    const viewport = page.viewportSize()
    await page.setViewportSize({ width: viewport.width, height: Math.round(viewport.height * 0.6) })
    await page.waitForTimeout(400)
    await page.setViewportSize(viewport)
    await page.waitForTimeout(400)
    const still = await page.evaluate(() => {
      const bar = document.getElementById("ld-bar")
      return { inert: bar.inert, aria: bar.getAttribute("aria-hidden") }
    })
    expect(still.inert && still.aria === "true", `com a folha aberta a barra saiu do isolamento`)

    await page.keyboard.press("Escape")
    await settle(page)
    expect((await button.getAttribute("aria-expanded")) === "false", "Esc não fechou a folha")
    expect(
      !(await page.locator("#ld-sheet").isVisible()),
      "a folha continuou à vista depois do Esc",
    )
    const after = await page.evaluate(() => ({
      focus: document.activeElement === document.querySelector("#ld-top [data-ld-menu]"),
      inert: ["#ld-top", "#ld-main", ".ld-footer", "#ld-bar"].filter(
        (selector) => document.querySelector(selector)?.inert,
      ),
    }))
    expect(after.focus, "o foco não voltou ao botão que abriu a folha")
    // A barra fixa segue o próprio estado (escondida no topo da página, então inerte); o resto volta.
    const leftover = after.inert.filter((selector) => selector !== "#ld-bar")
    expect(!leftover.length, `o inert continuou em ${leftover.join(", ")}`)
    const bar = await page.evaluate(() => {
      const el = document.getElementById("ld-bar")
      return { shown: el.classList.contains("ld-show"), inert: el.inert }
    })
    expect(
      bar.inert === !bar.shown,
      `ao fechar a folha a barra ficou com inert ${bar.inert} (à vista: ${bar.shown})`,
    )
  },

  async "sticky-bar-hidden-from-keyboard"(page) {
    await signOut(page)
    if (!(await isNarrow(page))) {
      expect(
        (await computed(page, "#ld-bar", "display")) === "none",
        "no desktop a barra fixa apareceu",
      )
      const reachable = await page.evaluate(() => {
        const bar = document.getElementById("ld-bar")
        const button = bar.querySelector("md-filled-button")
        const inner = button?.shadowRoot?.querySelector("button")
        ;(inner || button)?.focus({ preventScroll: true })
        return bar.contains(document.activeElement)
      })
      expect(!reachable, "no desktop o botão da barra fixa recebeu foco")
      return
    }

    const hidden = await page.evaluate(() => {
      const bar = document.getElementById("ld-bar")
      const button = bar.querySelector("md-filled-button")
      const inner = button?.shadowRoot?.querySelector("button")
      ;(inner || button)?.focus({ preventScroll: true })
      const style = getComputedStyle(bar)
      return {
        visibility: style.visibility,
        inert: bar.inert,
        aria: bar.getAttribute("aria-hidden"),
        shown: bar.classList.contains("ld-show"),
        focused: bar.contains(document.activeElement),
      }
    })
    expect(!hidden.shown, "a barra fixa já apareceu no topo")
    // As duas coisas que o relatório promete: inerte e oculta.
    expect(
      hidden.inert && hidden.visibility === "hidden",
      `a barra escondida: visibility ${hidden.visibility}, inert ${hidden.inert}`,
    )
    expect(hidden.aria === "true", `aria-hidden da barra escondida: ${hidden.aria}`)
    expect(!hidden.focused, "o botão da barra escondida recebeu foco")

    await scrollTo(page, 1200)
    await page.waitForFunction(() =>
      document.getElementById("ld-bar")?.classList.contains("ld-show"),
    )
    const shown = await page.evaluate(() => {
      const bar = document.getElementById("ld-bar")
      const button = bar.querySelector("md-filled-button")
      const inner = button?.shadowRoot?.querySelector("button")
      ;(inner || button)?.focus({ preventScroll: true })
      return {
        inert: bar.inert,
        aria: bar.getAttribute("aria-hidden"),
        visibility: getComputedStyle(bar).visibility,
        focused: bar.contains(document.activeElement),
      }
    })
    expect(!shown.inert, "a barra à vista continuou inerte")
    expect(shown.aria !== "true", "a barra à vista continuou oculta para a tecnologia assistiva")
    expect(shown.visibility === "visible", `barra à vista com visibility ${shown.visibility}`)
    expect(shown.focused, "com a barra à vista, o botão não recebeu foco")

    // Com a chamada final na tela, a barra some de novo e sai do teclado.
    await page.evaluate(() => document.getElementById("fim").scrollIntoView({ block: "center" }))
    await page.waitForFunction(
      () => !document.getElementById("ld-bar")?.classList.contains("ld-show"),
    )
    await page.waitForTimeout(400)
    const atEnd = await page.evaluate(() => {
      const bar = document.getElementById("ld-bar")
      return {
        inert: bar.inert,
        aria: bar.getAttribute("aria-hidden"),
        visibility: getComputedStyle(bar).visibility,
      }
    })
    expect(
      atEnd.inert && atEnd.aria === "true" && atEnd.visibility === "hidden",
      `na chamada final a barra ficou com inert ${atEnd.inert}, aria ${atEnd.aria}, ${atEnd.visibility}`,
    )
  },

  async "inline-targets"(page) {
    await signOut(page)
    const targets = await page.evaluate(() => {
      const size = (el) => {
        const rect = el.getBoundingClientRect()
        // Sem arredondar: 43,6 px não pode passar como 44 (confirmação do Codex).
        return { width: rect.width, height: rect.height }
      }
      const inline = document.querySelector("#perguntas .ld-inline")
      return {
        inline: inline ? { text: inline.innerText.trim(), ...size(inline) } : null,
        footer: [...document.querySelectorAll(".ld-footer nav > *")].map((el) => ({
          text: el.innerText.trim(),
          ...size(el),
        })),
      }
    })
    expect(targets.inline, '"Fale com a gente" não está nas perguntas')
    expect(
      targets.inline.height >= 44 && targets.inline.width >= 44,
      `"${targets.inline.text}" mede ${targets.inline.width}x${targets.inline.height}`,
    )
    expect(targets.footer.length >= 4, `links do rodapé: ${targets.footer.length}`)
    for (const link of targets.footer)
      expect(
        link.height >= 44 && link.width >= 44,
        `"${link.text}" do rodapé mede ${link.width}x${link.height}`,
      )
  },
}

await runProof(checkpoints, "round72")
