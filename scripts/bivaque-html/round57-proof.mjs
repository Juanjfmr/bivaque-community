import {
  action,
  choose,
  dialogKind,
  dismissPushAsk,
  expect,
  fill,
  go,
  KEY,
  reload,
  routeOf,
  runProof,
  settle,
  snapshot,
  stored,
  toast,
} from "./proof-harness.mjs"

// Rodada 57: caminhos quebrados simples da auditoria (AUDITORIA_FUNCIONAL_2026-10-18, itens A1, A2,
// A3, A7 e B12). Um checkpoint por caminho: aviso de proposta que abre o pedido, aviso de pedido
// que sumiu, "Você organiza" no próprio encontro, interesse recusado no próprio anúncio, menu de
// toque longo do próprio anúncio, cancelamento do pedido de entrada em grupo fechado e o contador
// de Salvos que bate com a lista.
const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
async function demoCategory(page) {
  const s = await snapshot(page)
  const counts = {}
  for (const b of s.biz)
    if (b.city === s.homeCity && b.claimed !== false) counts[b.cat] = (counts[b.cat] || 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}
async function openRequestForm(page) {
  if (!(await page.locator('[data-action="create"]:visible').count())) await go(page, "inicio")
  await page.locator('[data-action="create"]:visible').first().click()
  await settle(page)
  await page.locator('#create-menu [data-action="create-request"]').click()
  await settle(page)
  expect((await dialogKind(page)) === "editor", "Contratar serviço não abriu")
}
async function createRequest(page, cat) {
  await openRequestForm(page)
  await choose(page, "request-cat", cat)
  await choose(page, "request-hood", "Outro bairro")
  await fill(page, "request-desc", "Preciso de manutenção completa no apartamento de dois quartos.")
  await action(page, "submit-request")
  await dismissPushAsk(page)
  const r = await routeOf(page)
  expect(r.name === "pedido" && r.id, `pedido não abriu: ${r.name}`)
  return r.id
}
// Os controles do protótipo fazem as empresas de exemplo responderem ao pedido aberto.
async function simulateProposals(page) {
  await action(page, "prototype")
  await action(page, "simulate-proposals")
  await page.keyboard.press("Escape")
  await settle(page)
}
// Aviso local da cidade atual, gravado como se viesse de outra rodada do protótipo.
async function addNotice(page, { id, text, go: destination }) {
  const s = await snapshot(page)
  s.notices = [
    { id, city: s.homeCity, unread: true, text, go: destination, when: "Agora" },
    ...s.notices,
  ]
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(s)])
  await reload(page)
}
async function openNoticeFromInbox(page, id) {
  await go(page, "inicio")
  await action(page, "notices")
  await page.locator(`#dialog [data-action="notice-open"][data-value="${id}"]`).click()
  await settle(page)
}
async function openCreateEvent(page) {
  await page.locator('[data-action="create"]:visible').first().click()
  await settle(page)
  await page.locator('#create-menu [data-action="create-event"]').click()
  await settle(page)
  expect((await dialogKind(page)) === "editor", "Criar encontro não abriu o editor")
}
async function fillEvent(page, title) {
  await fill(page, "event-title", title)
  await page.locator("#event-date").fill(inDays(5))
  await page.locator("#event-time").fill("09:30")
  await fill(page, "event-place", "Praça da Vila Militar")
  await fill(page, "event-desc", "Encontro para quem chegou na cidade trocar dicas.")
}
// Anúncio ativo da própria pessoa (a semente traz dois, i4 e i6).
async function ownActiveItem(page) {
  const s = await snapshot(page)
  const mine = s.items.find((x) => x.mine && x.status === "active" && x.city === s.homeCity)
  expect(mine, "sem anúncio próprio ativo na cidade")
  return mine
}

