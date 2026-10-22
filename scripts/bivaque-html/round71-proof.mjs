import {
  confirmOk,
  expect,
  go,
  reload,
  routeOf,
  runProof,
  settle,
  snapshot,
} from "./proof-harness.mjs"

// Rodada 71: a landing pública é a v8 aprovada (título F), na pele da marca e nos dois temas.
// Um único CTA ("Criar conta") leva ao cadastro; "Entrar" leva ao login; quem está fora não lê o
// Bivaque além da conversa ilustrativa.
const TITLE = "Juntos somos mais fortes."
const LEAD =
  "A família militar se ajuda, em qualquer cidade: pergunte a quem já mora perto, ache serviços e imóveis, passe adiante o que não usa mais. Gratuito para militares, veteranos, pensionistas e suas famílias."
const SECTIONS = [
  ["inicio", TITLE],
  ["exemplo", "Uma pergunta, várias famílias respondendo"],
  ["recursos", "O que a gente resolve junto, na sua cidade"],
  ["mudanca", "Transferido? Chegue sabendo."],
  ["participar", "Três passos para entrar"],
  ["perguntas", "Perguntas frequentes"],
  ["fim", "Entre na comunidade da sua cidade."],
]

const flat = (text) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()

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

const isNarrow = (page) => page.evaluate(() => innerWidth <= 860)

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
const luminance = ({ r, g, b }) => {
  const channel = (v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}
const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}
// Compõe uma camada com alfa sobre outra cor (o véu sobre a foto).
const over = (top, bottom) => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
})
const ratio = (value) => Math.round(value * 100) / 100

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

