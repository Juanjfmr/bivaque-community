import {
  action,
  choose,
  confirmOk,
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

// Rodada 60 (AUDITORIA_FUNCIONAL_2026-10-18, item C): bloquear pessoa, denunciar resposta, comentário,
// publicação e conversa, e a consequência de cada tipo no Painel do Bivaque. Um checkpoint por
// comportamento. Fixtures entram pelo armazenamento (`patchState`, que recarrega); o que a prova pode
// fazer pela tela, faz pela tela (bloquear, denunciar, decidir no Painel).
const GID = "g-familias"
const OLD_DAY = "new Date(2026,9,18,12).getTime()"

const mainText = (page) => page.locator("#main").innerText()
const confirmText = (page) => page.locator("#confirm-dialog").innerText()
const count = (page, selector) => page.locator(selector).count()
async function patchState(page, code, arg) {
  await snapshot(page)
  await page.evaluate(
    ([k, src, a]) => {
      const s = JSON.parse(localStorage.getItem(k))
      new Function("s", "a", `{${src}}`)(s, a)
      localStorage.setItem(k, JSON.stringify(s))
    },
    [KEY, code, arg],
  )
  await reload(page)
}
async function openMenu(page, openAction, value) {
  await page.locator(`[data-action="${openAction}"][data-value="${value}"]:visible`).first().click()
  await settle(page)
}
async function pickMenu(page, openAction, value, item) {
  await openMenu(page, openAction, value)
  await page.locator(`#create-menu [data-action="${item}"]`).click()
  await settle(page)
}
const menuLabels = async (page) =>
  (await page.locator("#create-menu .create-menu-label").allInnerTexts()).map((t) => t.trim())
const menuIcons = async (page) =>
  (await page.locator("#create-menu md-icon").allInnerTexts()).map((t) => t.trim())
const searchOf = (page, q) => page.evaluate((x) => window.Bivaque.search(x), q)
const askOf = async (page, id) => (await stored(page)).asks.find((a) => a.id === id)
const answerOf = async (page, qid, who) =>
  (await askOf(page, qid)).answers.find((a) => a.who === who)
const dayIso = (page, n) =>
  page.evaluate((k) => {
    const d = new Date()
    d.setDate(d.getDate() + k)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }, n)
// Primeira publicação e comentário do grupo de famílias por autor (ids sorteados a cada carga).
async function seeded(page) {
  const s = await snapshot(page)
  const g = s.groups.find((x) => x.id === GID)
  const question = g.posts.find((p) => p.author === "Luana M.")
  return {
    s,
    question,
    poll: g.posts.find((p) => p.author === "Ana P."),
    monica: question.comments.find((c) => c.author === "Mônica L."),
    ana: question.comments.find((c) => c.author === "Ana P."),
    a3monica: s.asks.find((a) => a.id === "a3").answers.find((a) => a.who === "Mônica L."),
  }
}
// Bloqueia pela tela: toca no item do menu (ou no botão) e confirma.
async function confirmBlock(page) {
  await confirmOk(page)
  await settle(page)
}

// Fixtures do Painel: denúncias já feitas (as de verdade passam pela tela no checkpoint próprio).
const REPORTS = `s.reports=[...(s.reports||[]),...a.map((r,i)=>({id:'rp-r60-'+i,reason:'abuse',details:'',at:Date.now()-36e5*(i+1),status:'open',...r}))]`
// Meu pedido com duas propostas, e outro com a proposta escolhida.
const REQUESTS = `const mk=(id,over)=>({id,city:s.homeCity,cat:'Casa e reparos',spec:null,hood:'Centro',desc:'Preciso de um eletricista para trocar a fiação do quarto, com material incluso.',when:{kind:'asap',date:null},photos:[],status:'open',createdAt:Date.now()-36e5,expiresAt:Date.now()+5*864e5,who:s.profile.name,mine:true,proposals:[],...over});const pr=(id,bizId,status)=>({id,bizId,price:{kind:'fixed',min:300,max:null},date:a[0],duration:'1 dia',validUntil:a[1],msg:'Atendemos o Centro com material incluso.',status,at:Date.now()-18e5});s.requests=[mk('r-r60',{proposals:[pr('p-r60-1','b6','sent'),pr('p-r60-2','b1','sent')]}),mk('r-r60c',{status:'chosen',chosen:'p-r60-c1',threadId:'t3',proposals:[pr('p-r60-c1','b6','chosen'),pr('p-r60-c2','b1','declined')]})]`

// Painel: revisa uma denúncia pelo prefixo do id.
const queueTitles = (page) =>
  page.locator("#main .ow-q .t b").evaluateAll((els) => els.map((e) => e.textContent))
const queueId = (page, prefix) =>
  page
    .locator(`#main [data-action="owner-review"][data-value^="${prefix}"]`)
    .first()
    .getAttribute("data-value")
async function review(page, prefix) {
  const id = await queueId(page, prefix)
  expect(!!id, `sem a denúncia ${prefix} na fila`)
  await page.locator(`#main [data-action="owner-review"][data-value="${id}"]`).click()
  await settle(page)
  expect(
    await page.evaluate(() => document.querySelector("#dialog")?.dataset.kind === "owner-review"),
    `a revisão de ${prefix} não abriu`,
  )
  return id
}
const dialogButtons = (page) =>
  page
    .locator(
      "#dialog .dialog-actions md-text-button, #dialog .dialog-actions md-filled-button, #dialog .dialog-actions md-outlined-button",
    )
    .allInnerTexts()
    .then((l) => l.map((t) => t.trim()))
// Decide uma denúncia: abre, escolhe o motivo e toca na decisão.
async function decide(page, prefix, d, reason = "ofensa") {
  const id = await review(page, prefix)
  if (reason) await choose(page, "owner-reason", reason)
  await page.locator(`#dialog [data-action="owner-decide"][data-value="${id}~${d}"]`).click()
  await settle(page)
  return id
}

const checkpoints = {
  // ---- Bloquear (quadros 3 e 4) ----
  async "answer-menu-offers-report-and-block-and-confirm-explains-it"(page) {
    const { a3monica } = await seeded(page)
    await go(page, "pergunta/a3")
    expect(
      (await count(page, '[data-action="answer-other-menu"]:visible')) === 2,
      "⋮ nas duas respostas alheias",
    )
    expect(
      (await count(page, '[data-action="answer-menu"]')) === 0,
      "menu de autor em resposta alheia",
    )
    await openMenu(page, "answer-other-menu", `a3|${a3monica.id}`)
    expect(
      JSON.stringify(await menuLabels(page)) ===
        JSON.stringify(["Denunciar resposta", "Bloquear Mônica L."]),
      `rótulos: ${await menuLabels(page)}`,
    )
    expect(
      JSON.stringify(await menuIcons(page)) === JSON.stringify(["flag", "cancel"]),
      `ícones: ${await menuIcons(page)}`,
    )
    await page.locator('#create-menu [data-action="block-person"]').click()
    await settle(page)
    const text = await confirmText(page)
    expect(/Bloquear Mônica L\.\?/.test(text), `título: ${text}`)
    expect(
      /Você deixa de ver as perguntas, respostas, anúncios e mensagens dela, e ela não consegue mais falar com você\./.test(
        text,
      ) && /Ela não é avisada\. Você pode desbloquear em Configurações\./.test(text),
      `os dois parágrafos do quadro 4: ${text}`,
    )
    expect((await count(page, "#confirm-dialog [slot=content] p")) === 2, "não são dois parágrafos")
    expect(
      (await page.locator("#confirm-dialog md-text-button").innerText()).trim() === "Cancelar" &&
        (await page.locator("#confirm-dialog md-filled-button").innerText()).trim() ===
          "Bloquear" &&
        (await count(page, "#confirm-dialog .danger-fill")) === 0,
      "botões Cancelar e Bloquear (sem o vermelho)",
    )
    await page.locator('#confirm-dialog [data-action="cancel-confirm"]').click()
    await settle(page)
    expect(!((await stored(page)).blocked || []).length, "Cancelar bloqueou")
    expect((await mainText(page)).includes(a3monica.t), "a resposta sumiu sem confirmar")
    await openMenu(page, "answer-other-menu", `a3|${a3monica.id}`)
    await page.locator('#create-menu [data-action="block-person"]').click()
    await settle(page)
    await confirmBlock(page)
    expect(/Mônica L\. bloqueada\./.test(await toast(page)), `aviso: ${await toast(page)}`)
    const blocked = (await stored(page)).blocked
    expect(blocked.length === 1 && blocked[0].name === "Mônica L.", "não gravou o bloqueio")
    expect(!(await mainText(page)).includes(a3monica.t), "a resposta continua na pergunta")
    expect(
      (await count(page, '[data-action="answer-other-menu"]:visible')) === 1,
      "sobrou mais de uma",
    )
  },
  async "blocking-from-an-ad-removes-the-person-everywhere-and-detail-asks-first"(page) {
    const s = await snapshot(page)
    const a5 = s.asks.find((a) => a.id === "a5")
    const turmaPost = s.groups
      .find((g) => g.id === "turma-manaus-2027")
      .posts.find((p) => p.author === "Paulo R.")
    // Antes: Paulo R. aparece em Comunidade, busca, catálogo e grupo.
    expect((await searchOf(page, "berço")).items.includes("i3"), "o anúncio não aparecia na busca")
    expect((await searchOf(page, a5.q)).asks.includes("a5"), "a pergunta não aparecia na busca")
    await go(page, "grupo/turma-manaus-2027")
    expect(
      (await mainText(page)).includes(turmaPost.text.slice(0, 20)),
      "a publicação não aparecia no grupo",
    )
    await go(page, "anuncio/i3")
    expect(
      (await count(page, '[data-action="block-person"][data-value="Paulo R."]')) === 1,
      "sem Bloquear ao lado de Denunciar",
    )
    await page.locator('[data-action="block-person"][data-value="Paulo R."]').click()
    await settle(page)
    await confirmBlock(page)
    expect(/Paulo R\. bloqueado\./.test(await toast(page)), `aviso: ${await toast(page)}`)
    // O próprio anúncio pede confirmação antes de aparecer (detalhe aberto pelo endereço).
    let body = await mainText(page)
    expect(/Conteúdo de uma pessoa que você bloqueou/.test(body), `detalhe: ${body.slice(0, 120)}`)
    expect((await count(page, '[data-action="peek-blocked"]')) === 1, "sem 'Ver mesmo assim'")
    expect(
      (await count(page, '[data-action="item-interest"]:visible')) === 0,
      "contato disponível no anúncio bloqueado",
    )
    // Depois: some de tudo.
    expect(!(await searchOf(page, "berço")).items.includes("i3"), "o anúncio continua na busca")
    expect(!(await searchOf(page, a5.q)).asks.includes("a5"), "a pergunta continua na busca")
    await go(page, "desapegos")
    expect(
      (await count(page, '#main [data-action="open-item"][data-value="i3"]')) === 0,
      "o anúncio continua em Desapegos",
    )
    await go(page, "comunidade")
    await page.locator('[data-action="question-filter"][data-value="ok"]').first().click()
    await settle(page)
    expect(
      (await count(page, '#main [data-action="open-question"][data-value="a5"]')) === 0,
      "a pergunta continua em Resolvidas",
    )
    await page.locator('[data-action="question-filter"][data-value="help"]').first().click()
    await settle(page)
    const a3row = await page
      .locator('#main [data-action="open-question"][data-value="a3"]')
      .innerText()
    expect(
      /1 resposta\b/.test(a3row),
      `a pergunta de outra pessoa ainda conta a resposta dele: ${a3row}`,
    )
    await go(page, "grupo/turma-manaus-2027")
    expect(
      !(await mainText(page)).includes(turmaPost.text.slice(0, 20)),
      "a publicação continua no grupo",
    )
    await go(page, `publicacao/turma-manaus-2027~${turmaPost.id}`)
    expect(
      /Conteúdo de uma pessoa que você bloqueou/.test(await mainText(page)),
      "publicação aberta pelo endereço sem aviso",
    )
    await go(page, "conversas")
    expect(
      /Você bloqueou esta pessoa/.test(await mainText(page)),
      "a conversa não mostra o bloqueio",
    )
    // Pergunta aberta pelo endereço: pede confirmação; "Ver mesmo assim" mostra com a faixa; recarregar volta ao aviso.
    await go(page, "pergunta/a5")
    expect(
      /Conteúdo de uma pessoa que você bloqueou/.test(await mainText(page)),
      "pergunta sem aviso",
    )
    await page.locator('[data-action="peek-blocked"]').click()
    await settle(page)
    body = await mainText(page)
    expect(
      body.includes(a5.q) && /Você bloqueou Paulo R\./.test(body),
      "Ver mesmo assim não mostrou a pergunta com a faixa",
    )
    expect(
      (await count(page, '#main [data-action="unblock-person"]')) === 1,
      "sem Desbloquear na faixa",
    )
    await reload(page)
    expect(
      /Conteúdo de uma pessoa que você bloqueou/.test(await mainText(page)),
      "o 'Ver mesmo assim' ficou guardado",
    )
  },
  async "blocking-from-group-post-and-comment-menus"(page) {
    const { question, poll, monica } = await seeded(page)
    await go(page, `grupo/${GID}`)
    await openMenu(page, "post-other-menu", `${GID}|${question.id}`)
    expect(
      JSON.stringify(await menuLabels(page)) ===
        JSON.stringify(["Denunciar publicação", "Bloquear Luana M."]),
      `menu da publicação: ${await menuLabels(page)}`,
    )
    await page.keyboard.press("Escape")
    await settle(page)
    expect(
      (await count(page, '[data-action="post-menu"]')) === 0,
      "menu de autor em publicação alheia",
    )
    await go(page, `publicacao/${GID}~${question.id}`)
    await openMenu(page, "comment-other-menu", `${GID}|${question.id}|${monica.id}`)
    expect(
      JSON.stringify(await menuLabels(page)) ===
        JSON.stringify(["Denunciar resposta", "Bloquear Mônica L."]),
      `menu do comentário (pergunta de grupo): ${await menuLabels(page)}`,
    )
    await page.locator('#create-menu [data-action="block-person"]').click()
    await settle(page)
    await confirmBlock(page)
    expect(!(await mainText(page)).includes(monica.text), "o comentário continua na publicação")
    expect(
      /1 comentário\b/.test(await mainText(page)),
      "o contador não descontou o comentário bloqueado",
    )
    await go(page, `grupo/${GID}`)
    expect(
      /1 comentário\b/.test(
        await page.locator(`#main .gpost:has([data-value="${GID}|${question.id}"])`).innerText(),
      ),
      "o contador do feed",
    )
    // Bloquear quem escreveu a publicação a tira do feed.
    await openMenu(page, "post-other-menu", `${GID}|${poll.id}`)
    await page.locator('#create-menu [data-action="block-person"]').click()
    await settle(page)
    await confirmBlock(page)
    expect(!(await mainText(page)).includes(poll.text), "a publicação continua no feed")
  },
  // ---- Conversa (quadro 6) ----
  async "thread-menu-has-pin-report-block-delete-and-a-blocked-thread-hides-the-composer"(page) {
    await snapshot(page)
    await go(page, "conversas")
    await openMenu(page, "thread-menu", "t3")
    const labels = await menuLabels(page)
    const core = labels.filter((l) => !/^Marcar como/.test(l))
    expect(
      JSON.stringify(core) ===
        JSON.stringify([
          "Fixar conversa",
          "Denunciar conversa",
          "Bloquear Marcos T.",
          "Apagar conversa",
        ]),
      `menu da conversa: ${labels}`,
    )
    expect(
      (await menuIcons(page)).includes("push_pin") && (await menuIcons(page)).includes("flag"),
      "ícones do menu",
    )
    expect((await count(page, "#create-menu .danger-action")) === 1, "só Apagar é perigoso")
    await page.locator('#create-menu [data-action="block-person"]').click()
    await settle(page)
    expect(/Bloquear Marcos T\.\?/.test(await confirmText(page)), "confirmação do bloqueio")
    await confirmBlock(page)
    await go(page, "conversa/t3")
    expect(
      (await count(page, "#chat-input")) === 0,
      "a caixa de mensagem continua na conversa bloqueada",
    )
    expect(
      /Você bloqueou Marcos T\./.test(await page.locator("#detail-actions").innerText()),
      "sem o aviso na conversa",
    )
    expect(
      (await count(page, '[data-action="unblock-person"]:visible')) >= 1,
      "sem o botão Desbloquear",
    )
    await openMenu(page, "thread-menu", "t3")
    expect(
      (await menuLabels(page)).includes("Desbloquear Marcos T."),
      "o menu não oferece Desbloquear",
    )
    await page.keyboard.press("Escape")
    await settle(page)
    await page.locator('[data-action="unblock-person"]:visible').first().click()
    await settle(page)
    expect((await count(page, "#chat-input")) === 1, "a caixa não voltou depois de desbloquear")
    expect(!((await stored(page)).blocked || []).length, "o bloqueio continuou gravado")
  },
  async "contact-with-a-blocked-person-is-refused"(page) {
    await patchState(
      page,
      `s.blocked=[{name:'Ricardo A.',at:Date.now()},{name:'Amazon Climatização',at:Date.now()}]`,
    )
    const before = (await stored(page)).threads.length
    await go(page, "anuncio/i2")
    await page.locator('[data-action="peek-blocked"]').click()
    await settle(page)
    await page.locator('[data-action="item-interest"]:visible').first().click()
    await settle(page)
    expect(/Você bloqueou Ricardo A\./.test(await toast(page)), `aviso: ${await toast(page)}`)
    expect((await routeOf(page)).name === "anuncio", "abriu conversa com quem foi bloqueado")
    await page.locator('[data-action="item-visit"]:visible').first().click()
    await settle(page)
    expect((await routeOf(page)).name === "anuncio", "Combinar visita abriu conversa")
    await go(page, "negocio/b1")
    await page.locator('[data-action="quote"]:visible').first().click()
    await settle(page)
    expect(
      /Você bloqueou Amazon Climatização\./.test(await toast(page)),
      `aviso (negócio): ${await toast(page)}`,
    )
    expect((await routeOf(page)).name === "negocio", "pedir orçamento abriu conversa")
    expect(
      (await stored(page)).threads.length === before,
      "criou conversa nova com quem foi bloqueado",
    )
  },
  async "settings-lists-blocked-people-and-unblocking-brings-everything-back"(page) {
    const s0 = await snapshot(page)
    const a6 = s0.asks.find((a) => a.id === "a6")
    await patchState(
      page,
      `s.blocked=[{name:'Jéssica L.',at:${OLD_DAY}},{name:'Marcos T.',at:${OLD_DAY}-864e5*5}]`,
    )
    expect(
      !(await searchOf(page, a6.q)).asks.includes("a6"),
      "a pergunta de quem foi bloqueado aparece na busca",
    )
    await go(page, "voce")
    await action(page, "settings")
    expect(
      /Pessoas bloqueadas/.test(await page.locator("#dialog").innerText()),
      "Configurações sem 'Pessoas bloqueadas'",
    )
    await page.locator('#dialog [data-action="open-blocked"]').click()
    await settle(page)
    expect((await routeOf(page)).name === "bloqueados", "não abriu Pessoas bloqueadas")
    const body = await mainText(page)
    expect(/Quem você bloqueou não vê que foi bloqueado\./.test(body), "sem a frase do quadro 5")
    expect(/Jéssica L\.[\s\S]*Bloqueada em 18\/10/.test(body), `feminino: ${body}`)
    expect(/Marcos T\.[\s\S]*Bloqueado em 13\/10/.test(body), `masculino: ${body}`)
    expect(
      (await count(page, '#main [data-action="unblock-person"]')) === 2,
      "sem os dois Desbloquear",
    )
    await page.locator('#main [data-action="unblock-person"][data-value="Jéssica L."]').click()
    await settle(page)
    expect(/Jéssica L\. desbloqueada\./.test(await toast(page)), `aviso: ${await toast(page)}`)
    expect((await stored(page)).blocked.length === 1, "a lista não encolheu")
    expect((await searchOf(page, a6.q)).asks.includes("a6"), "a pergunta não voltou para a busca")
    await go(page, "comunidade")
    expect(
      (await count(page, '#main [data-action="open-question"][data-value="a6"]')) === 1,
      "a pergunta não voltou para Comunidade",
    )
    await go(page, "bloqueados")
    await page.locator('#main [data-action="unblock-person"][data-value="Marcos T."]').click()
    await settle(page)
    expect(/Ninguém bloqueado/.test(await mainText(page)), "sem o estado vazio")
    await go(page, "grupo/turma-manaus-2027")
    expect(
      /matriculou filho/.test(await mainText(page)) || (await count(page, ".gpost")) >= 3,
      "as publicações não voltaram ao grupo",
    )
  },
  async "there-is-no-block-for-yourself"(page) {
    await patchState(
      page,
      `s.asks.unshift({id:'q-r60',q:'Onde encontro professor de xilofone aos sábados?',city:s.homeCity,who:s.profile.name,ini:'RS',mine:true,topic:s.homeCity,ctx:'Pergunta de um membro da cidade',status:'open',when:'agora',createdAt:Date.now(),answers:[{id:'a-r60-m',who:s.profile.name,ini:'RS',t:'Eu fui na clínica da esquina.',mine:true,helped:0,solved:false}]});const q3=s.asks.find(x=>x.id==='a3');q3.answers.push({id:'a-r60-m3',who:s.profile.name,ini:'RS',t:'Eu indico a escola da esquina.',mine:true,helped:0,solved:false});const g=s.groups.find(x=>x.id==='g-familias');g.posts.unshift({id:'p-r60-m',type:'post',author:s.profile.name,ini:'RS',text:'Minha dica de sábado.',at:Date.now()-36e5,comments:[{id:'c-r60-m',author:s.profile.name,ini:'RS',text:'Meu comentário.',mine:true,at:Date.now()}],useful:0,liked:false,mine:true})`,
    )
    // Pergunta minha: nem o botão, nem o ⋮ de outra pessoa na minha resposta.
    await go(page, "pergunta/q-r60")
    expect(
      (await count(
        page,
        '#main [data-action="block-person"], #main [data-action="answer-other-menu"]',
      )) === 0,
      "Bloquear na minha pergunta",
    )
    // Resposta minha numa pergunta alheia: o ⋮ dela é o de autor; o das outras pessoas oferece bloquear só elas.
    await go(page, "pergunta/a3")
    expect(
      (await count(page, '[data-action="answer-menu"]')) === 1,
      "⋮ de autor só na minha resposta",
    )
    const names = []
    for (const el of await page.locator('[data-action="answer-other-menu"]').all()) {
      await el.click()
      await settle(page)
      names.push(...(await menuLabels(page)).filter((l) => /^Bloquear /.test(l)))
      await page.keyboard.press("Escape")
      await settle(page)
    }
    expect(
      names.length === 2 && !names.some((n) => /Rafael Souza/.test(n)),
      `bloquear oferecido: ${names}`,
    )
    // Meu anúncio e minha publicação: sem Bloquear.
    await go(page, "anuncio/i4")
    expect(
      (await count(page, '#main [data-action="block-person"]')) === 0,
      "Bloquear no meu anúncio",
    )
    await go(page, `grupo/${GID}`)
    expect(
      (await count(page, '[data-action="post-other-menu"][data-value$="p-r60-m"]')) === 0,
      "⋮ de outra pessoa na minha publicação",
    )
    await go(page, `publicacao/${GID}~p-r60-m`)
    expect(
      (await count(page, '[data-action="comment-other-menu"]')) === 0,
      "⋮ de outra pessoa no meu comentário",
    )
    expect(
      (await count(page, '#main [data-action="block-person"]')) === 0,
      "Bloquear na minha publicação",
    )
    // Nas conversas, o menu só oferece a outra pessoa.
    await go(page, "conversas")
    await openMenu(page, "thread-menu", "t3")
    expect(
      !(await menuLabels(page)).some((l) => /Rafael Souza/.test(l)),
      "o menu da conversa oferece me bloquear",
    )
  },
  // ---- Denunciar ----
  async "reporting-answer-comment-post-and-thread-reaches-the-panel"(page) {
    const { a3monica, question, ana, poll } = await seeded(page)
    const report = async (name, value, item = "report") => {
      await pickMenu(page, name, value, item)
      expect(
        await page.evaluate(() => document.querySelector("#dialog")?.open),
        "a denúncia não abriu o motivo",
      )
      await choose(page, "report-reason", "abuse")
      await fill(page, "report-details", "Ofensa na conversa.")
      await page.locator('#dialog [data-action="submit-report"]').click()
      await settle(page)
      expect(/Denúncia registrada/.test(await toast(page)), `aviso: ${await toast(page)}`)
    }
    await go(page, "pergunta/a3")
    await report("answer-other-menu", `a3|${a3monica.id}`)
    await go(page, `publicacao/${GID}~${question.id}`)
    await report("comment-other-menu", `${GID}|${question.id}|${ana.id}`)
    await go(page, `grupo/${GID}`)
    await report("post-other-menu", `${GID}|${poll.id}`)
    await go(page, "conversas")
    await report("thread-menu", "t3")
    const reports = (await stored(page)).reports
    expect(
      JSON.stringify(reports.map((r) => [r.type, r.target])) ===
        JSON.stringify([
          ["answer", `a3~${a3monica.id}`],
          ["comment", `${GID}~${question.id}~${ana.id}`],
          ["post", `${GID}~${poll.id}`],
          ["thread", "t3"],
        ]),
      `denúncias gravadas: ${JSON.stringify(reports.map((r) => [r.type, r.target]))}`,
    )
    expect(
      reports.every((r) => /· “|Conversa com/.test(r.label)),
      "a denúncia não guardou o título",
    )
    // Denunciar de novo o mesmo conteúdo não duplica.
    await go(page, "pergunta/a3")
    await pickMenu(page, "answer-other-menu", `a3|${a3monica.id}`, "report")
    await choose(page, "report-reason", "spam")
    await page.locator('#dialog [data-action="submit-report"]').click()
    await settle(page)
    expect(/já denunciou/.test(await toast(page)), "denúncia repetida")
    expect((await stored(page)).reports.length === 4, "duplicou a denúncia")
    // Na fila do Painel, com título e alvo legíveis.
    await go(page, "dono/filas")
    const titles = await queueTitles(page)
    for (const t of [
      "Resposta de Mônica L. · “",
      "Resposta de Ana P. · “",
      "Publicação de Ana P. · “",
      "Conversa com Marcos T.",
    ])
      expect(
        titles.some((x) => x.startsWith(t)),
        `sem “${t}” na fila: ${titles.join(" | ")}`,
      )
    expect(/Manaus · 1 denúncia: ofensa/.test(await mainText(page)), "sem o alvo (cidade e motivo)")
  },
  // ---- Consequência no Painel ----
  async "panel-removes-answer-comment-and-post-with-removed-by-moderation-in-place"(page) {
    const { a3monica, question, ana, poll } = await seeded(page)
    await patchState(page, REPORTS, [
      { type: "answer", target: `a3~${a3monica.id}`, label: "x" },
      { type: "comment", target: `${GID}~${question.id}~${ana.id}`, label: "x" },
      { type: "post", target: `${GID}~${poll.id}`, label: "x" },
    ])
    await go(page, "dono/filas")
    // Sem motivo a remoção não passa.
    const id = await review(page, `report:answer|a3~${a3monica.id}:`)
    expect(
      JSON.stringify(await dialogButtons(page)) === JSON.stringify(["Dispensar", "Remover"]),
      `botões: ${await dialogButtons(page)}`,
    )
    await page.locator(`#dialog [data-action="owner-decide"][data-value="${id}~remove"]`).click()
    await settle(page)
    expect((await answerOf(page, "a3", "Mônica L.")).hidden !== true, "removeu sem motivo")
    await choose(page, "owner-reason", "ofensa")
    await page.locator(`#dialog [data-action="owner-decide"][data-value="${id}~remove"]`).click()
    await settle(page)
    expect((await answerOf(page, "a3", "Mônica L.")).hidden === true, "a resposta não foi removida")
    await decide(page, `report:comment|${GID}~${question.id}~${ana.id}:`, "remove")
    await decide(page, `report:post|${GID}~${poll.id}:`, "remove")
    const s = await stored(page)
    const g = s.groups.find((x) => x.id === GID)
    const p = g.posts.find((x) => x.id === question.id)
    expect(p.comments.find((c) => c.id === ana.id).hidden === true, "o comentário não foi removido")
    expect(g.posts.find((x) => x.id === poll.id).hidden === true, "a publicação não foi removida")
    expect(
      !(await queueTitles(page)).some((t) => /Mônica L\.|Ana P\./.test(t)),
      "a denúncia continua na fila",
    )
    // No app: "removido pela moderação" no lugar, fora das contas.
    await go(page, "pergunta/a3")
    const q = await mainText(page)
    expect(
      /Resposta removida pela moderação\./.test(q) && !q.includes(a3monica.t),
      "a resposta removida não foi trocada pelo aviso",
    )
    expect(
      (await count(page, '[data-action="answer-other-menu"]:visible')) === 1,
      "a resposta removida ainda tem menu",
    )
    await go(page, `publicacao/${GID}~${question.id}`)
    const c = await mainText(page)
    expect(
      /Resposta removida pela moderação\./.test(c) && !c.includes(ana.text),
      "o comentário removido não foi trocado pelo aviso",
    )
    await go(page, `grupo/${GID}`)
    const f = await mainText(page)
    expect(
      /Publicação removida pela moderação\./.test(f) && !f.includes(poll.text),
      "a publicação removida não foi trocada pelo aviso",
    )
    expect(/1 comentário\b/.test(f), "o contador ainda conta o comentário removido")
    await go(page, `publicacao/${GID}~${poll.id}`)
    expect(
      /Publicação removida/.test(await mainText(page)),
      "o endereço da publicação removida abre",
    )
  },
  async "panel-warns-or-dismisses-a-reported-conversation"(page) {
    await patchState(page, REPORTS, [
      { type: "thread", target: "t3", label: "x" },
      { type: "thread", target: "t4", label: "x" },
    ])
    await go(page, "dono/filas")
    const id = await review(page, "report:thread|t3:")
    expect(
      JSON.stringify(await dialogButtons(page)) === JSON.stringify(["Dispensar", "Advertir"]),
      `botões da conversa: ${await dialogButtons(page)}`,
    )
    await page.locator(`#dialog [data-action="owner-decide"][data-value="${id}~warn"]`).click()
    await settle(page)
    expect(!((await stored(page)).owner?.warnings || []).length, "advertiu sem motivo")
    await choose(page, "owner-reason", "ofensa")
    await page.locator(`#dialog [data-action="owner-decide"][data-value="${id}~warn"]`).click()
    await settle(page)
    expect(
      /Conversa com Marcos T\.: advertência registrada\./.test(await toast(page)),
      `aviso: ${await toast(page)}`,
    )
    const o = (await stored(page)).owner
    expect(
      o.warnings.length === 1 && o.warnings[0].who === "Marcos T.",
      "a advertência não foi registrada",
    )
    expect(o.log[0].text.includes("advertência registrada"), "sem o registro no Painel")
    const s = await stored(page)
    expect(
      s.threads.some((t) => t.id === "t3" && !t.deleted),
      "a conversa foi mexida",
    )
    await page.locator('#main [data-action="owner-status"][data-value="done"]').click()
    await settle(page)
    expect(
      /Advertência registrada/.test(await mainText(page)),
      "a decisão não aparece em Decididas",
    )
    // Dispensar fecha sem registrar nada.
    await page.locator('#main [data-action="owner-status"][data-value="open"]').click()
    await settle(page)
    await decide(page, "report:thread|t4:", "dismiss", "")
    expect((await stored(page)).owner.warnings.length === 1, "dispensar registrou advertência")
    expect(
      (await stored(page)).reports.every((r) => r.status === "closed"),
      "as denúncias não fecharam",
    )
  },
  async "panel-suspends-a-business-and-it-leaves-catalog-and-search"(page) {
    await patchState(page, REPORTS, [{ type: "biz", target: "b3", label: "x" }])
    expect(
      (await searchOf(page, "Frio Norte")).biz.includes("b3"),
      "o negócio não aparecia na busca",
    )
    await go(page, "dono/filas")
    await review(page, "report:biz|b3:")
    expect(
      JSON.stringify(await dialogButtons(page)) ===
        JSON.stringify(["Dispensar", "Suspender página"]),
      `botões do negócio: ${await dialogButtons(page)}`,
    )
    await page.keyboard.press("Escape")
    await settle(page)
    await decide(page, "report:biz|b3:", "suspend")
    expect(
      /Página suspensa/.test(await toast(page)) || /página suspensa/.test(await toast(page)),
      `aviso: ${await toast(page)}`,
    )
    expect((await stored(page)).biz.find((b) => b.id === "b3").suspended === true, "não suspendeu")
    expect(!(await searchOf(page, "Frio Norte")).biz.includes("b3"), "continua na busca")
    await go(page, "negocios")
    expect(
      (await count(page, '#main [data-action="open-biz"][data-value="b3"]')) === 0,
      "continua no catálogo",
    )
    await go(page, "comunidade")
    await page.locator('[data-action="community-tab"][data-value="biz"]').click()
    await settle(page)
    expect(
      (await count(page, '#main [data-action="open-biz"][data-value="b3"]')) === 0,
      "continua na aba de negócios",
    )
    await go(page, "negocio/b3")
    const body = await mainText(page)
    expect(/Página suspensa pela moderação/.test(body), "a página não diz que está suspensa")
    expect(
      (await count(
        page,
        '[data-action="quote"], [data-action="whatsapp"], [data-action="recommend-biz"]',
      )) === 0,
      "a página suspensa ainda recebe pedidos",
    )
  },
  async "panel-removes-a-request-and-a-proposal"(page) {
    const d1 = await dayIso(page, 2)
    const d2 = await dayIso(page, 7)
    await patchState(page, `${REQUESTS};${REPORTS}`, [d1, d2])
    // Os dois alvos no mesmo lote: o pedido e uma proposta.
    await page.evaluate(
      ([k]) => {
        const s = JSON.parse(localStorage.getItem(k))
        s.reports = [
          {
            id: "rp-r60-a",
            type: "proposal",
            target: "p-r60-1",
            reason: "fraud",
            details: "",
            at: Date.now() - 36e5,
            status: "open",
          },
          {
            id: "rp-r60-b",
            type: "request",
            target: "r-r60",
            reason: "spam",
            details: "",
            at: Date.now() - 72e5,
            status: "open",
          },
        ]
        localStorage.setItem(k, JSON.stringify(s))
      },
      [KEY],
    )
    await reload(page)
    await go(page, "pedido/r-r60")
    expect(
      /Propostas \(2 de 5\)/.test(await mainText(page)),
      "o pedido não começa com duas propostas",
    )
    await go(page, "dono/filas")
    const titles = await queueTitles(page)
    expect(
      titles.some((t) => /^Proposta de Jorge Eletricista/.test(t)) &&
        titles.some((t) => /^Pedido de orçamento: Casa e reparos/.test(t)),
      `fila: ${titles.join(" | ")}`,
    )
    await review(page, "report:proposal|p-r60-1:")
    expect(
      JSON.stringify(await dialogButtons(page)) === JSON.stringify(["Dispensar", "Remover"]),
      `botões da proposta: ${await dialogButtons(page)}`,
    )
    await page.keyboard.press("Escape")
    await settle(page)
    await decide(page, "report:proposal|p-r60-1:", "remove", "golpe")
    let s = await stored(page)
    expect(
      s.requests.find((r) => r.id === "r-r60").proposals.find((p) => p.id === "p-r60-1").status ===
        "removed",
      "a proposta não foi removida",
    )
    await go(page, "pedido/r-r60")
    expect(
      /Propostas \(1 de 5\)/.test(await mainText(page)),
      "a proposta removida continua na lista",
    )
    await go(page, "dono/filas")
    await decide(page, "report:request|r-r60:", "remove", "golpe")
    s = await stored(page)
    expect(
      s.requests.find((r) => r.id === "r-r60").status === "removed",
      "o pedido não foi removido",
    )
    await go(page, "pedido/r-r60")
    expect(/Pedido removido/.test(await mainText(page)), "o endereço do pedido removido abre")
    await go(page, "pedidos")
    expect(
      (await count(page, '#main [data-action="open-request"][data-value="r-r60"]')) === 0,
      "o pedido removido continua na lista",
    )
  },
  async "owner-undo-restores-each-consequence-without-touching-other-content"(page) {
    const { a3monica, question, ana, poll } = await seeded(page)
    const d1 = await dayIso(page, 2)
    const d2 = await dayIso(page, 7)
    await patchState(page, `${REQUESTS};${REPORTS}`, [d1, d2])
    await page.evaluate(
      ([k, items]) => {
        const s = JSON.parse(localStorage.getItem(k))
        s.reports = items.map((r, i) => ({
          id: `rp-r60-${i}`,
          reason: "abuse",
          details: "",
          at: Date.now() - 36e5 * (i + 1),
          status: "open",
          ...r,
        }))
        localStorage.setItem(k, JSON.stringify(s))
      },
      [
        KEY,
        [
          { type: "answer", target: `a3~${a3monica.id}` },
          { type: "comment", target: `${GID}~${question.id}~${ana.id}` },
          { type: "post", target: `${GID}~${poll.id}` },
          { type: "biz", target: "b3" },
          { type: "request", target: "r-r60" },
          { type: "proposal", target: "p-r60-c1" },
          { type: "thread", target: "t3" },
        ],
      ],
    )
    await reload(page)
    await go(page, "dono/filas")
    const keys = [
      [`report:answer|a3~${a3monica.id}:`, "remove"],
      [`report:comment|${GID}~${question.id}~${ana.id}:`, "remove"],
      [`report:post|${GID}~${poll.id}:`, "remove"],
      ["report:biz|b3:", "suspend"],
      ["report:request|r-r60:", "remove"],
      ["report:proposal|p-r60-c1:", "remove"],
      ["report:thread|t3:", "warn"],
    ]
    const ids = []
    for (const [prefix, d] of keys) ids.push(await decide(page, prefix, d))
    let s = await stored(page)
    const g = () => s.groups.find((x) => x.id === GID)
    expect(
      s.asks.find((a) => a.id === "a3").answers.find((a) => a.who === "Mônica L.").hidden === true,
      "resposta",
    )
    expect(s.biz.find((b) => b.id === "b3").suspended === true, "negócio")
    expect(
      s.requests.find((r) => r.id === "r-r60c").status === "open" &&
        s.requests.find((r) => r.id === "r-r60c").chosen === null,
      "pedido da proposta escolhida não voltou a ficar aberto",
    )
    expect(s.owner.warnings.length === 1, "advertência")
    // Desfaz cada uma pela lista de decididas.
    await page.locator('#main [data-action="owner-status"][data-value="done"]').click()
    await settle(page)
    for (const id of ids) {
      await page.locator(`#main [data-action="owner-undo"][data-value="${id}"]`).click()
      await settle(page)
      expect(/voltou para a fila/.test(await toast(page)), `desfazer ${id}: ${await toast(page)}`)
    }
    s = await stored(page)
    expect(
      s.asks.find((a) => a.id === "a3").answers.find((a) => a.who === "Mônica L.").hidden ===
        undefined,
      "a resposta continua removida",
    )
    expect(
      g()
        .posts.find((x) => x.id === question.id)
        .comments.find((c) => c.id === ana.id).hidden === undefined,
      "o comentário continua removido",
    )
    expect(
      g().posts.find((x) => x.id === poll.id).hidden === undefined,
      "a publicação continua removida",
    )
    expect(s.biz.find((b) => b.id === "b3").suspended === undefined, "a página continua suspensa")
    expect(s.requests.find((r) => r.id === "r-r60").status === "open", "o pedido continua removido")
    const c = s.requests.find((r) => r.id === "r-r60c")
    expect(
      c.status === "chosen" &&
        c.chosen === "p-r60-c1" &&
        c.threadId === "t3" &&
        c.proposals[0].status === "chosen",
      "a proposta escolhida não voltou",
    )
    expect(!(s.owner.warnings || []).length, "a advertência continua registrada")
    expect(
      Object.keys(s.owner.decisions).length === 0 && s.reports.every((r) => r.status === "open"),
      "as denúncias não voltaram para a fila",
    )
    expect(
      s.threads.length === 4 && s.asks.length >= 7,
      "mexeu em conteúdo que não era o denunciado",
    )
  },
  async "report-of-content-the-author-deleted-only-offers-dismiss"(page) {
    await patchState(page, REPORTS, [
      { type: "ask", target: "q-gone", label: "Pergunta “Onde encontro professor de xilofone?”" },
      {
        type: "answer",
        target: "q-gone~a-gone",
        label: "Resposta de Mônica L. · “A clínica da esquina.”",
      },
      { type: "comment", target: `${GID}~p-gone~c-gone` },
      { type: "post", target: `${GID}~p-gone`, label: "Publicação de Ana P. · “Dica de sábado.”" },
      { type: "item", target: "i-gone" },
    ])
    await go(page, "dono/filas")
    const titles = await queueTitles(page)
    expect(
      titles.includes("Pergunta “Onde encontro professor de xilofone?”"),
      `o título guardado não aparece: ${titles.join(" | ")}`,
    )
    expect(
      titles.includes("Publicação de Ana P. · “Dica de sábado.”"),
      "título da publicação excluída",
    )
    expect(
      titles.filter((t) => t === "Conteúdo denunciado").length === 2,
      "denúncia sem título guardado deveria ficar genérica",
    )
    expect(/excluído pelo autor/.test(await mainText(page)), "a fila não diz que o autor excluiu")
    for (const prefix of [
      "report:ask|q-gone:",
      "report:answer|q-gone~a-gone:",
      `report:comment|${GID}~p-gone~c-gone:`,
      `report:post|${GID}~p-gone:`,
      "report:item|i-gone:",
    ]) {
      await review(page, prefix)
      expect(
        /O conteúdo já foi excluído pelo autor\./.test(await page.locator("#dialog").innerText()),
        `${prefix}: sem o aviso`,
      )
      expect(
        JSON.stringify(await dialogButtons(page)) === JSON.stringify(["Dispensar"]),
        `${prefix}: botões ${await dialogButtons(page)}`,
      )
      expect((await count(page, "#owner-reason")) === 0, `${prefix}: pede motivo`)
      await page.keyboard.press("Escape")
      await settle(page)
    }
    const id = await review(page, "report:ask|q-gone:")
    await page.locator(`#dialog [data-action="owner-decide"][data-value="${id}~dismiss"]`).click()
    await settle(page)
    expect((await stored(page)).owner.decisions[id].d === "dismiss", "não dispensou")
    expect(
      !(await queueTitles(page)).includes("Pergunta “Onde encontro professor de xilofone?”"),
      "a denúncia continua na fila",
    )
  },
}

await runProof(checkpoints, "round60")
