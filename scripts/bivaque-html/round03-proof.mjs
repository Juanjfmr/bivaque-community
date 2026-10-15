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
  reload,
  routeOf,
  runProof,
  settle,
  stored,
  toast,
} from "./proof-harness.mjs"

// Rodada 03: Desapegos, Imóveis e Negócios. Publicar, rascunho, editar, encerrar,
// excluir, salvar, interesse, oferta, visita, contatos recebidos e página de negócio.
async function openCreate(page, entry) {
  await page.locator('[data-action="create"]:visible').first().click()
  await settle(page)
  await page.locator(`#create-menu [data-action="${entry}"]`).click()
  await settle(page)
  expect((await dialogKind(page)) !== null, `${entry} não abriu o editor`)
}
async function fillItem(page, { title = "Mesa de jantar 6 lugares", price = "450" } = {}) {
  await fill(page, "item-title", title)
  await fill(page, "item-price", price)
  await choose(page, "item-hood")
  await fill(page, "item-desc", "Mesa de madeira maciça, ótimo estado, retirada no bairro.")
}
async function otherItem(page) {
  await go(page, "catalogo")
  const ids = await page
    .locator('#main [data-action="open-item"]')
    .evaluateAll((els) => [...new Set(els.map((e) => e.dataset.value))])
  for (const id of ids) {
    await go(page, `anuncio/${id}`)
    if (await page.locator('[data-action="item-interest"]:visible').count()) return id
  }
  throw new Error("nenhum anúncio de terceiros ativo na cidade")
}
async function myItem(page) {
  await go(page, "meus-anuncios")
  const id = await page
    .locator('#main [data-action="open-item"]')
    .first()
    .getAttribute("data-value")
  expect(id, "sem anúncio próprio na demo")
  await go(page, `anuncio/${id}`)
  return id
}
async function otherBiz(page) {
  await go(page, "negocios")
  const ids = await page
    .locator('#main [data-action="open-biz"]')
    .evaluateAll((els) => [...new Set(els.map((e) => e.dataset.value))])
  for (const id of ids) {
    await go(page, `negocio/${id}`)
    if (await page.locator('[data-action="quote"]:visible').count()) return id
  }
  throw new Error("nenhum negócio de terceiros com orçamento")
}
const item = async (page, id) => (await stored(page)).items.find((i) => i.id === id)

