import {
  action,
  addChips,
  choose,
  confirmOk,
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

// Rodada 58 (AUDITORIA_FUNCIONAL_2026-10-18, itens A4, A5 e A6): Política de privacidade e Código de
// conduta legíveis (links do aceite que voltam ao mesmo passo sem perder o formulário); pedido depois
// da escolha (concluir, conversar, desistir, proposta vencida); "Ocultar" pessoal com Desfazer e a
// lista Ocultados. Um checkpoint por comportamento.
const VALID = "senha1234"
const req = async (page, id) => (await stored(page)).requests?.find((r) => r.id === id)
const value = (page, id) => page.locator(`#${id}`).evaluate((el) => el.value)
const routeIs = (page, name) =>
  page
    .waitForFunction((n) => window.Bivaque.inspect().route.name === n, name, { timeout: 3000 })
    .catch(() => {})
const onEntry = (page) => page.evaluate(() => document.body.classList.contains("entry-mode"))

// ---------- entrada: sair, abrir o cadastro ----------
async function signOutToLanding(page) {
  await snapshot(page)
  await go(page, "voce")
  await page.locator('#main [data-action="sign-out"]').click()
  await settle(page)
  await confirmOk(page)
}
async function startSignup(page) {
  await signOutToLanding(page)
  await page.locator('#main [data-action="entry-join"]').click()
  await settle(page)
  expect((await routeOf(page)).id === "conta", "Quero fazer parte não abriu a conta")
}
async function openLegalFromConsent(page, kind) {
  await page
    .locator(`#main label.en-check [data-action="open-legal"][data-value="${kind}"]`)
    .click()
  await routeIs(page, kind)
  await settle(page)
  expect((await routeOf(page)).name === kind, `o link ${kind} não abriu a página`)
}
async function backFromLegal(page) {
  await page.locator('#main [data-action="back"]').click()
  await routeIs(page, "entrar")
  await settle(page)
  expect((await routeOf(page)).name === "entrar", "voltar da página não retornou à entrada")
}

// ---------- pedidos ----------
async function demoCategory(page) {
  const s = await snapshot(page)
  const counts = {}
  for (const b of s.biz)
    if (b.city === s.homeCity && b.claimed !== false) counts[b.cat] = (counts[b.cat] || 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}
async function createRequest(page, cat) {
  if (!(await page.locator('[data-action="create"]:visible').count())) await go(page, "inicio")
  await page.locator('[data-action="create"]:visible').first().click()
  await settle(page)
  await page.locator('#create-menu [data-action="create-request"]').click()
  await settle(page)
  await choose(page, "request-cat", cat)
  await choose(page, "request-hood", "Outro bairro")
  await fill(page, "request-desc", "Preciso de manutenção completa no apartamento de dois quartos.")
  await action(page, "submit-request")
  await dismissPushAsk(page)
  const r = await routeOf(page)
  expect(r.name === "pedido" && r.id, `pedido não abriu: ${r.name}`)
  return r.id
}
async function simulateProposals(page) {
  await action(page, "prototype")
  await action(page, "simulate-proposals")
  await page.keyboard.press("Escape")
  await settle(page)
}
// Pedido com propostas recebidas e ainda aberto.
async function requestWithProposals(page, minimum = 2) {
  const id = await createRequest(page, await demoCategory(page))
  await simulateProposals(page)
  const r = await req(page, id)
  expect(r.proposals.length >= minimum, `só ${r.proposals.length} propostas de exemplo`)
  return id
}
// Escolhe a primeira proposta pela tela (a escolha abre a conversa) e volta ao pedido.
async function chooseFirst(page, id) {
  await go(page, `pedido/${id}`)
  const pid = (await req(page, id)).proposals[0].id
  await page.locator(`[data-action="choose-proposal"][data-value="${id}|${pid}"]`).click()
  await settle(page)
  await confirmOk(page)
  await routeIs(page, "conversa")
  expect((await req(page, id)).status === "chosen", "a escolha não foi salva")
  await go(page, `pedido/${id}`)
  return pid
}
// Edita o armazenamento (fixture) e recarrega.
async function patchState(page, fn, arg) {
  await page.evaluate(
    ([k, src, a]) => {
      const s = JSON.parse(localStorage.getItem(k))
      new Function("s", "a", src)(s, a)
      localStorage.setItem(k, JSON.stringify(s))
    },
    [KEY, `${fn}`, arg],
  )
  await reload(page)
}
const mainText = (page) => page.locator("#main").innerText()

// ---------- perguntas ----------
async function swipeAndTap(page, qid, act) {
  const row = page.locator(
    `#main .swipe-row:has([data-action="open-question"][data-value="${qid}"])`,
  )
  const content = row.locator(".swipe-content")
  const box = await content.boundingBox()
  const y = box.y + box.height / 2
  const x = box.x + box.width * 0.7
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (const dx of [20, 60, 120, 180, 230]) await page.mouse.move(x - dx, y)
  await page.mouse.up()
  await settle(page)
  await row.locator(`.swipe-actions [data-action="${act}"]`).click()
  await settle(page)
}
async function firstListedQuestion(page) {
  await snapshot(page)
  await go(page, "comunidade")
  const qid = await page
    .locator('#main [data-action="open-question"]')
    .first()
    .getAttribute("data-value")
  expect(qid, "sem pergunta na lista da Comunidade")
  const ask = (await stored(page)).asks.find((a) => a.id === qid)
  return { qid, text: ask.q }
}
const askOf = async (page, id) => (await stored(page)).asks.find((a) => a.id === id)

const checkpoints = {
  // ---- A4: Política de privacidade e Código de conduta ----
  async "consent-links-open-the-pages-and-keep-the-form"(page) {
    await startSignup(page)
    await fill(page, "en-name", "Carla Teste")
    await fill(page, "en-email", "carla.teste@exemplo.com")
    await fill(page, "en-pass", VALID)
    // Caixa desmarcada: tocar no link não marca a caixa.
    await openLegalFromConsent(page, "privacidade")
    expect(await onEntry(page), "a página aberta por quem saiu não usa o visual da entrada")
    const text = await mainText(page)
    expect(/Versão de teste/.test(text), "a política não diz que é versão de teste")
    expect(
      /O CPF serve só para confirmar o vínculo e não fica salvo/.test(text),
      "política sem CPF",
    )
    expect(/Seu bairro só aparece se você permitir/.test(text), "política sem o bairro")
    await backFromLegal(page)
    expect((await routeOf(page)).id === "conta", "não voltou ao mesmo passo (conta)")
    expect(
      (await value(page, "en-name")) === "Carla Teste" &&
        (await value(page, "en-email")) === "carla.teste@exemplo.com" &&
        (await value(page, "en-pass")) === VALID,
      "o que foi digitado se perdeu ao ler a política",
    )
    expect(
      !(await page.locator("#en-consent").evaluate((el) => el.checked)),
      "tocar no link marcou a caixa do aceite",
    )
    // Caixa marcada: tocar no link não desmarca.
    await page.locator("#en-consent").click()
    await openLegalFromConsent(page, "conduta")
    const conduct = await mainText(page)
    expect(
      /Código de conduta/.test(conduct) && /Como denunciar/.test(conduct),
      "conduta incompleta",
    )
    await backFromLegal(page)
    expect(
      await page.locator("#en-consent").evaluate((el) => el.checked),
      "tocar no link desmarcou a caixa do aceite",
    )
    expect((await value(page, "en-name")) === "Carla Teste", "nome perdido na segunda leitura")
    // A senha só ficou na memória: nunca no armazenamento.
    await page.locator('#main [data-action="entry-signup"]').click()
    await settle(page)
    expect((await routeOf(page)).id === "cpf", "o cadastro não seguiu depois da leitura")
    const raw = await page.evaluate((k) => localStorage.getItem(k), KEY)
    expect(!raw.includes(VALID), "a senha foi gravada")
  },
  async "google-consent-link-returns-to-the-same-step"(page) {
    await startSignup(page)
    await page.locator('#main [data-action="entry-google"]').first().click()
    await settle(page)
    expect((await routeOf(page)).id === "aceite", "o Google não abriu o aceite")
    await page.locator("#en-consent").click()
    await openLegalFromConsent(page, "privacidade")
    await backFromLegal(page)
    expect((await routeOf(page)).id === "aceite", "não voltou ao passo do aceite")
    expect(
      await page.locator("#en-consent").evaluate((el) => el.checked),
      "a caixa do aceite do Google foi desmarcada",
    )
  },
  async "legal-pages-open-with-an-account"(page) {
    await snapshot(page)
    for (const [name, title, trecho] of [
      ["privacidade", "Política de privacidade", /Quem vê/],
      ["conduta", "Código de conduta", /Comércio honesto/],
    ]) {
      await go(page, name)
      const r = await routeOf(page)
      expect(r.name === name, `quem está dentro foi redirecionado de ${name} para ${r.name}`)
      expect(!(await onEntry(page)), `${name} abriu sem a barra do app para quem está dentro`)
      const text = await mainText(page)
      expect(text.includes(title) && trecho.test(text), `${name} sem o texto esperado`)
      expect(/Versão de teste/.test(text), `${name} sem 'Versão de teste'`)
    }
  },
  async "legal-pages-open-without-an-account"(page) {
    await signOutToLanding(page)
    expect((await routeOf(page)).name === "entrar", "sair não levou à landing")
    // Rodapé da landing.
    await page.locator('#main .en-legal [data-action="open-legal"][data-value="conduta"]').click()
    await routeIs(page, "conduta")
    await settle(page)
    expect((await routeOf(page)).name === "conduta", "o link da landing não abriu o código")
    expect(await onEntry(page), "a página não usa o visual da entrada para quem saiu")
    expect(/Comércio honesto/.test(await mainText(page)), "código sem texto")
    await backFromLegal(page)
    expect((await stored(page)).signedOut === true, "ler a página mudou a sessão")
    // Endereço direto, sem passar pela landing.
    await go(page, "privacidade")
    expect((await routeOf(page)).name === "privacidade", "o endereço direto foi redirecionado")
    expect(/O que guardamos/.test(await mainText(page)), "privacidade sem texto")
  },
  async "settings-links-open-the-pages"(page) {
    await snapshot(page)
    await go(page, "voce")
    await action(page, "settings")
    await page.locator('#dialog [data-action="open-legal"][data-value="privacidade"]').click()
    await routeIs(page, "privacidade")
    await settle(page)
    expect((await routeOf(page)).name === "privacidade", "Configurações não abriu a política")
    expect(!(await page.evaluate(() => document.querySelector("#dialog")?.open)), "diálogo aberto")
    await go(page, "voce")
    await action(page, "settings")
    await page.locator('#dialog [data-action="open-legal"][data-value="conduta"]').click()
    await routeIs(page, "conduta")
    await settle(page)
    expect((await routeOf(page)).name === "conduta", "Configurações não abriu o código")
  },

  // ---- A5: pedido depois da escolha ----
  async "complete-request-closes-it-as-done"(page) {
    const id = await requestWithProposals(page, 1)
    await chooseFirst(page, id)
    const before = await mainText(page)
    for (const label of [
      "Serviço concluído",
      "Conversar com o prestador",
      "Desistir desta proposta",
    ])
      expect(before.includes(label), `pedido escolhido sem '${label}'`)
    await action(page, "complete-request", id)
    const r = await req(page, id)
    expect(r.status === "done" && r.doneAt, "o pedido não ficou concluído")
    expect(/Serviço concluído/.test(await toast(page)), "sem aviso de serviço concluído")
    const after = await mainText(page)
    expect(/Concluído/.test(after), "o detalhe não mostra o pedido concluído")
    expect(
      !(await page
        .locator('[data-action="complete-request"],[data-action="give-up-proposal"]')
        .count()),
      "pedido concluído ainda oferece concluir ou desistir",
    )
    expect(
      (await page.locator('[data-action="chat-provider"]').count()) === 1,
      "pedido concluído perdeu a conversa com o prestador",
    )
    await go(page, "pedidos")
    expect(
      /Concluído/.test(
        await page.locator(`#main [data-action="open-request"][data-value="${id}"]`).innerText(),
      ),
      "a lista de pedidos não mostra 'Concluído'",
    )
  },
  async "chat-with-provider-opens-the-conversation"(page) {
    const id = await requestWithProposals(page, 1)
    await chooseFirst(page, id)
    const r = await req(page, id)
    const threads = (await stored(page)).threads.length
    await action(page, "chat-provider", id)
    await routeIs(page, "conversa")
    const route = await routeOf(page)
    expect(route.name === "conversa" && route.id === r.threadId, "não abriu a conversa da escolha")
    expect((await stored(page)).threads.length === threads, "criou uma segunda conversa")
  },
  async "give-up-reopens-for-the-other-valid-proposals"(page) {
    const id = await requestWithProposals(page, 2)
    const pid = await chooseFirst(page, id)
    const total = (await req(page, id)).proposals.length
    await action(page, "give-up-proposal", id)
    expect(
      (await req(page, id)).status === "chosen",
      "desistir não pediu confirmação (o pedido já mudou)",
    )
    await confirmOk(page)
    const r = await req(page, id)
    expect(r.status === "open" && !r.chosen, `pedido não reabriu: ${r.status}`)
    expect(
      r.proposals.find((p) => p.id === pid).status === "gaveup",
      "proposta não ficou desistida",
    )
    expect(
      r.proposals.filter((p) => p.id !== pid).every((p) => p.status === "sent"),
      "as outras propostas válidas não voltaram",
    )
    expect(/Pedido reaberto/.test(await toast(page)), "sem aviso do resultado")
    const text = await mainText(page)
    expect(
      new RegExp(`Propostas \\(${total - 1} de 5\\)`).test(text),
      "a lista mostra a proposta desistida ou perdeu as outras",
    )
    const buttons = await page.locator('[data-action="choose-proposal"]').count()
    expect(buttons === total - 1, `só ${buttons} propostas podem ser escolhidas de novo`)
  },
  async "give-up-after-the-deadline-keeps-the-request-closed"(page) {
    const id = await requestWithProposals(page, 2)
    await chooseFirst(page, id)
    await patchState(page, "s.requests.find((r) => r.id === a).expiresAt = Date.now() - 1000", id)
    await go(page, `pedido/${id}`)
    await action(page, "give-up-proposal", id)
    await confirmOk(page)
    const r = await req(page, id)
    expect(r.status === "open", "o status do pedido ficou inesperado")
    expect(
      r.proposals.filter((p) => p.status === "sent").length === 0,
      "propostas voltaram depois do prazo do pedido",
    )
    expect(/prazo do pedido já passou/.test(await toast(page)), "sem aviso do prazo")
    expect(/Expirado/.test(await mainText(page)), "o pedido sem prazo não aparece como Expirado")
    expect(
      !(await page.locator('[data-action="choose-proposal"]').count()),
      "pedido encerrado ainda permite escolher",
    )
  },
  async "expired-proposal-cannot-be-chosen"(page) {
    const id = await requestWithProposals(page, 2)
    const pid = (await req(page, id)).proposals[0].id
    await patchState(
      page,
      `const d = new Date(); d.setDate(d.getDate() - 1)
       const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
       s.requests.find((r) => r.id === a[0]).proposals.find((p) => p.id === a[1]).validUntil = iso`,
      [id, pid],
    )
    await go(page, `pedido/${id}`)
    const col = page.locator(
      `.prop-col:has([data-action="choose-proposal"][data-value="${id}|${pid}"])`,
    )
    expect((await col.count()) === 0, "a proposta vencida ainda tem o botão Escolher")
    expect(/Vencida/.test(await mainText(page)), "a proposta vencida não aparece como 'Vencida'")
    const others = (await req(page, id)).proposals.length - 1
    expect(
      (await page.locator('[data-action="choose-proposal"]').count()) === others,
      "as outras propostas deixaram de poder ser escolhidas",
    )
    // Tela desatualizada: um botão de escolha para a proposta vencida.
    await page.evaluate((v) => {
      const b = document.createElement("button")
      b.dataset.action = "choose-proposal"
      b.dataset.value = v
      b.textContent = "escolher vencida"
      b.style.cssText = "position:fixed;top:100px;left:10px;z-index:9999"
      document.body.append(b)
    }, `${id}|${pid}`)
    await page.locator("text=escolher vencida").click()
    await settle(page)
    expect(/venceu/.test(await toast(page)), "a escolha da proposta vencida foi aceita")
    expect((await req(page, id)).status === "open", "o pedido mudou de situação")
  },
  async "give-up-notices-the-provider-page"(page) {
    const cat = await demoCategory(page)
    await go(page, "voce")
    await action(page, "my-biz")
    await fill(page, "biz-name", "Prestador Teste")
    await choose(page, "biz-category", cat)
    await fill(page, "biz-hours", "Seg a sex, 8h às 18h")
    await addChips(page, "biz-hoods", ["Centro"])
    await addChips(page, "biz-services", ["Atendimento geral"])
    await action(page, "submit-biz")
    const id = await createRequest(page, cat)
    const fixture = () => `
      const r = s.requests.find((x) => x.id === a[0])
      const mk = (id, bizId, status) => ({ id, bizId, price: { kind: "fixed", min: 300 }, date: "2099-01-01", validUntil: "2099-01-02", duration: "1 dia", msg: "Proposta de teste", status, at: Date.now() })
      r.proposals = [
        mk("p-meu", s.myBiz.id, a[1] ? "chosen" : "declined"),
        mk("p-outra", s.biz[0].id, a[1] ? "declined" : "chosen"),
      ]
      r.status = "chosen"
      r.chosen = a[1] ? "p-meu" : "p-outra"
      r.threadId = null
      s.notices = s.notices.filter((n) => !n.go || n.go[1] !== a[0])`
    // 1) A página do prestador é a escolhida: o cliente desiste e a empresa é avisada.
    await patchState(page, fixture(), [id, true])
    await go(page, `pedido/${id}`)
    await action(page, "give-up-proposal", id)
    await confirmOk(page)
    let s = await stored(page)
    expect(
      s.notices.some((n) => n.go?.[1] === id && /desistiu da sua proposta/.test(n.text)),
      "a empresa desistida não foi avisada",
    )
    expect(
      s.requests.find((r) => r.id === id).proposals.find((p) => p.id === "p-meu").status ===
        "gaveup",
      "proposta da empresa não ficou desistida",
    )
    // 2) Outra empresa foi a escolhida: a página do prestador volta à lista e é avisada.
    await patchState(page, fixture(), [id, false])
    await go(page, `pedido/${id}`)
    await action(page, "give-up-proposal", id)
    await confirmOk(page)
    s = await stored(page)
    expect(
      s.notices.some((n) => n.go?.[1] === id && /voltou à lista/.test(n.text)),
      "a empresa que voltou à lista não foi avisada",
    )
    expect(
      s.requests.find((r) => r.id === id).proposals.find((p) => p.id === "p-meu").status === "sent",
      "a proposta da empresa não voltou",
    )
  },

  // ---- A6: Ocultar pessoal ----
  async "hide-question-is-personal-and-can-be-undone"(page) {
    const { qid } = await firstListedQuestion(page)
    await swipeAndTap(page, qid, "hide-question")
    const ask = await askOf(page, qid)
    expect(typeof ask.hiddenByMe === "number", "ocultar não gravou o campo pessoal")
    expect(!ask.hidden, "ocultar gravou o campo da moderação")
    expect(
      (await page.locator(`#main [data-action="open-question"][data-value="${qid}"]`).count()) ===
        0,
      "a pergunta ocultada continua na lista",
    )
    expect(/Pergunta ocultada para você\./.test(await toast(page)), "sem o aviso de ocultar")
    await page.locator('#snackbar [data-action="undo"]').click()
    await settle(page)
    expect((await askOf(page, qid)).hiddenByMe === undefined, "Desfazer não devolveu a pergunta")
    expect(
      (await page.locator(`#main [data-action="open-question"][data-value="${qid}"]`).count()) ===
        1,
      "a pergunta não voltou à lista depois de Desfazer",
    )
  },
  async "hidden-question-direct-link-does-not-say-moderation"(page) {
    const { qid, text } = await firstListedQuestion(page)
    await swipeAndTap(page, qid, "hide-question")
    await go(page, `pergunta/${qid}`)
    const body = await mainText(page)
    expect(/Você ocultou esta pergunta/.test(body), "o endereço direto não avisa que foi ocultada")
    expect(body.includes(text), "o endereço direto não abre a pergunta")
    expect(!/modera/i.test(body), "a pergunta ocultada pela pessoa fala em moderação")
    await action(page, "show-question", qid)
    expect((await askOf(page, qid)).hiddenByMe === undefined, "Mostrar não limpou o campo")
    expect(
      !/Você ocultou esta pergunta/.test(await mainText(page)),
      "a faixa continua depois de Mostrar",
    )
  },
  async "moderation-removal-still-says-moderation"(page) {
    const { qid } = await firstListedQuestion(page)
    await patchState(page, "s.asks.find((x) => x.id === a).hidden = true", qid)
    await go(page, `pergunta/${qid}`)
    expect(/modera/i.test(await mainText(page)), "a remoção pela moderação deixou de ser dita")
    await go(page, "comunidade")
    expect(
      (await page.locator(`#main [data-action="open-question"][data-value="${qid}"]`).count()) ===
        0,
      "pergunta removida pela moderação continua na lista",
    )
  },
  async "hidden-list-in-settings-shows-the-question-again"(page) {
    const { qid, text } = await firstListedQuestion(page)
    await patchState(page, "s.asks.find((x) => x.id === a).hiddenByMe = Date.now()", qid)
    await go(page, "voce")
    await action(page, "settings")
    await page.locator('#dialog [data-action="open-hidden"]').click()
    await routeIs(page, "ocultados")
    await settle(page)
    expect((await routeOf(page)).name === "ocultados", "Configurações não abriu Ocultados")
    expect(/Só você deixa de ver/.test(await mainText(page)), "Ocultados sem a explicação")
    const row = page.locator("#main .list-row", { hasText: text })
    expect((await row.count()) === 1, "a pergunta ocultada não está na lista")
    expect(/ocultada em/.test(await row.innerText()), "a linha não diz quando foi ocultada")
    await row.locator('[data-action="show-question"]').click()
    await settle(page)
    expect((await askOf(page, qid)).hiddenByMe === undefined, "Mostrar não limpou o campo")
    expect((await row.count()) === 0, "a pergunta continua em Ocultados")
    expect(/Nada oculto/.test(await mainText(page)), "lista vazia sem o aviso")
    await go(page, "comunidade")
    expect(
      (await page.locator(`#main [data-action="open-question"][data-value="${qid}"]`).count()) ===
        1,
      "a pergunta não voltou à Comunidade",
    )
  },
}

await runProof(checkpoints, "round58")