const checkpoints = {
  async "proposal-notice-opens-the-request"(page) {
    const cat = await demoCategory(page)
    const id = await createRequest(page, cat)
    await simulateProposals(page)
    const notice = (await stored(page)).notices.find(
      (n) => n.go?.[0] === "pedido" && n.go[1] === id,
    )
    expect(notice, "sem aviso de proposta para o pedido")
    await openNoticeFromInbox(page, notice.id)
    const r = await routeOf(page)
    expect(r.name === "pedido" && r.id === id, `aviso de proposta não abriu o pedido: ${r.name}`)
    expect(
      /Propostas \(\d+ de 5\)/.test(await page.locator("#main").innerText()),
      "pedido aberto sem a lista de propostas",
    )
  },
  async "list-notice-opens-the-request-list"(page) {
    await addNotice(page, {
      id: "n-r57-lista",
      text: "Sua proposta para Manutenção em Centro não foi escolhida.",
      go: ["pedidos"],
    })
    await openNoticeFromInbox(page, "n-r57-lista")
    const r = await routeOf(page)
    expect(r.name === "pedidos", `aviso de lista não abriu Pedidos de serviço: ${r.name}`)
  },
  async "missing-request-notice-stays-in-the-inbox"(page) {
    await addNotice(page, {
      id: "n-r57-sumido",
      text: "Pedido que não existe mais.",
      go: ["pedido", "r-inexistente"],
    })
    await openNoticeFromInbox(page, "n-r57-sumido")
    const r = await routeOf(page)
    expect(r.name === "inicio", `aviso de pedido sumido abriu outra tela: ${r.name}`)
    expect(
      /não está mais disponível/.test(await page.locator("#notice-status").innerText()),
      "aviso sem explicação quando o pedido não existe",
    )
  },
  async "own-event-opens-from-agenda"(page) {
    await openCreateEvent(page)
    await fillEvent(page, "Café da Rodada 57")
    await action(page, "submit-event")
    const id = (await routeOf(page)).id
    expect(id, "encontro não foi publicado")
    await go(page, "agenda")
    const row = page.locator(`#main .list-row:has([data-action="open-event"][data-value="${id}"])`)
    const organizer = row.locator('[data-action="open-event"]', { hasText: "Você organiza" })
    expect((await organizer.count()) === 1, "o próprio encontro não mostra 'Você organiza'")
    expect(
      (await row.locator('[data-action="attend-event"]').count()) === 0,
      "o próprio encontro ainda oferece confirmar presença",
    )
    await organizer.click()
    await settle(page)
    const r = await routeOf(page)
    expect(r.name === "evento" && r.id === id, `'Você organiza' não abriu o encontro: ${r.name}`)
  },
  async "own-listing-interest-is-refused"(page) {
    const mine = await ownActiveItem(page)
    await go(page, "inicio")
    const threadsBefore = (await stored(page)).threads.length
    await page.evaluate((id) => {
      const b = document.createElement("button")
      b.type = "button"
      b.textContent = "controle-r57"
      b.dataset.action = "item-interest"
      b.dataset.value = id
      b.style.cssText = "position:fixed;top:120px;left:20px;z-index:9999"
      document.body.append(b)
    }, mine.id)
    await page.locator(`[data-action="item-interest"][data-value="${mine.id}"]`).click()
    await settle(page)
    expect(/Este anúncio é seu\./.test(await toast(page)), "sem aviso para o próprio anúncio")
    const s = await stored(page)
    expect(s.threads.length === threadsBefore, "criou conversa com o próprio anúncio")
    expect(
      !s.threads.some((t) => t.about?.type === "item" && t.about?.id === mine.id),
      "conversa com o próprio anúncio existe",
    )
    expect((await routeOf(page)).name === "inicio", "mudou de tela ao pedir interesse")
  },
  async "own-listing-menu-offers-view-not-interest"(page) {
    const mine = await ownActiveItem(page)
    await go(page, "meus-anuncios")
    const card = page.locator(
      `#main .photo-card > .card-link[data-action="open-item"][data-value="${mine.id}"]`,
    )
    expect((await card.count()) === 1, "anúncio próprio não aparece em Meus anúncios")
    const box = await card.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(650)
    await page.mouse.up()
    await page.waitForFunction(() => !document.querySelector("#create-menu")?.hidden, null, {
      timeout: 2000,
    })
    const menu = page.locator("#create-menu")
    expect(
      (await menu.locator('[data-action="item-interest"]').count()) === 0,
      "o menu do próprio anúncio oferece 'Tenho interesse'",
    )
    expect(
      (await menu.locator('[data-action="report"]').count()) === 0,
      "o menu do próprio anúncio oferece denunciar",
    )
    expect(
      (await menu.locator(`[data-action="open-item"][data-value="${mine.id}"]`).count()) === 1,
      "o menu do próprio anúncio não oferece 'Ver anúncio'",
    )
    await menu.locator('[data-action="open-item"]').click()
    await settle(page)
    const r = await routeOf(page)
    expect(r.name === "anuncio" && r.id === mine.id, `'Ver anúncio' não abriu o anúncio: ${r.name}`)
  },
  async "closed-group-request-can-be-cancelled"(page) {
    const s0 = await snapshot(page)
    const g = s0.groups.find(
      (x) => x.city === s0.homeCity && x.privacy === "fechado" && !x.on && !x.pending && !x.auto,
    )
    expect(g, "sem grupo fechado disponível para pedir entrada")
    await go(page, `grupo/${g.id}`)
    await action(page, "join-group", g.id)
    expect(
      (await stored(page)).groups.find((x) => x.id === g.id).pending === true,
      "pedido não ficou pendente",
    )
    expect(
      (await page.locator(`[data-action="join-group"][data-value="${g.id}"]:visible`).count()) ===
        0,
      "com pedido pendente ainda aparece 'Pedir para entrar'",
    )
    await action(page, "cancel-join", g.id)
    const after = (await stored(page)).groups.find((x) => x.id === g.id)
    expect(after.pending === false && !after.on, "pedido não foi cancelado")
    expect(/Pedido cancelado\./.test(await toast(page)), "sem aviso de pedido cancelado")
    expect(
      (await page.locator(`[data-action="join-group"][data-value="${g.id}"]:visible`).count()) ===
        1,
      "depois de cancelar não voltou a oferecer o pedido",
    )
  },
  async "saved-counter-matches-saved-list"(page) {
    // Fixture: um anúncio salvo e ativo, um anúncio salvo que foi removido e um negócio salvo.
    await snapshot(page)
    await page.evaluate((k) => {
      const s = JSON.parse(localStorage.getItem(k))
      const active = s.items.filter((x) => x.status === "active")
      for (const x of s.items) x.saved = false
      for (const b of s.biz) b.saved = false
      active[0].saved = true
      active[1].saved = true
      active[1].status = "removed"
      s.biz[0].saved = true
      localStorage.setItem(k, JSON.stringify(s))
    }, KEY)
    await reload(page)
    await go(page, "voce")
    // O contador anima ao entrar na tela: espera o número final.
    await page.waitForFunction(
      () => !document.querySelector('.profile-stat[data-action="saved"] b[aria-hidden]'),
      null,
      { timeout: 2000 },
    )
    const shown = Number(
      (await page.locator('.profile-stat[data-action="saved"] b').innerText()).trim(),
    )
    await go(page, "salvos")
    const listed = await page.locator("#main article.photo-card").count()
    expect(
      shown === listed && listed === 2,
      `Você mostra ${shown} salvos e a tela Salvos lista ${listed}`,
    )
  },
}

await runProof(checkpoints, "round57")
