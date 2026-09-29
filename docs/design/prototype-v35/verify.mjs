// Sondas de comportamento do protótipo v35. Independentes do autoteste do arquivo (?selftest=1).
// Uso: node verify.mjs [caminho/Bivaque_v35.html]
// Chromium: PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH (ou o do Playwright instalado).
import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

let chromium
try {
  ;({ chromium } = await import("@playwright/test"))
} catch {
  ;({ chromium } = await import("playwright-core"))
}
const here = dirname(fileURLToPath(import.meta.url))
const FILE = resolve(process.argv[2] || resolve(here, "Bivaque_v35.html"))
if (!existsSync(FILE)) {
  console.error("HTML não encontrado:", FILE)
  process.exit(2)
}
const PAGE_URL = `file://${FILE}`
const exe =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined)
const browser = await chromium.launch(exe ? { executablePath: exe } : {})
const DESK = { width: 1440, height: 900 },
  MOB = { width: 390, height: 844 }
const results = []
const pageErrors = []
// Por padrão as sondas rodam com movimento reduzido (medidas estáveis). MOTION=normal roda a suíte inteira
// com animação e transição ligadas, que é o que a maioria das pessoas recebe.
const MOTION = process.env.MOTION === "normal" ? "no-preference" : "reduce"

let CUR = DESK
const VPS = [
  ["1440", DESK],
  ["390", MOB],
]
const ONCE = new Set(["P27", "P29", "P31"]) // já percorrem os dois viewports por conta própria
async function fresh(vp = CUR) {
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: MOTION })
  const page = await ctx.newPage()
  page.on("pageerror", (e) => pageErrors.push(e.message))
  await page.route(/unsplash\.com|fonts\.(googleapis|gstatic)\.com/, (r) => r.abort())
  await page.goto(PAGE_URL)
  await page.waitForFunction(() => window.__bv)
  return { ctx, page }
}
const S = (page, f, arg) =>
  page.evaluate(
    `(() => { const S = __bv.S; const arg = ${JSON.stringify(arg ?? null)}; return (${f.toString()})(S, arg) })()`,
  )
const go = (page, p, params = {}) => page.evaluate(([p, params]) => __bv.go(p, params), [p, params])
// espera as animações finitas terminarem (as infinitas, como o esqueleto de imagem, não contam)
const settle = (page) =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Number.POSITIVE_INFINITY)
        .map((a) => a.finished.catch(() => {})),
    ),
  )
const view = (page) => page.evaluate(() => document.querySelector("#view").innerText)
const drawer = (page) =>
  page.evaluate(() =>
    document.getElementById("overlay").hidden ? "" : document.getElementById("drawer").innerText,
  )
async function search(page, q) {
  await go(page, "resolver")
  await page.fill("#rq", q)
  await page.press("#rq", "Enter")
  await page.waitForTimeout(60)
}
const A = (page, name, data = {}) =>
  page.evaluate(([n, d]) => __bv.A[n](d, document.createElement("button")), [name, data])
async function probe(id, area, title, fn) {
  if (process.env.ONLY && !process.env.ONLY.split(",").includes(id)) return
  for (const [label, vp] of ONCE.has(id) ? [["1440+390", DESK]] : VPS) {
    CUR = vp
    let ok = false,
      detail = ""
    const before = pageErrors.length
    try {
      const r = await fn()
      ok = r[0]
      detail = r[1] || ""
    } catch (e) {
      ok = false
      detail = `exceção: ${String(e).split("\n")[0]}`
    }
    if (pageErrors.length > before) {
      ok = false
      detail += ` · erro JS: ${pageErrors.slice(before).join("; ").slice(0, 160)}`
    }
    const tag = `${id}@${label}`
    results.push({ id: tag, area, title, ok, detail })
    console.log((ok ? "PASS " : "FAIL ") + tag.padEnd(13) + title + (ok ? "" : `  → ${detail}`))
  }
}
const ROTEIRO = [
  "escola para minha filha",
  "vender o sofá antes da mudança",
  "onde morar chegando em novembro",
  "preciso instalar um split",
  "quero algo para fazer no fim de semana",
]
const AD_WORDS = /Anúncio|Destaque|Patrocinado|Parceiro/

/* ============ CONFIANÇA E PAGO ============ */
await probe(
  "P01",
  "Confiança",
  "anúncio nunca aparece na zona orgânica do Resolver (5 buscas + 4 extras, 3 focos)",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    const qs = [
      ...ROTEIRO,
      "mudança para Brasília",
      "pediatra que atende sábado",
      "instalar ar-condicionado",
      "pediatra em Brasília",
    ]
    for (const f of ["auto", "origin", "destination"]) {
      await page.evaluate((f) => {
        __bv.S.focus = f
      }, f)
      for (const q of qs) {
        await search(page, q)
        const r = await page.evaluate(() => ({
          org: [...document.querySelectorAll("#results .result-zone .result-card")].map((c) => ({
            t: c.querySelector(".card-link").textContent,
            ad: c.classList.contains("is-ad"),
          })),
          sp: [...document.querySelectorAll("#results .sponsored-zone .result-card")].map((c) => ({
            t: c.querySelector(".card-link").textContent,
            badge: c.querySelector(".badge.ad")?.textContent || "",
            why: c.innerText.includes("Por que apareceu"),
          })),
        }))
        r.org.forEach((o) => {
          if (o.ad) bad.push(`${f}|${q}: card ad no orgânico ${o.t}`)
        })
        r.sp.forEach((s) => {
          if (!AD_WORDS.test(s.badge)) bad.push(`${f}|${q}: anúncio sem rótulo ${s.t}`)
          if (s.why) bad.push(`${f}|${q}: anúncio com 'por que apareceu'`)
        })
        const orgT = r.org.map((o) => o.t.replace(/ · .*/, "")),
          spT = r.sp.map((s) => s.t.replace(/ · .*/, ""))
        spT.forEach((t) => {
          if (orgT.some((o) => o && (t.startsWith(o) || o.startsWith(t))))
            bad.push(`${f}|${q}: mesmo objeto nas duas zonas: ${t}`)
        })
      }
    }
    await ctx.close()
    return [!bad.length, bad.slice(0, 4).join(" | ")]
  },
)
await probe(
  "P02",
  "Confiança",
  "catálogos: anúncio só na faixa rotulada; selo e evidência iguais; sem estrelas",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    for (const [p, side] of [
      ["services", "origin"],
      ["housing", "destination"],
      ["events", "origin"],
    ]) {
      await go(page, p, { side })
      const r = await page.evaluate(() => ({
        inList: document.querySelectorAll("#catList .is-ad").length,
        band: [...document.querySelectorAll(".ad-band .is-ad")].map(
          (c) => c.querySelector(".badge.ad")?.textContent || "SEM",
        ),
        why: [...document.querySelectorAll(".is-ad")].filter((c) =>
          c.innerText.includes("Por que apareceu"),
        ).length,
      }))
      if (r.inList) bad.push(`${p}: anúncio na lista`)
      if (r.band.some((b) => !AD_WORDS.test(b))) bad.push(`${p}: faixa sem rótulo`)
      if (r.why) bad.push(`${p}: anúncio com 'por que apareceu'`)
    }
    await go(page, "services", { side: "origin" })
    const s = await page.evaluate(() => ({
      cards: document.querySelectorAll(".service-card").length,
      seals: document.querySelectorAll(".service-card .seal").length,
      ev: [...document.querySelectorAll(".service-card")].every((c) =>
        /deu certo|deram certo|parcial|não deu|não deram|ninguém contratou|Sem evidência/.test(
          c.innerText,
        ),
      ),
      stars: /★|avaliações/.test(document.querySelector("#view").innerText),
    }))
    if (s.cards !== s.seals) bad.push(`selo em ${s.seals}/${s.cards} prestadores`)
    if (!s.ev) bad.push("prestador sem linha de evidência")
    if (s.stars) bad.push("estrelas/avaliações presentes")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P03",
  "Confiança",
  "ficha do prestador: resultado, recência e vínculo (contratou × mencionou); zero e poucos relatos",
  async () => {
    const { ctx, page } = await fresh()
    await A(page, "openObj", { dtype: "provider", id: "p-frio" })
    const t = await drawer(page)
    const bad = []
    if (!/não deu certo/.test(t)) bad.push("evidência negativa não aparece")
    if (!/contrataram/.test(t) || !/só ouviu falar/.test(t))
      bad.push("vínculo contratou×mencionou ausente")
    if (!/mais recente [a-z]{3}\/\d{2}/.test(t)) bad.push("recência ausente")
    await A(page, "closeDrawer")
    await go(page, "services", { side: "destination" })
    const v = await view(page)
    if (!/Sem evidência ainda/.test(v)) bad.push("estado zero (sem evidência) ausente")
    if (!/Poucos relatos/.test(v)) bad.push("badge 'Poucos relatos' ausente")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P03b",
  "Confiança",
  "selo 'Recomendado' só com maioria de contratações bem-sucedidas; quem só ouviu falar não conta como resultado",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await go(page, "services", { side: "origin" })
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll(".service-card")].map((c) => ({
        n: c.querySelector(".card-link").textContent,
        rec: /Recomendado pela comunidade/.test(c.innerText),
        ev: c.querySelector(".trust").innerText,
        hired: c.querySelectorAll(".trust")[1].innerText,
      })),
    )
    const frio = rows.find((r) => /Frio Norte/.test(r.n)),
      manut = rows.find((r) => /Manutenção/.test(r.n))
    if (frio.rec) bad.push("Frio Norte (1 de 2 contratações deu errado) recebeu 'Recomendado'")
    if (!manut.rec) bad.push("Manutenção & Reparos (2 de 2) deveria ser recomendada")
    if (/2 deram certo/.test(frio.ev)) bad.push(`mencionou contado como resultado: ${frio.ev}`)
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P04",
  "Monetização",
  "benefício: condição, validade, resgate persistente e estado vencido",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await A(page, "openObj", { dtype: "benefit", id: "b-gym" })
    let t = await drawer(page)
    if (!/Condições/.test(t) || !/Validade/.test(t)) bad.push("condição/validade ausentes")
    await page.click("#drawer [data-act=redeem]")
    t = await drawer(page)
    if (!/BVQ-/.test(t)) bad.push("código não gerado")
    await page.reload()
    await page.waitForFunction(() => window.__bv)
    await A(page, "openObj", { dtype: "benefit", id: "b-gym" })
    if (!/BVQ-/.test(await drawer(page))) bad.push("código não persistiu")
    await A(page, "closeDrawer")
    await A(page, "advanceToMove")
    await A(page, "openObj", { dtype: "benefit", id: "b-food" })
    t = await drawer(page)
    if (!/Vencido/.test(t)) bad.push("benefício vencido não marcado")
    if (await page.locator("#drawer [data-act=redeem]").count())
      bad.push("benefício vencido ainda resgatável")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P05",
  "Monetização",
  "painel do prestador: pedido recebido → proposta chega a quem pediu, com a mesma ficha pública",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await go(page, "services", { side: "origin" })
    await page.locator(".service-card:not(.is-ad) .cta").first().click()
    await page.selectOption("#q-need", "new")
    await page.click("#drawer button[type=submit]")
    await page.waitForTimeout(80)
    const q = await S(page, (s) => s.quotes.at(-1))
    const nid = q.needId
    await go(page, "provider")
    if (!/Membro da rede/.test(await view(page))) bad.push("pedido não aparece no painel")
    await page.fill(`#pp-${q.id}`, "700")
    await page.fill(`#pd-${q.id}`, "5")
    await page.click(`form[data-id="${q.id}"] button[type=submit]`)
    const n = await S(page, (s, id) => s.needs.find((x) => x.id === id), nid)
    if (!n.proposals.length) bad.push("proposta não chegou à necessidade")
    const notif = await page.evaluate(() =>
      __bv.deriveNotifs().some((x) => /proposta/.test(x.title)),
    )
    if (!notif) bad.push("sem notificação de proposta")
    await go(page, "provider")
    const panel = await page.evaluate(
      () => document.querySelector(".profile-card:nth-child(2) p:nth-of-type(2)").innerText,
    )
    await go(page, "services", { side: "origin" })
    const card = await page.evaluate(
      () =>
        [...document.querySelectorAll(".service-card")]
          .find((c) => /Manutenção/.test(c.innerText))
          .querySelector(".trust").innerText,
    )
    if (panel !== card) bad.push(`ficha do painel ≠ ficha pública ("${panel}" vs "${card}")`)
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)

