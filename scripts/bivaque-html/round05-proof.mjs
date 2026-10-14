import {
  action,
  confirmOk,
  dialogKind,
  expect,
  failStorage,
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

// Rodada 05: Encontros/Eventos e avisos. No HTML original, criar, editar, confirmar
// presença e cancelar encontro não tinham tratamento; a Rodada 01 os desviou para um
// aviso de dependência. Aqui o fluxo é ligado ao editor existente, sem tela nova.
const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
const ev = async (page, id) => (await stored(page)).events.find((e) => e.id === id)
async function openCreateEvent(page) {
  await page.locator('[data-action="create"]:visible').first().click()
  await settle(page)
  await page.locator('#create-menu [data-action="create-event"]').click()
  await settle(page)
  expect((await dialogKind(page)) === "editor", "Criar encontro não abriu o editor")
}
async function fillEvent(
  page,
  { title = "Café de boas-vindas na Vila", place = "Praça da Vila Militar" } = {},
) {
  await fill(page, "event-title", title)
  await page.locator("#event-date").fill(inDays(5))
  await page.locator("#event-time").fill("09:30")
  await fill(page, "event-place", place)
  await fill(page, "event-desc", "Encontro para quem chegou na cidade trocar dicas.")
}
async function otherEvent(page, test = () => true) {
  const s = await snapshot(page)
  const e = s.events.find((x) => !x.mine && x.city === s.homeCity && x.date >= inDays(0) && test(x))
  expect(e, "sem encontro de terceiros na agenda")
  await go(page, `evento/${e.id}`)
  return e
}

const checkpoints = {
  async "create-event"(page) {
    await openCreateEvent(page)
    await fillEvent(page)
    await action(page, "submit-event")
    const r = await routeOf(page)
    expect(r.name === "evento" && r.id, `não abriu o encontro publicado: ${r.name}`)
    const e = await ev(page, r.id)
    expect(e?.mine && e.on && e.going === 1 && e.date === inDays(5), "encontro não salvo")
    await reload(page)
    await go(page, "agenda")
    expect(
      await page.locator(`[data-action="open-event"][data-value="${r.id}"]`).count(),
      "encontro não aparece na agenda",
    )
  },
  async "create-event-validation"(page) {
    await openCreateEvent(page)
    await action(page, "submit-event")
    expect((await dialogKind(page)) === "editor", "publicou encontro vazio")
    await fillEvent(page, { title: "Café" })
    await action(page, "submit-event")
    expect((await dialogKind(page)) === "editor", "aceitou título curto")
    await fillEvent(page)
    await page
      .locator("#event-date")
      .fill(await page.evaluate(() => new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10)))
    await action(page, "submit-event")
    expect((await dialogKind(page)) === "editor", "aceitou data passada")
  },
  async "edit-event-and-capacity"(page) {
    await openCreateEvent(page)
    await fillEvent(page)
    await action(page, "submit-event")
    const id = (await routeOf(page)).id
    await action(page, "edit-event", id)
    await fill(page, "event-place", "Clube dos Oficiais")
    await action(page, "submit-event")
    expect((await ev(page, id)).place === "Clube dos Oficiais", "edição não salva")
    expect((await stored(page)).events.filter((e) => e.id === id).length === 1, "edição duplicou")
  },
  async "event-capacity-validation"(page) {
    await openCreateEvent(page)
    await fillEvent(page, { title: "Piquenique das famílias" })
    for (const bad of ["-3", "2.5", "20000"]) {
      await fill(page, "event-max", bad)
      await action(page, "submit-event")
      expect((await dialogKind(page)) === "editor", `aceitou vagas = ${bad}`)
    }
    await fill(page, "event-max", "30")
    await action(page, "submit-event")
    const e = await ev(page, (await routeOf(page)).id)
    expect(e?.max === 30, `vagas válidas não salvas: ${e?.max}`)
  },
  async "attend-past-event"(page) {
    const e = await otherEvent(page, (x) => !x.on)
    // Fixture: move o encontro para três dias antes do relógio do navegador.
    await page.evaluate(
      ([k, id]) => {
        const s = JSON.parse(localStorage.getItem(k))
        s.events.find((y) => y.id === id).date = new Date(Date.now() - 3 * 864e5)
          .toISOString()
          .slice(0, 10)
        localStorage.setItem(k, JSON.stringify(s))
      },
      [KEY, e.id],
    )
    await reload(page)
    await go(page, `evento/${e.id}`)
    await action(page, "attend-event", e.id)
    expect(!(await ev(page, e.id)).on, "confirmou presença em encontro passado")
    expect(/já aconteceu/i.test(await toast(page)), "sem aviso de encontro passado")
  },
  async "attend-toggle-persists"(page) {
    const e = await otherEvent(page, (x) => !x.on && (!x.max || (x.going || 0) < x.max))
    const going = e.going || 0
    await action(page, "attend-event", e.id)
    let x = await ev(page, e.id)
    expect(x.on && x.going === going + 1, `confirmar não contou: ${x.going}`)
    await reload(page)
    expect((await ev(page, e.id)).on, "presença não persistiu")
    await action(page, "attend-event", e.id)
    x = await ev(page, e.id)
    expect(!x.on && x.going === going, "cancelar presença não descontou")
  },
  async "attend-full-event"(page) {
    const e = await otherEvent(page, (x) => !x.on)
    // Fixture: deixa o encontro lotado para provar o limite de vagas.
    await page.evaluate(
      ([k, id]) => {
        const s = JSON.parse(localStorage.getItem(k))
        const t = s.events.find((y) => y.id === id)
        t.max = Math.max(1, t.going || 0)
        t.going = t.max
        localStorage.setItem(k, JSON.stringify(s))
      },
      [KEY, e.id],
    )
    await reload(page)
    await go(page, `evento/${e.id}`)
    await action(page, "attend-event", e.id)
    const x = await ev(page, e.id)
    expect(!x.on && x.going === x.max, "aceitou presença em encontro lotado")
    expect(/vagas/i.test(await toast(page)), "sem aviso de vagas esgotadas")
  },
  async "cancel-event-with-undo"(page) {
    await openCreateEvent(page)
    await fillEvent(page, { title: "Trilha no parque municipal" })
    await action(page, "submit-event")
    const id = (await routeOf(page)).id
    await action(page, "delete-event", id)
    await confirmOk(page)
    expect(!(await ev(page, id)), "encontro não cancelado")
    expect((await routeOf(page)).name === "agenda", "não voltou para a agenda")
    await page.locator('#snackbar [data-action="undo"]').click()
    await settle(page)
    expect(await ev(page, id), "desfazer não restaurou o encontro")
  },
  async "attend-needs-verification"(page) {
    await snapshot(page)
    await action(page, "prototype")
    await page.locator("#verified-test").click()
    await action(page, "apply-prototype")
    const e = await otherEvent(page, (x) => !x.on && (!x.max || (x.going || 0) < x.max))
    await action(page, "attend-event", e.id)
    expect(!(await ev(page, e.id)).on, "confirmou presença sem verificação")
  },
  async "attend-storage-failure"(page) {
    const e = await otherEvent(page, (x) => !x.on && (!x.max || (x.going || 0) < x.max))
    await failStorage(page)
    await action(page, "attend-event", e.id)
    expect(!(await ev(page, e.id)).on, "estado gravado apesar da falha")
    expect(/salvar/i.test(await toast(page)), "sem aviso de falha")
    expect(!/confirmada/i.test(await toast(page)), "anunciou presença não gravada")
  },
  async "agenda-open-and-back"(page) {
    await go(page, "agenda")
    const id = await page.locator('[data-action="open-event"]').first().getAttribute("data-value")
    await page.locator(`[data-action="open-event"][data-value="${id}"]`).first().click()
    await settle(page)
    expect((await routeOf(page)).id === id, "agenda não abriu o encontro")
    await page.goBack()
    await settle(page)
    expect((await routeOf(page)).name === "agenda", "voltar não retornou à agenda")
  },
  async "group-notification-level"(page) {
    const s = await snapshot(page)
    const g = s.groups.find((x) => x.city === s.homeCity && x.on)
    await go(page, `grupo/${g.id}`)
    await action(page, "group-menu", g.id)
    const level = await page
      .locator(`#create-menu [data-action="notif-level"]`)
      .evaluateAll(
        (els, cur) => els.map((e) => e.dataset.value).find((v) => !v.endsWith(`|${cur}`)),
        g.notif,
      )
    await page.locator(`#create-menu [data-action="notif-level"][data-value="${level}"]`).click()
    await settle(page)
    await reload(page)
    expect(
      (await stored(page)).groups.find((x) => x.id === g.id).notif === level.split("|")[1],
      "nível de aviso não salvo",
    )
  },
}

await runProof(checkpoints, "round05")