const checkpoints = {
  async "publish-desapego"(page) {
    await openCreate(page, "create-item")
    await fillItem(page)
    await action(page, "submit-item")
    expect((await dialogKind(page)) === null, "editor não fechou ao publicar")
    const r = await routeOf(page)
    expect(r.name === "anuncio" && r.id, `não abriu o anúncio publicado: ${r.name}`)
    const i = await item(page, r.id)
    expect(
      i?.mine && i.status === "active" && i.title === "Mesa de jantar 6 lugares",
      "anúncio não salvo",
    )
    await reload(page)
    await go(page, "meus-anuncios")
    expect(
      await page.locator(`#main [data-action="open-item"][data-value="${r.id}"]`).count(),
      "publicado não aparece em Meus anúncios",
    )
  },
  async "publish-validation"(page) {
    await openCreate(page, "create-item")
    await action(page, "submit-item")
    expect((await dialogKind(page)) !== null, "publicou formulário vazio")
    await fillItem(page, { title: "Mesa", price: "450" })
    await action(page, "submit-item")
    expect((await dialogKind(page)) !== null, "publicou título com 4 letras")
    await fillItem(page, { price: "0" })
    await action(page, "submit-item")
    expect((await dialogKind(page)) !== null, "publicou preço zero")
    expect(
      (await stored(page)) === null ||
        !(await stored(page)).items.some((i) => i.title.startsWith("Mesa")),
      "gravou anúncio inválido",
    )
  },
  async "invalid-field-gets-focus"(page) {
    await openCreate(page, "create-item")
    await fill(page, "item-price", "450")
    await fill(page, "item-desc", "Mesa de madeira maciça, ótimo estado, retirada no bairro.")
    await page.locator("#item-desc").scrollIntoViewIfNeeded()
    await action(page, "submit-item")
    const state = await page.evaluate(() => {
      const field = document.querySelector("#item-title")
      const box = field.getBoundingClientRect()
      return {
        focused: field.matches(":focus-within"),
        inView: box.top >= 0 && box.bottom <= innerHeight,
      }
    })
    expect(
      state.focused && state.inView,
      `campo inválido sem foco/visibilidade: ${JSON.stringify(state)}`,
    )
  },
  async "publish-imovel"(page) {
    await openCreate(page, "create-property")
    await fillItem(page, { title: "Apartamento 2 quartos perto da base", price: "2300" })
    await action(page, "submit-item")
    expect((await dialogKind(page)) !== null, "publicou imóvel sem quartos e área")
    await fill(page, "item-beds", "2")
    await fill(page, "item-area", "68")
    await action(page, "submit-item")
    const r = await routeOf(page)
    const i = await item(page, r.id)
    expect(i?.kind === "imovel" && String(i.beds) === "2", "imóvel não salvo com detalhes")
  },
  async "draft-save-resume-publish"(page) {
    await openCreate(page, "create-item")
    await fill(page, "item-title", "Bicicleta aro 29")
    await action(page, "save-draft")
    expect((await dialogKind(page)) === null, "rascunho não fechou o editor")
    const s = await stored(page)
    const draft = s.drafts.find((d) => d.title === "Bicicleta aro 29")
    expect(draft, "rascunho não salvo")
    await reload(page)
    await go(page, "meus-anuncios")
    await page
      .locator(`[data-action="open-draft"][data-value="${draft.id}"]:visible`)
      .first()
      .click()
    await settle(page)
    expect(
      (await page.locator("#item-title input").inputValue()) === "Bicicleta aro 29",
      "rascunho não restaurou o título",
    )
    await fillItem(page, { title: "Bicicleta aro 29" })
    await action(page, "submit-item")
    const after = await stored(page)
    expect(
      after.items.some((i) => i.title === "Bicicleta aro 29" && i.mine),
      "rascunho não publicou",
    )
    expect(!after.drafts.some((d) => d.id === draft.id), "rascunho continuou após publicar")
  },
  async "discard-guard"(page) {
    await openCreate(page, "create-item")
    await fill(page, "item-title", "Texto não salvo")
    await page.locator("#item-title input").dispatchEvent("input")
    await page.keyboard.press("Escape")
    await settle(page)
    const confirmOpen = await page.evaluate(() => document.querySelector("#confirm-dialog")?.open)
    expect(confirmOpen && (await dialogKind(page)) !== null, "fechou editor sujo sem confirmar")
    await page
      .locator("#confirm-dialog md-text-button, #confirm-dialog md-outlined-button")
      .first()
      .click()
    await settle(page)
    expect(
      (await page.locator("#item-title input").inputValue()) === "Texto não salvo",
      "continuar editando perdeu o texto",
    )
  },
  async "edit-item"(page) {
    const id = await myItem(page)
    await action(page, "edit-item", id)
    await fill(page, "item-price", "999")
    await action(page, "submit-item")
    const s = await stored(page)
    expect(s.items.find((i) => i.id === id)?.numPrice === 999, "edição de preço não salva")
    const mine = s.items.filter((i) => i.mine).length
    await reload(page)
    await go(page, "meus-anuncios")
    expect(
      (await stored(page)).items.filter((i) => i.mine).length === mine,
      "edição duplicou o anúncio",
    )
    expect(s.items.filter((i) => i.id === id).length === 1, "id duplicado após edição")
  },
  async "close-reactivate-undo"(page) {
    const id = await myItem(page)
    await action(page, "item-status", id)
    expect((await item(page, id)).status === "sold", "não encerrou")
    expect(/encerrado/i.test(await toast(page)), "sem confirmação de encerramento")
    await page.locator('#snackbar [data-action="undo"]').click()
    await settle(page)
    expect((await item(page, id)).status === "active", "desfazer não reativou")
    await action(page, "item-status", id)
    await action(page, "item-status", id)
    expect((await item(page, id)).status === "active", "reativar falhou")
  },
  async "delete-with-undo"(page) {
    const id = await myItem(page)
    await action(page, "delete-item", id)
    await confirmOk(page)
    expect(!(await item(page, id)), "não excluiu")
    expect((await routeOf(page)).name === "meus-anuncios", "não voltou para Meus anúncios")
    await page.locator('#snackbar [data-action="undo"]').click()
    await settle(page)
    expect(await item(page, id), "desfazer não restaurou")
  },
  async "buyer-save-interest-return"(page) {
    const id = await otherItem(page)
    await action(page, "save-item", id)
    expect((await item(page, id)).saved === true, "não salvou")
    await reload(page)
    expect((await item(page, id)).saved === true, "salvo não persistiu")
    await action(page, "item-interest", id)
    const r = await routeOf(page)
    expect(r.name === "conversa", `interesse não abriu conversa: ${r.name}`)
    const t = (await stored(page)).threads.find((x) => x.id === r.id)
    expect(t?.about.type === "item" && t.about.id === id, "conversa não ligada ao anúncio")
    await page.goBack()
    await settle(page)
    expect((await routeOf(page)).id === id, "voltar não retornou ao anúncio")
  },
  async "buyer-offer-and-visit"(page) {
    const id = await otherItem(page)
    await action(page, "item-offer", id)
    await fill(page, "offer-amount", "")
    await action(page, "send-offer", id)
    expect((await dialogKind(page)) !== null, "enviou oferta vazia")
    await fill(page, "offer-amount", "300")
    await action(page, "send-offer", id)
    const r = await routeOf(page)
    expect(r.name === "conversa", "oferta não abriu conversa")
    // "Preparar oferta" deixa a mensagem como rascunho no campo, para a pessoa revisar e enviar.
    const draft = await page.locator("#chat-input textarea").inputValue()
    expect(/300/.test(draft), `oferta não preparada no campo de mensagem: "${draft}"`)
    await go(page, `anuncio/${id}`)
    await action(page, "item-visit", id)
    expect((await routeOf(page)).name === "conversa", "visita não abriu conversa")
  },
  async "sold-item-blocks-contact"(page) {
    const id = await myItem(page)
    await action(page, "item-status", id)
    const s = await stored(page)
    expect(s.items.find((i) => i.id === id).status === "sold", "não encerrou")
    await action(page, "item-leads", id)
    expect((await dialogKind(page)) !== null, "contatos recebidos não abriu")
    const text = await page.locator("#dialog").innerText()
    expect(/contato|conversa/i.test(text), "contatos recebidos sem conteúdo nem estado vazio")
  },
  async "business-create-validate"(page) {
    await go(page, "voce")
    await action(page, "my-biz")
    expect((await dialogKind(page)) !== null, "editor de negócio não abriu")
    await fill(page, "biz-name", "Marcenaria Teste")
    await choose(page, "biz-category")
    await fill(page, "biz-hours", "Seg a sex, 8h às 18h")
    await addChips(page, "biz-hoods", ["Centro", "Adrianópolis"])
    await addChips(page, "biz-services", ["Móveis sob medida"])
    await fill(page, "biz-whatsapp", "123")
    await action(page, "submit-biz")
    expect(
      (await dialogKind(page)) !== null && /WhatsApp/i.test(await toast(page)),
      "aceitou WhatsApp inválido",
    )
    await fill(page, "biz-whatsapp", "92991234567")
    await fill(page, "biz-website", "marcenaria.com")
    await action(page, "submit-biz")
    expect(
      (await dialogKind(page)) !== null &&
        (await page.evaluate(() =>
          document.querySelector("#biz-website").matches(":focus-within"),
        )),
      "site sem protocolo aceito ou sem foco no campo",
    )
    await fill(page, "biz-website", "https://marcenaria.example")
    await action(page, "submit-biz")
    expect((await dialogKind(page)) === null, "negócio válido não publicou")
    const s = await stored(page)
    expect(s.myBiz?.live && s.myBiz.name === "Marcenaria Teste", "página do negócio não salva")
    expect((await routeOf(page)).name === "negocio", "não abriu a página publicada")
  },
  async "business-buyer-journeys"(page) {
    const id = await otherBiz(page)
    await action(page, "save-biz", id)
    expect((await stored(page)).biz.find((b) => b.id === id).saved, "negócio não salvo")
    const before = (await stored(page)).biz.find((b) => b.id === id).recN
    await action(page, "recommend-biz", id)
    await fill(page, "recommend-why", "Curto")
    await action(page, "submit-recommend", id)
    expect((await dialogKind(page)) !== null, "aceitou indicação curta")
    await fill(page, "recommend-why", "Atendimento rápido e preço justo na mudança.")
    await action(page, "submit-recommend", id)
    const b = (await stored(page)).biz.find((x) => x.id === id)
    expect(b.recN === before + 1 && b.myInd, "indicação não contabilizada")
    await action(page, "recommend-biz", id)
    expect(
      (await dialogKind(page)) === null && /já indicou/i.test(await toast(page)),
      "indicou duas vezes",
    )
    const wa = page.locator(`[data-action="whatsapp"][data-value="${id}"]:visible`)
    if (await wa.count()) {
      await wa.first().click()
      await settle(page)
      expect(
        (await page.evaluate(() => window.__opened)).some((u) => u.startsWith("https://wa.me/55")),
        "WhatsApp sem link wa.me com DDI",
      )
    }
    await action(page, "quote", id)
    const r = await routeOf(page)
    expect(r.name === "conversa", "orçamento não abriu conversa")
    const t = (await stored(page)).threads.find((x) => x.id === r.id)
    expect(t?.about.type === "biz" && t.about.id === id, "conversa não ligada ao negócio")
  },
  async "indicate-new-business-once"(page) {
    await go(page, "negocios")
    await action(page, "indicate")
    const indicateOnce = async () => {
      await fill(page, "ind-name", "Chaveiro Teste da Vila")
      await choose(page, "ind-category")
      await choose(page, "ind-hood")
      await fill(page, "ind-why", "Atendeu rápido no domingo e cobrou o combinado.")
      await action(page, "submit-indicate")
    }
    await indicateOnce()
    let b = (await stored(page)).biz.find((x) => x.name === "Chaveiro Teste da Vila")
    expect(b && b.claimed === false && b.myInd, "indicação não criou o negócio")
    const says = b.says.length
    const recN = b.recN
    await go(page, "negocios")
    await action(page, "indicate")
    await indicateOnce()
    b = (await stored(page)).biz.find((x) => x.name === "Chaveiro Teste da Vila")
    expect(
      (await stored(page)).biz.filter((x) => x.name === "Chaveiro Teste da Vila").length === 1,
      "duplicou o negócio",
    )
    expect(
      b.recN === recN && b.says.length === says,
      `segunda indicação duplicou depoimento: ${b.says.length}`,
    )
  },
  async "claim-edit-and-leads"(page) {
    await go(page, "negocios")
    await action(page, "indicate")
    await fill(page, "ind-name", "Costureira Teste")
    await choose(page, "ind-category")
    await choose(page, "ind-hood")
    await fill(page, "ind-why", "Fez a barra das fardas no mesmo dia.")
    await action(page, "submit-indicate")
    const b = (await stored(page)).biz.find((x) => x.name === "Costureira Teste")
    await go(page, `negocio/${b.id}`)
    await action(page, "claim-biz", b.id)
    await fill(page, "claim-name", "")
    await action(page, "confirm-claim", b.id)
    expect((await stored(page)).myBiz?.id !== b.id, "assumiu sem nome")
    await fill(page, "claim-name", "Joana Lima")
    await action(page, "confirm-claim", b.id)
    expect((await dialogKind(page)) !== null, "editor não abriu após assumir")
    await fill(page, "biz-hours", "Seg a sáb, 9h às 17h")
    await addChips(page, "biz-hoods", ["Centro"])
    await addChips(page, "biz-services", ["Ajustes de farda"])
    await action(page, "submit-biz")
    const s = await stored(page)
    expect(s.myBiz?.id === b.id && s.myBiz.claimed && s.myBiz.live, "página assumida não publicada")
    await action(page, "biz-leads", b.id)
    expect(
      /contato|pedido/i.test(await page.locator("#dialog").innerText()),
      "pedidos recebidos sem conteúdo",
    )
    await page.keyboard.press("Escape")
    await settle(page)
    await action(page, "edit-biz", b.id)
    expect(
      (await page.locator("#biz-name input").inputValue()) === "Costureira Teste",
      "edição não carregou a página",
    )
  },
  async "gallery-switches-photo"(page) {
    // A demo não tem anúncio com 2+ fotos: publica um com duas imagens geradas.
    const png = (r, g, b) =>
      page.evaluate(
        ([r, g, b]) => {
          const c = document.createElement("canvas")
          c.width = c.height = 64
          const x = c.getContext("2d")
          x.fillStyle = `rgb(${r},${g},${b})`
          x.fillRect(0, 0, 64, 64)
          return c.toDataURL("image/png").split(",")[1]
        },
        [r, g, b],
      )
    const files = [
      {
        name: "a.png",
        mimeType: "image/png",
        buffer: Buffer.from(await png(200, 30, 30), "base64"),
      },
      {
        name: "b.png",
        mimeType: "image/png",
        buffer: Buffer.from(await png(30, 30, 200), "base64"),
      },
    ]
    await openCreate(page, "create-item")
    await page.locator("#upload-photos").setInputFiles(files)
    await page.waitForTimeout(800)
    await fillItem(page, { title: "Luminária com duas fotos" })
    await action(page, "submit-item")
    const thumbs = page.locator('[data-action="gallery"]:visible')
    expect((await thumbs.count()) >= 2, `galeria com ${await thumbs.count()} miniaturas`)
    const before = await page.locator("#hero-image").getAttribute("src")
    await thumbs.nth(1).click()
    await settle(page)
    expect(
      (await page.locator("#hero-image").getAttribute("src")) !== before,
      "galeria não trocou a foto",
    )
  },
  async "publish-storage-failure"(page) {
    await openCreate(page, "create-item")
    await fillItem(page, { title: "Cadeira de escritório" })
    await failStorage(page)
    await action(page, "submit-item")
    expect((await dialogKind(page)) !== null, "editor fechou apesar da falha")
    expect(/salvar/i.test(await toast(page)), "sem feedback de falha")
    expect(
      (await page.locator("#item-title input").inputValue()) === "Cadeira de escritório",
      "texto perdido após falha",
    )
  },
}

await runProof(checkpoints, "round03")
