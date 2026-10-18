import {
  action,
  choose,
  expect,
  fill,
  go,
  KEY,
  reload,
  runProof,
  settle,
  snapshot,
  stored,
  toast,
} from "./proof-harness.mjs"

// Rodada 63 (AUDITORIA_FUNCIONAL_2026-10-18, itens B8 a B11 e B13): promessas da tela cumpridas ou
// retiradas. "Mostrar meu bairro", busca no texto das respostas, oferta de negócio no grupo, planos
// (conversas por mês e destaque em Patrocinado) e bairros/mapa só onde há dados. Um checkpoint por
// comportamento, com o lado ligado e o desligado. Fixtures entram pelo armazenamento (`patchState`,
// que recarrega); o que a prova pode fazer pela tela, faz pela tela.
const GID = "g-familias"
const BIZ = "b6"
const DAY = 864e5

const mainText = (page) => page.locator("#main").innerText()
const dialogText = (page) => page.locator("#dialog").innerText()
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
// A página de negócio da pessoa (a de Jorge Eletricista, assumida) — como o fluxo "Sou o responsável".
const MY_BIZ = `const b=s.biz.find(x=>x.id==='${BIZ}');s.myBiz={...b,spon:false,mine:true,live:true,claimed:true,owner:'Rafael Souza · responsável de teste'};s.biz=s.biz.filter(x=>x.id!=='${BIZ}')`
// Seis contatos novos na caixa da página (só a mensagem do cliente).
const SIX_THREADS = `s.threads=[...[1,2,3,4,5,6].map(n=>({id:'t-r63-'+n,who:['Marina L.','Caio R.','Helena P.','Otávio S.','Bianca F.','Lúcio M.'][n-1],ini:'XX',city:s.homeCity,about:{type:'biz',id:s.myBiz.id},snapshot:{title:s.myBiz.name,city:s.homeCity},msgs:[{me:false,t:'Olá! Atendem no meu bairro?',at:Date.now()-n*6e4}],unread:true,updatedAt:Date.now()-n*6e4})),...s.threads]`
const settingsOpen = async (page) => {
  await go(page, "voce")
  await action(page, "settings")
}
// Configurações pela tela: bairro do perfil (opcional) e a chave "Mostrar meu bairro".
async function setHoodPrefs(page, { hood, show }) {
  await settingsOpen(page)
  if (hood !== undefined) await choose(page, "profile-hood", hood)
  const on = await page.locator("#privacy-hood").evaluate((el) => el.selected)
  if (on !== show) await page.locator("#privacy-hood").click()
  await action(page, "save-settings")
  expect((await stored(page)).prefs.showHood === show, `showHood deveria ser ${show}`)
}
const cardText = (page, title) =>
  page.locator(".photo-card", { hasText: title }).first().innerText()

// Conteúdo próprio da pessoa para os checkpoints de bairro: anúncio, pedido, resposta, publicação e
// comentário de grupo. O anúncio do Kit de ferramentas (Planalto) passa a ser dela.
const OWN_CONTENT = `
 Object.assign(s.items.find(i=>i.id==='i11'),{mine:true,seller:s.profile.name,sini:'RS',note:'Membro da comunidade'});
 s.requests=[{id:'r-r63',city:s.homeCity,cat:'Casa e reparos',spec:null,hood:'Centro',desc:'Preciso de um eletricista para trocar a fiação do quarto, com material incluso.',when:{kind:'asap',date:null},photos:[],status:'open',createdAt:Date.now()-36e5,expiresAt:Date.now()+5*864e5,who:s.profile.name,mine:true,proposals:[]}];
 s.asks.find(a=>a.id==='q-own')||s.asks.unshift({id:'q-own',q:'Quem indica uma escola boa perto da Ponta Negra?',city:s.homeCity,who:s.profile.name,ini:'RS',mine:true,topic:s.homeCity,ctx:'Pergunta de um membro da cidade',status:'open',when:'agora',answers:[],createdAt:Date.now()});
 s.asks.find(a=>a.id==='a3').answers.push({id:'a-r63',who:s.profile.name,ini:'RS',mine:true,t:'Eu fui bem atendido por lá.',biz:null,solved:false,helped:0,liked:false});
 const g=s.groups.find(x=>x.id==='${GID}');g.posts.unshift({id:'p-r63',type:'post',author:s.profile.name,ini:'RS',text:'Dica da minha rua: feira aos sábados.',at:Date.now(),comments:[{id:'c-r63',author:s.profile.name,ini:'RS',text:'Passei lá ontem.',mine:true,at:Date.now()}],useful:0,liked:false,mine:true})`

