import {
  action,
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

// Rodada 62 (AUDITORIA_FUNCIONAL_2026-10-18, seção D): Ajuda, Fale com a gente, Meus chamados e
// Apagar a conta. Um checkpoint por comportamento. Fixtures entram pelo armazenamento (`patchState`,
// que recarrega); o que a prova pode fazer pela tela, faz.
const TOPICS = [
  ["conta", "Conta e entrada"],
  ["comunidade", "Comunidade"],
  ["anuncios", "Anúncios e negócios"],
  ["seguranca", "Segurança"],
]
const GONE = "Membro que saiu"
const TICKET_TEXT = "Não consigo ver o bairro dos vizinhos no meu perfil."
const SENT = "Recebemos. Respondemos por e-mail em até 2 dias úteis."

// Tudo o que é meu, para a exclusão: anúncio, pergunta, resposta, indicação, página, publicação,
// comentário, encontro, pedido, rascunho, chamado, mais conversas e avisos que já vêm nos exemplos.
const MINE = `
const own = s.profile.name;
s.items.unshift({...structuredClone(s.items[0]), id:'i-r62', title:'Bicicleta infantil r62', mine:true, saved:true});
s.drafts=[{id:'d-r62',title:'Rascunho r62',kind:'desapego'}];
s.asks.unshift({id:'q-r62',q:'Pergunta minha r62 sobre pediatra aos sábados?',city:s.homeCity,who:own,ini:'RS',mine:true,topic:'Saúde',ctx:'x',status:'open',when:'agora',createdAt:Date.now(),following:true,answers:[]});
const other=s.asks.find(a=>!a.mine&&a.city===s.homeCity&&a.status==='open');
other.answers.push({id:'a-r62',who:own,ini:'RS',t:'Resposta minha r62 numa pergunta alheia.',mine:true,helped:0,solved:false});
other.following=true;
const b9=s.biz.find(x=>x.id==='b9');b9.myInd=true;b9.recN=(b9.recN||0)+1;b9.saved=true;b9.says.push(['RS','me',own,'Indico muito o b9 r62.']);
s.myBiz={...structuredClone(s.biz[0]),id:'b-r62',name:'Marcenaria r62',mine:true,live:true,claimed:true};
const g=s.groups.find(x=>x.id==='g-familias');
g.posts.unshift({id:'p-r62',type:'post',author:own,ini:'RS',text:'Publicação minha r62.',at:Date.now()-36e5,comments:[],useful:0,liked:false,mine:true},
 {id:'p-r62-poll',type:'poll',author:'Ana P.',ini:'AP',text:'Enquete alheia r62',at:Date.now()-72e5,comments:[],useful:0,liked:false,mine:false,poll:{options:[['A',2],['B',4]],voted:1}});
const host=g.posts.find(x=>!x.mine&&x.type!=='poll');
host.comments.push({id:'c-r62',author:own,ini:'RS',text:'Comentário meu r62.',mine:true,at:Date.now()});
s.events.unshift({...structuredClone(s.events[0]),id:'e-r62',title:'Evento meu r62',mine:true,on:true,going:3});
s.events[1].on=true;s.events[1].going=(s.events[1].going||0)+1;
s.requests=[...(s.requests||[]),{id:'r-r62',mine:true,city:s.homeCity,cat:'Elétrica',status:'open',expiresAt:Date.now()+864e5,createdAt:Date.now(),proposals:[],when:{kind:'asap'},desc:'Pedido meu r62',hood:'Centro',photos:[]}];
s.tickets=[{id:'t-r62',topic:'conta',text:'Chamado meu r62 aberto.',at:Date.now()-1e4,status:'open',email:'rafael@exemplo.com'}];
s.invites=[{name:'Familiar r62',email:'familiar@exemplo.com',code:'DEMO-R62R62R6',used:false,at:Date.now()}];
s.alerts=[{id:'al-r62'}];s.recent=['pediatra'];s.lastViewed={type:'ask',id:'q-r62',city:s.homeCity};`
// Dois chamados abertos, o mais antigo primeiro, e um já respondido.
const TICKETS = `s.tickets=[{id:'t-new',topic:'seguranca',text:'Chamado novo r62 sobre segurança.',at:Date.now()-1e4,status:'open',email:'rafael@exemplo.com'},{id:'t-old',topic:'conta',text:'Chamado antigo r62 sobre conta.',at:Date.now()-9e6,status:'open',email:'rafael@exemplo.com'},{id:'t-done',topic:'anuncios',text:'Chamado respondido r62.',at:Date.now()-2e7,status:'answered',answeredAt:Date.now()-1e7,reply:'Resposta de exemplo r62.',email:'rafael@exemplo.com'}]`
const SIGNED_OUT = "s.signedOut=true"

const mainText = (page) => page.locator("#main").innerText()
const count = (page, selector) => page.locator(selector).count()
const fieldError = (page, id) => page.locator(`#${id}`).evaluate((el) => el.error)
const entryMode = (page) => page.evaluate(() => document.body.classList.contains("entry-mode"))
async function patchState(page, src) {
  await snapshot(page)
  await page.evaluate(
    ([k, code]) => {
      const s = JSON.parse(localStorage.getItem(k))
      new Function("s", code)(s)
      localStorage.setItem(k, JSON.stringify(s))
    },
    [KEY, [].concat(src).join(";")],
  )
  await reload(page)
}
const click = async (page, selector) => {
  await page.locator(`${selector}:visible`).first().click()
  await settle(page)
}
async function openTopic(page, id) {
  await go(page, "ajuda")
  await click(page, `[data-action="support-open"][data-value="ajuda:${id}"]`)
}

const checkpoints = {
  // ---- Ajuda ----
  async "help-opens-with-account-and-each-topic-opens"(page) {
    await go(page, "ajuda")
    expect((await routeOf(page)).name === "ajuda", "a Ajuda não abriu")
    const text = await mainText(page)
    for (const [, title] of TOPICS) expect(text.includes(title), `sem o tema ${title}`)
    expect(text.includes("Não achou?"), "sem o cartão Não achou?")
    expect(text.includes("Respondemos por e-mail em até 2 dias úteis."), "sem o prazo de resposta")
    expect(text.includes("Nenhum chamado ainda"), "Meus chamados sem estado vazio")
    expect(
      (await count(page, '#main [data-action="support-open"][data-value="contato"]')) === 1,
      "sem Fale com a gente",
    )
    for (const [id, title] of TOPICS) {
      await openTopic(page, id)
      const r = await routeOf(page)
      expect(r.name === "ajuda" && r.id === id, `o tema ${id} não abriu: ${r.name}/${r.id}`)
      const n = await count(page, "#main .help-q")
      expect(n >= 3 && n <= 5, `${title} tem ${n} perguntas (esperado de 3 a 5)`)
      await page.locator("#main .help-q summary").first().click()
      await settle(page)
      expect(
        await page
          .locator("#main .help-q")
          .first()
          .evaluate((d) => d.open),
        `a primeira pergunta de ${title} não abriu`,
      )
      expect(
        (await page.locator("#main .help-q p").first().innerText()).trim().length > 20,
        `${title}: resposta vazia`,
      )
    }
  },
  async "help-opens-without-account-and-from-the-landing-footer"(page) {
    await patchState(page, SIGNED_OUT)
    expect((await routeOf(page)).name === "entrar", "quem saiu não está na entrada")
    await click(page, '.en-legal [data-action="support-open"][data-value="ajuda"]')
    expect((await routeOf(page)).name === "ajuda", "o rodapé da landing não abriu a Ajuda")
    expect(await entryMode(page), "a Ajuda de quem saiu não usa o visual da entrada")
    expect(await page.locator("#topbar").isHidden(), "a barra do app apareceu para quem saiu")
    for (const [id, title] of TOPICS) {
      await openTopic(page, id)
      expect((await mainText(page)).includes(title), `sem o tema ${title} (sem conta)`)
      expect((await count(page, "#main .help-q")) >= 3, `${title}: poucas perguntas (sem conta)`)
    }
    await go(page, "ajuda")
    expect((await routeOf(page)).name === "ajuda", "o endereço direto da Ajuda foi redirecionado")
  },
  async "help-entry-points-in-voce-and-settings"(page) {
    await go(page, "voce")
    await click(page, '#main [data-action="support-open"][data-value="ajuda"]')
    expect((await routeOf(page)).name === "ajuda", "a linha Ajuda de Você não abriu a Ajuda")
    await go(page, "voce")
    await action(page, "settings")
    expect((await dialogKind(page)) !== null, "Configurações não abriu")
    await click(page, '#dialog [data-action="support-open"][data-value="ajuda"]')
    expect((await routeOf(page)).name === "ajuda", "Configurações não abriu a Ajuda")
    expect((await dialogKind(page)) === null, "o diálogo ficou aberto")
  },
  // ---- Fale com a gente ----
  async "contact-validates-and-saves-the-ticket"(page) {
    await go(page, "contato")
    const text = await mainText(page)
    for (const label of ["Conta", "Comunidade", "Anúncios", "Segurança", "Outro"])
      expect(
        (await count(page, `md-filter-chip[label="${label}"]`)) === 1,
        `sem o assunto ${label}`,
      )
    expect(text.includes("A resposta vai para rafael@exemplo.com."), "sem o e-mail da conta")
    expect(
      await page.locator('md-filter-chip[label="Conta"]').evaluate((c) => c.selected),
      "Conta não vem marcado",
    )
    await click(page, '[data-action="support-send"]')
    expect(await fieldError(page, "support-text"), "texto vazio sem erro no campo")
    await fill(page, "support-text", "curto")
    await click(page, '[data-action="support-send"]')
    expect(await fieldError(page, "support-text"), "texto curto sem erro no campo")
    expect(
      (await page.locator("#support-text").evaluate((el) => el.errorText)).includes("10"),
      "o erro não diz o mínimo",
    )
    expect(((await stored(page))?.tickets || []).length === 0, "gravou chamado inválido")
    await click(page, 'md-filter-chip[label="Segurança"]')
    expect(
      await page.locator('md-filter-chip[label="Segurança"]').evaluate((c) => c.selected),
      "Segurança não marcou",
    )
    expect(
      !(await page.locator('md-filter-chip[label="Conta"]').evaluate((c) => c.selected)),
      "Conta continuou marcado",
    )
    await fill(page, "support-text", TICKET_TEXT)
    expect(!(await fieldError(page, "support-text")), "o erro não saiu ao digitar")
    await click(page, '[data-action="support-send"]')
    const t = (await stored(page)).tickets
    expect(t.length === 1, `chamados gravados: ${t.length}`)
    expect(
      t[0].topic === "seguranca" &&
        t[0].text === TICKET_TEXT &&
        t[0].status === "open" &&
        t[0].email === "rafael@exemplo.com" &&
        typeof t[0].at === "number" &&
        t[0].id,
      `chamado gravado errado: ${JSON.stringify(t[0])}`,
    )
    expect((await toast(page)).includes(SENT), `aviso: ${await toast(page)}`)
    expect((await routeOf(page)).name === "chamados", "não abriu Meus chamados")
    const list = await mainText(page)
    expect(
      list.includes(TICKET_TEXT) && list.includes("Segurança") && list.includes("Em andamento"),
      "Meus chamados não mostra o chamado com o estado",
    )
  },
  async "contact-without-account-asks-for-the-email"(page) {
    await patchState(page, SIGNED_OUT)
    await go(page, "contato")
    expect(await entryMode(page), "sem o visual da entrada")
    expect((await count(page, "#support-email")) === 1, "sem o campo de e-mail")
    await fill(page, "support-text", TICKET_TEXT)
    await click(page, '[data-action="support-send"]')
    expect(await fieldError(page, "support-email"), "e-mail vazio sem erro no campo")
    await fill(page, "support-email", "isso-nao-e-email")
    await click(page, '[data-action="support-send"]')
    expect(await fieldError(page, "support-email"), "e-mail inválido sem erro no campo")
    expect(((await stored(page)).tickets || []).length === 0, "gravou chamado sem e-mail")
    await fill(page, "support-email", "Visita@Exemplo.com")
    await click(page, '[data-action="support-send"]')
    const t = (await stored(page)).tickets
    expect(t.length === 1 && t[0].email === "visita@exemplo.com", "e-mail do chamado não gravou")
    expect((await routeOf(page)).name === "chamados", "não abriu Meus chamados")
    expect((await mainText(page)).includes(TICKET_TEXT), "o chamado não aparece")
  },
  // ---- Meus chamados ----
  async "my-tickets-show-the-state-from-help"(page) {
    await patchState(page, TICKETS)
    await go(page, "ajuda")
    expect((await mainText(page)).includes("2 em andamento"), "a Ajuda não conta os abertos")
    await click(page, '#main [data-action="support-open"][data-value="chamados"]')
    expect((await routeOf(page)).name === "chamados", "Meus chamados não abriu")
    const text = await mainText(page)
    expect((await count(page, "#main .ticket")) === 3, "esperava 3 chamados")
    expect(
      text.includes("Chamado novo r62") && text.includes("Chamado antigo r62"),
      "faltam chamados abertos",
    )
    expect(
      text.includes("Respondido") && text.includes("Resposta de exemplo r62."),
      "o chamado respondido não mostra o estado e a resposta",
    )
    expect(text.includes("Em andamento"), "sem o estado Em andamento")
  },
  async "simulate-support-reply-answers-the-oldest-and-notifies"(page) {
    await patchState(page, TICKETS)
    await go(page, "voce")
    await action(page, "prototype")
    await click(page, '#dialog [data-action="support-simulate"]')
    let s = await stored(page)
    const by = (id) => s.tickets.find((t) => t.id === id)
    expect(by("t-old").status === "answered", "o chamado mais antigo não foi respondido")
    expect(by("t-new").status === "open", "o chamado novo foi respondido")
    expect(by("t-old").reply && by("t-old").answeredAt, "sem a resposta no chamado")
    const notice = s.notices.find((n) => n.go?.[0] === "chamados")
    expect(notice?.unread && notice.text.includes("Conta"), "sem o aviso do chamado")
    await page.keyboard.press("Escape")
    await settle(page)
    expect((await dialogKind(page)) === null, "os Controles não fecharam")
    await go(page, "inicio")
    await action(page, "notices")
    await action(page, "notice-open", notice.id)
    expect((await routeOf(page)).name === "chamados", "o aviso não abriu Meus chamados")
    expect((await mainText(page)).includes("Respondido"), "Meus chamados sem o respondido")
    // Segunda e terceira simulações: a segunda responde o outro; a terceira avisa que não há mais.
    await go(page, "voce")
    await action(page, "prototype")
    await click(page, '#dialog [data-action="support-simulate"]')
    s = await stored(page)
    expect(
      s.tickets.every((t) => t.status === "answered"),
      "restou chamado aberto",
    )
    await click(page, '#dialog [data-action="support-simulate"]')
    expect(
      (await toast(page)).includes("Nenhum chamado em andamento"),
      `sem aviso quando não há chamado: ${await toast(page)}`,
    )
    expect(
      (await stored(page)).notices.filter((n) => n.go?.[0] === "chamados").length === 2,
      "criou aviso sem chamado",
    )
  },
  // ---- Apagar a conta ----
  async "delete-account-asks-for-the-word"(page) {
    const before = JSON.stringify(await snapshot(page))
    await go(page, "voce")
    await action(page, "settings")
    await click(page, '#dialog [data-action="support-open"][data-value="apagar-conta"]')
    expect((await routeOf(page)).name === "apagar-conta", "Configurações não abriu Apagar a conta")
    const text = await mainText(page)
    for (const t of [
      "Isso não pode ser desfeito.",
      "Seus anúncios, perguntas e páginas",
      "Saem da comunidade",
      "Suas respostas e indicações",
      "Ficam, sem o seu nome",
      "Suas conversas",
      "Apagadas para você",
    ])
      expect(text.includes(t), `sem o texto "${t}"`)
    expect(
      (await page.locator("#delete-word").getAttribute("label")) === "Digite APAGAR para confirmar",
      "sem o rótulo do campo",
    )
    await click(page, '[data-action="account-delete"]')
    expect(await fieldError(page, "delete-word"), "sem erro no campo com a palavra vazia")
    for (const wrong of ["APAGA", "apagar tudo", "sim"]) {
      await fill(page, "delete-word", wrong)
      await click(page, '[data-action="account-delete"]')
      expect(await fieldError(page, "delete-word"), `"${wrong}" foi aceito`)
    }
    expect((await routeOf(page)).name === "apagar-conta", "saiu da tela com a palavra errada")
    expect(JSON.stringify(await stored(page)) === before, "mudou o armazenamento sem a palavra")
    await fill(page, "delete-word", "A")
    expect(!(await fieldError(page, "delete-word")), "o erro não saiu ao digitar")
  },
  async "delete-account-removes-mine-and-anonymizes-the-rest"(page) {
    await patchState(page, MINE)
    const b = await stored(page)
    expect(
      b.threads.length > 0 && b.notices.length > 0,
      "os exemplos não trazem conversas e avisos",
    )
    const asked = b.asks.find((a) => a.answers.some((x) => x.id === "a-r62"))
    const stay = b.events.find((e) => e.id !== "e-r62" && e.on)
    const goingBefore = stay.going
    const pollBefore = b.groups
      .find((g) => g.id === "g-familias")
      .posts.find((p) => p.id === "p-r62-poll").poll.options[1][1]
    const recN = b.biz.find((x) => x.id === "b9").recN
    await go(page, "apagar-conta")
    await fill(page, "delete-word", "  apagar ")
    await click(page, '[data-action="account-delete"]')
    const s = await stored(page)
    expect(s.signedOut === true && typeof s.accountDeletedAt === "number", "não saiu da conta")
    expect(!s.items.some((x) => x.mine || x.id === "i-r62"), "sobrou anúncio meu")
    expect(!s.items.some((x) => x.saved), "sobrou anúncio salvo")
    expect(s.drafts.length === 0, "sobrou rascunho")
    expect(!s.asks.some((a) => a.mine || a.id === "q-r62"), "sobrou pergunta minha")
    const answers = s.asks.find((a) => a.id === asked.id).answers
    const mine = answers.find((a) => a.id === "a-r62")
    expect(
      mine && mine.who === GONE && !mine.mine && mine.t.includes("Resposta minha r62"),
      `a resposta não ficou anônima: ${JSON.stringify(mine)}`,
    )
    expect(s.myBiz === null, "sobrou a página do negócio")
    const b9 = s.biz.find((x) => x.id === "b9")
    const say = b9.says.find((x) => String(x[3]).includes("b9 r62"))
    expect(say && say[2] === GONE && say[1] !== "me", `a indicação não ficou anônima: ${say}`)
    expect(!b9.myInd && !b9.saved && b9.recN === recN, "indicação ou contagem errada")
    const g = s.groups.find((x) => x.id === "g-familias")
    const post = g.posts.find((p) => p.id === "p-r62")
    expect(post && post.author === GONE && !post.mine, "a publicação não ficou anônima")
    const comment = g.posts.flatMap((p) => p.comments).find((c) => c.id === "c-r62")
    expect(comment && comment.author === GONE && !comment.mine, "o comentário não ficou anônimo")
    expect(!s.groups.some((x) => x.on), "continua em grupos")
    expect(
      g.posts.find((p) => p.id === "p-r62-poll").poll.options[1][1] === pollBefore - 1,
      "o voto na enquete ficou",
    )
    expect(!s.events.some((e) => e.mine || e.id === "e-r62"), "sobrou encontro meu")
    const kept = s.events.find((e) => e.id === stay.id)
    expect(!kept.on && kept.going === goingBefore - 1, "a presença em outro encontro ficou")
    expect(!(s.requests || []).some((r) => r.mine), "sobrou pedido meu")
    expect(s.threads.length === 0, "sobraram conversas")
    expect(s.notices.length === 0, "sobraram avisos")
    expect(s.tickets.length === 0, "sobraram chamados")
    expect(s.invites.length === 0 && s.alerts.length === 0, "sobraram convites ou alertas")
    expect(s.lastViewed === null, "sobrou o último visto")
    expect(!s.profile.name && !s.profile.email && !s.profile.verified, "o perfil não foi limpo")
    expect(JSON.stringify(s.entry) === "{}", "a entrada não foi limpa")
    const dump = JSON.stringify(s)
    expect(!dump.includes("Rafael Souza"), "o nome da pessoa continua guardado")
    expect(!dump.includes("rafael@exemplo.com"), "o e-mail da pessoa continua guardado")
    for (const gone of [
      "Bicicleta infantil r62",
      "Pergunta minha r62",
      "Marcenaria r62",
      "Evento meu r62",
      "Pedido meu r62",
      "Chamado meu r62",
      "Familiar r62",
    ])
      expect(!dump.includes(gone), `sobrou "${gone}"`)
  },
  async "deleted-account-screen-leads-to-the-landing"(page) {
    await go(page, "apagar-conta")
    await fill(page, "delete-word", "APAGAR")
    await click(page, '[data-action="account-delete"]')
    const r = await routeOf(page)
    expect(r.name === "entrar" && r.id === "apagada", `rota: ${r.name}/${r.id}`)
    expect(await entryMode(page), "sem o visual da entrada")
    const text = await mainText(page)
    expect(text.includes("Sua conta foi apagada."), "sem a tela de conta apagada")
    expect(text.includes("Obrigado por ter feito parte."), "sem o agradecimento")
    await reload(page)
    expect((await mainText(page)).includes("Sua conta foi apagada."), "a tela sumiu ao recarregar")
    await click(page, '[data-action="account-deleted-home"]')
    const home = await routeOf(page)
    expect(home.name === "entrar" && !home.id, `Voltar ao início foi para ${home.name}/${home.id}`)
    expect((await mainText(page)).includes("Quero fazer parte"), "não chegou à landing")
    // Quem apagou não volta pela conta antiga.
    await go(page, "entrar/login")
    await fill(page, "en-email", "rafael@exemplo.com")
    await fill(page, "en-pass-login", "qualquer123")
    await click(page, '[data-action="entry-login-submit"]')
    expect((await stored(page)).signedOut === true, "entrou na conta apagada")
    expect((await mainText(page)).includes("incorretos"), "sem erro ao tentar a conta apagada")
    // A Ajuda continua aberta para quem apagou.
    await go(page, "ajuda")
    expect((await routeOf(page)).name === "ajuda", "a Ajuda não abre depois de apagar")
  },
  // ---- Armazenamento falhando ----
  async "failing-storage-leaves-nothing-half-done"(page) {
    await patchState(page, MINE)
    const before = JSON.stringify(await stored(page))
    await go(page, "apagar-conta")
    await fill(page, "delete-word", "APAGAR")
    await failStorage(page)
    await click(page, '[data-action="account-delete"]')
    expect(/Não foi possível salvar/.test(await toast(page)), `sem o aviso: ${await toast(page)}`)
    const r = await routeOf(page)
    expect(r.name === "apagar-conta", `saiu da tela apesar da falha: ${r.name}`)
    expect(JSON.stringify(await stored(page)) === before, "o armazenamento mudou apesar da falha")
    await go(page, "voce")
    const text = await mainText(page)
    expect(text.includes("Rafael Souza"), "o perfil foi limpo na tela apesar da falha")
    expect(text.includes("Meus anúncios"), "a conta saiu apesar da falha")
    await go(page, "minhas")
    expect(
      (await mainText(page)).includes("Pergunta minha r62"),
      "a pergunta sumiu apesar da falha",
    )
  },
  async "failing-storage-keeps-the-ticket-draft"(page) {
    await go(page, "contato")
    await fill(page, "support-text", TICKET_TEXT)
    await failStorage(page)
    await click(page, '[data-action="support-send"]')
    expect(/Não foi possível salvar/.test(await toast(page)), `sem o aviso: ${await toast(page)}`)
    expect((await routeOf(page)).name === "contato", "saiu do formulário apesar da falha")
    expect(
      (await page.locator("#support-text").evaluate((el) => el.value)) === TICKET_TEXT,
      "o texto digitado se perdeu",
    )
    expect(((await stored(page))?.tickets || []).length === 0, "gravou o chamado apesar da falha")
  },
}

await runProof(checkpoints, "round62")
