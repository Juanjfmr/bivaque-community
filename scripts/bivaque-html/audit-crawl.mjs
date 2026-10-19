import { mkdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { KEY, runProof, settle, snapshot } from "./proof-harness.mjs"

// Varredura de funcionamento do protótipo (pedido do usuário em 2026-10-18, antes do back-end real):
// percorre todas as rotas, clica em cada ação visível da tela e, um nível abaixo, em cada ação dos
// diálogos que elas abrem. Cada clique parte do mesmo estado inicial (o armazenamento é restaurado e
// a página recarregada). Registra: ações sem efeito observável, controles não clicáveis, diálogos sem
// saída, erros de JavaScript, destinos "Página indisponível" e as rotas alcançadas por navegação, para
// apontar páginas órfãs. Não reprova: o relatório vai para .visual/bivaque-html-audit/<contexto>.json.
const OUT = resolve(import.meta.dirname, "../../.visual/bivaque-html-audit")
const NAMES = [
  "inicio",
  "comunidade",
  "conversas",
  "conversa",
  "voce",
  "busca",
  "catalogo",
  "desapegos",
  "imoveis",
  "negocios",
  "anuncio",
  "negocio",
  "pergunta",
  "grupo",
  "publicacao",
  "evento",
  "agenda",
  "salvos",
  "meus-anuncios",
  "minhas",
  "guia",
  "pedidos",
  "pedido",
  "dono",
  "entrar",
]
const SCREENS = [
  "inicio",
  "busca",
  "catalogo",
  "desapegos",
  "imoveis",
  "negocios",
  "comunidade",
  "agenda",
  "guia",
  "salvos",
  "meus-anuncios",
  "minhas",
  "voce",
  "conversas",
  "pedidos",
  "dono",
  "dono/filas",
  "dono/cidades",
  "dono/negocios",
  "dono/equipe",
]
function details(s) {
  const c = s.homeCity
  const item = s.items?.find((x) => x.city === c && !x.mine && x.status === "active")
  const home = s.items?.find((x) => x.city === c && !x.mine && x.kind === "imovel")
  const mine = s.items?.find((x) => x.mine)
  const biz = s.biz?.find((x) => x.city === c && x.claimed !== false)
  const gIn = s.groups?.find((x) => x.city === c && x.on && x.posts?.length)
  const gOut = s.groups?.find((x) => x.city === c && !x.on)
  const ask = s.asks?.find((x) => x.city === c && x.answers?.length)
  const askOpen = s.asks?.find((x) => x.city === c && !x.answers?.length)
  const ev = s.events?.find((x) => x.city === c && !x.mine)
  const th = s.threads?.find((x) => !x.deleted)
  const req = (s.requests || s.pedidos || [])[0]
  return [
    item && `anuncio/${item.id}`,
    home && `anuncio/${home.id}`,
    mine && `anuncio/${mine.id}`,
    biz && `negocio/${biz.id}`,
    gIn && `grupo/${gIn.id}`,
    gOut && `grupo/${gOut.id}`,
    gIn && `publicacao/${gIn.id}~${gIn.posts[0].id}`,
    ask && `pergunta/${ask.id}`,
    askOpen && `pergunta/${askOpen.id}`,
    ev && `evento/${ev.id}`,
    th && `conversa/${th.id}`,
    req && `pedido/${req.id}`,
  ].filter(Boolean)
}
const signature = (page) =>
  page.evaluate(() => {
    const h = (s) => {
      let x = 0
      for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0
      return x
    }
    const d = document.querySelector("#dialog")
    const c = document.querySelector("#confirm-dialog")
    const m = document.querySelector("#create-menu")
    return JSON.stringify({
      hash: location.hash,
      dialog: d?.open ? h(d.innerText) : 0,
      confirm: !!c?.open,
      panel: document.querySelector("#filter-panel")?.open
        ? h(document.querySelector("#filter-panel").innerText)
        : 0,
      palette: !!document.querySelector("#palette:not([hidden])"),
      lightbox: !!document.querySelector("#lightbox"),
      menu:
        !!m &&
        !m.hidden &&
        m.getBoundingClientRect().height > 0 &&
        getComputedStyle(m).visibility !== "hidden",
      toast: document.querySelector("#snackbar.show")?.innerText ?? "",
      live: [...document.querySelectorAll("[aria-live],[role=alert],[role=status]")]
        .map((e) => e.textContent.trim())
        .join("|"),
      main: h(document.querySelector("#main")?.innerHTML ?? ""),
      store: h(localStorage.getItem("bivaque-material-web-v3") ?? ""),
      opened: (window.__opened ?? []).length,
      clip: window.__clip ?? 0,
      shared: window.__shared ?? 0,
      fields: h(
        [...document.querySelectorAll("md-outlined-text-field,md-filled-text-field,input,textarea")]
          .map((e) => e.value ?? "")
          .join("|"),
      ),
      body: document.body.className,
      invalid: [
        ...document.querySelectorAll(
          "md-outlined-text-field,md-filled-text-field,md-outlined-select,md-filled-select",
        ),
      ].filter((e) => e.error).length,
    })
  })
const dialogTitle = (page) =>
  page.evaluate(() => {
    const d = document.querySelector("#dialog")
    if (!d?.open) return null
    const hd = d.querySelector('[slot="headline"]')?.cloneNode(true)
    for (const x of hd?.querySelectorAll("md-icon,md-icon-button,[data-action]") ?? []) x.remove()
    return (hd?.textContent || d.dataset.kind || "diálogo").trim().slice(0, 60)
  })
const listTargets = (page, inDialog) =>
  page.locator(inDialog ? "#dialog [data-action]:visible" : "[data-action]:visible").evaluateAll(
    (els, inDialog) => [
      ...new Map(
        els
          .filter(
            (e) =>
              !e.disabled &&
              !e.hasAttribute("disabled") &&
              e.getAttribute("aria-disabled") !== "true",
          )
          .filter(
            (e) =>
              e.dataset.action !== "noop" &&
              !e.hasAttribute("selected") &&
              e.getAttribute("aria-selected") !== "true" &&
              e.getAttribute("aria-pressed") !== "true",
          )
          .filter((e) =>
            inDialog ? true : !e.closest("#dialog,#confirm-dialog,#create-menu,#snackbar"),
          )
          .map((e) => [
            `${e.dataset.action}|${e.dataset.value ?? ""}`,
            [
              e.dataset.action,
              e.dataset.value ?? null,
              (e.innerText || e.getAttribute("aria-label") || "").trim().slice(0, 40),
            ],
          ]),
      ).values(),
    ],
    inDialog,
  )
const selector = (name, value, inDialog) =>
  `${inDialog ? "#dialog " : ""}${value === null ? `[data-action="${name}"]:not([data-value])` : `[data-action="${name}"][data-value=${JSON.stringify(value)}]`}`

async function audit(page) {
  const ctx = `${page.viewportSize().width}`
  const found = {
    dead: [],
    unclickable: [],
    noExit: [],
    errors: [],
    broken: [],
    reached: new Set(),
    clicked: 0,
    dialogs: [],
  }
  let current = "inicio"
  page.on("pageerror", (e) => found.errors.push(`${current}: ${e.message.split("\n")[0]}`))
  page.on("console", (m) => {
    if (m.type() === "error") found.errors.push(`${current}: console: ${m.text().slice(0, 160)}`)
  })
  await page.addInitScript(() => {
    window.__clip = 0
    window.__shared = 0
    navigator.share = async () => {
      window.__shared++
    }
    if (navigator.clipboard)
      navigator.clipboard.writeText = () => {
        window.__clip++
        return Promise.resolve()
      }
  })
  const base = await snapshot(page)
  // Sem a folha dos avisos cobrindo os fluxos.
  base.prefs = { ...(base.prefs || {}), pushAskedAt: Date.now() }
  const states = {
    membro: JSON.stringify(base),
    fora: JSON.stringify({ ...base, signedOut: true }),
    analise: JSON.stringify({
      ...base,
      signedOut: true,
      entry: {
        account: { name: "Carla Teste", email: "carla.teste@exemplo.com", provider: "email" },
        consentAt: Date.now(),
        eligibility: "pending",
        checkedAt: Date.now(),
      },
    }),
    cidade: JSON.stringify({
      ...base,
      signedOut: true,
      entry: {
        account: { name: "Carla Teste", email: "carla.teste@exemplo.com", provider: "email" },
        consentAt: Date.now(),
        eligibility: "verified",
      },
    }),
  }
  const url = page.url().split("#")[0]
  const prepare = async (stateKey, route) => {
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, states[stateKey]])
    await page.goto(`${url}#${route}`)
    await page.reload()
    await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
    await page.evaluate(() => {
      window.scrollTo(0, 0)
      window.dispatchEvent(new Event("scroll"))
    })
    await settle(page)
  }
  const click = async (sel) => {
    const el = page.locator(`${sel}:visible`).first()
    if (!(await el.count())) return "missing"
    if ((await el.getAttribute("aria-disabled")) === "true") return "disabled"
    let ok = await el.click({ timeout: 3000 }).then(
      () => true,
      () => false,
    )
    if (!ok) {
      await page.mouse.move(180, 300)
      await page.mouse.wheel(0, -1200)
      await page.waitForTimeout(500)
      ok = await el.click({ timeout: 3000 }).then(
        () => true,
        () => false,
      )
    }
    await page.waitForTimeout(450)
    return ok ? "ok" : "fail"
  }
  const note = async (label) => {
    const r = await page.evaluate(() => window.Bivaque.inspect().route)
    found.reached.add(r.name)
    if (
      /Página indisponível/.test(
        await page
          .locator("#main")
          .innerText()
          .catch(() => ""),
      )
    )
      found.broken.push(label)
  }
  const sweptDialogs = new Set()
  const plan = [
    ...[...SCREENS, ...details(base)].map((r) => ["membro", r]),
    ["fora", "entrar"],
    ["fora", "entrar/conta"],
    ["fora", "entrar/login"],
    ["fora", "entrar/senha"],
    ["fora", "entrar/convite"],
    ["analise", "entrar/analise"],
    ["cidade", "entrar/cidade"],
  ]
  const only = process.env.AUDIT_ROUTES?.split(",")
  for (const [st, route] of only ? plan.filter(([, r]) => only.includes(r)) : plan) {
    await prepare(st, route)
    current = route
    const targets = await listTargets(page, false)
    for (const [name, value, text] of targets) {
      const label = `${route} → ${name}${value ? `=${value}` : ""}${text ? ` («${text}»)` : ""}`
      await prepare(st, route)
      const before = await signature(page)
      const res = await click(selector(name, value, false))
      if (res === "missing" || res === "disabled") continue
      found.clicked++
      if (res === "fail") {
        found.unclickable.push(label)
        continue
      }
      const after = await signature(page)
      if (before === after) {
        found.dead.push(label)
        continue
      }
      await note(label)
      // Um nível abaixo: diálogos abertos por esta ação, uma vez por título.
      const title = await dialogTitle(page)
      if (!title || sweptDialogs.has(title)) continue
      sweptDialogs.add(title)
      const inner = await listTargets(page, true)
      const hasClose = inner.some(([n]) => /close|cancel|later|back|prev/.test(n))
      await page.keyboard.press("Escape")
      await page.waitForTimeout(450)
      const escCloses = !(await page.evaluate(() => document.querySelector("#dialog")?.open))
      found.dialogs.push({ title, from: label, actions: inner.length, escCloses, hasClose })
      if (!escCloses && !hasClose) found.noExit.push(`${title} (de ${label})`)
      for (const [iname, ivalue, itext] of inner) {
        const ilabel = `${route} → ${name} → [${title}] ${iname}${ivalue ? `=${ivalue}` : ""}${itext ? ` («${itext}»)` : ""}`
        await prepare(st, route)
        await click(selector(name, value, false))
        if ((await dialogTitle(page)) !== title) continue
        const b2 = await signature(page)
        const r2 = await click(selector(iname, ivalue, true))
        if (r2 === "missing" || r2 === "disabled") continue
        found.clicked++
        if (r2 === "fail") {
          found.unclickable.push(ilabel)
          continue
        }
        if (b2 === (await signature(page))) found.dead.push(ilabel)
        else await note(ilabel)
      }
    }
  }
  const orphans = NAMES.filter((n) => !found.reached.has(n))
  const report = { ...found, reached: [...found.reached].sort(), orphans }
  mkdirSync(OUT, { recursive: true })
  writeFileSync(join(OUT, `audit-${ctx}.json`), JSON.stringify(report, null, 2))
  console.log(
    `  auditoria ${ctx}: ${found.clicked} cliques, ${found.dead.length} sem efeito, ${found.unclickable.length} não clicáveis, ${found.noExit.length} diálogos sem saída, ${found.errors.length} erros, ${found.broken.length} destinos indisponíveis, órfãs: ${orphans.join(", ") || "nenhuma"}`,
  )
}

await runProof({ audit }, "audit", {
  allowExternal: ["https://unpkg.com/maplibre-gl@", "https://tiles.openfreemap.org/"],
})
