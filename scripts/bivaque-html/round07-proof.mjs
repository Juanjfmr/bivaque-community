import {
  action,
  dialogKind,
  expect,
  fill,
  go,
  runProof,
  settle,
  snapshot,
  toast,
} from "./proof-harness.mjs"

// Rodada 07: polimento premium. Critérios objetivos: aviso não cobre navegação nem
// Criar; fim de lista não fica escondido; nome acessível em todo controle; imagens com
// alt; aviso anunciado a leitor de tela; mensagens de erro dizem o que corrigir.
const ROUTES = [
  "inicio",
  "catalogo",
  "negocios",
  "comunidade",
  "agenda",
  "guia",
  "salvos",
  "meus-anuncios",
  "voce",
  "conversas",
]
const overlap = (a, b) =>
  a &&
  b &&
  a.width &&
  b.width &&
  !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top)

const checkpoints = {
  async "toast-clears-navigation-and-create"(page) {
    const s = await snapshot(page)
    const item = s.items.find((x) => x.city === s.homeCity && !x.mine)
    await go(page, "catalogo")
    await page.locator(`[data-action="save-item"][data-value="${item.id}"]:visible`).first().click()
    await settle(page)
    const r = await page.evaluate(() => {
      const box = (sel) => {
        const e = document.querySelector(sel)
        if (!e) return null
        const st = getComputedStyle(e)
        if (st.display === "none" || st.visibility === "hidden") return null
        return e.getBoundingClientRect().toJSON()
      }
      return { toast: box("#snackbar.show"), nav: box("#nav"), fab: box("#fab") }
    })
    expect(r.toast, "aviso não apareceu")
    expect(!overlap(r.toast, r.nav), `aviso cobre a navegação: ${JSON.stringify([r.toast, r.nav])}`)
    expect(!overlap(r.toast, r.fab), `aviso cobre o Criar: ${JSON.stringify([r.toast, r.fab])}`)
  },
  async "end-of-content-reachable"(page) {
    const hidden = []
    for (const route of ROUTES) {
      await go(page, route)
      // O app rola dentro de um contêiner próprio, não na janela.
      await page.evaluate(() => {
        let e = document.querySelector("#main")
        while (
          e &&
          !(
            e.scrollHeight > e.clientHeight + 4 &&
            /(auto|scroll)/.test(getComputedStyle(e).overflowY)
          )
        )
          e = e.parentElement
        ;(e ?? document.scrollingElement).scrollTop = 1e7
      })
      await page.waitForTimeout(500)
      const covered = await page.evaluate(() => {
        // "Arrastar para excluir" fica atrás da linha por design e só aparece com o gesto.
        const els = [
          ...document.querySelectorAll("#main [data-action]:not(.swipe-actions [data-action])"),
        ].filter((e) => {
          const r = e.getBoundingClientRect()
          // Só o que está na faixa horizontal da tela (carrosséis rolam para o lado).
          return r.width > 0 && r.height > 0 && r.left >= 0 && r.right <= innerWidth
        })
        // O último controle VISUAL: o de base mais baixa na página rolada até o fim.
        const last = els
          .sort((a, b) => a.getBoundingClientRect().bottom - b.getBoundingClientRect().bottom)
          .at(-1)
        if (!last) return null
        const r = last.getBoundingClientRect()
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return last.contains(top)
          ? null
          : `${last.dataset.action} coberto por ${top?.id || top?.className || top?.tagName}`
      })
      if (covered) hidden.push(`${route}: ${covered}`)
    }
    expect(!hidden.length, `fim da tela escondido: ${hidden.join("; ")}`)
  },
  async "accessible-names-and-alt"(page) {
    const problems = []
    for (const route of ROUTES) {
      await go(page, route)
      const found = await page.evaluate(() => {
        const name = (e) =>
          (
            e.getAttribute("aria-label") ||
            e.getAttribute("label") ||
            e.getAttribute("title") ||
            (e.getAttribute("aria-labelledby") &&
              document.getElementById(e.getAttribute("aria-labelledby"))?.textContent) ||
            e.textContent ||
            ""
          ).trim()
        const visible = (e) => {
          const r = e.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"
        }
        const out = []
        for (const e of document.querySelectorAll(
          "button,a[href],[role=button],md-icon-button,md-filled-button,md-outlined-button,md-text-button,md-filled-tonal-button,md-filter-chip,md-fab,input,textarea",
        )) {
          if (!visible(e) || e.closest("[aria-hidden=true]")) continue
          // Texto do ícone (ligadura) não é nome acessível.
          const own = name(e)
            .replace(/\b[a-z]+(_[a-z]+)+\b/g, "")
            .trim()
          const iconOnly = /^[a-z_]+$/.test(name(e)) && !e.getAttribute("aria-label")
          if (!own || iconOnly)
            out.push(`${e.tagName.toLowerCase()}[${e.dataset.action || e.id || ""}] sem nome`)
        }
        for (const img of document.querySelectorAll("img"))
          if (visible(img) && !img.hasAttribute("alt"))
            out.push(`img sem alt (${img.src.slice(0, 30)})`)
        return out
      })
      for (const f of found) problems.push(`${route}: ${f}`)
    }
    expect(
      !problems.length,
      `${problems.length} problemas: ${[...new Set(problems)].slice(0, 15).join("; ")}`,
    )
  },
  async "wcag-contrast-and-target-size"(page) {
    const problems = []
    for (const route of ROUTES) {
      await go(page, route)
      const found = await page.evaluate(() => {
        const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number)
        const lum = ([r, g, b]) => {
          const f = (channel) => {
            const v = channel / 255
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
          }
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
        }
        // Fundo efetivo: compõe camadas semitransparentes. Se houver foto por baixo
        // (imagem de fundo ou <img> sob o texto), usa o pior caso entre branco e preto.
        const blend = (top, under) => {
          const a = top[3] ?? 1
          return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a))
        }
        const underlays = (e) => {
          const layers = []
          const r = e.getBoundingClientRect()
          for (let x = e; x; x = x.parentElement) {
            const st = getComputedStyle(x)
            const c = rgb(st.backgroundColor)
            const photo =
              st.backgroundImage !== "none" ||
              [...x.querySelectorAll(":scope > img, :scope > * > img")].some((img) => {
                const q = img.getBoundingClientRect()
                return !(
                  q.right <= r.left ||
                  r.right <= q.left ||
                  q.bottom <= r.top ||
                  r.bottom <= q.top
                )
              })
            if (c.length >= 3 && (c[3] ?? 1) > 0) layers.push(c)
            if (c.length >= 3 && (c[3] ?? 1) > 0.95) return [layers]
            if (photo)
              return [
                [...layers, [255, 255, 255, 1]],
                [...layers, [0, 0, 0, 1]],
              ]
          }
          return [[...layers, rgb(getComputedStyle(document.body).backgroundColor)]]
        }
        const out = []
        const inView = (r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight
        for (const e of document.querySelectorAll("#main *, #topbar *, #nav *")) {
          const text = [...e.childNodes].some(
            (n) => n.nodeType === 3 && n.textContent.trim().length > 1,
          )
          if (!text || !inView(e.getBoundingClientRect())) continue
          // Ligadura de ícone (bookmark_border etc.) não é texto lido.
          if (
            e.matches("md-icon, .material-symbols-outlined, [class*=icon]") &&
            /^[a-z_]+$/.test(e.textContent.trim())
          )
            continue
          const st = getComputedStyle(e)
          if (st.visibility === "hidden" || Number(st.opacity) < 0.95) continue
          const fg = rgb(st.color)
          if ((fg[3] ?? 1) < 0.95) continue
          const ratio = Math.min(
            ...underlays(e).map((stack) => {
              const b = stack.reduceRight((under, top) => blend(top, under))
              const [l1, l2] = [lum(fg), lum(b)].sort((x, y) => y - x)
              return (l1 + 0.05) / (l2 + 0.05)
            }),
          )
          const size = Number.parseFloat(st.fontSize)
          const large = size >= 24 || (size >= 18.66 && Number(st.fontWeight) >= 700)
          if (ratio < (large ? 3 : 4.5))
            out.push(`contraste ${ratio.toFixed(2)} "${e.textContent.trim().slice(0, 24)}"`)
        }
        for (const e of document.querySelectorAll(
          "#main [data-action], #nav [data-action], #topbar [data-action], #fab",
        )) {
          const r = e.getBoundingClientRect()
          if (!inView(r) || getComputedStyle(e).display === "inline") continue
          if (r.width < 24 || r.height < 24)
            out.push(`alvo ${Math.round(r.width)}x${Math.round(r.height)} ${e.dataset.action}`)
        }
        return out
      })
      for (const f of found) problems.push(`${route}: ${f}`)
    }
    const unique = [...new Set(problems)]
    expect(!unique.length, `${unique.length} problemas WCAG: ${unique.slice(0, 15).join("; ")}`)
  },
  async "reduced-motion-respected"(page) {
    // Os contextos da prova pedem prefers-reduced-motion: reduce.
    const longest = async () =>
      page.evaluate(() =>
        Math.max(
          0,
          ...document
            .getAnimations()
            .map((a) => Number(a.effect?.getComputedTiming?.().duration) || 0),
        ),
      )
    await page.locator('[data-action="create"]:visible').first().click()
    await page.waitForTimeout(30)
    const menu = await longest()
    await page.keyboard.press("Escape")
    await settle(page)
    await action(page, "city")
    await page.waitForTimeout(30)
    const dialog = await longest()
    expect(
      menu <= 1 && dialog <= 1,
      `animação com movimento reduzido: menu ${menu}ms, diálogo ${dialog}ms`,
    )
  },
  async "toast-announced-to-screen-readers"(page) {
    const live = await page.evaluate(() => {
      const t = document.querySelector("#snackbar")
      return (
        t &&
        (t.getAttribute("role") === "status" ||
          ["polite", "assertive"].includes(t.getAttribute("aria-live")))
      )
    })
    expect(live, "aviso não é anunciado por leitor de tela (sem role=status/aria-live)")
  },
  async "precise-error-messages"(page) {
    await page.locator('[data-action="create"]:visible').first().click()
    await settle(page)
    await page.locator('#create-menu [data-action="create-event"]').click()
    await settle(page)
    await fill(page, "event-title", "Café de boas-vindas")
    await fill(page, "event-place", "Praça da Vila")
    await fill(page, "event-desc", "Encontro para quem chegou na cidade.")
    await page
      .locator("#event-date")
      .fill(await page.evaluate(() => new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10)))
    await action(page, "submit-event")
    expect((await dialogKind(page)) === "editor", "aceitou data passada")
    const msg = await toast(page)
    expect(
      /hoje ou depois/i.test(msg),
      `mensagem genérica para data passada: "${msg.replace(/\s+/g, " ")}"`,
    )
  },
  async "empty-event-date-message"(page) {
    await page.locator('[data-action="create"]:visible').first().click()
    await settle(page)
    await page.locator('#create-menu [data-action="create-event"]').click()
    await settle(page)
    await fill(page, "event-title", "Café de boas-vindas")
    await fill(page, "event-place", "Praça da Vila")
    await fill(page, "event-desc", "Encontro para quem chegou na cidade.")
    await page.locator("#event-date").fill("")
    await action(page, "submit-event")
    const msg = (await toast(page)).replace(/\s+/g, " ")
    expect((await dialogKind(page)) === "editor", "publicou sem data")
    expect(
      /informe a data/i.test(msg) && !/hoje ou depois/i.test(msg),
      `mensagem enganosa para data vazia: "${msg}"`,
    )
  },
}

await runProof(checkpoints, "round07")