const checkpoints = {
  // ---- B8: Mostrar meu bairro ----
  async "own-listing-and-request-show-the-hood-only-while-allowed"(page) {
    await patchState(page, OWN_CONTENT)
    const title = "Kit de ferramentas completo"
    // ligado (padrão): o bairro aparece onde os outros leem
    await go(page, "desapegos")
    expect(/Planalto/.test(await cardText(page, title)), "ligado: o cartão não mostra o bairro")
    await go(page, "anuncio/i11")
    expect(/Planalto/.test(await mainText(page)), "ligado: o detalhe não mostra o bairro")
    expect((await page.locator('[data-action="map"]').count()) === 1, "ligado: falta Ver bairro")
    await go(page, "pedidos")
    expect(/Casa e reparos · Centro/.test(await mainText(page)), "ligado: o pedido sem bairro")
    expect(
      (await page.evaluate(() => window.Bivaque.search("Planalto"))).items.includes("i11"),
      "ligado: a busca não acha pelo bairro",
    )
    // desligado pela tela: some de tudo o que a pessoa publicou
    await setHoodPrefs(page, { show: false })
    await go(page, "desapegos")
    const off = await cardText(page, title)
    expect(!/Planalto/.test(off) && /Manaus/.test(off), `desligado: cartão "${off}"`)
    await go(page, "anuncio/i11")
    const detail = await mainText(page)
    expect(!/Planalto/.test(detail), "desligado: o detalhe ainda mostra o bairro")
    expect(/Manaus/.test(detail), "desligado: o detalhe perdeu a cidade")
    expect(
      (await page.locator('[data-action="map"]').count()) === 0,
      "desligado: Ver bairro continua",
    )
    await go(page, "pedidos")
    const rows = await mainText(page)
    expect(
      /Casa e reparos/.test(rows) && !/Casa e reparos · Centro/.test(rows),
      "desligado: o pedido ainda mostra o bairro",
    )
    expect(
      !(await page.evaluate(() => window.Bivaque.search("Planalto"))).items.includes("i11"),
      "desligado: a busca acha pelo bairro escondido",
    )
    // o dado não se perde; o conteúdo dos outros não muda
    const s = await stored(page)
    expect(s.items.find((i) => i.id === "i11").hood === "Planalto", "o bairro do anúncio se perdeu")
    expect(s.requests[0].hood === "Centro", "o bairro do pedido se perdeu")
    await go(page, "desapegos")
    expect(
      /Flores/.test(await cardText(page, "20 caixas de mudança")),
      "o anúncio de outra pessoa perdeu o bairro",
    )
    // religar mostra de novo
    await setHoodPrefs(page, { show: true })
    await go(page, "desapegos")
    expect(/Planalto/.test(await cardText(page, title)), "religado: o bairro não voltou")
    await go(page, "pedidos")
    expect(/Casa e reparos · Centro/.test(await mainText(page)), "religado: pedido sem bairro")
  },

  async "own-question-answer-and-group-post-headers-follow-the-preference"(page) {
    await patchState(page, OWN_CONTENT)
    // a pessoa informa o bairro do perfil (opcional) e deixa a chave ligada
    await setHoodPrefs(page, { hood: "Parque 10", show: true })
    expect((await stored(page)).profile.hood === "Parque 10", "o bairro do perfil não foi salvo")
    await go(page, "pergunta/q-own")
    expect(/Pergunta de um membro da cidade · Parque 10/.test(await mainText(page)), "pergunta")
    await go(page, "pergunta/a3")
    const answer = page.locator(".answer", { hasText: "Eu fui bem atendido" })
    expect(/Sua indicação · Parque 10/.test(await answer.innerText()), "resposta ligada")
    await go(page, `grupo/${GID}`)
    expect(
      /Parque 10/.test(await page.locator(".gpost", { hasText: "feira aos sábados" }).innerText()),
      "publicação ligada",
    )
    await go(page, `publicacao/${GID}~p-r63`)
    expect(/Passei lá ontem/.test(await mainText(page)), "sem o comentário próprio")
    expect(
      /Parque 10/.test(await page.locator(".answer", { hasText: "Passei lá" }).innerText()),
      "comentário ligado",
    )
    // desligado: some de todos, sem perder o dado
    await setHoodPrefs(page, { show: false })
    await go(page, "pergunta/q-own")
    expect(!/Parque 10/.test(await mainText(page)), "desligado: pergunta")
    await go(page, "pergunta/a3")
    expect(!/Parque 10/.test(await mainText(page)), "desligado: resposta")
    await go(page, `grupo/${GID}`)
    expect(!/Parque 10/.test(await mainText(page)), "desligado: publicação")
    await go(page, `publicacao/${GID}~p-r63`)
    expect(!/Parque 10/.test(await mainText(page)), "desligado: comentário")
    expect((await stored(page)).profile.hood === "Parque 10", "o bairro do perfil se perdeu")
    // o conteúdo dos outros não muda
    await go(page, "pergunta/a3")
    expect(
      /Membro da comunidade/.test(await page.locator(".answer", { hasText: "Mônica" }).innerText()),
      "a resposta de outra pessoa mudou",
    )
    await setHoodPrefs(page, { show: true })
    await go(page, "pergunta/q-own")
    expect(/Parque 10/.test(await mainText(page)), "religado: pergunta")
  },

  // ---- B11: busca nas respostas ----
  async "search-looks-inside-answers-and-shows-the-excerpt"(page) {
    const ASK = `s.asks.unshift({id:'q-r63s',q:'Qual escola fica perto da Base Aérea?',city:s.homeCity,who:'Carla R.',ini:'CR',mine:false,topic:'Escolas',ctx:'Pergunta de um membro da cidade',status:'open',when:'agora',createdAt:Date.now(),answers:[{id:'a-r63s',who:'Mônica L.',ini:'ML',t:'A Escola Girassol tem horário integral e transporte próprio até a Base.',biz:null,solved:false,helped:0,liked:false}]})`
    const search = (q) => page.evaluate((x) => window.Bivaque.search(x), q)
    await snapshot(page)
    expect(!(await search("girassol")).asks.includes("q-r63s"), "antes: já achava a pergunta")
    await patchState(page, ASK)
    expect((await search("girassol")).asks.includes("q-r63s"), "a busca não olha as respostas")
    await go(page, "busca")
    await page.locator("#search-query input").fill("girassol")
    await page.waitForTimeout(600)
    const row = page.locator("#search-results .list-row", { hasText: "Qual escola fica perto" })
    expect((await row.count()) === 1, "a pergunta não apareceu em Indicações e respostas")
    const text = await row.innerText()
    expect(/Mônica L\.: “.*Girassol.*”/s.test(text), `sem o trecho da resposta: ${text}`)
    // quando o texto da pergunta já basta e nenhuma resposta bate, não há trecho
    await page.locator("#search-query input").fill("base aérea")
    await page.waitForTimeout(600)
    expect(
      (await page.locator("#search-results .search-snippet").count()) === 0,
      "trecho sem resposta que bata",
    )
    // resposta removida pela moderação ou de pessoa bloqueada não é procurada
    await patchState(page, `s.asks.find(a=>a.id==='q-r63s').answers[0].hidden=true`)
    expect(!(await search("girassol")).asks.includes("q-r63s"), "achou resposta removida")
    await patchState(
      page,
      `const a=s.asks.find(a=>a.id==='q-r63s').answers[0];a.hidden=false;s.blocked=[{name:'Mônica L.',at:Date.now()}]`,
    )
    expect(!(await search("girassol")).asks.includes("q-r63s"), "achou resposta de bloqueada")
  },

  // ---- B9: oferta de negócio de membro no grupo ----
  async "group-offer-type-needs-permission-and-an-active-page"(page) {
    const chips = () =>
      page
        .locator("#dialog .post-types md-filter-chip")
        .evaluateAll((els) => els.map((e) => e.label))
    const open = async () => {
      await go(page, `grupo/${GID}`)
      await action(page, "new-post")
      return chips()
    }
    const close = async () => {
      await action(page, "close-dialog")
    }
    // grupo permite, mas a pessoa não tem página: o tipo não aparece
    let labels = await open()
    expect(!labels.includes("Oferta do meu negócio"), `sem página: ${labels}`)
    await close()
    // com página ativa: aparece
    await patchState(page, MY_BIZ)
    labels = await open()
    expect(labels.includes("Oferta do meu negócio"), `com página: ${labels}`)
    await close()
    // página suspensa ou pausada: some
    for (const flag of ["suspended", "paused"]) {
      await patchState(page, `s.myBiz.${flag}=true`)
      labels = await open()
      expect(!labels.includes("Oferta do meu negócio"), `${flag}: ${labels}`)
      await close()
      await patchState(page, `delete s.myBiz.${flag}`)
    }
    // o administrador desliga a permissão pela tela: o tipo some e as ofertas existentes ficam ocultas
    await patchState(page, `s.groups.find(g=>g.id==='${GID}').role='admin'`)
    await go(page, `grupo/${GID}`)
    expect(
      /Kit festa com 10%/.test(await mainText(page)),
      "com permissão: a oferta existente sumiu",
    )
    await action(page, "manage-group", GID)
    await page.locator("#manage-offers").click()
    await action(page, "save-manage", GID)
    expect(
      (await stored(page)).groups.find((g) => g.id === GID).allowOffers === false,
      "não desligou",
    )
    expect(!/Kit festa com 10%/.test(await mainText(page)), "sem permissão: a oferta continua")
    labels = await open()
    expect(!labels.includes("Oferta do meu negócio"), `sem permissão: ${labels}`)
    await close()
    // religar devolve tudo
    await action(page, "manage-group", GID)
    await page.locator("#manage-offers").click()
    await action(page, "save-manage", GID)
    expect(/Kit festa com 10%/.test(await mainText(page)), "religado: a oferta não voltou")
    labels = await open()
    expect(labels.includes("Oferta do meu negócio"), `religado: ${labels}`)
  },

  async "group-offer-is-limited-to-one-per-week-with-the-date-to-try-again"(page) {
    await patchState(page, MY_BIZ)
    const offers = async () =>
      (await stored(page)).groups
        .find((g) => g.id === GID)
        .posts.filter((p) => p.mine && p.type === "offer")
    const post = async (text) => {
      await go(page, `grupo/${GID}`)
      await action(page, "new-post")
      await action(page, "post-type", "offer")
      const t = await page.locator("#dialog .who-sees").first().innerText()
      expect(/Jorge Eletricista/.test(t), `sem o link da página: ${t}`)
      await fill(page, "post-text", text)
      await action(page, "submit-post", GID)
    }
    await post("Orçamento de fiação com 10% para quem é do grupo.")
    expect(/Oferta publicada/.test(await toast(page)), `aviso: ${await toast(page)}`)
    const list = await offers()
    expect(list.length === 1 && list[0].biz === BIZ, "não gravou a oferta com a página")
    const card = page.locator(".gpost", { hasText: "Orçamento de fiação" })
    expect(/Oferta/.test(await card.innerText()), "sem o rótulo Oferta")
    expect((await card.locator('[data-action="open-biz"]').count()) === 1, "sem o link da página")
    // segunda oferta: recusada, dizendo quando pode de novo
    await post("Segunda oferta na mesma semana.")
    const msg = await toast(page)
    expect(/Pode fazer outra em \d\d\/\d\d às \d\d:\d\d/.test(msg), `sem a data: ${msg}`)
    expect((await offers()).length === 1, "criou a segunda oferta")
    // passada a semana, pode de novo
    await patchState(
      page,
      `const g=s.groups.find(x=>x.id==='${GID}');g.offerAt[s.profile.name]=Date.now()-8*${DAY}`,
    )
    await post("Oferta nova depois de uma semana.")
    expect((await offers()).length === 2, "não liberou depois de uma semana")
    // excluir a oferta não zera o prazo
    await patchState(
      page,
      `const g=s.groups.find(x=>x.id==='${GID}');g.posts=g.posts.filter(p=>!(p.mine&&p.type==='offer'))`,
    )
    await post("Oferta logo depois de excluir.")
    expect(/Pode fazer outra em/.test(await toast(page)), "excluir zerou o prazo")
  },

  // ---- B10: planos ----
  async "free-plan-refuses-the-sixth-new-conversation-and-invites-to-plans"(page) {
    await patchState(page, `${MY_BIZ};${SIX_THREADS}`)
    const reply = async (n, text = "Olá! Atendemos sim.") => {
      await go(page, `conversa/t-r63-${n}`)
      await fill(page, "chat-input", text)
      await action(page, "send-message", `t-r63-${n}`)
    }
    const msgs = async (n) => (await stored(page)).threads.find((t) => t.id === `t-r63-${n}`).msgs
    for (const n of [1, 2, 3, 4, 5]) {
      await reply(n)
      expect((await msgs(n)).length === 2, `a resposta ${n} não foi enviada`)
    }
    // a sexta conversa nova: recusada, com aviso e convite aos planos
    await reply(6)
    expect((await msgs(6)).length === 1, "enviou a sexta conversa nova")
    const text = await page.evaluate(() => document.querySelector("#dialog")?.innerText)
    expect(
      /5 conversas novas/.test(text) &&
        /continuam livres/.test(text) &&
        /Conhecer os planos/.test(text),
      `aviso: ${text}`,
    )
    await action(page, "plans")
    expect(/Planos para o negócio/.test(await dialogText(page)), "o convite não abriu os planos")
    await action(page, "close-dialog")
    // conversa que já foi respondida segue livre
    await reply(1, "Mais uma informação sobre o orçamento.")
    expect((await msgs(1)).length === 3, "bloqueou conversa já respondida")
    // com o Plano do negócio, a sexta passa
    await go(page, `negocio/${BIZ}`)
    await action(page, "plans")
    await page.locator('#dialog md-radio[value="plan"]').click()
    await action(page, "activate-plan")
    await reply(6)
    expect((await msgs(6)).length === 2, "o plano não liberou a sexta conversa")
    const s = await stored(page)
    expect(s.subscription.repliedThreadIds.length === 6, "não contou as seis conversas")
  },

  async "new-month-resets-the-free-conversation-count"(page) {
    await patchState(
      page,
      `${MY_BIZ};${SIX_THREADS};s.subscription.month='2020-01';s.subscription.repliedThreadIds=['x1','x2','x3','x4','x5']`,
    )
    await go(page, `negocio/${BIZ}`)
    expect(/0 de 5 conversas novas respondidas/.test(await mainText(page)), "mês velho contou")
    await go(page, "conversa/t-r63-6")
    await fill(page, "chat-input", "Atendemos sim.")
    await action(page, "send-message", "t-r63-6")
    const s = await stored(page)
    expect(s.threads.find((t) => t.id === "t-r63-6").msgs.length === 2, "o mês novo não liberou")
    expect(
      s.subscription.repliedThreadIds.join() === "t-r63-6" &&
        s.subscription.month === new Date().toISOString().slice(0, 7),
      `contagem do mês: ${s.subscription.repliedThreadIds}`,
    )
    await go(page, `negocio/${BIZ}`)
    expect(/1 de 5 conversas novas respondidas/.test(await mainText(page)), "contador do mês")
  },

  async "test-panel-simulates-a-new-contact-in-the-page-inbox"(page) {
    await patchState(page, MY_BIZ)
    await go(page, "voce")
    await action(page, "prototype")
    await action(page, "simulate-biz-contact")
    await settle(page)
    const s = await stored(page)
    const t = s.threads.find((x) => x.about.type === "biz" && x.about.id === BIZ && x.unread)
    expect(!!t && t.msgs.length === 1 && !t.msgs[0].me, "o contato de teste não foi criado")
    expect(/Contato de teste/.test(await toast(page)), "sem aviso")
    await action(page, "close-dialog")
    await go(page, "conversas")
    expect(
      new RegExp(t.who.replace(".", "\\.")).test(await mainText(page)),
      `fora de Conversas: ${(await mainText(page)).slice(0, 300)}`,
    )
  },

  async "moment-plan-puts-the-page-in-sponsored-for-seven-days-without-reordering"(page) {
    await patchState(page, MY_BIZ)
    const sponsored = async () => {
      await go(page, "negocios")
      const sec = page.locator("#business-results > section").filter({
        has: page.getByRole("heading", { name: "Patrocinado", exact: true }),
      })
      return (await sec.count()) ? sec.innerText() : ""
    }
    const organic = async () => {
      await go(page, "negocios")
      return page
        .locator("#business-results > section")
        .filter({
          has: page.getByRole("heading", { name: "Indicações da comunidade", exact: true }),
        })
        .locator(".photo-card h3")
        .allInnerTexts()
    }
    const before = await sponsored()
    expect(!/Jorge Eletricista/.test(before), "no plano grátis já aparecia em Patrocinado")
    const orderBefore = (await organic()).filter((n) => n !== "Jorge Eletricista")
    await go(page, `negocio/${BIZ}`)
    expect(/Sem destaque no plano grátis/.test(await mainText(page)), "estado do plano grátis")
    await action(page, "plans")
    await page.locator('#dialog md-radio[value="moment"]').click()
    await action(page, "activate-plan")
    expect(/Patrocinado até \d\d\/\d\d/.test(await toast(page)), `aviso: ${await toast(page)}`)
    const sub = (await stored(page)).subscription
    expect(
      sub.tier === "moment" && Math.abs(sub.spot.until - sub.spot.from - 7 * DAY) < 1000,
      "o destaque não dura 7 dias",
    )
    // identificado como Patrocinado, fora das indicações, sem mexer na ordem delas
    expect(/Jorge Eletricista/.test(await sponsored()), "não apareceu em Patrocinado")
    const orderAfter = await organic()
    expect(!orderAfter.includes("Jorge Eletricista"), `continua nas indicações: ${orderAfter}`)
    expect(
      JSON.stringify(orderAfter) === JSON.stringify(orderBefore),
      `a ordem das indicações mudou: ${orderAfter} / ${orderBefore}`,
    )
    expect(
      /Patrocinado/.test(
        await page.locator("#business-results .photo-card", { hasText: "Jorge" }).innerText(),
      ),
      "o cartão não diz Patrocinado",
    )
    await go(page, `negocio/${BIZ}`)
    expect(
      /Patrocinado/.test(await page.locator(".detail-hero .pill").innerText()),
      "página sem rótulo",
    )
    expect(/Patrocinado até/.test(await mainText(page)), "sem a data do destaque")
    // página pausada ou suspensa não ocupa o espaço
    await patchState(page, `s.myBiz.paused=true`)
    expect(!/Jorge Eletricista/.test(await sponsored()), "pausada ainda em Patrocinado")
    await patchState(page, `delete s.myBiz.paused`)
    // passados os 7 dias volta ao normal e oferece destacar de novo
    await patchState(page, `s.subscription.spot.until=Date.now()-1000`)
    expect(!/Jorge Eletricista/.test(await sponsored()), "o destaque não terminou")
    expect((await organic()).includes("Jorge Eletricista"), "não voltou às indicações")
    await go(page, `negocio/${BIZ}`)
    await action(page, "biz-boost")
    expect(/Patrocinado até/.test(await toast(page)), "Destacar de novo não funcionou")
    expect(/Jorge Eletricista/.test(await sponsored()), "não voltou a Patrocinado")
  },

  async "business-plan-gives-four-boosts-a-month-and-shows-what-is-left"(page) {
    await patchState(page, MY_BIZ)
    await go(page, `negocio/${BIZ}`)
    await action(page, "plans")
    await page.locator('#dialog md-radio[value="plan"]').click()
    await action(page, "activate-plan")
    await go(page, `negocio/${BIZ}`)
    let t = await mainText(page)
    expect(/Conversas novas sem limite/.test(t), "plano sem conversas ilimitadas")
    expect(/Restam 4 de 4 destaques neste mês/.test(t), `destaques: ${t}`)
    expect((await stored(page)).subscription.spot == null, "ativar não deve destacar sozinho")
    await action(page, "biz-boost")
    expect((await stored(page)).subscription.boosts === 1, "não contou o destaque")
    expect(
      /Patrocinado até/.test(await mainText(page)) &&
        (await page.locator('[data-action="biz-boost"]').count()) === 0,
      "durante o destaque não deve oferecer outro",
    )
    // três destaques usados: resta um; no quarto, acabam até o mês seguinte
    await patchState(page, `s.subscription.spot.until=Date.now()-1000;s.subscription.boosts=3`)
    await go(page, `negocio/${BIZ}`)
    expect(/Restam 1 de 4 destaques/.test(await mainText(page)), "faltou 'Restam 1 de 4'")
    await action(page, "biz-boost")
    expect((await stored(page)).subscription.boosts === 4, "o quarto destaque não contou")
    await patchState(page, `s.subscription.spot.until=Date.now()-1000`)
    await go(page, `negocio/${BIZ}`)
    t = await mainText(page)
    expect(/4 destaques do mês já foram usados\. Voltam em \d\d\/\d\d/.test(t), `esgotado: ${t}`)
    expect((await page.locator('[data-action="biz-boost"]').count()) === 0, "oferece o quinto")
    // o mês novo devolve os quatro
    await patchState(page, `s.subscription.month='2020-01'`)
    await go(page, `negocio/${BIZ}`)
    expect(/Restam 4 de 4 destaques/.test(await mainText(page)), "mês novo não devolveu")
  },

  // ---- B13: bairros e mapa só onde há dados ----
  async "hood-filter-and-map-exist-only-for-cities-with-hood-data"(page) {
    // Manaus: filtro de bairro e botão Mapa
    await go(page, "imoveis")
    expect(
      (await page.locator('[data-action="catalog-view"]').count()) === 2,
      "Manaus sem Lista/Mapa",
    )
    expect(
      (await page.locator('[data-action="catalog-pill"][data-value="hood"]').count()) === 1,
      "Manaus sem o filtro de bairro",
    )
    await action(page, "catalog-pill", "all")
    expect(/Bairro/.test(await page.locator("#filter-panel").innerText()), "painel sem Bairro")
    await page.keyboard.press("Escape")
    await settle(page)
    // outra cidade: nenhum dos dois, e Manaus não é oferecida no lugar
    for (const city of ["Brasília", "Natal"]) {
      await action(page, "city")
      await choose(page, "city-select", city)
      await action(page, "apply-city")
      for (const route of ["imoveis", "desapegos"]) {
        await go(page, route)
        expect(
          (await page.locator('[data-action="catalog-view"]').count()) === 0,
          `${city}/${route}: botão de Mapa`,
        )
        expect(
          (await page.locator('[data-action="catalog-pill"][data-value="hood"]').count()) === 0,
          `${city}/${route}: filtro de bairro`,
        )
        await action(page, "catalog-pill", "all")
        const panel = await page.locator("#filter-panel").innerText()
        expect(!/Bairro|Ponta Negra|Planalto/.test(panel), `${city}/${route}: painel com bairros`)
        await page.keyboard.press("Escape")
        await settle(page)
      }
    }
    // voltar para Manaus devolve os dois
    await action(page, "city")
    await choose(page, "city-select", "Manaus")
    await action(page, "apply-city")
    await go(page, "desapegos")
    expect(
      (await page.locator('[data-action="catalog-view"]').count()) === 2,
      "Manaus perdeu o Mapa",
    )
  },
}

await runProof(checkpoints, "round63")
