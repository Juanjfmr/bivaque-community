import {
  action,
  addChips,
  choose,
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

// Rodada 11: pedido aberto e propostas (ADR-20261015-pedido-aberto-e-propostas, aprovado
// para o protótipo). Lado de quem pede e lado do prestador, com limites e falhas.
const req = async (page, id) => (await stored(page)).requests?.find((r) => r.id === id)
async function demoCategory(page) {
  const s = await snapshot(page)
  const counts = {}
  for (const b of s.biz)
    if (b.city === s.homeCity && b.claimed !== false) counts[b.cat] = (counts[b.cat] || 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}
async function openRequestForm(page) {
  // Telas de detalhe não têm o botão Criar: parte do início.
  if (!(await page.locator('[data-action="create"]:visible').count())) await go(page, "inicio")
  await page.locator('[data-action="create"]:visible').first().click()
  await settle(page)
  await page.locator('#create-menu [data-action="create-request"]').click()
  await settle(page)
  expect((await dialogKind(page)) === "editor", "Contratar serviço não abriu")
}
async function createRequest(
  page,
  {
    cat,
    hood = "Outro bairro",
    desc = "Preciso de manutenção completa no apartamento de dois quartos.",
  } = {},
) {
  await openRequestForm(page)
  await choose(page, "request-cat", cat)
  await choose(page, "request-hood", hood)
  await fill(page, "request-desc", desc)
  await action(page, "submit-request")
  const r = await routeOf(page)
  expect(r.name === "pedido" && r.id, `pedido não abriu: ${r.name}`)
  return r.id
}
// Página "Meu negócio" do próprio usuário no ramo informado, atendendo o Centro.
async function createMyBiz(page, cat) {
  await go(page, "voce")
  await action(page, "my-biz")
  await fill(page, "biz-name", "Prestador Teste")
  await choose(page, "biz-category", cat)
  await fill(page, "biz-hours", "Seg a sex, 8h às 18h")
  await addChips(page, "biz-hoods", ["Centro"])
  await addChips(page, "biz-services", ["Atendimento geral"])
  await action(page, "submit-biz")
}
async function simulate(page) {
  await action(page, "prototype")
  await action(page, "simulate-proposals")
  // Os Controles do protótipo continuam abertos: fecha antes de navegar.
  await page.keyboard.press("Escape")
  await settle(page)
}

const checkpoints = {
  async "request-validation-and-submit"(page) {
    const cat = await demoCategory(page)
    await openRequestForm(page)
    await action(page, "submit-request")
    expect(/tipo de serviço/i.test(await toast(page)), "sem mensagem de tipo")
    await choose(page, "request-cat", cat)
    await choose(page, "request-hood", "Centro")
    await fill(page, "request-desc", "Curto")
    await action(page, "submit-request")
    expect(/20 caracteres/.test(await toast(page)), "aceitou descrição curta")
    await fill(
      page,
      "request-desc",
      "Preciso de manutenção completa no apartamento de dois quartos.",
    )
    await choose(page, "request-when", "on")
    expect(await page.locator("#request-date").isVisible(), "data não apareceu para 'em uma data'")
    await action(page, "submit-request")
    const id = (await routeOf(page)).id
    const r = await req(page, id)
    expect(
      r?.mine && r.status === "open" && r.cat === cat && r.when.kind === "on",
      "pedido não salvo",
    )
    expect(
      /Enviado para \d+ empresa/.test(await page.locator("#main").innerText()),
      "sem informação de envio",
    )
    expect(
      /não intermedeia pagamento/i.test(await page.locator("#main").innerText()),
      "sem aviso de pagamento",
    )
  },
  async "proposals-compare-and-choose"(page) {
    const cat = await demoCategory(page)
    const id = await createRequest(page, { cat })
    await simulate(page)
    await go(page, `pedido/${id}`)
    let r = await req(page, id)
    expect(r.proposals.length >= 1 && r.proposals.length <= 5, `propostas: ${r.proposals.length}`)
    const cards = await page.locator('[data-action="choose-proposal"]').count()
    expect(cards === r.proposals.length, "nem toda proposta pode ser escolhida")
    expect(
      (await stored(page)).notices.some((n) => n.go?.[1] === id),
      "sem aviso de propostas",
    )
    const pid = r.proposals[0].id
    await page.locator(`[data-action="choose-proposal"][data-value="${id}|${pid}"]`).click()
    await settle(page)
    await confirmOk(page)
    expect((await routeOf(page)).name === "conversa", "escolha não abriu a conversa")
    expect(
      /Escolhi sua proposta/.test(await page.locator("#chat-input textarea").inputValue()),
      "sem rascunho na conversa",
    )
    r = await req(page, id)
    expect(r.status === "chosen" && r.chosen === pid, "escolha não salva")
    expect(
      r.proposals.filter((p) => p.id !== pid).every((p) => p.status === "declined"),
      "outras propostas não recusadas",
    )
  },
  async "cancel-and-open-limit"(page) {
    const cat = await demoCategory(page)
    const ids = []
    for (let i = 0; i < 3; i++) ids.push(await createRequest(page, { cat }))
    await openRequestForm(page).catch(() => {})
    expect(/3 pedidos abertos/.test(await toast(page)), "permitiu o 4º pedido aberto")
    await go(page, `pedido/${ids[0]}`)
    await action(page, "cancel-request", ids[0])
    await confirmOk(page)
    expect((await req(page, ids[0])).status === "cancelled", "não cancelou")
    expect(
      !(await page.locator('[data-action="choose-proposal"]').count()),
      "cancelado ainda permite escolha",
    )
  },
  async "expired-request"(page) {
    const id = await createRequest(page, { cat: await demoCategory(page) })
    await page.evaluate(
      ([k, rid]) => {
        const s = JSON.parse(localStorage.getItem(k))
        s.requests.find((r) => r.id === rid).expiresAt = Date.now() - 1000
        localStorage.setItem(k, JSON.stringify(s))
      },
      [KEY, id],
    )
    await reload(page)
    await go(page, `pedido/${id}`)
    expect(/Expirado/.test(await page.locator("#main").innerText()), "não mostra expirado")
    expect(
      !(await page.locator('[data-action="cancel-request"]').count()),
      "expirado ainda pode ser cancelado",
    )
  },
  async "provider-propose-edit-withdraw"(page) {
    const cat = await demoCategory(page)
    await createMyBiz(page, cat)
    await action(page, "requests")
    const rid = await page
      .locator('#main [data-action="open-request"]')
      .last()
      .getAttribute("data-value")
    // Fixture: proposta de outra empresa no mesmo pedido; o prestador não pode vê-la.
    await page.evaluate(
      ([k, id]) => {
        const s = JSON.parse(localStorage.getItem(k))
        s.requests
          .find((r) => r.id === id)
          .proposals.push({
            id: "p-outra",
            bizId: "b-outra",
            price: { kind: "fixed", min: 777 },
            date: "2099-01-01",
            validUntil: "2099-01-02",
            duration: "1 dia",
            msg: "Proposta concorrente secreta",
            status: "sent",
          })
        localStorage.setItem(k, JSON.stringify(s))
      },
      [KEY, rid],
    )
    await reload(page)
    await go(page, `pedido/${rid}`)
    expect(
      !/concorrente secreta|777/.test(await page.locator("#main").innerText()),
      "prestador vê proposta de concorrente",
    )
    await action(page, "propose", rid)
    await choose(page, "prop-kind", "range")
    await fill(page, "prop-min", "500")
    await fill(page, "prop-max", "300")
    await fill(page, "prop-duration", "2 dias")
    await fill(page, "prop-msg", "Atendemos no Centro com garantia.")
    await action(page, "submit-proposal", rid)
    expect(
      (await dialogKind(page)) === "editor" && /faixa/i.test(await toast(page)),
      "aceitou faixa invertida",
    )
    await fill(page, "prop-max", "800")
    await action(page, "submit-proposal", rid)
    let mine = (await req(page, rid)).proposals.find(
      (p) => p.msg === "Atendemos no Centro com garantia.",
    )
    expect(mine?.price.kind === "range" && mine.price.max === 800, "proposta não salva")
    await action(page, "propose", rid)
    await fill(page, "prop-msg", "Atendemos no Centro com garantia de 90 dias.")
    await action(page, "submit-proposal", rid)
    mine = (await req(page, rid)).proposals.find((p) => p.msg.includes("90 dias"))
    expect(
      mine &&
        (await req(page, rid)).proposals.filter((p) => p.msg.startsWith("Atendemos no Centro"))
          .length === 1,
      "edição duplicou a proposta",
    )
    await action(page, "withdraw-proposal", rid)
    await confirmOk(page)
    expect(
      (await req(page, rid)).proposals.find((p) => p.id === mine.id).status === "withdrawn",
      "não retirou",
    )
  },
  async "photos-limited-to-four"(page) {
    await snapshot(page)
    const png = await page.evaluate(() => {
      const c = document.createElement("canvas")
      c.width = c.height = 16
      return c.toDataURL("image/png").split(",")[1]
    })
    await openRequestForm(page)
    const files = [1, 2, 3, 4, 5].map((n) => ({
      name: `f${n}.png`,
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    }))
    await page.locator("#upload-photos").setInputFiles(files)
    await page.waitForTimeout(1500)
    expect(
      (await page.locator("#photo-previews img").count()) === 4,
      `fotos aceitas: ${await page.locator("#photo-previews img").count()}`,
    )
  },
  async "readonly-city-cannot-request"(page) {
    await snapshot(page)
    await action(page, "city")
    await choose(page, "city-select", "Natal")
    await action(page, "apply-city")
    await go(page, "negocios")
    expect(
      !(await page.locator('#main [data-action="create-request"]').count()),
      "atalho visível em cidade consultada",
    )
  },
  async "every-icon-exists-in-embedded-font"(page) {
    // Um ícone ausente da fonte recortada aparece como letras ("handyman" aconteceu).
    const seen = new Set()
    const collect = async () => {
      for (const n of await page.evaluate(() =>
        [...document.querySelectorAll("md-icon")]
          .map((i) => i.textContent.trim())
          .filter((t) => /^[a-z_0-9]+$/.test(t)),
      ))
        seen.add(n)
    }
    await snapshot(page)
    for (const r of [
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
    ]) {
      await go(page, r)
      await collect()
    }
    await go(page, "inicio")
    await page.locator('[data-action="create"]:visible').first().click()
    await settle(page)
    await collect()
    await page.locator('#create-menu [data-action="create-request"]').click()
    await settle(page)
    await collect()
    await page.keyboard.press("Escape")
    await settle(page)
    await action(page, "prototype")
    await collect()
    const missing = await page.evaluate(
      async (names) => {
        await document.fonts.ready
        return names.filter((n) => {
          const s = document.createElement("span")
          s.style.cssText =
            "font-family:'Material Symbols Rounded';font-size:24px;position:absolute;white-space:nowrap"
          s.textContent = n
          document.body.append(s)
          const w = s.getBoundingClientRect().width
          s.remove()
          return w > 30
        })
      },
      [...seen],
    )
    expect(seen.size > 20, `poucos ícones coletados: ${seen.size}`)
    expect(!missing.length, `ícones fora da fonte embutida: ${missing.join(", ")}`)
  },
  async "provider-privacy-hood-and-closed"(page) {
    const cat = await demoCategory(page)
    await createMyBiz(page, cat)
    await action(page, "requests")
    const rid = await page
      .locator('#main [data-action="open-request"]')
      .last()
      .getAttribute("data-value")
    // Fixtures: um pedido em bairro que a página não atende, e o pedido visto encerrado com outra empresa escolhida.
    await page.evaluate(
      ([k, id]) => {
        const s = JSON.parse(localStorage.getItem(k))
        const base = s.requests.find((r) => r.id === id)
        s.requests.push({
          ...base,
          id: "r-outro-bairro",
          hood: "Tarumã",
          desc: "Pedido de outro bairro",
          proposals: [],
        })
        const r = s.requests.find((x) => x.id === id)
        r.photos = ["data:image/png;base64,iVBORw0KGgo="]
        r.proposals.push({
          id: "p-meu",
          bizId: s.myBiz.id,
          price: { kind: "fixed", min: 300 },
          date: "2099-01-01",
          validUntil: "2099-01-02",
          duration: "1 dia",
          msg: "Minha proposta",
          status: "declined",
        })
        r.proposals.push({
          id: "p-outra",
          bizId: "b-outra",
          price: { kind: "fixed", min: 250 },
          date: "2099-01-01",
          validUntil: "2099-01-02",
          duration: "1 dia",
          msg: "Outra",
          status: "chosen",
        })
        r.status = "chosen"
        r.chosen = "p-outra"
        localStorage.setItem(k, JSON.stringify(s))
      },
      [KEY, rid],
    )
    await reload(page)
    await go(page, "pedidos")
    expect(
      !(await page.locator('[data-value="r-outro-bairro"]').count()),
      "pedido de bairro não atendido aparece para a empresa",
    )
    await go(page, "pedido/r-outro-bairro")
    expect(
      !/Pedido de outro bairro/.test(await page.locator("#main").innerText()),
      "endereço direto mostra pedido de outro bairro",
    )
    await go(page, `pedido/${rid}`)
    const text = await page.locator("#main").innerText()
    const before = (await stored(page)).requests.find((r) => r.id === rid)
    expect(
      !text.includes(before.desc) && !text.includes(before.who),
      "empresa recusada vê descrição ou nome",
    )
    expect(
      !(await page.locator("#main img[alt='Foto do pedido']").count()),
      "empresa recusada vê as fotos",
    )
    expect(/encerrado/i.test(text), "sem aviso de pedido encerrado")
  },
  async "withdrawn-proposal-cannot-be-chosen"(page) {
    const id = await createRequest(page, { cat: await demoCategory(page) })
    await simulate(page)
    const pid = (await req(page, id)).proposals[0].id
    await page.evaluate(
      ([k, rid, p]) => {
        const s = JSON.parse(localStorage.getItem(k))
        s.requests.find((r) => r.id === rid).proposals.find((x) => x.id === p).status = "withdrawn"
        localStorage.setItem(k, JSON.stringify(s))
      },
      [KEY, id, pid],
    )
    await reload(page)
    await go(page, `pedido/${id}`)
    // Tela desatualizada: um botão de escolha para a proposta já retirada.
    await page.evaluate((v) => {
      const b = document.createElement("button")
      b.dataset.action = "choose-proposal"
      b.dataset.value = v
      b.textContent = "escolher retirada"
      b.style.cssText = "position:fixed;top:100px;left:10px;z-index:9999"
      document.body.append(b)
    }, `${id}|${pid}`)
    await page.locator("text=escolher retirada").click()
    await settle(page)
    expect(
      /não está mais disponível/.test(await toast(page)),
      "proposta retirada aceita para escolha",
    )
    expect((await req(page, id)).status === "open", "pedido mudou de situação")
  },
  async "report-request-and-proposal"(page) {
    // P7: denúncia de proposta (quem pede) e de pedido (prestador). O tratamento depende da
    // rodada de moderação, como nas outras denúncias do protótipo: nada é registrado.
    const cat = await demoCategory(page)
    const id = await createRequest(page, { cat })
    await simulate(page)
    await go(page, `pedido/${id}`)
    const before = await req(page, id)
    const reports = page.locator('#main [data-action="report"][data-value^="proposal|"]')
    expect(
      (await reports.count()) === before.proposals.length,
      "nem toda proposta pode ser denunciada",
    )
    await reports.first().click()
    await settle(page)
    expect((await dialogKind(page)) === "dependency", "denúncia de proposta sem aviso")
    expect(
      JSON.stringify(await req(page, id)) === JSON.stringify(before),
      "denúncia alterou o pedido",
    )
    await page.keyboard.press("Escape")
    await settle(page)
    await createMyBiz(page, cat)
    await action(page, "requests")
    const rid = await page
      .locator('#main [data-action="open-request"]')
      .last()
      .getAttribute("data-value")
    await go(page, `pedido/${rid}`)
    expect(
      !(await page.locator('#main [data-action="report"][data-value^="proposal|"]').count()),
      "prestador denuncia a própria proposta",
    )
    await page.locator(`#main [data-action="report"][data-value="request|${rid}"]`).click()
    await settle(page)
    expect((await dialogKind(page)) === "dependency", "denúncia de pedido sem aviso")
  },
  async "create-menu-new-item-fits"(page) {
    // O 7º item do menu Criar (subtítulo mais longo) cabe no botão, no menu e na tela.
    await go(page, "inicio")
    await page.locator('[data-action="create"]:visible').first().click()
    await page.locator("#create-menu.open").waitFor()
    await settle(page)
    const fit = await page.evaluate(() => {
      const r = (e) => e.getBoundingClientRect()
      const menu = document.querySelector("#create-menu")
      const item = menu.querySelector('[data-action="create-request"]')
      const inside = (a, b) =>
        a.left >= b.left - 1 &&
        a.right <= b.right + 1 &&
        a.top >= b.top - 1 &&
        a.bottom <= b.bottom + 1
      const view = { left: 0, top: 0, right: innerWidth, bottom: innerHeight }
      return {
        item: Boolean(item),
        inMenu: item && inside(r(item), r(menu)),
        menuInView: inside(r(menu), view),
        textInButton:
          item &&
          [...item.querySelectorAll(".create-menu-label,.create-menu-sub")].every((t) =>
            inside(r(t), r(item)),
          ),
      }
    })
    expect(fit.item, "menu Criar sem Contratar serviço")
    expect(fit.inMenu && fit.menuInView, `menu fora da tela: ${JSON.stringify(fit)}`)
    expect(fit.textInButton, "texto de Contratar serviço transborda o botão")
  },
  async "request-storage-failure"(page) {
    await openRequestForm(page)
    await choose(
      page,
      "request-cat",
      await (async () => {
        const s = await stored(page)
        return s?.biz?.[0]?.cat ?? "Mudança e transporte"
      })(),
    )
    await choose(page, "request-hood", "Centro")
    await fill(
      page,
      "request-desc",
      "Preciso de manutenção completa no apartamento de dois quartos.",
    )
    await failStorage(page)
    await action(page, "submit-request")
    expect(
      (await dialogKind(page)) === "editor" && /salvar/i.test(await toast(page)),
      "sem feedback de falha",
    )
  },
}

await runProof(checkpoints, "round11")
