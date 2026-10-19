import {
  action,
  addChips,
  choose,
  dialogKind,
  expect,
  fill,
  go,
  reload,
  runProof,
  settle,
  snapshot,
  stored,
  toast,
} from "./proof-harness.mjs"

// Rodada 06: fechamento. (1) Promessas da tela de planos: modo teste,
// sem pagamento, pagar não altera a ordem, conteúdo pago identificado. (2) Varredura
// "nenhum botão morto" nas TELAS: cada ação visível fora de diálogos precisa produzir
// efeito observável. Botões dentro de diálogos são cobertos pelas provas das rodadas.
// Os checkpoints de planos e patrocínio são observação: a aprovação comercial é R3
// (RISK_MATRIX) e depende de ADR aprovado por pessoa.
const ROUTES = [
  "inicio",
  "busca",
  "catalogo",
  "negocios",
  "comunidade",
  "agenda",
  "guia",
  "salvos",
  "meus-anuncios",
  "voce",
  "conversas",
  "pedidos",
]
// Rotas de detalhe montadas a partir do estado de exemplo.
async function detailRoutes(page) {
  const s = await snapshot(page)
  const city = s.homeCity
  const item = s.items.find((x) => x.city === city && !x.mine && x.status === "active")
  const mine = s.items.find((x) => x.mine)
  const biz = s.biz.find((x) => x.city === city && x.claimed !== false)
  const group = s.groups.find((x) => x.city === city && x.on && x.posts?.length)
  const ask = s.asks.find((x) => x.city === city && x.answers.length)
  const event = s.events.find((x) => x.city === city && !x.mine)
  const thread = s.threads.find((x) => !x.deleted)
  return [
    item && `anuncio/${item.id}`,
    mine && `anuncio/${mine.id}`,
    biz && `negocio/${biz.id}`,
    group && `grupo/${group.id}`,
    group && `publicacao/${group.id}~${group.posts[0].id}`,
    ask && `pergunta/${ask.id}`,
    event && `evento/${event.id}`,
    thread && `conversa/${thread.id}`,
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
    return JSON.stringify({
      hash: location.hash,
      dialog: d?.open ? h(d.innerText) : 0,
      confirm: !!c?.open,
      // Rodada 23: painel de filtros (dialog nativo) também é resposta visível.
      panel: document.querySelector("#filter-panel")?.open
        ? h(document.querySelector("#filter-panel").innerText)
        : 0,
      // offsetParent é nulo para position:fixed; mede a caixa visível do menu.
      menu: (() => {
        const m = document.querySelector("#create-menu")
        return (
          !!m &&
          !m.hidden &&
          m.getBoundingClientRect().height > 0 &&
          getComputedStyle(m).visibility !== "hidden"
        )
      })(),
      toast: document.querySelector("#snackbar.show")?.innerText ?? "",
      live: [...document.querySelectorAll("[aria-live],[role=alert],[role=status]")]
        .map((e) => e.textContent.trim())
        .join("|"),
      main: h(document.querySelector("#main")?.innerHTML ?? ""),
      store: h(localStorage.getItem("bivaque-material-web-v3") ?? ""),
      opened: (window.__opened ?? []).length,
      clip: window.__clip ?? 0,
      // Rodada 10: respostas rápidas só preenchem o campo de mensagem.
      fields: h(
        [...document.querySelectorAll("md-outlined-text-field,md-filled-text-field,input,textarea")]
          .map((e) => e.value ?? "")
          .join("|"),
      ),
      shared: window.__shared ?? 0,
    })
  })

