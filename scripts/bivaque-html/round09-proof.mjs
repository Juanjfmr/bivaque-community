import { statSync } from "node:fs"
import { resolve } from "node:path"
import { expect, go, runProof, settle, snapshot, toast } from "./proof-harness.mjs"

// Rodada 09: melhorias invisíveis. Pacote Material reproduzível com 5 componentes a mais,
// indicador de processamento de fotos, suporte a alto contraste (forced-colors) e limite de peso.
const COMPONENTS_ADDED = [
  "md-input-chip",
  "md-suggestion-chip",
  "md-slider",
  "md-fab",
  "md-secondary-tab",
]
const COMPONENTS_KEPT = [
  "md-assist-chip",
  "md-checkbox",
  "md-chip-set",
  "md-circular-progress",
  "md-dialog",
  "md-divider",
  "md-elevation",
  "md-filled-button",
  "md-filled-field",
  "md-filled-text-field",
  "md-filled-tonal-button",
  "md-filled-tonal-icon-button",
  "md-filter-chip",
  "md-focus-ring",
  "md-icon",
  "md-icon-button",
  "md-item",
  "md-linear-progress",
  "md-list",
  "md-list-item",
  "md-menu",
  "md-menu-item",
  "md-outlined-button",
  "md-outlined-field",
  "md-outlined-select",
  "md-outlined-text-field",
  "md-primary-tab",
  "md-radio",
  "md-ripple",
  "md-select-option",
  "md-switch",
  "md-tabs",
  "md-text-button",
]
// Peso da Rodada 08 (2.798.120 bytes) + folga de 120 KB para os componentes novos.
const SIZE_BUDGET = 2_798_120 + 120 * 1024

const checkpoints = {
  async "material-components-registered"(page) {
    const missing = await page.evaluate(
      (tags) => tags.filter((t) => !customElements.get(t)),
      [...COMPONENTS_KEPT, ...COMPONENTS_ADDED],
    )
    expect(!missing.length, `componentes não registrados: ${missing.join(", ")}`)
    const size = statSync(
      resolve(import.meta.dirname, "../../prototypes/bivaque-html/dist/Bivaque_Material_Web.html"),
    ).size
    expect(size <= SIZE_BUDGET, `HTML acima do orçamento: ${size} > ${SIZE_BUDGET}`)
  },
  async "photo-processing-feedback"(page) {
    // Desacelera o processamento para observar o indicador (fotos grandes no celular).
    await page.evaluate(() => {
      const original = window.createImageBitmap
      window.createImageBitmap = (...args) =>
        new Promise((done) => setTimeout(() => done(original(...args)), 400))
    })
    const png = await page.evaluate(() => {
      const c = document.createElement("canvas")
      c.width = c.height = 32
      c.getContext("2d").fillRect(0, 0, 32, 32)
      return c.toDataURL("image/png").split(",")[1]
    })
    await page.locator('[data-action="create"]:visible').first().click()
    await settle(page)
    await page.locator('#create-menu [data-action="create-item"]').click()
    await settle(page)
    const files = [1, 2, 3].map((n) => ({
      name: `f${n}.png`,
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    }))
    await page.locator("#upload-photos").setInputFiles(files)
    await page.waitForTimeout(150)
    const during = await page.evaluate(() => {
      const p = document.querySelector("#photo-progress")
      return {
        shown: getComputedStyle(p).display !== "none",
        text: p.textContent,
        role: p.getAttribute("role"),
      }
    })
    expect(
      during.shown && /Preparando foto 1 de 3/.test(during.text),
      `indicador ausente: ${JSON.stringify(during)}`,
    )
    expect(during.role === "status", "indicador não anunciado ao leitor de tela")
    await page.waitForTimeout(1800)
    const after = await page.evaluate(() => ({
      hidden:
        getComputedStyle(document.querySelector("#photo-progress md-circular-progress")).display ===
          "none" && !document.querySelector("#photo-progress").textContent.trim(),
      previews: document.querySelectorAll("#photo-previews img").length,
    }))
    expect(
      after.hidden && after.previews === 3,
      `fim do processamento incorreto: ${JSON.stringify(after)}`,
    )
  },
  async "photo-progress-counts-accepted-files"(page) {
    await page.evaluate(() => {
      const original = window.createImageBitmap
      window.createImageBitmap = (...args) =>
        new Promise((done) => setTimeout(() => done(original(...args)), 400))
    })
    const png = await page.evaluate(() => {
      const c = document.createElement("canvas")
      c.width = c.height = 32
      c.getContext("2d").fillRect(0, 0, 32, 32)
      return c.toDataURL("image/png").split(",")[1]
    })
    await page.locator('[data-action="create"]:visible').first().click()
    await settle(page)
    await page.locator('#create-menu [data-action="create-item"]').click()
    await settle(page)
    await page.locator("#upload-photos").setInputFiles([
      { name: "grande.png", mimeType: "image/png", buffer: Buffer.alloc(13 * 1024 * 1024) },
      { name: "ok.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") },
    ])
    await page.waitForTimeout(150)
    const text = await page.locator("#photo-progress").textContent()
    expect(
      /Preparando foto…/.test(text) && !/2 de 2/.test(text),
      `contagem errada com arquivo recusado: "${text}"`,
    )
  },
  async "forced-colors-keeps-meaning"(page) {
    await page.emulateMedia({ forcedColors: "active" })
    await go(page, "inicio")
    const shell = await page.evaluate(() => {
      const active = document.querySelector('.nav-item[aria-current="page"]')
      const pill = document.querySelector("#main .pill")
      return {
        activeMarked: !!active && getComputedStyle(active).textDecorationLine.includes("underline"),
        pillBorder: !!pill && Number.parseFloat(getComputedStyle(pill).borderTopWidth) > 0,
      }
    })
    expect(shell.activeMarked, "aba ativa indistinguível em alto contraste")
    expect(shell.pillBorder, "selo sem contorno em alto contraste")
    const s = await snapshot(page)
    const g = s.groups.find((x) => x.city === s.homeCity && x.on && x.posts.some((p) => p.poll))
    if (g) {
      const p = g.posts.find((y) => y.poll)
      await go(page, `publicacao/${g.id}~${p.id}`)
      const bar = await page.evaluate(() => {
        const b = document.querySelector(".poll-bar")
        if (!b) return null
        const st = getComputedStyle(b)
        return { adjust: st.forcedColorAdjust, bg: st.backgroundColor }
      })
      expect(
        !bar || (bar.adjust === "none" && bar.bg !== "rgba(0, 0, 0, 0)"),
        `barra da enquete some: ${JSON.stringify(bar)}`,
      )
    }
    const item = s.items.find((x) => x.city === s.homeCity && !x.mine)
    await go(page, "catalogo")
    await page.locator(`[data-action="save-item"][data-value="${item.id}"]:visible`).first().click()
    await settle(page)
    const snack = await page.evaluate(() =>
      Number.parseFloat(getComputedStyle(document.querySelector("#snackbar")).borderTopWidth),
    )
    expect((await toast(page)).length > 0 && snack > 0, "aviso sem contorno em alto contraste")
  },
}

await runProof(checkpoints, "round09")