/* ============ NECESSIDADE, PEDIDO, PROPOSTA, OFERTA ============ */
await probe(
  "P06",
  "Necessidade",
  "as 5 buscas do roteiro criam 0 necessidades; 'Acompanhar' cria exatamente 1",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    const n0 = await S(page, (s) => s.needs.length)
    for (const q of ROTEIRO) await search(page, q)
    const n1 = await S(page, (s) => s.needs.length)
    if (n1 !== n0) bad.push(`necessidades ${n0} → ${n1} após buscar`)
    if (!(await page.locator("text=Acompanhar esta busca").count())) {
      bad.push("botão 'Acompanhar' não existe: a busca já foi tratada como necessidade")
      await ctx.close()
      return [false, bad.join(" | ")]
    }
    await page.click("text=Acompanhar esta busca")
    const n2 = await S(page, (s) => s.needs.length)
    if (n2 !== n0 + 1) bad.push(`acompanhar: ${n0} → ${n2}`)
    if (await page.locator("text=Acompanhar esta busca").count())
      bad.push("botão 'Acompanhar' continua depois de acompanhar")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P07",
  "Necessidade",
  "orçamento pelo catálogo não toca na necessidade de mudança; conversa ancora na escolhida",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    const b = await S(page, (s) => JSON.stringify(s.needs.find((n) => n.id === "n-move")))
    await go(page, "services", { side: "origin" })
    await page.locator(".ad-band .cta").first().click()
    if (!/Ligar a qual necessidade/.test(await drawer(page)))
      bad.push("sem escolha explícita de necessidade")
    await page.selectOption("#q-need", "new")
    await page.click("#drawer button[type=submit]")
    await page.waitForTimeout(80)
    const a = await S(page, (s) => JSON.stringify(s.needs.find((n) => n.id === "n-move")))
    if (a !== b) bad.push("n-move foi alterada")
    const anchor = await page.evaluate(() => document.querySelector(".anchor-card").innerText)
    if (/Mudança Manaus/.test(anchor))
      bad.push(`conversa ancorada na mudança: ${anchor.replace(/\n/g, " ")}`)
    await go(page, "messages", { id: "c-house" })
    if (!/Nenhuma necessidade ligada/.test(await view(page)))
      bad.push("conversa sem necessidade não é declarada")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P08",
  "Necessidade",
  "3 propostas comparáveis; escolher cria 'contratei' e conversa; deu certo? aparece depois de 3 dias",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await A(page, "openProposals", { id: "n-move" })
    const t = await drawer(page)
    if ((await page.locator("#drawer .proposal .price").count()) !== 3)
      bad.push("não mostra 3 propostas com preço")
    if (!/dias/.test(t) || !/Seguro|seguro/.test(t)) bad.push("prazo/seguro ausentes")
    await page.locator("#drawer [data-act=chooseProposal]").nth(2).click()
    await page.waitForTimeout(80)
    const n = await S(page, (s) => s.needs.find((x) => x.id === "n-move"))
    if (n.status !== "contracted") bad.push(`status ${n.status}`)
    if (n.proposals.filter((p) => p.status === "declined").length !== 2)
      bad.push("demais não recusadas")
    await A(page, "advance", { n: 3 })
    if (!(await page.evaluate(() => __bv.deriveNotifs().some((x) => /Deu certo\?/.test(x.title)))))
      bad.push("sem lembrete 'deu certo?' após 3 dias")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P09",
  "Criação",
  "Contribuir: infere direção e tipo, você corrige, vê prévia e o anúncio publicado aparece (4 tipos)",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    const cases = [
      ["quero vender meu sofá antes da mudança", "offer", "sell"],
      ["quero alugar meu apartamento", "offer", "housing"],
      ["sou eletricista e quero oferecer serviço", "offer", "service"],
      ["vou organizar uma corrida no sábado", "offer", "event"],
      ["alguém conhece pediatra?", "ask", null],
    ]
    for (const [q, dir, type] of cases) {
      await A(page, "openComposer")
      await page.fill("#cmp-q", q)
      await page.click("#drawer button[type=submit]")
      const d = await page.evaluate(() => ({
        dir: document.querySelector("#drawer [data-act=cmpDir][aria-pressed=true]")?.dataset.v,
        type: document.querySelector("#drawer [data-act=cmpType][aria-pressed=true]")?.dataset.v,
      }))
      if (d.dir !== dir || (type && d.type !== type)) bad.push(`${q}: inferiu ${d.dir}/${d.type}`)
      await A(page, "closeDrawer")
    }
    const mk0 = await page.evaluate(() => __bv.S.own.market.length)
    await A(page, "openComposer")
    await page.fill("#cmp-q", "quero vender meu sofá antes da mudança")
    await page.click("#drawer button[type=submit]")
    await page.click("#drawer [data-act=composeGo]")
    await page.fill("#o-price", "700")
    await page.click("#drawer button[type=submit]")
    if (!/Prévia/.test(await drawer(page))) bad.push("sem prévia")
    if ((await page.evaluate(() => __bv.S.own.market.length)) !== mk0)
      bad.push("publicou antes da prévia")
    await page.click("#drawer [data-act=offerPublish]")
    await page.waitForTimeout(80)
    if ((await page.evaluate(() => __bv.S.own.market.length)) !== mk0 + 1)
      bad.push("anúncio não foi criado")
    if (!/Seu anúncio/.test(await view(page))) bad.push("anúncio não aparece em Desapegos")
    const n = await S(page, (s) => s.needs[0])
    if (n.dir !== "offer" || "responses" in n) bad.push("necessidade de oferta inconsistente")
    // serviço fica em verificação e não entra no catálogo
    await A(page, "openOffer", { type: "service" })
    await page.fill("#o-name", "Eletricista Teste")
    await page.fill("#o-area", "Flores")
    await page.click("#drawer button[type=submit]")
    await page.click("#drawer [data-act=offerPublish]")
    await page.waitForTimeout(80)
    await go(page, "services", { side: "origin" })
    if (/Eletricista Teste/.test(await view(page))) bad.push("serviço apareceu sem verificação")
    if ((await S(page, (s) => s.own.provider)).status !== "verification")
      bad.push("serviço não ficou em verificação")
    // imóvel e evento aparecem
    await A(page, "openOffer", { type: "housing" })
    await page.fill("#o-bairro", "Adrianópolis")
    await page.fill("#o-rent", "2500")
    await page.click("#drawer button[type=submit]")
    await page.click("#drawer [data-act=offerPublish]")
    await page.waitForTimeout(80)
    if (!/Adrianópolis/.test(await view(page))) bad.push("imóvel publicado não aparece")
    await A(page, "openOffer", { type: "event" })
    await page.fill("#o-title", "Churrasco da Vila")
    await page.fill("#o-place", "Salão")
    await page.click("#drawer button[type=submit]")
    await page.click("#drawer [data-act=offerPublish]")
    await page.waitForTimeout(80)
    if (!/Churrasco da Vila/.test(await view(page))) bad.push("evento publicado não aparece")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)

