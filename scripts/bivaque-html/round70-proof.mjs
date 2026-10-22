import { expect, go, runProof, settle } from "./proof-harness.mjs"

// Rodada 70: a pele da marca (ADR-20261020). Confere os tokens nos dois temas, o contraste dos pares
// de texto e fundo, a Brasa restrita à ação, os cantos, o símbolo oficial e o escurecimento das fotos.
const THEMES = {
  light: {
    surface: "#F2F0EB",
    onSurface: "#253033",
    primary: "#253033",
    brasa: "#B84A3A",
    accentText: "#9E3B2C",
    photoDim: "none",
  },
  dark: {
    surface: "#171E20",
    onSurface: "#ECEAE4",
    primary: "#ECEAE4",
    brasa: "#E07A5A",
    accentText: "#E07A5A",
    photoDim: "brightness(0.9)",
  },
}
const CONTRAST_PAIRS = [
  ["--md-sys-color-on-surface", "--md-sys-color-surface"],
  ["--md-sys-color-on-surface-variant", "--md-sys-color-surface"],
  ["--md-sys-color-on-surface", "--md-sys-color-surface-container-lowest"],
  ["--md-sys-color-on-primary", "--md-sys-color-primary"],
  ["--md-sys-color-on-primary-container", "--md-sys-color-primary-container"],
  ["--md-sys-color-on-secondary-container", "--md-sys-color-secondary-container"],
  ["--md-sys-color-on-tertiary-container", "--md-sys-color-tertiary-container"],
  ["--bv-on-brasa", "--bv-brasa"],
  ["--bv-accent-text", "--md-sys-color-surface"],
]

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
  throw new Error(`cor não reconhecida: ${value}`)
}
const sameColor = (a, b) => {
  const x = parseColor(a)
  const y = parseColor(b)
  return x.r === y.r && x.g === y.g && x.b === y.b
}
const luminance = (value) => {
  const { r, g, b } = parseColor(value)
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
const round = (value) => Math.round(value * 100) / 100

async function open(page, hash = "inicio") {
  await go(page, hash)
  await page.waitForFunction(
    () =>
      document.querySelector("#app-shell")?.hidden === false &&
      [...document.querySelectorAll(".brand-mark")].some((el) => el.getClientRects().length),
  )
  await page.evaluate(() => document.fonts.ready)
  await settle(page)
}

const themeOf = (page) => page.evaluate(() => document.documentElement.dataset.theme)

// Lê o valor computado dos tokens no tema atual. A sonda deixa o navegador normalizar o valor em rgb().
async function readTokens(page, names) {
  return page.evaluate((list) => {
    const root = getComputedStyle(document.documentElement)
    const probe = document.createElement("span")
    probe.style.position = "fixed"
    probe.style.left = "-9999px"
    probe.style.width = "1px"
    probe.style.height = "1px"
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

const checkpoints = {
  async "brand-tokens"(page) {
    await open(page)
    const theme = await themeOf(page)
    const table = THEMES[theme]
    expect(table, `tema desconhecido: ${theme}`)
    const { theme: applied, values } = await readTokens(page, [
      "--md-sys-color-surface",
      "--md-sys-color-on-surface",
      "--md-sys-color-primary",
      "--bv-brasa",
      "--bv-accent-text",
    ])
    expect(applied === theme, `tema aplicado ${applied}, esperado ${theme}`)
    const expected = {
      "--md-sys-color-surface": table.surface,
      "--md-sys-color-on-surface": table.onSurface,
      "--md-sys-color-primary": table.primary,
      "--bv-brasa": table.brasa,
      "--bv-accent-text": table.accentText,
    }
    for (const [name, wanted] of Object.entries(expected))
      expect(
        sameColor(values[name].color, wanted),
        `${name}: ${values[name].raw} (${values[name].color}), esperado ${wanted}`,
      )
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready
      await document.fonts.load('16px "Noto Sans"')
      await document.fonts.load('24px "Material Symbols Outlined"')
      return {
        notoSans: document.fonts.check('16px "Noto Sans"'),
        symbols: document.fonts.check('24px "Material Symbols Outlined"'),
      }
    })
    expect(fonts.notoSans, "Noto Sans não carregou")
    expect(fonts.symbols, "Material Symbols Outlined não carregou")
  },

  async contrast(page) {
    await open(page)
    const names = [...new Set(CONTRAST_PAIRS.flat())]
    const { values } = await readTokens(page, names)
    for (const [text, background] of CONTRAST_PAIRS) {
      const ratio = contrast(values[text].color, values[background].color)
      expect(
        ratio >= 4.5,
        `${text} sobre ${background}: ${round(ratio)}:1 (${values[text].raw} sobre ${values[background].raw})`,
      )
    }
  },

  async "brasa-only-on-action"(page) {
    await open(page)
    const theme = await themeOf(page)
    const brasa = THEMES[theme].brasa
    const result = await page.evaluate((wanted) => {
      const parse = (value) => {
        const text = String(value || "").toLowerCase()
        const hex = text.match(/^#([0-9a-f]{3,8})$/)
        if (hex) {
          const d = hex[1]
          const full = d.length < 6 ? [...d].map((x) => x + x).join("") : d
          return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16))
        }
        const rgb = text.match(/^rgba?\(([^)]+)\)$/)
        return rgb
          ? rgb[1]
              .split(/[\s,/]+/)
              .filter(Boolean)
              .slice(0, 3)
              .map(Number)
          : null
      }
      const is = (a, b) => {
        const x = parse(a)
        const y = parse(b)
        return !!x && !!y && x[0] === y[0] && x[1] === y[1] && x[2] === y[2]
      }
      const roots = [document]
      for (let i = 0; i < roots.length; i++)
        for (const el of roots[i].querySelectorAll("*"))
          if (el.shadowRoot) roots.push(el.shadowRoot)
      const elements = roots.flatMap((root) => [...root.querySelectorAll("*")])
      const hostOf = (el) => {
        const root = el.getRootNode()
        return root instanceof ShadowRoot ? root.host : null
      }
      const closestDeep = (el, selector) => {
        for (let node = el; node; ) {
          if (node.matches?.(selector)) return node
          node = hostOf(node) || node.parentElement
        }
        return null
      }
      const visible = (el) => {
        if (!el.getClientRects().length) return false
        const style = getComputedStyle(el)
        return style.visibility !== "hidden" && style.display !== "none"
      }
      const backgroundOffenders = []
      const textOffenders = []
      for (const el of elements) {
        if (!visible(el)) continue
        const style = getComputedStyle(el)
        if (is(style.backgroundColor, wanted)) {
          const allowed = closestDeep(el, "#fab") || closestDeep(el, "md-filled-button")
          if (!allowed) {
            const name =
              typeof el.className === "string" ? el.className.trim().split(/\s+/).join(".") : ""
            backgroundOffenders.push(`${el.tagName.toLowerCase()}${name ? `.${name}` : ""}`)
          }
        }
        const text = (el.textContent || "").trim()
        if (!text || el.children.length) continue
        if (!is(style.color, wanted)) continue
        const allowed =
          closestDeep(el, "#fab") ||
          closestDeep(el, "md-filled-button") ||
          closestDeep(el, ".h1-city") ||
          closestDeep(el, ".city-chip")
        if (!allowed) textOffenders.push(`${el.tagName.toLowerCase()}: ${text.slice(0, 40)}`)
      }
      return { backgroundOffenders, textOffenders }
    }, brasa)
    expect(
      !result.backgroundOffenders.length,
      `fundo Brasa fora da ação: ${result.backgroundOffenders.slice(0, 6).join(", ")}`,
    )
    expect(
      !result.textOffenders.length,
      `texto em Brasa: ${result.textOffenders.slice(0, 6).join(", ")}`,
    )
  },

  async shapes(page) {
    await open(page)
    const radius = (selector) =>
      page.evaluate((sel) => {
        const el = document.querySelector(sel)
        if (!el) return null
        return Number.parseFloat(getComputedStyle(el).borderTopLeftRadius)
      }, selector)
    const card = await radius("#main .photo-card")
    const search = await radius("#home-search")
    const fab = await radius("#fab")
    expect(card === 12, `cartão da Início com ${card}px de canto`)
    expect(search === 12, `campo de busca com ${search}px de canto`)
    expect(fab === 18, `botão Criar com ${fab}px de canto`)
  },

  async symbol(page) {
    await open(page)
    const theme = await themeOf(page)
    const marks = await page.evaluate(() => {
      const svgs = [...document.querySelectorAll(".brand-mark")].filter(
        (el) => el.getClientRects().length,
      )
      return svgs.map((svg) => ({
        tag: svg.tagName.toLowerCase(),
        viewBox: svg.getAttribute("viewBox"),
        rects: svg.querySelectorAll("rect").length,
        paths: [...svg.querySelectorAll("path")].map((path) => ({
          id: path.className.baseVal || path.id,
          fill: getComputedStyle(path).fill,
        })),
      }))
    })
    expect(marks.length > 0, "a marca não aparece na tela")
    const mark = marks[0]
    expect(mark.tag === "svg", `a marca é ${mark.tag}`)
    expect(mark.viewBox === "0 0 100 100", `viewBox ${mark.viewBox}`)
    expect(mark.rects === 0, "a marca tem um rect de fundo")
    expect(mark.paths.length === 2, `a marca tem ${mark.paths.length} paths`)
    const body = mark.paths.find((path) => /body/.test(path.id)) || mark.paths[0]
    const threshold = mark.paths.find((path) => /threshold/.test(path.id)) || mark.paths[1]
    if (theme === "dark") {
      for (const path of mark.paths)
        expect(
          sameColor(path.fill, "#FFFFFF"),
          `no escuro, ${path.id || "um path"} tem fill ${path.fill}`,
        )
    } else {
      expect(sameColor(body.fill, "#253033"), `corpo do símbolo com ${body.fill}`)
      expect(sameColor(threshold.fill, "#B84A3A"), `abertura do símbolo com ${threshold.fill}`)
    }
  },

  async "photo-dim"(page) {
    await open(page)
    const theme = await themeOf(page)
    const filter = await page.evaluate(() => {
      const img = [...document.querySelectorAll("#main .photo-card img, #main .home-row img")].find(
        (el) => el.getClientRects().length,
      )
      return img ? getComputedStyle(img).filter : null
    })
    expect(filter !== null, "a Início não tem foto de cartão")
    const wanted = THEMES[theme].photoDim
    if (wanted === "none") expect(filter === "none", `no claro a foto tem filter ${filter}`)
    else expect(filter === "brightness(0.9)", `no escuro a foto tem filter ${filter}`)
  },
}

await runProof(checkpoints, "round70")