const checkpoints = {
  async "plans-test-mode-no-ranking-change"(page) {
    await go(page, "negocios")
    const before = await page
      .locator('#main [data-action="open-biz"]')
      .evaluateAll((els) => els.map((e) => e.dataset.value))
    await snapshot(page)
    // "Planos" fica nas métricas da página do próprio negócio: cria uma antes.
    await go(page, "voce")
    await action(page, "my-biz")
    await fill(page, "biz-name", "Marcenaria Teste")
    await choose(page, "biz-category")
    await fill(page, "biz-hours", "Seg a sex, 8h às 18h")
    await addChips(page, "biz-hoods", ["Centro"])
    await addChips(page, "biz-services", ["Móveis sob medida"])
    await action(page, "submit-biz")
    await go(page, "negocios")
    const beforeOwn = await page
      .locator('#main [data-action="open-biz"]')
      .evaluateAll((els) => els.map((e) => e.dataset.value))
    await go(page, `negocio/${(await stored(page)).myBiz.id}`)
    await action(page, "plans")
    expect((await dialogKind(page)) !== null, "planos não abriu")
    const text = await page.locator("#dialog").innerText()
    expect(
      /nenhum pagamento/i.test(text) && /não altera a ordem/i.test(text),
      "tela de planos sem as garantias",
    )
    await page.locator('#dialog md-radio[value="plan"]').click()
    await action(page, "activate-plan")
    expect((await stored(page)).subscription.tier === "plan", "plano de teste não salvo")
    expect(/nenhum pagamento/i.test(await toast(page)), "ativação sem aviso de modo teste")
    await reload(page)
    await go(page, "negocios")
    const after = await page
      .locator('#main [data-action="open-biz"]')
      .evaluateAll((els) => els.map((e) => e.dataset.value))
    expect(before.length > 0, "lista de negócios vazia")
    expect(
      JSON.stringify(beforeOwn) === JSON.stringify(after),
      "plano alterou a ordem dos negócios",
    )
  },
  async "sponsored-is-labeled"(page) {
    const s = await snapshot(page)
    const spon = s.biz.filter((b) => b.city === s.homeCity && b.spon && b.claimed !== false)
    if (!spon.length) return
    await go(page, "inicio")
    const section = page.locator(".sponsored-section")
    if (await section.count())
      expect(/Patrocinado/.test(await section.innerText()), "destaque pago sem rótulo")
    for (const b of spon) {
      await go(page, `negocio/${b.id}`)
      expect(
        /Patrocinado/.test(await page.locator("#main").innerText()),
        `${b.name}: página paga sem rótulo`,
      )
    }
  },
  async "report-does-not-claim-success"(page) {
    const s = await snapshot(page)
    const item = s.items.find((x) => x.city === s.homeCity && !x.mine)
    await go(page, `anuncio/${item.id}`)
    await page.locator('[data-action="report"]:visible').first().click()
    await settle(page)
    expect((await dialogKind(page)) !== null, "denunciar sem resposta")
    const text = (await page.locator("#dialog").innerText()) + (await toast(page))
    expect(!/denúncia (enviada|registrada)/i.test(text), "anunciou denúncia que não existe")
  },
  async "voted-poll-answers"(page) {
    const s = await snapshot(page)
    const g = s.groups.find(
      (x) => x.city === s.homeCity && x.on && x.posts.some((p) => p.poll && p.poll.voted == null),
    )
    expect(g, "sem enquete aberta em grupo do qual a pessoa participa")
    const p = g.posts.find((y) => y.poll && y.poll.voted == null)
    await go(page, `publicacao/${g.id}~${p.id}`)
    await page.locator(`[data-action="vote-poll"][data-value="${g.id}|${p.id}|0"]`).click()
    await settle(page)
    expect(
      (await stored(page)).groups.find((x) => x.id === g.id).posts.find((y) => y.id === p.id).poll
        .voted === 0,
      "voto não salvo",
    )
    // Opção já bloqueada (aria-disabled) ainda recebe clique de mouse: precisa responder.
    await page
      .locator(`[data-action="vote-poll"][data-value="${g.id}|${p.id}|1"]`)
      .dispatchEvent("click")
    await settle(page)
    expect(/já foi registrado/i.test(await toast(page)), "segundo voto sem resposta")
  },
  async "sweep-detects-dead-control"(page) {
    // Controle negativo da régua: um botão que cai em `return true` sem efeito
    // (curtir publicação inexistente) precisa ser classificado como sem resposta.
    await go(page, "inicio")
    await page.evaluate(() => {
      const b = document.createElement("button")
      b.type = "button"
      b.textContent = "controle"
      b.dataset.action = "like-post"
      b.dataset.value = "grupo-inexistente|post-inexistente"
      b.style.cssText = "position:fixed;top:120px;left:20px;z-index:9999"
      document.body.append(b)
    })
    const before = await signature(page)
    await page.locator('[data-value="grupo-inexistente|post-inexistente"]').click()
    await page.waitForTimeout(450)
    expect(before === (await signature(page)), "régua da varredura deu falso positivo de resposta")
  },
  async "no-dead-buttons"(page) {
    await page.addInitScript(() => {
      window.__clip = 0
      // Folha nativa de compartilhamento simulada: em navegador sem tela ela seria cancelada.
      window.__shared = 0
      navigator.share = async () => {
        window.__shared++
      }
      const w = navigator.clipboard?.writeText?.bind(navigator.clipboard)
      if (navigator.clipboard)
        navigator.clipboard.writeText = (t) => {
          window.__clip++
          return w ? w(t).catch(() => {}) : Promise.resolve()
        }
    })
    await reload(page)
    const routes = [...ROUTES, ...(await detailRoutes(page))]
    const dead = []
    const unclickable = []
    const unclickableReasons = []
    let clicked = 0
    for (const r of routes) {
      await go(page, r)
      const targets = await page.locator("[data-action]:visible").evaluateAll((els) => [
        ...new Map(
          els
            .filter(
              (e) =>
                !e.disabled &&
                !e.hasAttribute("disabled") &&
                e.getAttribute("aria-disabled") !== "true" &&
                e.dataset.action !== "noop" &&
                // Filtro já selecionado não muda nada por definição.
                !e.hasAttribute("selected") &&
                e.getAttribute("aria-selected") !== "true" &&
                e.getAttribute("aria-pressed") !== "true",
            )
            .filter((e) => !e.closest("#dialog,#confirm-dialog,#create-menu,#snackbar"))
            .map((e) => [
              `${e.dataset.action}|${e.dataset.value ?? ""}`,
              [e.dataset.action, e.dataset.value ?? null],
            ]),
        ).values(),
      ])
      for (const [name, value] of targets) {
        // Recarga completa por alvo: toasts e timers do clique anterior não vazam.
        // O foco não entra na assinatura: o próprio clique o move para o botão.
        await page.goto(`${page.url().split("#")[0]}#${r}`)
        await page.reload()
        await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
        // A barra inferior recolhe ao rolar (design): volta ao topo para ela reaparecer.
        await page.evaluate(() => {
          window.scrollTo(0, 0)
          window.dispatchEvent(new Event("scroll"))
        })
        await settle(page)
        const sel =
          value === null
            ? `[data-action="${name}"]:not([data-value])`
            : `[data-action="${name}"][data-value=${JSON.stringify(value)}]`
        const el = page.locator(`${sel}:visible`).first()
        if (!(await el.count())) continue
        // O estado muda durante a varredura (ex.: enquete já votada fica aria-disabled).
        const why = await el.evaluate((e) => {
          if (e.getAttribute("aria-disabled") === "true") return "disabled"
          const r = e.getBoundingClientRect()
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          return e.contains(top) ? "" : `coberto por ${top?.id || top?.className || top?.tagName}`
        })
        if (why === "disabled") continue
        if (why) unclickableReasons.push(why)
        // Aba da própria rota não muda nada por definição.
        if (name === "nav" && value === r) continue
        const before = await signature(page)
        let ok = await el.click({ timeout: 4000 }).then(
          () => true,
          (err) => {
            unclickableReasons.push(
              err.message
                .split(/\r?\n/)
                .filter((l) => /intercept|stable|outside|enabled|visible/i.test(l))
                .slice(-1)[0]
                ?.trim() ?? "erro",
            )
            return false
          },
        )
        if (!ok) {
          // Como uma pessoa faria: rolar para cima revela a barra inferior recolhida.
          await page.mouse.move(180, 300)
          await page.mouse.wheel(0, -1200)
          await page.waitForTimeout(600)
          ok = await el.click({ timeout: 4000 }).then(
            () => true,
            () => false,
          )
        }
        await page.waitForTimeout(450)
        const after = await signature(page)
        clicked++
        const label = `${r} → ${name}${value ? `=${value}` : ""}`
        if (!ok) unclickable.push(label)
        else if (before === after) dead.push(label)
      }
    }
    console.log(
      `  varredura: ${routes.length} telas, ${clicked} ações de tela clicadas (fora de diálogos)`,
    )
    expect(!dead.length, `${dead.length} sem resposta: ${dead.slice(0, 12).join("; ")}`)
    expect(
      !unclickable.length,
      `${unclickable.length} não clicáveis: ${unclickable.slice(0, 12).join("; ")} [${[...new Set(unclickableReasons)].join(" / ")}]`,
    )
  },
}

// O mapa de bairros (Rodada 31) carrega MapLibre e o mapa-base quando o botão "Mapa" é tocado.
// Rodada 69: o produto pago saiu do lançamento; esta prova liga a chave para continuar guardando as regras dele.
await runProof(checkpoints, "round06", {
  labs: { paidPlans: true },
  allowExternal: ["https://unpkg.com/maplibre-gl@", "https://tiles.openfreemap.org/"],
})