/* ============ TRANSIÇÃO E LADO ============ */
await probe(
  "P10",
  "Contexto",
  "alternar o foco muda Home e Resolver; cidade citada vence o foco",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    const snap = async () => {
      await go(page, "home")
      return page.evaluate(() =>
        [...document.querySelectorAll(".side-col, .feed, .benefit-panel")]
          .map((e) => e.innerText)
          .join("|"),
      )
    }
    const auto = await snap()
    await A(page, "setFocus", { focus: "origin" })
    const o = await snap()
    await A(page, "setFocus", { focus: "destination" })
    const d = await snap()
    if (auto === o || o === d || auto === d)
      bad.push("Home não muda entre automático/saída/chegada")
    const zone = async (q) => {
      await search(page, q)
      return page.evaluate(() => document.querySelector(".result-zone-title")?.innerText || "")
    }
    await A(page, "setFocus", { focus: "origin" })
    const zo = await zone("pediatra que atende sábado")
    await A(page, "setFocus", { focus: "destination" })
    const zd = await zone("pediatra que atende sábado")
    if (!/Manaus/i.test(zo) || !/Brasília/i.test(zd))
      bad.push(`resolver não muda com o lado: "${zo}" / "${zd}"`)
    await A(page, "setFocus", { focus: "origin" })
    const zm = await zone("pediatra em Brasília")
    if (!/Brasília/i.test(zm)) bad.push(`cidade citada não venceu o foco: ${zm}`)
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P11",
  "Resolver",
  "casos âncora devolvem resultados heterogêneos (mudança, ar-condicionado, saúde em Brasília)",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    for (const [q, min] of [
      ["mudança para Brasília", 3],
      ["mudança Manaus → Brasília", 3],
      ["instalar ar-condicionado", 2],
      ["pediatra em Brasília", 2],
      ["documentos ao chegar", 2],
    ]) {
      await search(page, q)
      const r = await page.evaluate(() => ({
        n: document.querySelectorAll("#results .result-zone .result-card").length,
        types: [
          ...new Set(
            [...document.querySelectorAll("#results .result-zone .badge:not(.ad):not(.good)")].map(
              (b) => b.innerText,
            ),
          ),
        ],
      }))
      if (r.n < min) bad.push(`${q}: ${r.n} resultados`)
      if (r.types.length < 2 && !/documentos/.test(q)) bad.push(`${q}: só um tipo (${r.types})`)
    }
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P12",
  "Resolver",
  "esclarecimento muda o resultado; vazio útil; sem estrelas de 'humor'",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    const firsts = []
    for (let i = 0; i < 3; i++) {
      await search(page, "escola")
      await page.locator(".clarify-state .filter").nth(i).click()
      await page.waitForTimeout(50)
      firsts.push(
        await page.evaluate(() =>
          [...document.querySelectorAll("#results .result-zone .card-link")]
            .map((c) => c.textContent)
            .join("|"),
        ),
      )
    }
    if (new Set(firsts).size !== 3) bad.push("as 3 faixas etárias não mudam o resultado")
    await search(page, "preciso de um advogado")
    if (!/Ainda não encontrei/.test(await view(page))) bad.push("busca sem base não declara vazio")
    await search(page, "humor")
    if (!/Ainda não encontrei/.test(await view(page))) bad.push("'humor' inventou resultado")
    await search(page, "mudanca")
    await page.locator(".clarify-state .filter").first().click()
    await page.waitForTimeout(50)
    if (/Ainda não encontrei/.test(await view(page)))
      bad.push("clarificação de 'mudanca' cai no vazio")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P13",
  "Contexto",
  "Home muda com a fase e com a transferência; várias transferências; cidade sem base = cold start",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await go(page, "home")
    const c0 = await page.locator(".side-col").count()
    await A(page, "advanceToMove")
    await go(page, "home")
    const c1 = await page.locator(".side-col").count()
    const t1 = await view(page)
    if (!(c0 === 2 && c1 === 1)) bad.push(`colunas ${c0} → ${c1}`)
    if (!/Chegada · Brasília/.test(t1)) bad.push("após chegar, a Home não prioriza a chegada")
    await page.evaluate(() => {
      __bv.S.transitions.push({
        id: "tn",
        from: "brasilia",
        to: "natal",
        date: "2027-03-01",
        adults: 2,
        kids: 1,
      })
      __bv.S.activeT = "tn"
    })
    await go(page, "home")
    if (!/Ainda não há dados de Natal/.test(await view(page)))
      bad.push("Home sem cold start para Natal")
    await go(page, "services", { side: "destination" })
    if (!/Ainda não há dados de Natal/.test(await view(page))) bad.push("catálogo sem cold start")
    await search(page, "escola para minha filha")
    if (!/Ainda não há dados de Natal/.test(await view(page))) bad.push("Resolver sem cold start")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P14",
  "Contexto",
  "editar transferência: destino e data mudam a fase; origem = destino é recusado",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await A(page, "editT", { id: "t1" })
    await page.selectOption("#t-to", "natal")
    await page.fill("#t-date", "2026-10-05")
    await page.click("#drawer button[type=submit]")
    await page.waitForTimeout(80)
    const t = await S(page, (s) => s.transitions[0])
    if (t.to !== "natal") bad.push("destino não mudou")
    if ((await page.evaluate(() => __bv.phaseOf())) !== "moving")
      bad.push("fase não derivou da data")
    await A(page, "editT", { id: "t1" })
    await page.selectOption("#t-to", "manaus")
    await page.click("#drawer button[type=submit]")
    await page.waitForTimeout(80)
    if ((await S(page, (s) => s.transitions[0].to)) === "manaus")
      bad.push("aceitou origem = destino")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P15",
  "Desapegos/Privacidade",
  "nenhuma data exata de terceiros em tela; Desapegos invertido por lado",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    const exact =
      /\b\d{1,2}\/\d{1,2}\b|\b\d{1,2} (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b/i
    for (const [p, params] of [
      ["home", {}],
      ["market", { side: "origin" }],
      ["market", { side: "destination" }],
      ["messages", { id: "c-sofa" }],
    ]) {
      await go(page, p, params)
      const v = (await view(page))
        .split("\n")
        .filter((l) => /retirada|Retirada|Desapego|sofá|Sofá/.test(l))
      v.forEach((l) => {
        if (exact.test(l)) bad.push(`${p}: data exata em "${l.slice(0, 60)}"`)
      })
    }
    await go(page, "market", { side: "origin" })
    const o = await view(page)
    if (!/chegando a Manaus procuram/i.test(o))
      bad.push("lado da saída não mostra a demanda de quem chega")
    if (/você está saindo/.test(o))
      bad.push("motivo invertido ('você está saindo') no lado da saída")
    await go(page, "market", { side: "destination" })
    const d = await view(page)
    if (!/quem sai de Brasília/.test(d)) bad.push("lado da chegada não mostra a oferta de quem sai")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)

/* ============ PUBLICAÇÃO, INGRESSO, CONSENTIMENTO ============ */
await probe(
  "P16",
  "Comunidade",
  "perguntar exige entrar (com consentimento), editar, ver prévia e confirmar; nada por efeito colateral",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await search(page, "escola para minha filha")
    const th0 = await S(page, (s) => s.threads.length)
    await page.locator(".tail button", { hasText: "Perguntar a quem já viveu" }).click()
    if (!/Regra de entrada/.test(await drawer(page))) bad.push("não mostrou a regra de entrada")
    if ((await S(page, (s) => s.membership.arrivalsBsb)) !== null) {
      bad.push("entrou sem confirmar")
      await ctx.close()
      return [false, bad.join(" | ")]
    }
    await page.click("#drawer button[type=submit]")
    if ((await S(page, (s) => s.membership.arrivalsBsb)) !== null)
      bad.push("entrou sem marcar o consentimento")
    await page.check("#drawer input[name=ok]")
    await page.click("#drawer button[type=submit]")
    await page.waitForTimeout(100)
    if ((await S(page, (s) => s.membership.arrivalsBsb)) !== "member")
      bad.push("não entrou após confirmar")
    if ((await S(page, (s) => s.threads.length)) !== th0) bad.push("publicou ao entrar")
    const val = await page.inputValue("#ask-text")
    if (!/escola/.test(val)) bad.push("texto da busca não veio para edição")
    await page.fill("#ask-text", "Escolas com vaga no meio do ano para 8 anos?")
    await page.click("#drawer button[type=submit]")
    if (!/Prévia da pergunta/.test(await drawer(page))) bad.push("sem prévia")
    if ((await S(page, (s) => s.threads.length)) !== th0) bad.push("publicou antes de confirmar")
    await page.click("#drawer [data-act=askPublish]")
    await page.waitForTimeout(80)
    const th = await S(page, (s) => s.threads[0])
    if (th?.title !== "Escolas com vaga no meio do ano para 8 anos?")
      bad.push("pergunta publicada difere do texto editado")
    await go(page, "resolver")
    await search(page, "preciso de um advogado de família")
    await page.click(".empty-state .primary")
    if ((await page.inputValue("#ask-text")) !== "preciso de um advogado de família")
      bad.push("vazio não abre texto editável")
    const th2 = await S(page, (s) => s.threads.length)
    if (th2 !== th0 + 1) bad.push("vazio publicou por efeito colateral")
    await A(page, "closeDrawer")
    await A(page, "openObj", { dtype: "ref", id: "r-bsb-bairros" })
    await page.click("#drawer [data-act=openAsk]")
    if ((await page.inputValue("#ask-text")) !== "")
      bad.push("'perguntar algo específico' vem preenchido com o título da referência")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P17",
  "Comunidade",
  "regra de ingresso aplicada (transição elegível × pedido) e leitura bloqueada a quem não é membro",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await go(page, "community", { id: "arrivalsBsb" })
    const v = await view(page)
    if (!/regra de entrada/.test(v)) bad.push("não mostra a regra")
    if (/Escolas para criança de 8 anos/.test(v)) bad.push("vaza pergunta a quem não é membro")
    await A(page, "openJoin", { id: "arrivalsBsb" })
    if (!/Entrar/.test(await page.locator("#drawer button[type=submit]").innerText()))
      bad.push("transição elegível deveria poder entrar")
    await A(page, "closeDrawer")
    await page.evaluate(() => {
      __bv.S.transitions[0].to = "natal"
    })
    await A(page, "openJoin", { id: "arrivalsBsb" })
    if (!/Pedir entrada/.test(await page.locator("#drawer button[type=submit]").innerText()))
      bad.push("sem transição elegível deveria ser pedido")
    await page.check("#drawer input[name=ok]")
    await page.click("#drawer button[type=submit]")
    await page.waitForTimeout(80)
    if ((await S(page, (s) => s.membership.arrivalsBsb)) !== "pending")
      bad.push("pedido não ficou pendente")
    await A(page, "advance", { n: 3 })
    if ((await S(page, (s) => s.membership.arrivalsBsb)) !== "member")
      bad.push("aprovação simulada não ocorreu")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P18",
  "Confiança",
  "fechar necessidade com nome de criança não deixa o nome em nenhuma tela pública; prestador não vem preenchido errado",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await search(page, "escola para minha filha Sofia de 8 anos")
    await page.click("text=Acompanhar esta busca")
    await go(page, "home")
    await page.locator(".continue-card .card-link").first().click()
    await page.click("#drawer [data-act=openResolution]")
    const sel = await page.inputValue("#rs-prov")
    if (sel === "p-mud") bad.push("prestador pré-selecionado errado (Manaus Mudanças)")
    await page.check("#drawer input[value=no]")
    await page.click("#drawer button[type=submit]")
    await page.waitForTimeout(80)
    const ev = await S(page, (s) => s.evidence[0])
    if ("title" in ev || "query" in ev || JSON.stringify(ev).includes("Sofia"))
      bad.push("evidência guarda texto livre")
    // entra nas duas comunidades para ver todas as telas públicas
    await page.evaluate(() => {
      __bv.S.membership.arrivalsBsb = "member"
    })
    const pub = [
      "community:ajuricaba",
      "community:arrivalsBsb",
      "services:origin",
      "services:destination",
      "housing:origin",
      "housing:destination",
      "market:origin",
      "market:destination",
      "events:origin",
      "events:destination",
      "benefits:origin",
      "refs:origin",
      "refs:destination",
      "explorar",
      "provider",
    ]
    for (const k of pub) {
      const [p, x] = k.split(":")
      await go(page, p, p === "community" ? { id: x } : x ? { side: x } : {})
      if (/Sofia/.test(await view(page))) bad.push(`'Sofia' em ${k}`)
    }
    for (const pid of ["p-mud", "p-amazon", "p-bsb-mud"]) {
      await A(page, "openEvidence", { id: pid })
      if (/Sofia/.test(await drawer(page))) bad.push(`'Sofia' em evidência de ${pid}`)
      await A(page, "closeDrawer")
    }
    for (const r of await page.evaluate(() => __bv.DB.refs.map((r) => r.id))) {
      await A(page, "openObj", { dtype: "ref", id: r })
      if (/Sofia/.test(await drawer(page))) bad.push(`'Sofia' na referência ${r}`)
      await A(page, "closeDrawer")
    }
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P19",
  "Comunidade",
  "pergunta parecida oferece a existente antes de publicar (dedupe)",
  async () => {
    const { ctx, page } = await fresh()
    await A(page, "openAsk", { comm: "ajuricaba", q: "" })
    await page.fill("#ask-text", "Qual o melhor bairro de Brasília para família com crianças?")
    await page.click("#drawer button[type=submit]")
    const t1 = await drawer(page)
    await A(page, "askBack")
    await page.fill("#ask-text", "Existe cinema com sessão adaptada para autismo?")
    await page.click("#drawer button[type=submit]")
    const t2 = await drawer(page)
    await ctx.close()
    return [
      /Já existe uma pergunta parecida/.test(t1) && /Prévia da pergunta/.test(t2),
      `dedupe=${/Já existe/.test(t1)} · nova=${/Prévia/.test(t2)}`,
    ]
  },
)
await probe(
  "P20",
  "Pessoa",
  "consentimento só pelos temas aceitos; 'pedir ajuda' deixa rastro ligado à necessidade e aceite chega depois",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await A(page, "openPeople", { q: "veterinário 24h no Sudoeste" })
    const t = await drawer(page)
    if (/Renata|Família M|Carlos|Aline/.test(t)) bad.push("mostrou pessoa sem tema aceito")
    if (!/Ninguém aceitou/.test(t)) bad.push("sem estado vazio honesto")
    await A(page, "closeDrawer")
    await search(page, "escola para minha filha")
    const card = await page.evaluate(
      () =>
        [...document.querySelectorAll("#results .result-card")].find((c) =>
          /Pessoa/.test(c.innerText),
        )?.innerText || "",
    )
    if (!/Aceitou responder sobre: escolas/.test(card) || /veterin/.test(card))
      bad.push("card da pessoa sem o tema realmente aceito")
    await page.locator("#results .result-card", { hasText: "Renata" }).locator(".card-link").click()
    await page.click("#drawer [data-act=openHelp]")
    const opts = await page.$$eval("#hp-topic option", (o) => o.map((x) => x.textContent))
    if (opts.some((x) => /veterin|pediatra/.test(x))) bad.push("oferece tema não aceito")
    await page.selectOption("#hp-need", "new")
    await page.click("#drawer button[type=submit]")
    await page.waitForTimeout(80)
    const hr = await S(page, (s) => ({ h: s.helpReqs.at(-1), c: s.convs[0] }))
    if (!hr.h || !hr.c || hr.c.status !== "pending" || !hr.c.needId)
      bad.push("pedido sem conversa pendente ligada a necessidade")
    await A(page, "advance", { n: 3 })
    const c = await S(page, (s) => s.convs.find((x) => x.kind === "person"))
    if (c.status !== "active") bad.push("aceite simulado não abriu a conversa")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)

/* ============ MEMÓRIA, PERSISTÊNCIA, NOTIFICAÇÕES ============ */
await probe(
  "P21",
  "Memória",
  "referência com curador nomeado; evidência compartilhada aciona revisão; resposta que ajudou conta",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await A(page, "openObj", { dtype: "ref", id: "r-mao-mudanca" })
    let t = await drawer(page)
    if (!/Helena R\./.test(t)) bad.push("sem curador nomeado")
    if (!/2\/3/.test(t)) bad.push("progresso inicial ≠ 2/3")
    await A(page, "closeDrawer")
    await A(page, "openResolution", { id: "n-move" })
    await page.selectOption("#rs-prov", "p-mud")
    await page.click("#drawer button[type=submit]")
    await page.waitForTimeout(80)
    await A(page, "openObj", { dtype: "ref", id: "r-mao-mudanca" })
    t = await drawer(page)
    if (!/Em revisão pela curadoria/.test(t)) bad.push("3ª evidência não abriu revisão")
    await A(page, "closeDrawer")
    // evidência privada não conta
    await A(page, "openResolution", { id: "n-split" })
    await page.uncheck("#drawer input[name=share]")
    const before = await S(page, (s) => JSON.stringify(s.refExtra))
    await page.click("#drawer button[type=submit]")
    await page.waitForTimeout(60)
    if (before !== (await S(page, (s) => JSON.stringify(s.refExtra))))
      bad.push("evidência privada contou para a referência")
    // pergunta própria: resposta que ajudou
    await A(page, "openObj", { dtype: "thread", id: "t-neigh" })
    await page.locator("#drawer [data-act=resolveThread]").first().click()
    await page.waitForTimeout(60)
    if (!(await S(page, (s) => s.resolvedThreads["t-neigh"])))
      bad.push("não marcou resposta que ajudou")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P22",
  "Memória",
  "salvos, presença, resposta e mensagem persistem depois de recarregar",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await A(page, "toggleSave", { type: "market", id: "m-mao-nb" })
    await A(page, "rsvp", { id: "e-barco", set: "going" })
    await page.evaluate(() =>
      __bv.A.postReply({ id: "t-ped" }, { text: { value: "Confirmei com a Dra. Beatriz." } }),
    )
    await page.evaluate(() =>
      __bv.A.sendMsg({ id: "c-sofa" }, { text: { value: "Posso retirar sábado?" } }),
    )
    await page.reload()
    await page.waitForFunction(() => window.__bv)
    await go(page, "profile")
    if (!/Notebook Dell/.test(await view(page))) bad.push("salvo não voltou em Você")
    await go(page, "events", { side: "origin" })
    if (!/Você vai/.test(await view(page))) bad.push("presença não voltou")
    await go(page, "community", { id: "ajuricaba" })
    await page.locator(".question", { hasText: "pediatra" }).click()
    if (!/Confirmei com a Dra/.test(await drawer(page))) bad.push("resposta não voltou")
    await A(page, "closeDrawer")
    await go(page, "messages", { id: "c-sofa" })
    if (!/Posso retirar sábado/.test(await view(page))) bad.push("mensagem não voltou")
    await go(page, "events", { side: "origin" })
    await page.locator(".listing", { hasText: "Passeio de barco" }).locator(".card-link").click()
    await page.click("#drawer [data-act=rsvp]")
    await page.waitForTimeout(60)
    if ((await S(page, (s) => s.rsvps["e-barco"])) !== undefined)
      bad.push("cancelar presença não funcionou")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P23",
  "Recorrência",
  "notificações só existem com o estado que as gera; 'Amanhã' só com presença; badge = não lidas",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await A(page, "advance", { n: 4 })
    if (await page.evaluate(() => __bv.deriveNotifs().some((n) => /^Amanhã/.test(n.title))))
      bad.push("'Amanhã' sem presença confirmada")
    await page.evaluate(() => {
      __bv.S.day = 0
    })
    await A(page, "rsvp", { id: "e-familia", set: "going" })
    await page.evaluate(() => {
      __bv.S.day = 4
    })
    if (
      !(await page.evaluate(() =>
        __bv.deriveNotifs().some((n) => /^Amanhã: Passeio com famílias/.test(n.title)),
      ))
    )
      bad.push("'Amanhã' não apareceu com presença")
    await A(page, "rsvp", { id: "e-familia", set: "cancel" })
    if (await page.evaluate(() => __bv.deriveNotifs().some((n) => /^Amanhã/.test(n.title))))
      bad.push("'Amanhã' ficou depois de cancelar")
    await go(page, "notifications")
    const n = await page.evaluate(() => ({
      cards: document.querySelectorAll(".notice-card").length,
      derived: __bv.deriveNotifs().length,
      badge: +document.getElementById("bellBadge").textContent || 0,
      unread: __bv.deriveNotifs().filter((x) => !x.read).length,
    }))
    if (n.cards !== n.derived) bad.push(`cards ${n.cards} ≠ derivadas ${n.derived}`)
    if (n.badge !== n.unread) bad.push(`badge ${n.badge} ≠ não lidas ${n.unread}`)
    await page.locator(".notice-card .card-link").first().click()
    await page.waitForTimeout(60)
    const after = await page.evaluate(() => __bv.deriveNotifs().filter((x) => !x.read).length)
    if (after >= n.unread) bad.push("abrir notificação não marcou como lida")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P24",
  "Recorrência",
  "avanço de tempo gera novidade causal: desapego na janela, resposta à sua pergunta, proposta ao seu pedido",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    // pedido real: orçamento a um prestador orgânico do catálogo
    await go(page, "services", { side: "origin" })
    await page.locator(".service-card:not(.is-ad) .cta").first().click()
    await page.selectOption("#q-need", "new")
    await page.click("#drawer button[type=submit]")
    await page.waitForTimeout(80)
    const nid = await S(page, (s) => s.quotes.at(-1).needId)
    // pergunta própria, ainda sem resposta
    await page.evaluate(() => {
      __bv.S.threads.unshift({
        id: "t-x",
        community: "ajuricaba",
        title: "Teste",
        tags: [],
        author: "Você",
        own: true,
        day: __bv.S.day,
        ago: "agora",
        replies: [],
      })
    })
    const snap = (id) =>
      page.evaluate((id) => {
        const n = __bv.deriveNotifs()
        return {
          desapego: n.some((x) => /Novo desapego na sua janela/.test(x.title)),
          resposta: n.some((x) => /Nova resposta na sua pergunta/.test(x.title)),
          proposta: n.some((x) => x.act === "openProposals" && x.dataset.id === id),
          propostas: __bv.needById(id).proposals.length,
        }
      }, id)
    const antes = await snap(nid)
    if (antes.desapego || antes.resposta || antes.proposta || antes.propostas)
      bad.push(`novidade existia antes de o tempo passar: ${JSON.stringify(antes)}`)
    await A(page, "advance", { n: 3 })
    const depois = await snap(nid)
    if (!depois.desapego) bad.push("sem novo desapego na janela depois de 3 dias")
    if (!depois.resposta) bad.push("sem resposta à sua pergunta depois de 3 dias")
    if (!depois.proposta || depois.propostas !== 1)
      bad.push(
        `sem proposta ao seu pedido (propostas=${depois.propostas}, notificação=${depois.proposta})`,
      )
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P35",
  "Criação",
  "Editar preserva todos os campos e o publicado é exatamente a prévia (imóvel, serviço, evento, desapego)",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await page.evaluate(() => {
      __bv.S.membership.arrivalsBsb = "member"
    })
    const pick = async (sel, i) => {
      const vals = await page.$$eval(`${sel} option`, (o) => o.map((x) => x.value))
      await page.selectOption(sel, vals[Math.min(i, vals.length - 1)])
    }
    const read = (sels) =>
      page.evaluate(
        (sels) => Object.fromEntries(sels.map((q) => [q, document.querySelector(q).value])),
        sels,
      )
    const cases = {
      housing: [
        ["#o-type", "#o-bairro", "#o-beds", "#o-rent", "#o-from", "#o-city"],
        async () => {
          await pick("#o-type", 1)
          await page.fill("#o-bairro", "Adrianópolis")
          await page.fill("#o-beds", "4")
          await page.fill("#o-rent", "2900")
          await pick("#o-from", 4)
          await pick("#o-city", 1)
        },
        (o, b) =>
          o.title === b["#o-type"] &&
          o.from === b["#o-from"] &&
          o.city === b["#o-city"] &&
          String(o.beds) === b["#o-beds"] &&
          String(o.rent) === b["#o-rent"] &&
          o.bairro === b["#o-bairro"],
      ],
      service: [
        ["#o-name", "#o-cat", "#o-area", "#o-city"],
        async () => {
          await page.fill("#o-name", "Clínica Teste")
          await pick("#o-cat", 3)
          await page.fill("#o-area", "Flores")
          await pick("#o-city", 1)
        },
        (o, b) =>
          o.tags[0] === b["#o-cat"] &&
          o.city === b["#o-city"] &&
          o.name === b["#o-name"] &&
          o.area === b["#o-area"],
      ],
      event: [
        ["#o-title", "#o-date", "#o-time", "#o-place", "#o-comm"],
        async () => {
          await page.fill("#o-title", "Encontro X")
          await page.fill("#o-date", "2026-10-11")
          await page.fill("#o-time", "19h")
          await page.fill("#o-place", "Praça")
          await pick("#o-comm", 1)
        },
        (o, b) =>
          o.community === b["#o-comm"] &&
          o.city === "brasilia" &&
          o.title === b["#o-title"] &&
          o.date === b["#o-date"] &&
          o.place === b["#o-place"],
      ],
      sell: [
        ["#o-title", "#o-cat", "#o-price", "#o-win", "#o-city"],
        async () => {
          await page.fill("#o-title", "Cadeira")
          await pick("#o-cat", 2)
          await page.fill("#o-price", "120")
          await pick("#o-win", 4)
          await pick("#o-city", 1)
        },
        (o, b) =>
          o.cat === b["#o-cat"] &&
          o.window === b["#o-win"] &&
          o.city === b["#o-city"] &&
          String(o.price) === b["#o-price"] &&
          o.title === b["#o-title"],
      ],
    }
    for (const [type, [sels, fill, matches]] of Object.entries(cases)) {
      await A(page, "openOffer", { type })
      await fill()
      const antes = await read(sels)
      await page.click("#drawer button[type=submit]")
      await page.click("#drawer [data-act=offerBack]")
      const depois = await read(sels)
      let diverged = false
      for (const q of sels)
        if (antes[q] !== depois[q]) {
          bad.push(`${type} ${q}: "${antes[q]}" virou "${depois[q]}" depois de Editar`)
          diverged = true
        }
      if (diverged) {
        // campos em branco não passam da validação: seguir só produziria um erro de tempo esgotado
        await A(page, "closeDrawer")
        continue
      }
      await page.click("#drawer button[type=submit]")
      await page.click("#drawer [data-act=offerPublish]")
      await page.waitForTimeout(60)
      const pub = await page.evaluate((t) => {
        const o = __bv.S.own
        return t === "housing"
          ? o.housing[0]
          : t === "service"
            ? o.provider
            : t === "event"
              ? o.events[0]
              : o.market[0]
      }, type)
      if (!pub || !matches(pub, antes))
        bad.push(`${type}: o publicado difere da prévia: ${JSON.stringify(pub)?.slice(0, 120)}`)
    }
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe("P25", "Robustez", "texto com apóstrofo ou HTML não quebra nem executa", async () => {
  const { ctx, page } = await fresh()
  const bad = []
  await search(page, "veterinário d'água do Sudoeste")
  await page.click(".empty-state .primary")
  if (!/Perguntar à comunidade/.test(await drawer(page))) bad.push("apóstrofo quebrou o fluxo")
  await A(page, "closeDrawer")
  await search(page, "<img src=x onerror=window.__x=1>")
  await page.waitForTimeout(100)
  if (await page.evaluate(() => window.__x)) bad.push("HTML executou")
  if (await page.locator('#view img[src="x"]').count()) bad.push("HTML virou elemento")
  if (!(await page.inputValue("#rq")).includes("<img src=x"))
    bad.push("texto não ficou literal no campo")
  await ctx.close()
  return [!bad.length, bad.join(" | ")]
})
await probe(
  "P26",
  "A11y",
  "gaveta é diálogo: foco entra e fica, Esc fecha e devolve o foco, Voltar fecha antes de sair da página",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await go(page, "services", { side: "origin" })
    const trig = page.locator(".service-card:not(.is-ad) .card-link").first()
    await trig.focus()
    await trig.press("Enter")
    await page.waitForTimeout(80)
    const d = await page.evaluate(() => ({
      role: document.getElementById("drawer").getAttribute("role"),
      modal: document.getElementById("drawer").getAttribute("aria-modal"),
      inert: document.getElementById("app").inert,
      inside: document.getElementById("drawer").contains(document.activeElement),
    }))
    if (d.role !== "dialog" || d.modal !== "true") bad.push("sem role=dialog/aria-modal")
    if (!d.inert) bad.push("fundo não inerte")
    if (!d.inside) bad.push("foco não entrou")
    for (let i = 0; i < 14; i++) await page.keyboard.press("Tab")
    if (
      !(await page.evaluate(() =>
        document.getElementById("drawer").contains(document.activeElement),
      ))
    )
      bad.push("Tab saiu da gaveta")
    await page.keyboard.press("Escape")
    await page.waitForTimeout(80)
    const r = await page.evaluate(() => ({
      hidden: document.getElementById("overlay").hidden,
      cls: document.activeElement?.className || "",
    }))
    if (!r.hidden) bad.push("Esc não fechou")
    if (!/card-link/.test(r.cls)) bad.push(`foco não voltou ao gatilho: ${r.cls}`)
    await go(page, "housing", { side: "destination" })
    await page.locator(".listing .card-link").first().click()
    await page.waitForTimeout(80)
    await page.goBack()
    await page.waitForTimeout(100)
    const g = await page.evaluate(() => ({
      hidden: document.getElementById("overlay").hidden,
      page: __bv.route().page,
    }))
    if (!g.hidden || g.page !== "housing") bad.push(`Voltar: overlay=${!g.hidden} página=${g.page}`)
    await page.goBack()
    await page.waitForTimeout(100)
    if ((await page.evaluate(() => __bv.route().page)) === "housing")
      bad.push("segundo Voltar não saiu da página")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P27",
  "Cliques mortos",
  "todo controle com data-act produz efeito, nas páginas e nas gavetas (1440 e 390)",
  async () => {
    const bad = []
    let total = 0
    const pages = [
      ["home", {}],
      ["resolver", {}],
      ["resolver", { q: "onde morar chegando em novembro" }],
      ["resolver", { q: "veterinário 24h" }],
      ["resolver", { q: "escola" }],
      ["explorar", {}],
      ["services", { side: "origin" }],
      ["services", { side: "destination" }],
      ["housing", { side: "destination" }],
      ["market", { side: "origin" }],
      ["market", { side: "destination" }],
      ["events", { side: "origin" }],
      ["benefits", { side: "origin" }],
      ["refs", { side: "destination" }],
      ["community", { id: "ajuricaba" }],
      ["community", { id: "arrivalsBsb" }],
      ["messages", { id: "c-move" }],
      ["notifications", {}],
      ["profile", {}],
      ["provider", {}],
    ]
    for (const vp of [DESK, MOB]) {
      const { ctx, page } = await fresh(vp)
      const sweep = (scope) =>
        page.evaluate(async (scope) => {
          const dead = []
          const sel =
            scope === "drawer"
              ? "#drawer [data-act]"
              : "#view [data-act], .topbar [data-act], #sideNav [data-act], #typeNav [data-act], #mobileNav [data-act], button.context[data-act]"
          const n = document.querySelectorAll(sel).length
          const keep = {
            route: JSON.stringify(__bv.route()),
            html: document.querySelector("#view").innerHTML,
          }
          for (let i = 0; i < n; i++) {
            const els = [...document.querySelectorAll(sel)]
            const el = els[i]
            if (
              !el ||
              el.disabled ||
              el.classList.contains("skip") ||
              el.getClientRects().length === 0 ||
              el.getAttribute("aria-pressed") === "true" ||
              el.getAttribute("aria-current") === "page" ||
              (el.dataset.act === "go" &&
                el.dataset.page === __bv.route().page &&
                !el.dataset.id &&
                !el.dataset.side)
            )
              continue
            const b = {
              r: JSON.stringify(__bv.route()),
              s: JSON.stringify(__bv.S),
              t: __bv.toastN(),
              o: __bv.overlayOpen(),
              v: document.querySelector("#view").innerHTML.length,
              d: document.getElementById("drawer").innerHTML.length,
              m: !!document.getElementById("ctxMenu"),
              f:
                document.activeElement &&
                (document.activeElement.id || document.activeElement.tagName),
            }
            const label = `${el.dataset.act}:${(el.textContent || "").trim().slice(0, 24)}`
            try {
              el.click()
            } catch {
              dead.push(`exceção ${label}`)
              continue
            }
            await new Promise((r) => setTimeout(r, 15))
            const a = {
              r: JSON.stringify(__bv.route()),
              s: JSON.stringify(__bv.S),
              t: __bv.toastN(),
              o: __bv.overlayOpen(),
              v: document.querySelector("#view").innerHTML.length,
              d: document.getElementById("drawer").innerHTML.length,
              m: !!document.getElementById("ctxMenu"),
              f:
                document.activeElement &&
                (document.activeElement.id || document.activeElement.tagName),
            }
            if (
              a.m === b.m &&
              a.r === b.r &&
              a.s === b.s &&
              a.t === b.t &&
              a.o === b.o &&
              a.v === b.v &&
              a.d === b.d &&
              a.f === b.f
            )
              dead.push(label)
            if (document.getElementById("ctxMenu"))
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
            if (__bv.overlayOpen() && scope !== "drawer")
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
            if (scope === "drawer" && !__bv.overlayOpen()) return { dead, n, reopen: true, i }
            if (scope !== "drawer") {
              __bv.go(JSON.parse(keep.route).page, JSON.parse(keep.route).params)
            }
          }
          return { dead, n }
        }, scope)
      for (const [p, params] of pages) {
        await go(page, p, params)
        const r = await sweep("page")
        total += r.n
        for (const d of r.dead) bad.push(`${vp.width}px ${p}: morto ${d}`)
      }
      const objs = await page.evaluate(() => [
        ...__bv.DB.providers.map((x) => ["provider", x.id]),
        ...__bv.DB.housing.map((x) => ["housing", x.id]),
        ...__bv.DB.market.map((x) => ["market", x.id]),
        ...__bv.DB.events.map((x) => ["event", x.id]),
        ...__bv.DB.benefits.map((x) => ["benefit", x.id]),
        ...__bv.DB.refs.map((x) => ["ref", x.id]),
        ...__bv.DB.people.map((x) => ["person", x.id]),
        ["thread", "t-ped"],
        ["thread", "t-neigh"],
        ["thread", "t-move"],
        ["demand", "d-mao-moveis"],
        ["community", "ajuricaba"],
      ])
      for (const [dt, id] of objs) {
        await go(page, "home")
        await page.evaluate(([dt, id]) => __bv.A.openObj({ dtype: dt, id }), [dt, id])
        if (!(await page.evaluate(() => __bv.overlayOpen()))) {
          if (dt !== "community") bad.push(`${vp.width}px ${dt}:${id}: gaveta não abriu`)
          continue
        }
        const empty = await page.evaluate(
          () => document.getElementById("drawer").innerText.trim().length < 20,
        )
        if (empty) bad.push(`${dt}:${id}: gaveta vazia`)
        const idxs = await page.evaluate(
          () => document.querySelectorAll("#drawer [data-act]").length,
        )
        for (let i = 0; i < idxs; i++) {
          await go(page, "home")
          await page.evaluate(([dt, id]) => __bv.A.openObj({ dtype: dt, id }), [dt, id])
          const r = await page.evaluate(async (i) => {
            const el = document.querySelectorAll("#drawer [data-act]")[i]
            if (!el || el.getAttribute("aria-pressed") === "true") return null
            const label = `${el.dataset.act}:${el.textContent.trim().slice(0, 20)}`
            const b = {
              r: JSON.stringify(__bv.route()),
              s: JSON.stringify(__bv.S),
              t: __bv.toastN(),
              d: document.getElementById("drawer").innerHTML,
              o: __bv.overlayOpen(),
            }
            el.click()
            await new Promise((r) => setTimeout(r, 15))
            const same =
              b.r === JSON.stringify(__bv.route()) &&
              b.s === JSON.stringify(__bv.S) &&
              b.t === __bv.toastN() &&
              b.d === document.getElementById("drawer").innerHTML &&
              b.o === __bv.overlayOpen()
            return same ? label : ""
          }, i)
          total++
          if (r) bad.push(`${vp.width}px gaveta ${dt}:${id}: morto ${r}`)
        }
      }
      await ctx.close()
    }
    return [!bad.length, `${total} controles varridos · ${bad.slice(0, 6).join(" | ")}`]
  },
)
await probe(
  "P34",
  "Privacidade",
  "nenhuma fonte, script ou folha de estilo de terceiro é pedida; Public Sans auto-hospedada carrega",
  async () => {
    const ctx = await browser.newContext({ viewport: CUR })
    const page = await ctx.newPage()
    const bad = []
    const reqs = []
    page.on("request", (r) => {
      if (!r.url().startsWith("file:")) reqs.push(`${r.resourceType()} ${new URL(r.url()).host}`)
    })
    await page.route(/unsplash\.com/, (r) => r.abort()) // fotos de demonstração: terceiro declarado no README
    await page.goto(PAGE_URL)
    await page.waitForFunction(() => window.__bv)
    for (const p of ["home", "resolver", "services", "community", "profile"]) await go(page, p)
    const ff = await page.evaluate(async () => {
      await document.fonts.load('700 16px "Public Sans"', "Ação é ç ã")
      return {
        loaded: [...document.fonts].some(
          (f) => f.family.includes("Public Sans") && f.status === "loaded",
        ),
        body: getComputedStyle(document.body).fontFamily,
      }
    })
    const third = reqs.filter((x) => /^(font|script|stylesheet|xhr|fetch|websocket|other) /.test(x))
    if (third.length) bad.push(`requisição de terceiro: ${[...new Set(third)].join(", ")}`)
    if (!ff.loaded) bad.push("Public Sans local não carregou")
    if (!/^"?Public Sans/.test(ff.body)) bad.push(`corpo não usa Public Sans: ${ff.body}`)
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P28",
  "A11y",
  "campos com rótulo, botões com nome, imagens com alt, um item ativo por navegação",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    const audit = () =>
      page.evaluate(() => {
        const out = []
        const vis = (e) => e.offsetParent !== null || e.closest("#drawer")
        document.querySelectorAll("input:not([type=hidden]),select,textarea").forEach((e) => {
          if (!vis(e)) return
          const named =
            e.getAttribute("aria-label") ||
            e.getAttribute("aria-labelledby") ||
            (e.id && document.querySelector(`label[for="${e.id}"]`)) ||
            e.closest("label")
          if (!named) out.push(`campo sem rótulo: ${e.name || e.id || e.type}`)
        })
        document.querySelectorAll("button").forEach((e) => {
          if (!vis(e)) return
          if (!(e.innerText || "").trim() && !e.getAttribute("aria-label"))
            out.push(`botão sem nome: ${e.className}`)
        })
        document.querySelectorAll("img").forEach((e) => {
          if (!e.hasAttribute("alt")) out.push("img sem alt")
        })
        return out
      })
    const pages = [
      ["home", {}],
      ["resolver", { q: "onde morar chegando em novembro" }],
      ["services", { side: "origin" }],
      ["housing", { side: "destination" }],
      ["market", { side: "origin" }],
      ["events", { side: "origin" }],
      ["benefits", { side: "origin" }],
      ["refs", { side: "origin" }],
      ["community", { id: "ajuricaba" }],
      ["messages", { id: "c-move" }],
      ["notifications", {}],
      ["profile", {}],
      ["provider", {}],
    ]
    for (const [p, params] of pages) {
      await go(page, p, params)
      for (const x of await audit()) bad.push(`${p}: ${x}`)
    }
    for (const f of [
      "openQuote:p-frio",
      "openHelp:pe-renata",
      "openAsk:",
      "openComposer:",
      "openOffer:sell",
      "openResolution:n-move",
      "openContext:",
      "openJoin:arrivalsBsb",
    ]) {
      const [n, id] = f.split(":")
      await page.evaluate(
        ([n, id]) => __bv.A[n]({ id, type: id, comm: "ajuricaba", q: "" }),
        [n, id],
      )
      for (const x of await audit()) bad.push(`${f}: ${x}`)
      await A(page, "closeDrawer")
    }
    await go(page, "home")
    const nav = await page.evaluate(() => ({
      side: document.querySelectorAll("#sideNav [aria-current],#typeNav [aria-current]").length,
      mob: document.querySelectorAll("#mobileNav [aria-current]").length,
    }))
    if (nav.side !== 1 || nav.mob !== 1)
      bad.push(`itens ativos: lateral ${nav.side}, celular ${nav.mob}`)
    await go(page, "resolver")
    const n2 = await page.evaluate(
      () => document.querySelectorAll("#mobileNav [aria-current]").length,
    )
    if (n2 !== 1) bad.push(`Resolver: ${n2} ativos no celular`)
    await ctx.close()
    return [!bad.length, [...new Set(bad)].slice(0, 6).join(" | ")]
  },
)
await probe("P29", "A11y", "alvos de toque ≥ 44px nos controles (1440 e 390)", async () => {
  const bad = []
  for (const vp of [DESK, MOB]) {
    const { ctx, page } = await fresh(vp)
    const pages = [
      ["home", {}],
      ["resolver", { q: "onde morar chegando em novembro" }],
      ["services", { side: "origin" }],
      ["housing", { side: "destination" }],
      ["market", { side: "origin" }],
      ["events", { side: "origin" }],
      ["benefits", { side: "origin" }],
      ["refs", { side: "origin" }],
      ["community", { id: "ajuricaba" }],
      ["messages", { id: "c-move" }],
      ["notifications", {}],
      ["profile", {}],
      ["provider", {}],
    ]
    const measure = () =>
      page.evaluate(() =>
        [
          ...document.querySelectorAll(
            "button, input:not([type=hidden]), select, textarea, [role=button]",
          ),
        ]
          .filter(
            (e) =>
              e.offsetParent !== null && !e.classList.contains("skip") && !e.closest("[hidden]"),
          )
          .map((e) => {
            const r = e.getBoundingClientRect()
            let w = r.width,
              h = r.height
            if (e.classList.contains("card-link")) {
              const c = (
                e.closest(".card, .profile-row, .question, .inbox-item") || e
              ).getBoundingClientRect()
              w = c.width
              h = c.height
            }
            if (e.matches("input[type=checkbox],input[type=radio]")) {
              const l = e.closest("label")?.getBoundingClientRect()
              if (l) {
                w = l.width
                h = l.height
              }
            }
            return h < 43.5 || w < 43.5
              ? `${e.tagName.toLowerCase()}.${(e.className || "").toString().split(" ")[0]}"${(e.innerText || e.getAttribute("aria-label") || "").trim().slice(0, 18)}" ${Math.round(w)}×${Math.round(h)}`
              : null
          })
          .filter(Boolean),
      )
    for (const [p, params] of pages) {
      await go(page, p, params)
      for (const x of await measure()) bad.push(`${vp.width} ${p}: ${x}`)
    }
    for (const f of ["openQuote:p-frio", "openAsk:", "openOffer:sell", "openResolution:n-move"]) {
      const [n, id] = f.split(":")
      await page.evaluate(
        ([n, id]) => __bv.A[n]({ id, type: id, comm: "ajuricaba", q: "" }),
        [n, id],
      )
      for (const x of await measure()) bad.push(`${vp.width} ${f}: ${x}`)
      await A(page, "closeDrawer")
    }
    await ctx.close()
  }
  return [
    !bad.length,
    `${bad.length} abaixo de 44px · ${[...new Set(bad)].slice(0, 5).join(" | ")}`,
  ]
})
await probe("P30", "A11y", "contraste de texto ≥ 4,5:1 (fora de imagens)", async () => {
  const { ctx, page } = await fresh()
  const bad = []
  const lum = (c) => {
    const v = c.map((x) => {
      const y = x / 255
      return y <= 0.03928 ? y / 12.92 : ((y + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
  }
  const pages = [
    ["home", {}],
    ["resolver", { q: "preciso instalar um split" }],
    ["services", { side: "origin" }],
    ["housing", { side: "destination" }],
    ["community", { id: "ajuricaba" }],
    ["messages", { id: "c-move" }],
    ["notifications", {}],
    ["profile", {}],
  ]
  for (const [p, params] of pages) {
    await go(page, p, params)
    const rows = await page.evaluate(() => {
      const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number)
      const out = []
      document.querySelectorAll("#view *, .sidebar *").forEach((e) => {
        if (
          e.offsetParent === null ||
          !e.childNodes.length ||
          e.closest(".sr-only") ||
          e.closest("[aria-hidden=true]")
        )
          return
        const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
        if (!own) return
        let bgc = null,
          el = e,
          image = false
        while (el) {
          const cs = getComputedStyle(el)
          if (cs.backgroundImage !== "none") {
            image = true
            break
          }
          const b = parse(cs.backgroundColor)
          if (b.length >= 3 && (b[3] === undefined || b[3] > 0.95)) {
            bgc = b.slice(0, 3)
            break
          }
          el = el.parentElement
        }
        if (image) return
        if (!bgc) bgc = [247, 247, 242]
        const cs = getComputedStyle(e)
        const fg = parse(cs.color)
        if (fg.length < 3) return
        out.push({
          t: e.textContent.trim().slice(0, 24),
          fg: fg.slice(0, 3),
          bg: bgc,
          size: parseFloat(cs.fontSize),
          bold: +cs.fontWeight >= 700,
          op: +cs.opacity,
        })
      })
      return out
    })
    rows.forEach((r) => {
      const l1 = lum(r.fg),
        l2 = lum(r.bg)
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
      const large = r.size >= 24 || (r.size >= 18.66 && r.bold)
      if (ratio < (large ? 3 : 4.5) && r.op >= 1) bad.push(`${p}: "${r.t}" ${ratio.toFixed(2)}`)
    })
  }
  await ctx.close()
  return [
    !bad.length,
    `${bad.length} abaixo do limite · ${[...new Set(bad)].slice(0, 5).join(" | ")}`,
  ]
})
await probe(
  "P31",
  "Mobile",
  "390px: sem rolagem horizontal, Contribuir na barra superior e sem botão flutuante, entradas para todos os tipos, busca e lista/detalhe de conversas",
  async () => {
    const { ctx, page } = await fresh(MOB)
    const bad = []
    for (const [p, params] of [
      ["home", {}],
      ["resolver", { q: "onde morar chegando em novembro" }],
      ["services", { side: "origin" }],
      ["housing", { side: "destination" }],
      ["market", { side: "origin" }],
      ["events", { side: "origin" }],
      ["benefits", { side: "origin" }],
      ["refs", { side: "origin" }],
      ["community", { id: "ajuricaba" }],
      ["messages", {}],
      ["notifications", {}],
      ["profile", {}],
      ["provider", {}],
      ["explorar", {}],
    ]) {
      await go(page, p, params)
      const w = await page.evaluate(() => document.documentElement.scrollWidth)
      if (w > 390) bad.push(`${p}: rolagem horizontal (${w}px)`)
    }
    await go(page, "home")
    const f = await page.evaluate(() => {
      const add = document.querySelector(".topbar .top-add"),
        tb = document.querySelector(".topbar").getBoundingClientRect(),
        r = add?.getBoundingClientRect()
      return {
        add: !!r && add.offsetParent !== null && r.top >= tb.top - 1 && r.bottom <= tb.bottom + 1,
        floating: !!document.querySelector(".fab-contribute"),
        tabs: document.querySelectorAll("#mobileNav button").length,
        search: document.querySelector(".topbar .mobile-only")?.offsetParent !== null,
      }
    })
    if (!f.add) bad.push("Contribuir ausente da barra superior")
    if (f.floating) bad.push("botão flutuante ainda existe")
    if (f.tabs !== 5) bad.push(`barra inferior com ${f.tabs} abas (esperado 5)`)
    if (!f.search) bad.push("sem busca no celular")
    for (const p of ["services", "housing", "market", "events", "benefits", "refs"]) {
      const n = await page.evaluate(
        (p) =>
          [...document.querySelectorAll(`#view .chip-row [data-page="${p}"]`)].filter(
            (e) => e.offsetParent !== null,
          ).length,
        p,
      )
      if (!n) bad.push(`sem entrada visível para ${p}`)
    }
    const cards = await page.evaluate(() => document.querySelectorAll("#view .card").length)
    if (cards > 16) bad.push(`Home com ${cards} cards (> 16)`)
    await go(page, "messages")
    const l = await page.evaluate(() => ({
      list: document.querySelector(".inbox-list").offsetParent !== null,
      panel: document.querySelector(".conversation-panel").offsetParent !== null,
    }))
    if (!l.list || l.panel) bad.push("lista deveria aparecer sozinha antes de abrir conversa")
    await page.locator(".inbox-item").first().click()
    await page.waitForTimeout(60)
    const l2 = await page.evaluate(() => ({
      list: document.querySelector(".inbox-list").offsetParent !== null,
      panel: document.querySelector(".conversation-panel").offsetParent !== null,
      back: document.querySelector(".back-inline")?.offsetParent !== null,
    }))
    if (l2.list || !l2.panel || !l2.back) bad.push(`detalhe de conversa: ${JSON.stringify(l2)}`)
    await page.locator(".back-inline").click()
    await page.waitForTimeout(60)
    if (!(await page.evaluate(() => document.querySelector(".inbox-list").offsetParent !== null)))
      bad.push("voltar não retorna à lista")
    await go(page, "resolver", { q: "onde morar chegando em novembro" })
    await page.locator("#results .card-link").first().click()
    if (!(await page.evaluate(() => __bv.overlayOpen())))
      bad.push("card do resultado não abre a gaveta no celular (clique real)")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)
await probe(
  "P32",
  "Copy",
  "sem texto de bastidor; 'por que apareceu' no máximo uma vez por card e nunca em anúncio",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    const forbidden =
      /sinal\(is\)|Cidade não é comunidade|Inventário comercial|identificado visualmente|Sinais separados do pagamento|Oferta comercial separada|Atalhos contextuais|Referências devem mostrar|sem calendário vazio|Conhecimento reutilizável|Memória que continua útil|Cidades são apenas|lado certo|Resultados orgânicos|orgânic|Rede verificada para|Meu contexto|Foco escolhido|Ainda não há base|só mencionou|Demonstração: você vê|ainda não é prestador|Objeto/
    const scan = async (label) => {
      const t = `${await view(page)}\n${await drawer(page)}`
      if (forbidden.test(t)) bad.push(`${label}: ${t.match(forbidden)[0]}`)
      const c = await page.evaluate(
        () =>
          [...document.querySelectorAll(".card")].filter(
            (c) =>
              (c.innerText.match(/Por que apareceu/g) || []).length > 1 ||
              (c.classList.contains("is-ad") && /Por que apareceu/.test(c.innerText)),
          ).length,
      )
      if (c) bad.push(`${label}: 'por que apareceu' repetido/em anúncio em ${c} card(s)`)
    }
    for (const [p, params] of [
      ["home", {}],
      ["resolver", { q: "preciso instalar um split" }],
      ["resolver", { q: "onde morar chegando em novembro" }],
      ["services", { side: "origin" }],
      ["housing", { side: "destination" }],
      ["market", { side: "destination" }],
      ["events", { side: "origin" }],
      ["benefits", { side: "origin" }],
      ["refs", { side: "origin" }],
      ["community", { id: "ajuricaba" }],
      ["profile", {}],
      ["provider", {}],
    ]) {
      await go(page, p, params)
      await scan(p)
    }
    for (const a of [
      ["openContext", {}],
      ["openTrust", {}],
      ["openObj", { dtype: "ref", id: "r-bsb-docs" }],
      ["openObj", { dtype: "provider", id: "p-amazon" }],
      ["openObj", { dtype: "benefit", id: "b-ac" }],
      ["openCommunitySwitcher", {}],
    ]) {
      await A(page, a[0], a[1])
      await scan(a[0])
      await A(page, "closeDrawer")
    }
    await ctx.close()
    return [!bad.length, bad.slice(0, 4).join(" | ")]
  },
)
await probe(
  "P33",
  "Estados",
  "estados: zero, um e muitos; vencido; sem resposta; resolvido; interessado; salvo",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await go(page, "services", { side: "destination" })
    const v = await view(page)
    if (
      !/Sem evidência ainda/.test(v) ||
      !/Poucos relatos/.test(v) ||
      !/Recomendado pela comunidade/.test(v)
    )
      bad.push("provedor zero/um/muitos não distintos")
    await A(page, "advance", { n: 8 })
    if (
      !(await page.evaluate(() => __bv.deriveNotifs().some((n) => /Sem novidade há/.test(n.title))))
    )
      bad.push("necessidade sem resposta não vira aviso de 'sem novidade'")
    await A(page, "openObj", { dtype: "thread", id: "t-neigh" })
    if (!(await page.locator("#drawer [data-act=resolveThread]").count()))
      bad.push("sem ação de resolver na própria pergunta")
    await A(page, "closeDrawer")
    await go(page, "profile")
    if (
      !/Resolvido recentemente/.test(await view(page)) ||
      !/Instalação de split/.test(await view(page))
    )
      bad.push("resolvidos não aparecem no Perfil")
    await go(page, "housing", { side: "destination" })
    await page.locator(".heart").first().click()
    if ((await page.locator(".heart[aria-pressed=true]").count()) !== 1)
      bad.push("coração não salva")
    await ctx.close()
    return [!bad.length, bad.join(" | ")]
  },
)

/* ============ v35: SISTEMA VISUAL ============ */
await probe(
  "P36",
  "Visual",
  "ícones são SVG do sprite (nenhum símbolo Unicode em texto além de → de rota, $, + e as setas de teclado), todo <use> resolve, nenhum texto < 12 px, nenhum texto cru (${, [object, undefined, NaN), mídia com reserva quando a foto falha",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    const scan = async (label) => {
      const r = await page.evaluate(() => {
        const glyph = /[\p{S}\u2768-\u2775›‹«»]/gu
        const txt = `${document.getElementById("app").innerText}\n${document.getElementById("drawer").innerText}`
        const small = []
        document.querySelectorAll("#app *, #drawer *").forEach((e) => {
          if (e.offsetParent === null || e.closest(".sr-only")) return
          if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return
          const fs = parseFloat(getComputedStyle(e).fontSize)
          if (fs < 11.99)
            small.push(
              `${e.tagName.toLowerCase()}.${(e.className || "").toString().split(" ")[0]} ${fs}px`,
            )
        })
        return {
          glyphs: [...new Set(txt.match(glyph) || [])].filter((c) => !"→$+↑↓⌘".includes(c)),
          small: [...new Set(small)],
          orphan: [...document.querySelectorAll("use")]
            .map((u) => u.getAttribute("href"))
            .filter((h) => !document.querySelector(h)),
          noUse: document.querySelectorAll("svg.ic:not(:has(use))").length,
          raw: (txt.match(/\$\{|\[object |\bundefined\b|\bNaN\b/) || [])[0] || "",
        }
      })
      if (r.glyphs.length) bad.push(`${label}: glifo ${r.glyphs.join("")}`)
      if (r.small.length) bad.push(`${label}: texto < 12px ${r.small.slice(0, 2).join(",")}`)
      if (r.orphan.length) bad.push(`${label}: <use> sem símbolo ${r.orphan[0]}`)
      if (r.noUse) bad.push(`${label}: svg.ic sem <use>`)
      if (r.raw) bad.push(`${label}: texto cru na tela (${r.raw})`)
    }
    for (const [p, params] of [
      ["home", {}],
      ["resolver", { q: "preciso instalar um split" }],
      ["services", { side: "origin" }],
      ["housing", { side: "destination" }],
      ["market", { side: "destination" }],
      ["events", { side: "origin" }],
      ["benefits", { side: "origin" }],
      ["refs", { side: "origin" }],
      ["community", { id: "ajuricaba" }],
      ["messages", { id: "c-move" }],
      ["notifications", {}],
      ["profile", {}],
      ["provider", {}],
    ]) {
      await go(page, p, params)
      await scan(p)
    }
    for (const a of [
      ["openContext", {}],
      ["openTrust", {}],
      ["openObj", { dtype: "provider", id: "p-amazon" }],
      ["openObj", { dtype: "housing", id: "h-bsb-asa" }],
      ["openObj", { dtype: "event", id: "e-familia" }],
      ["openObj", { dtype: "ref", id: "r-bsb-docs" }],
      ["openNeed", { id: "n-move" }],
      ["openProposals", { id: "n-move" }],
      ["openComposer", {}],
    ]) {
      await A(page, a[0], a[1])
      await scan(a[0])
      await A(page, "closeDrawer")
    }
    await A(page, "resolveThread", { id: "t-neigh", i: 0 })
    await A(page, "openObj", { dtype: "thread", id: "t-neigh" })
    await scan("pergunta resolvida")
    await A(page, "closeDrawer")
    await go(page, "services", { side: "origin" })
    await page.waitForTimeout(250)
    const fb = await page.evaluate(() => {
      const pic = document.querySelector(".service-card .pic")
      return getComputedStyle(pic).backgroundImage
    })
    if (!/svg/.test(fb)) bad.push("foto que falhou não mostra a reserva de imagem")
    await ctx.close()
    return [!bad.length, bad.slice(0, 4).join(" | ")]
  },
)

/* ============ v35: NAVEGAÇÃO ============ */
const MOBILE = () => CUR.width < 1000
const openPal = async (page) => {
  if (MOBILE()) await page.locator(".topbar .mobile-only[data-act=openSearch]").click()
  else await page.keyboard.press("Control+k")
}
await probe(
  "P37",
  "Navegação",
  "paleta de comandos: abre, filtra, setas movem a seleção, Enter navega e foca a tela, Esc e Ctrl+K fecham; buscar não cria necessidade",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    const n0 = await S(page, (S) => S.needs.length)
    await openPal(page)
    const o = await page.evaluate(() => ({
      open: __bv.overlayOpen(),
      focus: document.activeElement?.id,
      role: document.activeElement?.getAttribute("role"),
      exp: document.activeElement?.getAttribute("aria-expanded"),
      n: document.querySelectorAll("#palList [role=option]").length,
      sel: document.querySelectorAll("#palList [aria-selected=true]").length,
      close: document.querySelector(".pal-close")?.offsetParent !== null,
      esc: document.querySelector(".pal-esc")?.offsetParent !== null,
    }))
    if (!o.open || o.focus !== "palQ" || o.role !== "combobox" || o.exp !== "true")
      bad.push(`abertura: ${JSON.stringify(o)}`)
    if (o.n < 5 || o.sel !== 1) bad.push(`lista inicial: ${o.n} itens, ${o.sel} selecionados`)
    if (MOBILE() ? !o.close : !o.esc) bad.push("falta o gesto de fechar deste tamanho de tela")
    await page.keyboard.type("moradia")
    const t = await page.evaluate(() =>
      [...document.querySelectorAll("#palList [role=option]")].map((b) =>
        b.innerText.replace(/\s+/g, " ").trim(),
      ),
    )
    if (!/^Buscar no Bivaque: “moradia”/.test(t[0]) || !t.some((x) => /^Imóveis/.test(x)))
      bad.push(`filtro: ${t.join("|")}`)
    await page.keyboard.press("ArrowDown")
    const a = await page.evaluate(() => {
      const i = document.getElementById("palQ").getAttribute("aria-activedescendant")
      return {
        i,
        sel: document.getElementById(i)?.getAttribute("aria-selected"),
        n: document.querySelectorAll("#palList [aria-selected=true]").length,
      }
    })
    if (a.i !== "pal-1" || a.sel !== "true" || a.n !== 1) bad.push(`seta: ${JSON.stringify(a)}`)
    await page.keyboard.press("Enter")
    const r = await page.evaluate(() => ({
      page: __bv.route().page,
      open: __bv.overlayOpen(),
      focus: document.activeElement?.id,
      inert: document.getElementById("app").inert,
    }))
    if (r.page !== "housing" || r.open || r.focus !== "view" || r.inert)
      bad.push(`Enter em "Imóveis": ${JSON.stringify(r)}`)
    // Ctrl+K alterna; Esc fecha
    await page.keyboard.press("Control+k")
    await page.keyboard.press("Control+k")
    if (await page.evaluate(() => __bv.overlayOpen())) bad.push("Ctrl+K não fecha a paleta aberta")
    await page.keyboard.press("Control+k")
    await page.keyboard.press("Escape")
    if (await page.evaluate(() => __bv.overlayOpen() || document.getElementById("app").inert))
      bad.push("Esc não fecha a paleta")
    // buscar leva ao Resolver sem criar necessidade
    await page.keyboard.press("Control+k")
    await page.keyboard.type("preciso instalar um split")
    await page.keyboard.press("Enter")
    const q = await page.evaluate(() => ({ page: __bv.route().page, q: __bv.route().params.q }))
    if (q.page !== "resolver" || q.q !== "preciso instalar um split")
      bad.push(`buscar: ${JSON.stringify(q)}`)
    if ((await S(page, (S) => S.needs.length)) !== n0)
      bad.push("buscar pela paleta criou necessidade")
    // criar abre o formulário certo
    await page.keyboard.press("Control+k")
    await page.keyboard.type("desapego")
    const idx = await page.evaluate(() =>
      [...document.querySelectorAll("#palList [role=option]")].findIndex((b) =>
        /^Anunciar desapego/.test(b.innerText.trim()),
      ),
    )
    if (idx < 0) bad.push("'Anunciar desapego' não aparece ao buscar 'desapego'")
    else {
      for (let i = 0; i < idx; i++) await page.keyboard.press("ArrowDown")
      await page.keyboard.press("Enter")
      if (!/Anunciar desapego/.test(await drawer(page)))
        bad.push("criar: formulário de desapego não abriu")
    }
    await ctx.close()
    return [!bad.length, bad.slice(0, 4).join(" | ")]
  },
)
await probe(
  "P38",
  "Navegação",
  "atalhos: g + letra navega, / abre a paleta, ? abre o quadro; nada dispara dentro de campo de texto nem com janela aberta",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    const cur = () => page.evaluate(() => __bv.route().page)
    for (const [k, p] of [
      ["r", "resolver"],
      ["c", "community"],
      ["m", "messages"],
      ["v", "profile"],
      ["n", "notifications"],
      ["h", "home"],
    ]) {
      await page.keyboard.press("g")
      await page.keyboard.press(k)
      if ((await cur()) !== p) bad.push(`g ${k} → ${await cur()} (esperado ${p})`)
    }
    await go(page, "resolver")
    await page.click("#rq")
    await page.keyboard.type("gr/?")
    const v = await page.evaluate(() => ({
      p: __bv.route().page,
      val: document.getElementById("rq").value,
      open: __bv.overlayOpen(),
    }))
    if (v.p !== "resolver" || v.val !== "gr/?" || v.open)
      bad.push(`digitar em campo disparou atalho: ${JSON.stringify(v)}`)
    await go(page, "home")
    await A(page, "openTrust")
    await page.keyboard.press("g")
    await page.keyboard.press("r")
    if ((await cur()) !== "home") bad.push("g r navegou com janela aberta")
    await A(page, "closeDrawer")
    await page.evaluate(() => document.activeElement?.blur())
    await page.keyboard.press("/")
    if (!(await page.evaluate(() => !!document.getElementById("palQ"))))
      bad.push("/ não abre a paleta")
    await page.keyboard.press("Escape")
    await page.keyboard.press("?")
    if (!/Atalhos de teclado/.test(await drawer(page))) bad.push("? não abre o quadro de atalhos")
    await ctx.close()
    return [!bad.length, bad.slice(0, 4).join(" | ")]
  },
)
await probe(
  "P39",
  "Navegação",
  "trilha nas telas de segundo nível volta ao pai; título e anúncio acompanham a página",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    const cur = () => page.evaluate(() => __bv.route().page)
    for (const [p, params, parent] of [
      ["services", { side: "origin" }, "explorar"],
      ["housing", { side: "destination" }, "explorar"],
      ["refs", { side: "origin" }, "explorar"],
      ["provider", {}, "profile"],
      ["notifications", {}, "home"],
    ]) {
      await go(page, p, params)
      const c = await page.evaluate(() => ({
        n: document.querySelectorAll("#view .crumbs").length,
        title: document.title,
      }))
      if (c.n !== 1) bad.push(`${p}: ${c.n} trilhas`)
      await page.locator("#view .crumbs button").click()
      if ((await cur()) !== parent)
        bad.push(`${p}: trilha vai a ${await cur()} (esperado ${parent})`)
    }
    await go(page, "home")
    if (await page.evaluate(() => document.querySelectorAll("#view .crumbs").length))
      bad.push("Início não deveria ter trilha")
    await go(page, "services", { side: "origin" })
    await page.waitForTimeout(120)
    const t = await page.evaluate(() => ({
      title: document.title,
      live: document.getElementById("live").textContent,
    }))
    if (!/^Serviços/.test(t.title)) bad.push(`título: ${t.title}`)
    if (t.live !== "Serviços") bad.push(`anúncio: "${t.live}"`)
    await ctx.close()
    return [!bad.length, bad.slice(0, 4).join(" | ")]
  },
)
await probe(
  "P40",
  "Navegação",
  "janela: clique no fundo fecha, selecionar texto e soltar fora não fecha, rolagem do fundo trava; no celular a alça arrasta para fechar",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    const open = () => page.evaluate(() => __bv.overlayOpen())
    const outside = MOBILE() ? [195, 20] : [5, 450]
    await A(page, "openObj", { dtype: "provider", id: "p-amazon" })
    if (!(await page.evaluate(() => document.documentElement.classList.contains("has-overlay"))))
      bad.push("rolagem do fundo não trava")
    const b = await page.locator("#dlgTitle").boundingBox()
    await page.mouse.move(b.x + 10, b.y + 8)
    await page.mouse.down()
    await page.mouse.move(outside[0], outside[1], { steps: 4 })
    await page.mouse.up()
    if (!(await open())) bad.push("selecionar e soltar fora fechou a janela")
    await page.mouse.click(outside[0], outside[1])
    if (await open()) bad.push("clique no fundo não fecha")
    if (await page.evaluate(() => document.documentElement.classList.contains("has-overlay")))
      bad.push("rolagem do fundo não destrava")
    if (MOBILE()) {
      await A(page, "openObj", { dtype: "provider", id: "p-amazon" })
      await settle(page)
      const h = await page.locator(".sheet-handle").boundingBox()
      await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
      await page.mouse.down()
      await page.mouse.move(h.x + h.width / 2, h.y + 40, { steps: 5 })
      await page.mouse.up()
      const back = await page.evaluate(() => ({
        open: __bv.overlayOpen(),
        tf: document.getElementById("drawer").style.transform,
      }))
      if (!back.open || back.tf) bad.push(`arraste curto deveria voltar: ${JSON.stringify(back)}`)
      await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
      await page.mouse.down()
      await page.mouse.move(h.x + h.width / 2, h.y + 260, { steps: 8 })
      await page.mouse.up()
      if (await open()) bad.push("arraste longo da alça não fecha")
    } else if (
      (await page.locator(".sheet-handle").count()) &&
      (await page
        .locator(".sheet-handle")
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      bad.push("alça aparece no desktop")
    }
    await ctx.close()
    return [!bad.length, bad.slice(0, 4).join(" | ")]
  },
)
await probe(
  "P41",
  "Movimento",
  "com preferência normal a troca de tela e a janela animam; com movimento reduzido nenhuma passa de 1 ms",
  async () => {
    const bad = []
    for (const rm of ["no-preference", "reduce"]) {
      const ctx = await browser.newContext({ viewport: CUR, reducedMotion: rm })
      const page = await ctx.newPage()
      page.on("pageerror", (e) => pageErrors.push(e.message))
      await page.route(/unsplash\.com|fonts\.(googleapis|gstatic)\.com/, (r) => r.abort())
      await page.goto(PAGE_URL)
      await page.waitForFunction(() => window.__bv)
      await go(page, "services", { side: "origin" })
      const v = await page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector("#view > *"))
        return {
          enter: document.getElementById("view").classList.contains("enter"),
          name: cs.animationName,
          dur: parseFloat(cs.animationDuration),
        }
      })
      await A(page, "openTrust")
      const d = await page.evaluate(() => {
        const cs = getComputedStyle(document.getElementById("drawer"))
        return { name: cs.animationName, dur: parseFloat(cs.animationDuration) }
      })
      if (rm === "no-preference") {
        if (!v.enter || v.name === "none" || v.dur < 0.1)
          bad.push(`tela não anima: ${JSON.stringify(v)}`)
        if (d.name === "none" || d.dur < 0.1) bad.push(`janela não anima: ${JSON.stringify(d)}`)
      } else if (v.dur > 0.001 || d.dur > 0.001)
        bad.push(`movimento reduzido ignorado: ${JSON.stringify({ v, d })}`)
      await ctx.close()
    }
    return [!bad.length, bad.slice(0, 3).join(" | ")]
  },
)

