import {
  action,
  addChips,
  choose,
  dialogKind,
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

// Rodada 12: grupos de serviço com especialidade opcional (lista aprovada pelo usuário em
// 2026-10-15). Quem recebe o pedido: empresas do grupo que marcaram a especialidade ou que
// não marcaram nenhuma.
const GROUPS = 13
async function openRequestForm(page) {
  if (!(await page.locator('[data-action="create"]:visible').count())) await go(page, "inicio")
  await page.locator('[data-action="create"]:visible').first().click()
  await settle(page)
  await page.locator('#create-menu [data-action="create-request"]').click()
  await settle(page)
  expect((await dialogKind(page)) === "editor", "Contratar serviço não abriu")
}
async function createRequest(page, cat, spec) {
  await openRequestForm(page)
  await choose(page, "request-cat", cat)
  if (spec) await choose(page, "request-spec", spec)
  await choose(page, "request-hood", "Outro bairro")
  await fill(
    page,
    "request-desc",
    "Preciso do serviço ainda nesta semana, com orçamento por escrito.",
  )
  await action(page, "submit-request")
  const r = await routeOf(page)
  expect(r.name === "pedido" && r.id, `pedido não abriu: ${r.name}`)
  return r.id
}
async function simulate(page) {
  await action(page, "prototype")
  await action(page, "simulate-proposals")
  await page.keyboard.press("Escape")
  await settle(page)
}
const req = async (page, id) => (await stored(page)).requests.find((r) => r.id === id)
const bizByName = (s, name) => s.biz.find((b) => b.name === name)

const checkpoints = {
  async "legacy-categories-migrate"(page) {
    const s = await snapshot(page)
    const jorge = bizByName(s, "Jorge Eletricista")
    const frio = bizByName(s, "Frio Norte Refrigeração")
    expect(
      jorge.cat === "Casa e reparos" && jorge.specs?.[0] === "Elétrica",
      `eletricista não migrou: ${jorge.cat}`,
    )
    expect(
      frio.cat === "Climatização e eletrodomésticos" && frio.specs?.[0] === "Geladeira e freezer",
      `refrigeração não migrou: ${frio.cat}`,
    )
    // Estado salvo antes da Rodada 12: negócio e pedido com categorias antigas.
    await page.evaluate((k) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.biz.find((b) => b.name === "Jorge Eletricista").cat = "Elétrica"
      delete x.biz.find((b) => b.name === "Jorge Eletricista").specs
      x.myBiz = {
        ...x.biz[0],
        id: "b-meu",
        name: "Minha Oficina",
        cat: "Mecânica",
        mine: true,
        live: true,
        claimed: true,
        specs: undefined,
      }
      x.requests = [
        {
          id: "r-antigo",
          city: x.homeCity,
          cat: "Mecânica",
          hood: "Centro",
          desc: "Pedido salvo antes da rodada",
          when: { kind: "asap", date: null },
          photos: [],
          status: "open",
          createdAt: Date.now(),
          expiresAt: Date.now() + 864e5,
          proposals: [],
          who: "Teste",
          mine: true,
        },
      ]
      localStorage.setItem(k, JSON.stringify(x))
    }, KEY)
    await reload(page)
    await go(page, "pedido/r-antigo")
    expect(
      (await page.locator("#main h1").innerText()) === "Mecânica" &&
        /^Veículos · /.test(await page.locator("#main .detail-title .muted").innerText()),
      "pedido antigo sem grupo e especialidade",
    )
    await go(page, "negocio/b-meu")
    expect(
      /Veículos · Mecânica/.test(await page.locator("#main").innerText()),
      "minha página com categoria antiga não migrou",
    )
    // A migração roda a cada carga, em memória: a página do negócio já mostra grupo e especialidade.
    await go(page, `negocio/${jorge.id}`)
    expect(
      /Casa e reparos · Elétrica/.test(await page.locator("#main").innerText()),
      "estado salvo não migrou",
    )
  },
  async "request-group-and-specialty"(page) {
    await openRequestForm(page)
    const groups = await page.locator("#request-cat md-select-option").count()
    expect(groups === GROUPS + 1, `grupos no formulário: ${groups - 1}`)
    expect(!(await page.locator("#request-spec").count()), "especialidade antes do grupo")
    await choose(page, "request-cat", "Casa e reparos")
    const specs = await page.locator("#request-spec md-select-option").count()
    expect(specs === 9, `especialidades de Casa e reparos: ${specs - 1}`)
    await choose(page, "request-cat", "Outros")
    expect(!(await page.locator("#request-spec").count()), "Outros com especialidade")
    await choose(page, "request-cat", "Casa e reparos")
    await choose(page, "request-spec", "Hidráulica")
    await choose(page, "request-hood", "Outro bairro")
    await fill(
      page,
      "request-desc",
      "Preciso trocar a torneira e ver um vazamento na pia da cozinha.",
    )
    await action(page, "submit-request")
    const id = (await routeOf(page)).id
    const r = await req(page, id)
    expect(
      r.cat === "Casa e reparos" && r.spec === "Hidráulica",
      `pedido salvo: ${r.cat}/${r.spec}`,
    )
    expect(
      (await page.locator("#main h1").innerText()) === "Hidráulica" &&
        /Casa e reparos/.test(await page.locator("#main").innerText()),
      "detalhe sem especialidade e grupo",
    )
    const noSpec = await createRequest(page, "Veículos")
    expect((await req(page, noSpec)).spec === null, "pedido sem especialidade ganhou uma")
  },
  async "specialty-filters-who-receives"(page) {
    // Demo: em Casa e reparos só há o eletricista, que marcou Elétrica.
    const hydraulic = await createRequest(page, "Casa e reparos", "Hidráulica")
    await simulate(page)
    expect(!(await req(page, hydraulic)).proposals.length, "eletricista respondeu a hidráulica")
    const electric = await createRequest(page, "Casa e reparos", "Elétrica")
    const any = await createRequest(page, "Casa e reparos")
    await simulate(page)
    const s = await stored(page)
    const jorge = bizByName(s, "Jorge Eletricista").id
    for (const id of [electric, any])
      expect(
        s.requests.find((r) => r.id === id).proposals.some((p) => p.bizId === jorge),
        "eletricista não recebeu pedido que atende",
      )
  },
  async "business-specialty-chips"(page) {
    await go(page, "voce")
    await action(page, "my-biz")
    await fill(page, "biz-name", "Lava Rápido Teste")
    await choose(page, "biz-category", "Veículos")
    expect((await page.locator("#biz-specs md-filter-chip").count()) === 6, "chips de Veículos")
    await page.locator('#biz-specs md-filter-chip[data-spec="Mecânica"]').click()
    await choose(page, "biz-category", "Saúde")
    expect(
      !(await page
        .locator("#biz-specs md-filter-chip")
        .evaluateAll((cs) => cs.some((c) => c.selected))),
      "trocar de grupo manteve especialidade marcada",
    )
    await choose(page, "biz-category", "Veículos")
    await page.locator('#biz-specs md-filter-chip[data-spec="Lavagem"]').click()
    await fill(page, "biz-hours", "Seg a sáb, 8h às 18h")
    await addChips(page, "biz-hoods", ["Centro"])
    await addChips(page, "biz-services", ["Lavagem completa"])
    await action(page, "submit-biz")
    const mine = (await stored(page)).myBiz
    expect(
      mine.cat === "Veículos" && JSON.stringify(mine.specs) === '["Lavagem"]',
      `especialidades salvas: ${JSON.stringify(mine.specs)}`,
    )
    expect(
      /Veículos · Lavagem/.test(await page.locator("#main").innerText()),
      "página sem especialidade",
    )
    // Lado do prestador: pedido de outra especialidade do grupo não chega.
    await page.evaluate((k) => {
      const x = JSON.parse(localStorage.getItem(k))
      const base = {
        city: x.homeCity,
        cat: "Veículos",
        hood: "Centro",
        when: { kind: "asap", date: null },
        photos: [],
        status: "open",
        createdAt: Date.now(),
        expiresAt: Date.now() + 864e5,
        proposals: [],
        who: "Vizinho",
        mine: false,
      }
      x.requests = [
        { ...base, id: "r-mecanica", spec: "Mecânica", desc: "Pedido de mecânica" },
        { ...base, id: "r-lavagem", spec: "Lavagem", desc: "Pedido de lavagem" },
        { ...base, id: "r-qualquer", spec: null, desc: "Pedido sem especialidade" },
      ]
      localStorage.setItem(k, JSON.stringify(x))
    }, KEY)
    await reload(page)
    await go(page, "pedidos")
    const seen = await page
      .locator('#main [data-action="open-request"]')
      .evaluateAll((rows) => rows.map((r) => r.dataset.value))
    expect(
      seen.includes("r-lavagem") && seen.includes("r-qualquer") && !seen.includes("r-mecanica"),
      `prestador vê: ${seen.join(", ")}`,
    )
  },
  async "reset-keeps-new-groups"(page) {
    await snapshot(page)
    await action(page, "prototype")
    await action(page, "reset-prototype")
    await page.locator("#confirm-dialog md-filled-button").last().click()
    await page.waitForFunction(() =>
      /reiniciado/.test(document.querySelector("#snackbar")?.innerText),
    )
    const s = await stored(page)
    const jorge = bizByName(s, "Jorge Eletricista")
    expect(jorge.cat === "Casa e reparos", `recomeçar voltou à categoria antiga: ${jorge.cat}`)
    const id = await createRequest(page, "Casa e reparos", "Elétrica")
    await simulate(page)
    expect((await req(page, id)).proposals.length, "depois de recomeçar, ninguém recebeu o pedido")
  },
  async "business-without-specialty-receives-any"(page) {
    await go(page, "voce")
    await action(page, "my-biz")
    await fill(page, "biz-name", "Oficina Geral Teste")
    await choose(page, "biz-category", "Veículos")
    await fill(page, "biz-hours", "Seg a sex, 8h às 18h")
    await addChips(page, "biz-hoods", ["Centro"])
    await addChips(page, "biz-services", ["Revisão"])
    await action(page, "submit-biz")
    expect(!(await stored(page)).myBiz.specs.length, "página ganhou especialidade sem marcar")
    await page.evaluate((k) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.requests = [
        {
          id: "r-mec",
          city: x.homeCity,
          cat: "Veículos",
          spec: "Mecânica",
          hood: "Centro",
          desc: "Pedido de mecânica",
          when: { kind: "asap", date: null },
          photos: [],
          status: "open",
          createdAt: Date.now(),
          expiresAt: Date.now() + 864e5,
          proposals: [],
          who: "Vizinho",
          mine: false,
        },
      ]
      localStorage.setItem(k, JSON.stringify(x))
    }, KEY)
    await reload(page)
    await go(page, "pedidos")
    expect(
      await page.locator('#main [data-action="open-request"][data-value="r-mec"]').count(),
      "empresa sem especialidade não vê pedido com especialidade",
    )
  },
  async "tampered-business-group-rejected"(page) {
    const tamper = (id) =>
      page.evaluate((x) => {
        document.getElementById(x).outerHTML =
          `<select id="${x}" required><option value="Foo" selected>Foo</option></select>`
      }, id)
    await go(page, "voce")
    await action(page, "my-biz")
    await fill(page, "biz-name", "Página Adulterada")
    await fill(page, "biz-hours", "Seg a sex")
    await addChips(page, "biz-hoods", ["Centro"])
    await addChips(page, "biz-services", ["Qualquer"])
    await tamper("biz-category")
    await action(page, "submit-biz")
    expect(/tipo de serviço/i.test(await toast(page)), "página com grupo inexistente sem aviso")
    expect(!(await stored(page))?.myBiz, "página com grupo inexistente salva")
  },
  async "tampered-indication-group-rejected"(page) {
    const tamper = (id) =>
      page.evaluate((x) => {
        document.getElementById(x).outerHTML =
          `<select id="${x}" required><option value="Foo" selected>Foo</option></select>`
      }, id)
    await go(page, "negocios")
    const before = (await snapshot(page)).biz.length
    await page.locator('[data-action="create"]:visible').first().click()
    await settle(page)
    await page.locator('#create-menu [data-action="indicate"]').click()
    await settle(page)
    await fill(page, "ind-name", "Negócio Adulterado")
    await choose(page, "ind-hood", "Centro")
    await fill(page, "ind-why", "Atendimento rápido e honesto.")
    await tamper("ind-category")
    await action(page, "submit-indicate")
    expect(/tipo de serviço/i.test(await toast(page)), "indicação com grupo inexistente sem aviso")
    expect((await stored(page)).biz.length === before, "indicação com grupo inexistente salva")
  },
  async "tampered-specialty-rejected"(page) {
    const before = (await snapshot(page)).requests?.length ?? 0
    await openRequestForm(page)
    await choose(page, "request-cat", "Saúde")
    await choose(page, "request-hood", "Outro bairro")
    await fill(page, "request-desc", "Preciso de atendimento ainda nesta semana, por favor.")
    // Tela adulterada: especialidade de outro grupo.
    await page.evaluate(() => {
      document.querySelector("#request-spec-wrap").innerHTML =
        '<select id="request-spec"><option value="Elétrica" selected>Elétrica</option></select>'
    })
    await action(page, "submit-request")
    expect(/especialidade da lista/.test(await toast(page)), "aceitou especialidade de outro grupo")
    expect(((await stored(page)).requests?.length ?? 0) === before, "pedido adulterado salvo")
  },
}

await runProof(checkpoints, "round12")