// O fundo que a pessoa vê atrás de um elemento: sobe até achar uma camada opaca.
async function backgroundOf(page, selector) {
  return page.evaluate((sel) => {
    for (let el = document.querySelector(sel); el; el = el.parentElement) {
      const bg = getComputedStyle(el).backgroundColor
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg
    }
    return getComputedStyle(document.body).backgroundColor
  }, selector)
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

const checkpoints = {
  async "hero-copy"(page) {
    await signOut(page)
    const h1 = await page.locator("#main h1").allInnerTexts()
    expect(h1.length === 1, `a landing tem ${h1.length} h1`)
    expect(flat(h1[0]) === TITLE, `h1: ${flat(h1[0])}`)
    const lead = await page.locator("#inicio .ld-lead").innerText()
    expect(flat(lead) === LEAD, `linha de apoio: ${flat(lead)}`)
    expect(
      flat(await page.locator("#inicio .ld-forces").innerText()) ===
        "Marinha, Exército e Aeronáutica",
      "sem a linha das três Forças",
    )
    const text = await page.locator("#main").innerText()
    for (const gone of ["Quero fazer parte", "Recebi um convite", "Muda a cidade"])
      expect(!text.includes(gone), `a landing ainda diz "${gone}"`)
    expect(!text.toLowerCase().includes("amostra"), "a landing ainda oferece amostra")
  },

  async "sections-in-order"(page) {
    await signOut(page)
    const found = await page.evaluate(() =>
      [...document.querySelectorAll("#main section[id]")].map((section) => ({
        id: section.id,
        title: (section.querySelector("h1, h2")?.innerText || "").replace(/\s+/g, " ").trim(),
      })),
    )
    expect(
      found.map((section) => section.id).join(" ") === SECTIONS.map(([id]) => id).join(" "),
      `seções: ${found.map((section) => section.id).join(" ")}`,
    )
    for (const [id, title] of SECTIONS) {
      const section = found.find((item) => item.id === id)
      expect(flat(section.title) === title, `#${id} abre com "${section.title}"`)
    }
    const faq = await page.evaluate(() => {
      const items = [...document.querySelectorAll("#perguntas details")]
      return {
        questions: items.map((item) => item.querySelector("summary").innerText.trim()),
        open: items
          .filter((item) => item.open)
          .map((item) => item.querySelector("summary").innerText.trim()),
      }
    })
    expect(faq.questions.length === 6, `perguntas: ${faq.questions.length}`)
    expect(
      faq.open.length === 1 && /confirmação pelo CPF/.test(faq.open[0]),
      `abertas: ${JSON.stringify(faq.open)}`,
    )
  },

  async "single-cta"(page) {
    await signOut(page)
    const ctas = await page.evaluate(() => {
      const visible = (el) => {
        if (!el.getClientRects().length) return false
        const style = getComputedStyle(el)
        return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0"
      }
      return [...document.querySelectorAll("#main button, #main a, #main md-filled-button")]
        .filter((el) => (el.innerText || "").trim() === "Criar conta" && visible(el))
        .map((el) => ({
          action: el.dataset?.action || el.closest("[data-action]")?.dataset?.action || "",
          tag: el.tagName.toLowerCase(),
        }))
    })
    expect(ctas.length > 0, "a landing não tem CTA visível")
    for (const cta of ctas) expect(cta.action === "entry-join", `CTA com ação ${cta.action}`)
    const brasa = (await tokens(page, ["--bv-brasa"])).values["--bv-brasa"].color
    const fill = await backgroundColorDeep(page, "#ld-hero-cta")
    expect(
      parseColor(fill).r === parseColor(brasa).r &&
        parseColor(fill).g === parseColor(brasa).g &&
        parseColor(fill).b === parseColor(brasa).b,
      `o CTA do topo tem fundo ${fill}, esperado ${brasa}`,
    )
    await page.locator("#ld-hero-cta").click()
    await settle(page)
    const account = await routeOf(page)
    expect(
      account.name === "entrar" && account.id === "conta",
      `o CTA do topo foi para ${account.name}/${account.id}`,
    )
    // Página nova: "Entrar" leva ao login.
    await reload(page)
    await go(page, "entrar")
    await settle(page)
    await page.locator("#ld-top [data-action='entry-login']").first().click()
    await settle(page)
    const login = await routeOf(page)
    expect(
      login.name === "entrar" && login.id === "login",
      `Entrar foi para ${login.name}/${login.id}`,
    )
  },

  async images(page) {
    await signOut(page)
    const photos = await page.evaluate(() => {
      const read = (selector) => {
        const img = document.querySelector(selector)
        if (!img) return null
        return {
          src: img.currentSrc || img.src,
          naturalWidth: img.naturalWidth,
          alt: img.getAttribute("alt"),
          hasAlt: img.hasAttribute("alt"),
        }
      }
      return {
        hero: read("#inicio .ld-hero-media img"),
        community: read("#recursos .ld-shot img"),
        home: read("#mudanca .ld-shot img"),
        final: read("#fim img"),
        captions: [...document.querySelectorAll("#main .ld-shot figcaption")].map((fig) =>
          fig.innerText.trim(),
        ),
      }
    })
    const named = [
      ["topo", photos.hero, true],
      ["captura da Comunidade", photos.community, true],
      ["captura da Início", photos.home, true],
      ["foto final", photos.final, false],
    ]
    for (const [label, photo, needsAlt] of named) {
      expect(photo, `sem a ${label}`)
      expect(photo.naturalWidth > 0, `a ${label} não carregou`)
      expect(photo.src.startsWith("data:image/webp"), `a ${label} não é WebP embutido`)
      expect(photo.hasAlt, `a ${label} não tem alt`)
      if (needsAlt) expect(photo.alt.trim().length > 0, `a ${label} está com alt vazio`)
      else expect(photo.alt === "", `a foto final tem alt "${photo.alt}"`)
    }
    expect(photos.captions.length === 2, `legendas: ${photos.captions.length}`)
    for (const caption of photos.captions)
      expect(/dados de exemplo/.test(caption), `legenda: ${caption}`)
  },

  async contrast(page) {
    await signOut(page)
    const { theme, values } = await tokens(page, [
      "--md-sys-color-on-surface",
      "--md-sys-color-surface",
      "--bv-on-brasa",
      "--bv-brasa",
      "--bv-on-photo",
      "--bv-photo-scrim",
    ])
    const body = contrast(
      parseColor(values["--md-sys-color-on-surface"].color),
      parseColor(values["--md-sys-color-surface"].color),
    )
    expect(body >= 4.5, `texto do corpo sobre surface: ${ratio(body)}:1`)

    const question = parseColor(await computed(page, "#perguntas summary", "color"))
    const questionBackground = parseColor(await backgroundOf(page, "#perguntas"))
    const faqRatio = contrast(question, questionBackground)
    expect(faqRatio >= 4.5, `texto das perguntas sobre o fundo: ${ratio(faqRatio)}:1`)

    const action = contrast(
      parseColor(values["--bv-on-brasa"].color),
      parseColor(values["--bv-brasa"].color),
    )
    expect(action >= 4.5, `--bv-on-brasa sobre --bv-brasa: ${ratio(action)}:1`)

    // Sobre a foto: o branco contra o véu composto sobre a cor média da foto.
    // A média vem do próprio arquivo (canvas 48×32); no escuro a foto ainda recebe brightness(.9).
    const photo = await page.evaluate(async () => {
      const img = document.querySelector("#inicio .ld-hero-media img")
      await img.decode()
      const canvas = document.createElement("canvas")
      canvas.width = 48
      canvas.height = 32
      const context = canvas.getContext("2d", { willReadFrequently: true })
      context.drawImage(img, 0, 0, canvas.width, canvas.height)
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
      let r = 0
      let g = 0
      let b = 0
      let n = 0
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
        n++
      }
      return {
        average: [r / n, g / n, b / n],
        dark: document.documentElement.dataset.theme === "dark",
      }
    })
    const dim = photo.dark ? 0.9 : 1
    const average = {
      r: photo.average[0] * dim,
      g: photo.average[1] * dim,
      b: photo.average[2] * dim,
      a: 1,
    }
    const scrim = over(parseColor(values["--bv-photo-scrim"].color), average)
    const photoRatio = contrast(parseColor(values["--bv-on-photo"].color), scrim)
    expect(
      photoRatio >= 4.5,
      `branco sobre o véu (${theme}): ${ratio(photoRatio)}:1 — média da foto ${photo.average.map(Math.round).join(",")}`,
    )
  },

  async anchors(page) {
    await signOut(page)
    const narrow = await isNarrow(page)
    if (narrow) {
      await page.locator("#ld-top [data-ld-menu]").click()
      await settle(page)
      await page.locator('#ld-sheet [data-landing-anchor="perguntas"]').click()
    } else {
      await page.locator('#ld-top [data-landing-anchor="perguntas"]').click()
    }
    await page
      .waitForFunction(
        () => {
          const section = document.getElementById("perguntas")
          const top = section?.getBoundingClientRect().top ?? -999
          return top > 40 && top < 140
        },
        null,
        { timeout: 4000 },
      )
      .catch(() => {})
    // A seção ativa é marcada pelo observador, no quadro seguinte à rolagem.
    await page
      .waitForFunction(
        () =>
          [...document.querySelectorAll("[data-landing-anchor]")].some(
            (link) =>
              link.dataset.landingAnchor === "perguntas" &&
              link.getAttribute("aria-current") === "true",
          ),
        null,
        { timeout: 4000 },
      )
      .catch(() => {})
    await settle(page)
    const landing = await page.evaluate(() => {
      const section = document.getElementById("perguntas")
      return {
        top: Math.round(section?.getBoundingClientRect().top ?? -999),
        current: [...document.querySelectorAll("[data-landing-anchor]")]
          .filter((link) => link.getAttribute("aria-current") === "true")
          .map((link) => link.dataset.landingAnchor),
        pill: (() => {
          const pill = document.querySelector("#ld-top .ld-pill")
          if (!pill) return null
          const style = getComputedStyle(pill)
          return { opacity: style.opacity, width: Math.round(pill.getBoundingClientRect().width) }
        })(),
      }
    })
    expect(landing.top > 30 && landing.top < 150, `#perguntas ficou em ${landing.top}px`)
    expect(landing.current.includes("perguntas"), `seção ativa: ${JSON.stringify(landing.current)}`)
    if (!narrow) {
      expect(
        landing.pill && Number(landing.pill.opacity) > 0.5 && landing.pill.width > 0,
        `a pílula não marcou a seção: ${JSON.stringify(landing.pill)}`,
      )
    }
  },

  async "mobile-menu"(page) {
    if (!(await isNarrow(page))) return
    await signOut(page)
    const button = page.locator("#ld-top [data-ld-menu]")
    expect((await button.getAttribute("aria-expanded")) === "false", "o botão já vem aberto")
    await button.click()
    await settle(page)
    expect((await button.getAttribute("aria-expanded")) === "true", "o botão não abriu a folha")
    expect(await page.locator("#ld-sheet").isVisible(), "a folha não apareceu")
    expect(
      await page.evaluate(() =>
        document.getElementById("ld-sheet").contains(document.activeElement),
      ),
      "o foco não entrou na folha",
    )
    await page.keyboard.press("Escape")
    await settle(page)
    expect((await button.getAttribute("aria-expanded")) === "false", "Esc não fechou a folha")
    expect(
      !(await page.locator("#ld-sheet").isVisible()),
      "a folha continuou à vista depois do Esc",
    )
    expect(
      await page.evaluate(
        () => document.activeElement === document.querySelector("#ld-top [data-ld-menu]"),
      ),
      "o foco não voltou ao botão que abriu a folha",
    )
  },

  async "sticky-bar"(page) {
    await signOut(page)
    const narrow = await isNarrow(page)
    const bar = "#ld-bar"
    if (!narrow) {
      expect((await computed(page, bar, "display")) === "none", "no desktop a barra fixa apareceu")
      await scrollTo(page, 1400)
      expect(
        (await computed(page, bar, "display")) === "none",
        "no desktop a barra fixa apareceu ao rolar",
      )
      return
    }
    const shown = () =>
      page.evaluate(() => {
        const element = document.getElementById("ld-bar")
        if (!element) return false
        const style = getComputedStyle(element)
        return style.display !== "none" && style.transform === "none"
      })
    expect(!(await shown()), "a barra fixa já apareceu no topo")
    await scrollTo(page, 1200)
    await page.waitForFunction(
      () => {
        const element = document.getElementById("ld-bar")
        return element && getComputedStyle(element).transform === "none"
      },
      null,
      { timeout: 3000 },
    )
    expect(await shown(), "a barra fixa não apareceu depois do topo")
    await page.evaluate(() => document.getElementById("fim").scrollIntoView({ block: "center" }))
    await settle(page)
    await page.waitForFunction(
      () => {
        const element = document.getElementById("ld-bar")
        return element && getComputedStyle(element).transform !== "none"
      },
      null,
      { timeout: 3000 },
    )
    expect(!(await shown()), "a barra fixa continuou na chamada final")
  },

  async "no-overflow"(page) {
    if (!(await isNarrow(page))) return
    await signOut(page)
    const width = await page.evaluate(() => {
      const main = document.getElementById("main")
      return { scroll: main.scrollWidth, client: main.clientWidth }
    })
    expect(
      width.scroll <= width.client,
      `a landing rola de lado: ${width.scroll} > ${width.client}`,
    )
  },

  // Revisão do coordenador (R71): sobre a foto o símbolo é o branco inteiro (brandbook: fundo escuro,
  // versão branca); com o topo sólido volta às cores do tema. E o texto do rodapé passa de 4,5:1.
  async "brand-on-dark"(page) {
    await signOut(page)
    const fills = () =>
      page
        .locator(".ld-top .brand-mark")
        .first()
        .evaluate((svg) => [...svg.querySelectorAll("path")].map((p) => getComputedStyle(p).fill))
    const white = "rgb(255, 255, 255)"
    const onPhoto = await fills()
    expect(
      onPhoto.length === 2 && onPhoto.every((fill) => fill === white),
      `símbolo sobre a foto: ${onPhoto.join(", ")}`,
    )
    await scrollTo(page, 1600)
    await page.waitForFunction(() =>
      document.querySelector(".ld-top")?.classList.contains("ld-solid"),
    )
    const solid = await fills()
    const { theme } = await tokens(page, [])
    const threshold = theme === "dark" ? white : "rgb(184, 74, 58)"
    expect(solid[1] === threshold, `abertura do símbolo com o topo sólido: ${solid[1]}`)

    const footerBg = parseColor(await backgroundOf(page, ".ld-footer"))
    for (const selector of [".ld-footer .ld-who", ".ld-footer small"]) {
      const color = parseColor(await computed(page, selector, "color"))
      const value = contrast(over(color, footerBg), footerBg)
      expect(value >= 4.5, `${selector} com ${ratio(value)}:1 sobre o rodapé`)
    }
  },

  async "reduced-motion"(page) {
    await signOut(page)
    await page.emulateMedia({ reducedMotion: "reduce" })
    await reload(page)
    await go(page, "entrar")
    await settle(page)
    const before = await page.evaluate(() => {
      const main = document.getElementById("main")
      const thread = document.getElementById("ld-thread")
      return {
        scroll: main.scrollTop,
        opacities: [...(thread?.querySelectorAll(".ld-msg, .ld-done") || [])].map(
          (element) => getComputedStyle(element).opacity,
        ),
      }
    })
    expect(before.opacities.length === 4, `mensagens da conversa: ${before.opacities.length}`)
    expect(before.scroll === 0, "a página já veio rolada")
    for (const opacity of before.opacities)
      expect(Number(opacity) === 1, `com movimento reduzido, uma mensagem está em ${opacity}`)

    // Sem a preferência, a conversa só se monta ao entrar na tela.
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await reload(page)
    await go(page, "entrar")
    await settle(page)
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll("#ld-thread .ld-msg, #ld-thread .ld-done")].map(
        (element) => getComputedStyle(element).opacity,
      ),
    )
    expect(hidden.length === 4, `mensagens da conversa: ${hidden.length}`)
    expect(
      hidden.some((opacity) => Number(opacity) < 1),
      "a conversa já veio montada sem rolar",
    )
    await page.evaluate(() =>
      document.getElementById("ld-thread").scrollIntoView({ block: "center" }),
    )
    await page.waitForFunction(
      () => {
        const thread = document.getElementById("ld-thread")
        if (!thread?.classList.contains("ld-in")) return false
        return [...thread.querySelectorAll(".ld-msg, .ld-done")].every(
          (element) => getComputedStyle(element).opacity === "1",
        )
      },
      null,
      { timeout: 4000 },
    )
  },
}

await runProof(checkpoints, "round71")