/* ============ v35: MENUS DE CONTEXTO ============ */
const menuLabels = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("#ctxMenu .menu-item")].map((b) =>
      b.innerText.replace(/\s+/g, " ").trim(),
    ),
  )
await probe(
  "P42",
  "Menu de contexto",
  "botão ⋯: abre com foco no 1º item, setas/Home/End/letra movem, Esc devolve o foco ao botão, Tab fecha, aria-expanded acompanha; no celular vira folha",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await go(page, "services", { side: "origin" })
    const kb = page.locator(".service-card:not(.is-ad) .kebab").first()
    const focusIdx = () =>
      page.evaluate(() =>
        [...document.querySelectorAll("#ctxMenu .menu-item")].indexOf(document.activeElement),
      )
    if (
      (await kb.getAttribute("aria-haspopup")) !== "menu" ||
      (await kb.getAttribute("aria-expanded")) !== "false"
    )
      bad.push("botão sem aria-haspopup/aria-expanded=false")
    await kb.click()
    await settle(page)
    const o = await page.evaluate(() => {
      const m = document.getElementById("ctxMenu")
      const r = m?.getBoundingClientRect()
      const cs = m && getComputedStyle(m)
      return {
        role: m?.getAttribute("role"),
        n: m?.querySelectorAll("[role=menuitem]").length,
        foc: document.activeElement?.getAttribute("role"),
        pos: cs?.position,
        title: m && getComputedStyle(m.querySelector(".menu-title")).display,
        inside: r && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
        label: m?.getAttribute("aria-label"),
      }
    })
    if (o.role !== "menu" || o.n < 5 || o.foc !== "menuitem")
      bad.push(`abertura: ${JSON.stringify(o)}`)
    if (!o.inside) bad.push("menu fora da tela")
    if (!/^Manutenção|^Frio|^Manaus|^Clínica|^Amazon/.test(o.label || ""))
      bad.push(`menu sem nome acessível do item: ${o.label}`)
    if (MOBILE() ? o.pos !== "fixed" || o.title === "none" : o.pos !== "absolute")
      bad.push(`layout do tamanho de tela: ${o.pos}/${o.title}`)
    if ((await kb.getAttribute("aria-expanded")) !== "true") bad.push("aria-expanded não vira true")
    if ((await focusIdx()) !== 0) bad.push("foco não começa no 1º item")
    await page.keyboard.press("ArrowDown")
    if ((await focusIdx()) !== 1) bad.push("ArrowDown não avança")
    await page.keyboard.press("End")
    const n = (await menuLabels(page)).length
    if ((await focusIdx()) !== n - 1) bad.push("End não vai ao último")
    await page.keyboard.press("ArrowDown")
    if ((await focusIdx()) !== 0) bad.push("ArrowDown no último não volta ao primeiro")
    await page.keyboard.press("Home")
    await page.keyboard.press("ArrowUp")
    if ((await focusIdx()) !== n - 1) bad.push("ArrowUp no primeiro não vai ao último")
    await page.keyboard.press("Home")
    await page.keyboard.press("s")
    const lab = await page.evaluate(() => document.activeElement.innerText.trim())
    if (!/^S/i.test(lab)) bad.push(`letra 's' foi para "${lab}"`)
    await page.keyboard.press("Escape")
    const c = await page.evaluate(() => ({
      gone: !document.getElementById("ctxMenu"),
      foc: document.activeElement?.classList.contains("kebab"),
      exp: document.querySelector(".service-card:not(.is-ad) .kebab").getAttribute("aria-expanded"),
    }))
    if (!c.gone || !c.foc || c.exp !== "false") bad.push(`Esc: ${JSON.stringify(c)}`)
    await kb.click()
    await page.keyboard.press("Tab")
    const t = await page.evaluate(() => ({
      gone: !document.getElementById("ctxMenu"),
      foc: document.activeElement?.classList.contains("kebab"),
    }))
    if (!t.gone || !t.foc) bad.push(`Tab não fecha e devolve o foco: ${JSON.stringify(t)}`)
    await kb.click()
    await page.mouse.click(2, 2)
    if (await page.evaluate(() => !!document.getElementById("ctxMenu")))
      bad.push("clique fora não fecha")
    if (await page.evaluate(() => __bv.overlayOpen() || __bv.route().page !== "services"))
      bad.push("clique fora acionou o que estava por baixo")
    await ctx.close()
    return [!bad.length, bad.slice(0, 4).join(" | ")]
  },
)
const MENU_CASES = [
  [
    "prestador orgânico",
    "services",
    { side: "origin" },
    ".service-card:not(.is-ad) .kebab",
    { has: ["Por que apareceu", "Ocultar este prestador", "Denunciar"] },
  ],
  [
    "prestador anúncio",
    "services",
    { side: "origin" },
    ".service-card.is-ad .kebab",
    { has: ["Ocultar este anúncio", "Denunciar anúncio"], not: /Por que apareceu/ },
  ],
  [
    "imóvel",
    "housing",
    { side: "destination" },
    ".listing:not(.is-ad) .kebab",
    { has: ["Ocultar este imóvel"] },
  ],
  [
    "imóvel anúncio",
    "housing",
    { side: "destination" },
    ".listing.is-ad .kebab",
    { has: ["Ocultar este anúncio"], not: /Por que apareceu/ },
  ],
  [
    "desapego",
    "market",
    { side: "destination" },
    ".listing .kebab",
    { has: ["Falar com o vendedor"] },
  ],
  [
    "evento",
    "events",
    { side: "origin" },
    ".listing:not(.is-ad) .kebab",
    { has: ["Confirmar presença"] },
  ],
  [
    "evento anúncio",
    "events",
    { side: "origin" },
    ".listing.is-ad .kebab",
    { has: ["Ocultar este anúncio"], not: /Por que apareceu/ },
  ],
  ["benefício", "benefits", { side: "origin" }, ".listing .kebab", { has: ["Ver como usar"] }],
  ["referência", "refs", { side: "origin" }, ".ref-card .kebab", { has: ["Sugerir correção"] }],
  [
    "pergunta",
    "community",
    { id: "ajuricaba" },
    ".question .kebab",
    { has: ["Abrir pergunta", "Denunciar"] },
  ],
  [
    "necessidade",
    "home",
    {},
    ".continue-card .kebab",
    { has: ["Ver caminhos", "Encerrar necessidade"] },
  ],
  ["conversa", "messages", {}, ".inbox-item .kebab", { has: ["Arquivar", "Silenciar"] }],
  ["aviso", "notifications", {}, ".notice-card .kebab", { has: ["Abrir", "Dispensar"] }],
  ["cartão da Início", "home", {}, ".feed-card .kebab", { has: ["Salvar"] }],
  [
    "resultado do Resolver",
    "resolver",
    { q: "preciso instalar um split" },
    "#results .result-card .kebab",
    { has: ["Pedir orçamento"] },
  ],
  // Anúncio próprio: a lista é outra (encerrar em vez de ocultar ou denunciar). A publicação é semeada
  // direto no estado porque o teste de menu não quer depender do formulário.
  [
    "imóvel próprio",
    "housing",
    { side: "origin" },
    ".listing[data-mown] .kebab",
    { has: ["Ver detalhes", "Encerrar anúncio"], not: /Ocultar|Denunciar|Por que apareceu/ },
    (page) =>
      page.evaluate(() => {
        __bv.S.own.housing.unshift({
          id: "h-own1",
          mine: true,
          city: "manaus",
          title: "Apartamento",
          bairro: "Flores",
          beds: 2,
          m2: 0,
          rent: 2000,
          from: "2026-11-01",
          furnished: false,
          tags: ["apartamento"],
          img: "1600210492486-724fe5c67fb0",
          owner: "Você",
        })
      }),
  ],
  [
    "desapego próprio",
    "market",
    { side: "origin" },
    ".listing[data-mown] .kebab",
    { has: ["Ver detalhes", "Encerrar anúncio"], not: /Ocultar|Denunciar|Falar com/ },
    (page) =>
      page.evaluate(() => {
        __bv.S.own.market.unshift({
          id: "m-own1",
          mine: true,
          city: "manaus",
          title: "Cadeira",
          price: 120,
          cat: "moveis",
          window: "2026-10-10",
          seller: "Você",
          img: "1555041469-a586c61ea9bc",
          appears: 0,
        })
      }),
  ],
  [
    "evento próprio",
    "events",
    { side: "origin" },
    ".listing[data-mown] .kebab",
    { has: ["Ver detalhes"], not: /Ocultar|Denunciar|Confirmar presença/ },
    (page) =>
      page.evaluate(() => {
        __bv.S.own.events.unshift({
          id: "e-own1",
          mine: true,
          city: "manaus",
          community: "ajuricaba",
          title: "Encontro",
          date: "2026-10-10",
          time: "10h",
          place: "Praça",
          img: "1529156069898-49953e39b3ac",
          going: 0,
          organizer: "Você",
        })
      }),
  ],
  [
    "pergunta própria",
    "community",
    { id: "ajuricaba" },
    ".question[data-mown] .kebab",
    { has: ["Abrir pergunta"], not: /Ocultar|Denunciar/ },
  ],
]
await probe(
  "P43",
  "Menu de contexto",
  "varredura: cada item de cada menu (15 tipos de terceiros e 4 de anúncio próprio) faz efeito; botão ⋯ visível e na ordem de Tab; clique direito abre a mesma lista; anúncio nunca oferece 'por que apareceu'",
  async () => {
    const bad = []
    let total = 0
    const effect = (page) =>
      page.evaluate(() =>
        JSON.stringify([
          __bv.route(),
          __bv.S,
          __bv.toastN(),
          __bv.overlayOpen(),
          document.querySelector("#view").innerHTML.length,
        ]),
      )
    for (const [name, p, params, sel, exp, seed] of MENU_CASES) {
      let n = 0
      {
        const { ctx, page } = await fresh()
        if (seed) await seed(page)
        await go(page, p, params)
        if (!(await page.locator(sel).count())) {
          bad.push(`${name}: sem botão ⋯ em ${p}`)
          await ctx.close()
          continue
        }
        const kbEl = page.locator(sel).first()
        if (!(await kbEl.isVisible())) {
          bad.push(`${name}: botão ⋯ não está visível`)
          await ctx.close()
          continue
        }
        if (!(await kbEl.evaluate((e) => e.matches("button") && e.tabIndex >= 0)))
          bad.push(`${name}: botão ⋯ fora da ordem de Tab`)
        await kbEl.click()
        const labels = await menuLabels(page)
        n = labels.length
        await page.keyboard.press("Escape")
        await kbEl.locator("xpath=ancestor::*[@data-mt][1]").click({ button: "right" })
        const viaRight = await menuLabels(page)
        if (JSON.stringify(viaRight) !== JSON.stringify(labels))
          bad.push(
            `${name}: clique direito abre [${viaRight.join("|")}], o botão abre [${labels.join("|")}]`,
          )
        for (const h of exp.has)
          if (!labels.some((l) => l === h))
            bad.push(`${name}: falta "${h}" em [${labels.join("|")}]`)
        if (exp.not && labels.some((l) => exp.not.test(l))) bad.push(`${name}: ${exp.not} presente`)
        await ctx.close()
      }
      for (let i = 0; i < n; i++) {
        const { ctx, page } = await fresh()
        if (seed) await seed(page)
        await go(page, p, params)
        await page.locator(sel).first().click()
        const before = await effect(page)
        const label = (await menuLabels(page))[i]
        await page.locator("#ctxMenu .menu-item").nth(i).click()
        await page.waitForTimeout(30)
        const after = await effect(page)
        total++
        if (before === after) bad.push(`${name}: "${label}" não faz nada`)
        if (await page.evaluate(() => !!document.getElementById("ctxMenu")))
          bad.push(`${name}: menu não fecha após "${label}"`)
        await ctx.close()
      }
    }
    return [!bad.length, `${total} itens varridos · ${bad.slice(0, 4).join(" | ")}`]
  },
)
await probe(
  "P44",
  "Menu de contexto",
  "ocultar, denunciar, arquivar, silenciar e dispensar mudam o estado de verdade, têm 'Desfazer' e ficam gerenciáveis em Você",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    const cards = () => page.locator(".service-card").count()
    const pick = async (sel, label) => {
      await page.locator(sel).first().click()
      await page.locator("#ctxMenu .menu-item", { hasText: new RegExp(`^${label}`) }).click()
    }
    const undo = async () => {
      if (!(await page.locator("#toastUndo").isVisible())) return false
      await page.locator("#toastUndo").click()
      return true
    }
    // ocultar prestador
    await go(page, "services", { side: "origin" })
    const n0 = await cards()
    await pick(".service-card:not(.is-ad) .kebab", "Ocultar este prestador")
    if ((await cards()) !== n0 - 1) bad.push(`ocultar: ${n0} → ${await cards()}`)
    if (!(await undo())) bad.push("ocultar sem Desfazer")
    if ((await cards()) !== n0) bad.push("Desfazer não trouxe o prestador de volta")
    await pick(".service-card:not(.is-ad) .kebab", "Ocultar este prestador")
    await search(page, "preciso instalar um split")
    const hiddenId = await page.evaluate(() => Object.keys(__bv.S.hidden)[0]?.split(":")[1])
    const inResults = await page.evaluate(
      (id) => !!document.querySelector(`#results [data-id="${id}"]`),
      hiddenId,
    )
    if (inResults) bad.push("prestador oculto ainda aparece no Resolver")
    await go(page, "profile")
    if (!/Itens ocultos/.test(await view(page))) bad.push("Você não lista itens ocultos")
    await page.locator("#view [data-act=unhideItem]").first().click()
    await go(page, "services", { side: "origin" })
    if ((await cards()) !== n0) bad.push("Mostrar de novo não devolveu o prestador")
    // anúncio oculto some, com a faixa
    await pick(".service-card.is-ad .kebab", "Ocultar este anúncio")
    if (
      (await page.locator(".ad-band .is-ad").count()) !==
      (await page.evaluate(
        () => __bv.DB.providers.filter((p) => p.city === "manaus" && p.campaign).length,
      )) -
        1
    )
      bad.push("anúncio oculto continua na faixa")
    // denunciar imóvel: motivo registrado, sem texto livre, item oculto
    await go(page, "housing", { side: "destination" })
    const h0 = await page.locator(".listing:not(.is-ad)").count()
    await pick(".listing:not(.is-ad) .kebab", "Denunciar")
    await page.locator("#drawer input[value=scam]").check()
    await page.locator("#drawer button[type=submit]").click()
    const rep = await S(page, (S) =>
      S.reports.map((r) => `${Object.keys(r).sort().join(",")}:${r.reason}`),
    )
    if (rep.length !== 1 || !/scam$/.test(rep[0]) || /text|msg|note/.test(rep[0]))
      bad.push(`denúncia: ${JSON.stringify(rep)}`)
    if ((await page.locator(".listing:not(.is-ad)").count()) !== h0 - 1)
      bad.push("denunciado não foi ocultado")
    // conversa: arquivar (com Desfazer), ver arquivadas, silenciar tira do contador
    await go(page, "messages")
    const c0 = await page.locator(".inbox-item").count()
    await pick(".inbox-item .kebab", "Silenciar")
    if (
      (await page.locator("#msgBadge").isVisible()) &&
      (await page.locator("#msgBadge").textContent()) !== "0"
    )
      bad.push("conversa silenciada ainda conta como não lida")
    if (await page.evaluate(() => __bv.deriveNotifs().some((n) => /respondeu/.test(n.title))))
      bad.push("conversa silenciada ainda gera aviso")
    await undo()
    await pick(".inbox-item .kebab", "Arquivar")
    if ((await page.locator(".inbox-item").count()) !== c0 - 1)
      bad.push("arquivar não tirou da lista")
    await page.locator("#view .inbox-foot").click()
    if ((await page.locator(".inbox-item").count()) !== 1)
      bad.push("Ver arquivadas não mostra a conversa")
    await pick(".inbox-item .kebab", "Desarquivar")
    await page
      .locator("#view .inbox-foot")
      .click()
      .catch(() => {})
    // aviso: dispensar com Desfazer
    await go(page, "notifications")
    const a0 = await page.locator(".notice-card").count()
    await pick(".notice-card .kebab", "Dispensar")
    if ((await page.locator(".notice-card").count()) !== a0 - 1)
      bad.push("dispensar não tirou o aviso")
    await undo()
    if ((await page.locator(".notice-card").count()) !== a0) bad.push("Desfazer não trouxe o aviso")
    await pick(".notice-card .kebab", "Marcar como lida")
    if (!(await page.locator("#ctxMenu").count()) === false) bad.push("menu ficou aberto")
    // necessidade: encerrar com Desfazer restaura o estado
    await go(page, "home")
    const nid = await page.locator(".continue-card").first().getAttribute("data-mid")
    const st0 = await S(page, (S, id) => S.needs.find((n) => n.id === id).status, nid)
    await pick(".continue-card .kebab", "Encerrar necessidade")
    if ((await S(page, (S, id) => S.needs.find((n) => n.id === id).status, nid)) !== "abandoned")
      bad.push("encerrar não encerra")
    await undo()
    if ((await S(page, (S, id) => S.needs.find((n) => n.id === id).status, nid)) !== st0)
      bad.push("Desfazer não restaura a necessidade")
    // salvar pelo coração e desfazer
    await go(page, "housing", { side: "destination" })
    await page.locator(".listing .heart").first().click()
    if ((await page.locator(".listing .heart[aria-pressed=true]").count()) !== 1)
      bad.push("coração não salva")
    await undo()
    if ((await page.locator(".listing .heart[aria-pressed=true]").count()) !== 0)
      bad.push("Desfazer não desfaz o salvamento")
    await ctx.close()
    return [!bad.length, bad.slice(0, 4).join(" | ")]
  },
)
await probe(
  "P45",
  "Menu de contexto",
  "portas alternativas: clique direito e tecla de menu abrem o mesmo menu; toque longo abre a folha sem abrir o cartão; toque curto ainda abre o cartão",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await go(page, "services", { side: "origin" })
    const card = page.locator(".service-card:not(.is-ad)").first()
    await page.locator(".service-card:not(.is-ad) .kebab").first().click()
    const viaButton = await menuLabels(page)
    await page.keyboard.press("Escape")
    // clique direito
    const box = await card.boundingBox()
    await page.mouse.click(box.x + 200, box.y + 30, { button: "right" })
    const viaRight = await menuLabels(page)
    if (JSON.stringify(viaRight) !== JSON.stringify(viaButton))
      bad.push(`clique direito ≠ botão: [${viaRight.join("|")}]`)
    const pos = await page.evaluate(() => {
      const r = document.getElementById("ctxMenu")?.getBoundingClientRect()
      return r && { l: r.left, t: r.top, r: r.right, b: r.bottom }
    })
    if (!MOBILE() && pos && (pos.l < 0 || pos.r > 1440 || pos.b > 900))
      bad.push("menu do clique direito fora da tela")
    await page.keyboard.press("Escape")
    // clique direito num texto selecionado dentro de campo não é sequestrado
    await go(page, "resolver")
    await page.fill("#rq", "texto")
    await page.locator("#rq").click({ button: "right" })
    if (await page.evaluate(() => !!document.getElementById("ctxMenu")))
      bad.push("clique direito em campo de texto abriu o menu do app")
    // tecla de menu
    await go(page, "services", { side: "origin" })
    await page.locator(".service-card:not(.is-ad) .card-link").first().focus()
    await page.keyboard.press("Shift+F10")
    if (!(await page.evaluate(() => !!document.getElementById("ctxMenu"))))
      bad.push("Shift+F10 não abre o menu")
    else {
      await page.keyboard.press("Escape")
      if (!(await page.evaluate(() => document.activeElement?.classList.contains("kebab"))))
        bad.push("foco não voltou ao botão ⋯ depois da tecla de menu")
    }
    await ctx.close()
    // toque longo × toque curto (celular com toque)
    const mctx = await browser.newContext({
      viewport: MOB,
      hasTouch: true,
      reducedMotion: MOTION,
    })
    const mp = await mctx.newPage()
    mp.on("pageerror", (e) => pageErrors.push(e.message))
    await mp.route(/unsplash\.com|fonts\.(googleapis|gstatic)\.com/, (r) => r.abort())
    await mp.goto(PAGE_URL)
    await mp.waitForFunction(() => window.__bv)
    await go(mp, "services", { side: "origin" })
    const cdp = await mctx.newCDPSession(mp)
    const link = mp.locator(".service-card:not(.is-ad) .card-link").first()
    await link.scrollIntoViewIfNeeded()
    const lb = await mp.locator(".service-card:not(.is-ad)").first().boundingBox()
    const pt = { x: lb.x + 160, y: lb.y + 40, id: 1 }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] })
    await mp.waitForTimeout(700)
    const during = await mp.evaluate(() => !!document.getElementById("ctxMenu"))
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
    await mp.waitForTimeout(150)
    const after = await mp.evaluate(() => ({
      menu: !!document.getElementById("ctxMenu"),
      drawer: __bv.overlayOpen(),
      sheet: getComputedStyle(document.getElementById("ctxMenu") || document.body).position,
    }))
    if (!during || !after.menu)
      bad.push(`toque longo não abre/mantém o menu: ${JSON.stringify({ during, after })}`)
    if (after.drawer) bad.push("toque longo também abriu o cartão")
    if (after.menu && after.sheet !== "fixed") bad.push("no celular o menu deveria ser folha")
    await mp.keyboard.press("Escape")
    await mp.waitForTimeout(50)
    await link.tap()
    await mp.waitForTimeout(80)
    if (!(await mp.evaluate(() => __bv.overlayOpen() && !document.getElementById("ctxMenu"))))
      bad.push("toque curto não abre o cartão")
    await mctx.close()
    return [!bad.length, bad.slice(0, 4).join(" | ")]
  },
)

/* ============ v35: FORMULÁRIOS ============ */
await probe(
  "P46",
  "Formulários",
  "validação inline: erro junto do campo (aria-invalid + aria-describedby), foco no primeiro, nada é enviado; corrigir limpa; consentimento exige marcar; painel do prestador com rótulos visíveis",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    const info = (id) =>
      page.evaluate((id) => {
        const el = document.getElementById(id)
        const m = (el?.getAttribute("aria-describedby") || "")
          .split(" ")
          .map((x) => document.getElementById(x))
          .find((x) => x?.classList.contains("err-msg"))
        return {
          inv: el?.getAttribute("aria-invalid"),
          msg: m?.innerText.trim(),
          focus: document.activeElement?.id === id,
        }
      }, id)
    const state0 = await S(page, (S) =>
      JSON.stringify([S.own, S.needs.length, S.convs.length, S.membership]),
    )
    // se a validação falhar em segurar o envio, a prévia abre e os campos somem: reabre o formulário
    // para as verificações seguintes acusarem por asserção, e não por tempo esgotado
    const reopen = async () => {
      if (!/Prévia/.test(await drawer(page))) return
      await A(page, "closeDrawer")
      await A(page, "openOffer", { type: "sell" })
    }
    await A(page, "openOffer", { type: "sell" })
    await page.locator("#drawer button[type=submit]").click()
    let t = await info("o-title")
    if (t.inv !== "true" || !/Preencha/.test(t.msg || "") || !t.focus)
      bad.push(`título vazio: ${JSON.stringify(t)}`)
    if ((await info("o-price")).inv !== "true") bad.push("preço vazio sem erro")
    if (/Prévia/.test(await drawer(page))) {
      bad.push("avançou com campos vazios")
      await reopen()
    }
    await page.fill("#o-title", "Mesa")
    await page.fill("#o-price", "abc")
    await page.locator("#drawer button[type=submit]").click()
    t = await info("o-price")
    if (t.inv !== "true" || !/número/.test(t.msg || ""))
      bad.push(`preço inválido: ${JSON.stringify(t)}`)
    if (/Prévia/.test(await drawer(page))) {
      await reopen()
      await page.fill("#o-title", "Mesa")
    }
    await page.fill("#o-price", "120")
    if ((await info("o-price")).inv === "true") bad.push("o erro não some ao corrigir")
    await page.locator("#drawer button[type=submit]").click()
    if (!/Prévia/.test(await drawer(page))) bad.push("formulário válido não avança")
    await A(page, "closeDrawer")
    await A(page, "openJoin", { id: "arrivalsBsb" })
    await page.locator("#drawer button[type=submit]").click()
    const ck = await page.evaluate(() => {
      const c = document.querySelector("#drawer input[name=ok]")
      return {
        inv: c?.getAttribute("aria-invalid"),
        msg: document.getElementById(c?.getAttribute("aria-describedby") || "x")?.innerText.trim(),
        member: __bv.S.membership.arrivalsBsb,
      }
    })
    if (ck.inv !== "true" || !/Marque/.test(ck.msg || "") || ck.member)
      bad.push(`consentimento: ${JSON.stringify(ck)}`)
    await A(page, "closeDrawer")
    await go(page, "provider")
    const lbl = await page.evaluate(() => {
      const ls = [...document.querySelectorAll(".proposal-form label")]
      return (
        ls.length >= 4 &&
        ls.every((l) => l.offsetParent !== null && !l.classList.contains("sr-only"))
      )
    })
    if (!lbl) bad.push("rótulos do painel do prestador não estão visíveis")
    await page.locator(".proposal-form button[type=submit]").first().click()
    if (
      (await page
        .locator(".proposal-form:first-of-type .field.err, .req:first-child .field.err")
        .count()) !== 2
    )
      bad.push("proposta vazia não acusa os dois campos")
    const state1 = await S(page, (S) =>
      JSON.stringify([S.own, S.needs.length, S.convs.length, S.membership]),
    )
    if (state0 !== state1) bad.push("formulário inválido alterou o estado")
    await ctx.close()
    return [!bad.length, bad.slice(0, 4).join(" | ")]
  },
)

await probe(
  "P47",
  "Formulários",
  "ligar conversa a uma necessidade: sem nenhuma necessidade ativa o formulário abre com uma opção marcada, envia sem erro de JS e cria a necessidade ligada",
  async () => {
    const { ctx, page } = await fresh()
    const bad = []
    await page.evaluate(() => {
      for (const n of __bv.S.needs) n.status = "abandoned"
    })
    await go(page, "messages", { id: "c-house" })
    await page.locator("#view [data-act=linkNeed]").click()
    const r = await page.evaluate(() => ({
      checked: [...document.querySelectorAll("#drawer input[name=need]:checked")].map(
        (i) => i.value,
      ),
      total: document.querySelectorAll("#drawer input[name=need]").length,
    }))
    if (r.checked.length !== 1 || r.checked[0] !== "new")
      bad.push(`opção marcada: ${JSON.stringify(r)}`)
    const n0 = await S(page, (S) => S.needs.length)
    await page.locator("#drawer button[type=submit]").click()
    const after = await page.evaluate(() => {
      const cv = __bv.S.convs.find((c) => c.id === "c-house")
      return {
        needs: __bv.S.needs.length,
        linked: cv.needId,
        exists: !!__bv.needById(cv.needId),
        open: __bv.overlayOpen(),
      }
    })
    if (after.needs !== n0 + 1 || !after.linked || !after.exists)
      bad.push(`ligar sem necessidades: ${JSON.stringify(after)}`)
    await ctx.close()
    return [!bad.length, bad.slice(0, 3).join(" | ")]
  },
)

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(
  `\n${results.length - failed.length}/${results.length} verificações passaram (${new Set(results.map((r) => r.id.split("@")[0])).size} sondas; a maioria roda em 1440 e em 390 px)`,
)
if (pageErrors.length) console.log("erros JS acumulados:", [...new Set(pageErrors)].slice(0, 5))
process.exit(failed.length ? 1 : 0)
