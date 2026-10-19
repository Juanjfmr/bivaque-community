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

// Rodada 64 (correções da revisão do Lote Funcional, parte de visibilidade, grupo encerrado, ofertas,
// acessibilidade e pequenos). Um checkpoint por item corrigido: a fixture recria a situação em que o
// defeito aparecia e a prova confere o comportamento correto. Fixtures entram pelo armazenamento
// (`patchState`, que recarrega); o que dá para fazer pela tela, faz pela tela.
const GID = "g-familias"
const DAY = 864e5

const mainText = (page) => page.locator("#main").innerText()
const dialogText = (page) => page.locator("#dialog").innerText()
const count = (page, selector) => page.locator(selector).count()
const routeIs = (page, name) =>
  page
    .waitForFunction((n) => window.Bivaque.inspect().route.name === n, name, { timeout: 4000 })
    .catch(() => {})
const wide = (page) => (page.viewportSize()?.width ?? 0) >= 1024
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
const block = (...names) =>
  `s.blocked=[...(s.blocked||[]),...${JSON.stringify(names)}.map(name=>({name,at:Date.now()}))]`
const group = async (page, id) => (await stored(page)).groups.find((g) => g.id === id)
const askOf = async (page, id) => (await stored(page)).asks.find((a) => a.id === id)
const menuTitles = async (page) =>
  (await page.locator("#create-menu .create-menu-label").allInnerTexts()).map((t) =>
    t.split("\n")[0].trim(),
  )
// A página de negócio da pessoa (a de Jorge Eletricista, assumida), como o fluxo "Sou o responsável".
const MY_BIZ = `const b=s.biz.find(x=>x.id==='b6');s.myBiz={...b,spon:false,mine:true,live:true,claimed:true,owner:'Rafael Souza · responsável de teste'};s.biz=s.biz.filter(x=>x.id!=='b6')`
// Conteúdo próprio: pergunta, resposta, publicação e comentário de grupo.
const OWN_CONTENT = `
 s.asks.unshift({id:'q-own',q:'Quem indica uma escola boa perto da Ponta Negra?',city:s.homeCity,who:s.profile.name,ini:'RS',mine:true,topic:s.homeCity,ctx:'Pergunta de um membro da cidade',status:'open',when:'agora',answers:[],createdAt:Date.now()});
 s.asks.find(a=>a.id==='a3').answers.push({id:'a-r64',who:s.profile.name,ini:'RS',mine:true,t:'Eu fui bem atendido por lá.',biz:null,solved:false,helped:0,liked:false});
 const g=s.groups.find(x=>x.id==='${GID}');g.posts.unshift({id:'p-r64',type:'post',author:s.profile.name,ini:'RS',text:'Dica da minha rua: feira aos sábados.',at:Date.now(),comments:[{id:'c-r64',author:s.profile.name,ini:'RS',text:'Passei lá ontem.',mine:true,at:Date.now()}],useful:0,liked:false,mine:true})`

// Abre o menu ⋮ e confere o nome acessível e a declaração do gatilho; fecha com Esc.
async function checkMenu(page, selector, label) {
  const trigger = page.locator(`${selector}:visible`).first()
  expect((await trigger.count()) === 1, `sem o gatilho ${selector}`)
  // O Material Web delega os atributos ARIA ao botão interno: confere ali, ou no próprio elemento.
  const declared = await trigger.evaluate(
    (el) =>
      el.getAttribute("aria-haspopup") ||
      el.ariaHasPopup ||
      el.shadowRoot?.querySelector("button")?.getAttribute("aria-haspopup"),
  )
  expect(
    declared === "menu",
    `${selector}: o gatilho não declara aria-haspopup="menu" antes de abrir`,
  )
  await trigger.click()
  await settle(page)
  const name = await page.locator("#create-menu").getAttribute("aria-label")
  expect(name === label, `${selector}: o menu se chama "${name}", esperado "${label}"`)
  await page.keyboard.press("Escape")
  await settle(page)
}
async function openCreateChoice(page, choice) {
  await page.locator('[data-action="create"]:visible').first().click()
  await settle(page)
  await page.locator(`#create-menu [data-action="${choice}"]`).click()
  await settle(page)
}
// Entrada: sai da conta e abre o cadastro (o rascunho da entrada vive só na memória).
async function startSignup(page) {
  await snapshot(page)
  await go(page, "voce")
  await page.locator('#main [data-action="sign-out"]').click()
  await settle(page)
  await confirmOk(page)
  await page.locator('#main [data-action="entry-join"]').click()
  await settle(page)
}

const checkpoints = {
  // ---- 1. Visibilidade: Continue de onde parou ----
  async "resume-drops-blocked-and-hidden-records"(page) {
    await patchState(page, "s.lastViewed={type:'item',id:'i1',city:s.homeCity}")
    await go(page, "inicio")
    expect((await count(page, '[data-action="resume"]')) === 1, "sem o Retomar no começo")
    // Bloquear Luana M. pela tela: o anúncio dela sai do Retomar e o registro é limpo.
    await go(page, "anuncio/i1")
    await page
      .locator('[data-action="block-person"][data-value="Luana M."]:visible')
      .first()
      .click()
    await settle(page)
    await confirmOk(page)
    // A confirmação grava de forma assíncrona: espera a condição (com prazo) em vez de ler uma vez só.
    await page
      .waitForFunction((k) => JSON.parse(localStorage.getItem(k))?.lastViewed === null, KEY, {
        timeout: 4000,
      })
      .catch(() => {})
    expect((await stored(page)).lastViewed === null, "bloquear não limpou lastViewed")
    await go(page, "inicio")
    expect(
      (await count(page, '[data-action="resume"]')) === 0,
      "Retomar mostra anúncio de bloqueada",
    )
    // Registro que ficou invisível sem passar pela tela (dados antigos) também não aparece.
    await patchState(page, "s.lastViewed={type:'item',id:'i1',city:s.homeCity}")
    await go(page, "inicio")
    expect((await count(page, '[data-action="resume"]')) === 0, "Retomar mostra registro invisível")
    // Ocultar uma pergunta pelo ⋮ limpa o Retomar dela.
    await patchState(page, "s.blocked=[];s.lastViewed={type:'ask',id:'a1',city:s.homeCity}")
    await go(page, "inicio")
    expect(/Pediatra/.test(await mainText(page)), "o Retomar da pergunta não aparece")
    await go(page, "pergunta/a1")
    await page.locator('[data-action="question-other-menu"]:visible').first().click()
    await settle(page)
    await page.locator('#create-menu [data-action="hide-question"]').click()
    await settle(page)
    expect((await stored(page)).lastViewed === null, "ocultar não limpou lastViewed")
    await go(page, "inicio")
    expect((await count(page, '[data-action="resume"]')) === 0, "Retomar mostra pergunta oculta")
  },

  // ---- 1. Visibilidade: depoimentos e avatares da página ----
  async "business-testimonials-skip-blocked-authors"(page) {
    await snapshot(page)
    await go(page, "negocio/b1")
    expect(
      /Luana M\./.test(await mainText(page)),
      "o relato de Luana não aparece antes do bloqueio",
    )
    await patchState(page, block("Luana M."))
    await go(page, "negocio/b1")
    const text = await mainText(page)
    expect(!/Luana M\./.test(text), "relato de pessoa bloqueada na página do negócio")
    expect(/Renato A\./.test(text), "o relato de quem não foi bloqueado sumiu")
    const stack = await page.locator(".detail-aside .avatar-stack").innerText()
    expect(!/LM/.test(stack), `avatar de pessoa bloqueada: ${stack}`)
  },

  // ---- 1. Visibilidade: interessados, navegação e métricas ----
  async "leads-badge-and-metrics-skip-blocked-conversations"(page) {
    const threads = `
     ${MY_BIZ};
     s.threads.unshift({id:'t-r64a',who:'Luana M.',ini:'LM',city:s.homeCity,about:{type:'item',id:'i4'},snapshot:{title:'Geladeira duplex 400 L',city:s.homeCity},msgs:[{me:false,t:'SEGREDO-LUANA quero comprar',at:Date.now()}],unread:true,updatedAt:Date.now()});
     s.threads.unshift({id:'t-r64b',who:'Luana M.',ini:'LM',city:s.homeCity,about:{type:'biz',id:s.myBiz.id},snapshot:{title:s.myBiz.name,city:s.homeCity},msgs:[{me:false,t:'SEGREDO-BIZ orçamento?',at:Date.now()}],unread:true,updatedAt:Date.now()})`
    await patchState(page, threads)
    const badge = async () => {
      await go(page, "inicio")
      return Number((await page.locator("#nav .badge").first().textContent()) || 0)
    }
    const before = await badge()
    await go(page, "anuncio/i4")
    await action(page, "item-leads", "i4")
    expect(/SEGREDO-LUANA/.test(await dialogText(page)), "antes do bloqueio, o contato não aparece")
    await action(page, "close-dialog")
    expect((await page.locator(".metric b").nth(1).innerText()) === "1", "conversas do anúncio")
    await go(page, "negocio/b6")
    expect((await page.locator(".metric b").nth(1).innerText()) === "1", "pedidos de contato")
    await patchState(page, block("Luana M."))
    expect((await badge()) === before - 2, `o contador de conversas contou bloqueada: ${before}`)
    await go(page, "anuncio/i4")
    await action(page, "item-leads", "i4")
    const leads = await dialogText(page)
    expect(!/SEGREDO-LUANA|Luana/.test(leads), `Ver interessados mostra bloqueada: ${leads}`)
    expect(/Nenhum contato ainda/.test(leads), "Ver interessados sem o estado vazio")
    await action(page, "close-dialog")
    expect((await page.locator(".metric b").nth(1).innerText()) === "0", "conversas do anúncio")
    await go(page, "negocio/b6")
    expect((await page.locator(".metric b").nth(1).innerText()) === "0", "pedidos de contato")
    await action(page, "biz-leads", "b6")
    expect(
      !/SEGREDO-BIZ|Luana/.test(await dialogText(page)),
      "contatos do negócio mostram bloqueada",
    )
  },

  // ---- 1. Visibilidade: avisos ----
  async "notices-skip-records-of-blocked-people"(page) {
    await snapshot(page)
    await go(page, "inicio")
    const bell = async () =>
      Number((await page.locator(".notice-button .badge").first().textContent()) || 0)
    const before = await bell()
    expect(before >= 2, `esperava avisos não lidos de exemplo: ${before}`)
    await action(page, "notices")
    expect(/Berço com colchão/.test(await dialogText(page)), "o aviso do berço não aparece antes")
    await action(page, "close-dialog")
    await patchState(page, block("Paulo R."))
    await go(page, "inicio")
    expect((await bell()) === before - 1, "o sino contou o aviso de anúncio de bloqueado")
    await action(page, "notices")
    const text = await dialogText(page)
    expect(!/Berço com colchão/.test(text), "o aviso de anúncio de bloqueado ainda é listado")
    expect(/agradeceu sua indicação/.test(text), "os outros avisos sumiram")
    await action(page, "close-dialog")
    if (wide(page)) {
      // Início do desktop: o resumo e "Sua pergunta recebeu N respostas" só contam o que a pessoa vê.
      await patchState(
        page,
        `${block("Luana M.")};s.asks.unshift({id:'q-r64n',q:'Qual padaria entrega cedo no Planalto?',city:s.homeCity,who:s.profile.name,ini:'RS',mine:true,topic:s.homeCity,ctx:'x',status:'open',when:'agora',answers:[{id:'x1',who:'Luana M.',ini:'LM',t:'Padaria A',solved:false},{id:'x2',who:'Mônica L.',ini:'ML',t:'Padaria B',solved:false}],createdAt:Date.now()})`,
      )
      await go(page, "inicio")
      const strip = await page.locator(".home-notice").first().innerText()
      expect(
        /Sua pergunta recebeu 1 resposta\b/.test(strip),
        `contou resposta de bloqueada: ${strip}`,
      )
    }
  },

  // ---- 1. Visibilidade: alertas ----
  async "alerts-count-and-simulation-skip-blocked-sellers"(page) {
    await patchState(
      page,
      "s.alerts=[{id:'al-r64',kind:'desapego',city:s.homeCity,attrs:{cats:[],hoods:[],cond:'',pickup:'',min:'',max:''},label:'Desapegos',notify:true,createdAt:Date.now()}]",
    )
    const num = async () => {
      await go(page, "voce")
      await action(page, "search-alerts")
      const t = await dialogText(page)
      await action(page, "close-dialog")
      return Number(/(\d+) anúncios? hoje/.exec(t)?.[1])
    }
    const before = await num()
    expect(before >= 2, `alerta sem anúncios de exemplo: ${before}`)
    await patchState(page, block("Luana M."))
    expect((await num()) === before - 1, "o alerta contou anúncio de pessoa bloqueada")
    // A simulação de anúncio novo não traz anúncio de quem está bloqueado.
    await patchState(page, block("Paula V."))
    const items = (await stored(page)).items.length
    await go(page, "voce")
    await action(page, "prototype")
    await action(page, "simulate-alert")
    expect(/Paula V\./.test(await toast(page)), `aviso da simulação: ${await toast(page)}`)
    expect((await stored(page)).items.length === items, "a simulação criou anúncio de bloqueada")
  },

  // ---- 1. Visibilidade: Ocultados ----
  async "hidden-list-skips-questions-of-blocked-people"(page) {
    await patchState(
      page,
      `${block("Carla R.")};for(const id of ['a1','a2'])s.asks.find(a=>a.id===id).hiddenByMe=Date.now()`,
    )
    await go(page, "ocultados")
    const text = await mainText(page)
    expect(!/Pediatra que atenda pelo plano/.test(text), "Ocultados mostra pergunta de bloqueada")
    expect(
      /Escola com vaga no 3º ano/.test(text),
      "Ocultados perdeu a pergunta de quem não foi bloqueado",
    )
  },

  // ---- 1. Visibilidade: Simular resposta ----
  async "simulated-answer-donor-skips-blocked-answers"(page) {
    await patchState(
      page,
      `${block("Luana M.")};s.asks.unshift({id:'q-r64',q:'Veterinário que atende à noite na Zona Oeste?',city:s.homeCity,who:s.profile.name,ini:'RS',mine:true,topic:'Pets',ctx:'x',status:'open',when:'agora',answers:[],createdAt:Date.now()})`,
    )
    await go(page, "voce")
    await action(page, "prototype")
    await action(page, "simulate-answer")
    const q = await askOf(page, "q-r64")
    const added = q.answers.at(-1)
    expect(
      !added || (added.originQuestion !== "a5" && !/Luana/.test(JSON.stringify(added))),
      `a resposta de exemplo veio da resposta de bloqueada: ${JSON.stringify(added)}`,
    )
  },

  // ---- 1. Visibilidade: Bloquear X não aparece quem já está bloqueado ----
  async "block-button-is-hidden-for-someone-already-blocked"(page) {
    await snapshot(page)
    await go(page, "anuncio/i1")
    expect(
      (await count(page, '[data-action="block-person"]')) >= 1,
      "sem Bloquear antes do bloqueio",
    )
    await patchState(page, block("Luana M.", "Carla R."))
    await go(page, "anuncio/i1")
    await page.locator('[data-action="peek-blocked"]').click()
    await settle(page)
    expect(/Você bloqueou Luana M\./.test(await mainText(page)), "sem a faixa de bloqueada")
    expect(
      (await count(page, '[data-action="block-person"]')) === 0,
      "anúncio: Bloquear de quem já está bloqueada",
    )
    await go(page, "pergunta/a1")
    await page.locator('[data-action="peek-blocked"]').click()
    await settle(page)
    expect(
      (await count(page, '[data-action="block-person"]')) === 0,
      "pergunta: Bloquear de quem já está bloqueada",
    )
  },

  // ---- 1. Visibilidade: contador "suas perguntas" ----
  async "profile-question-counter-matches-the-list"(page) {
    await patchState(
      page,
      `for (const [id,h] of [['q-r64a',false],['q-r64b',true]])s.asks.unshift({id,q:'Pergunta própria '+id+' para a prova?',city:s.homeCity,who:s.profile.name,ini:'RS',mine:true,topic:s.homeCity,ctx:'x',status:'open',when:'agora',answers:[],createdAt:Date.now(),hidden:h})`,
    )
    await go(page, "voce")
    const counter = Number(
      await page.locator('.profile-stat[data-action="my-questions"] b').innerText(),
    )
    await go(page, "minhas")
    const rows = await page.locator('#main [data-action="open-question"]').count()
    expect(counter === rows, `o contador (${counter}) difere da lista (${rows})`)
    expect(counter === 1, `a pergunta removida pela moderação foi contada: ${counter}`)
  },

  // ---- 2. Grupo encerrado: pedidos de entrada ----
  async "closing-a-group-clears-requests-and-refuses-approvals"(page) {
    await snapshot(page)
    await go(page, "grupo/g-futebol")
    await action(page, "manage-group", "g-futebol")
    expect(/Pedidos de entrada/.test(await dialogText(page)), "o admin não vê os pedidos antes")
    await action(page, "close-group", "g-futebol")
    await confirmOk(page)
    expect((await group(page, "g-futebol")).requests.length === 0, "encerrar não zerou os pedidos")
    // Dados antigos (pedidos que sobraram num grupo já encerrado): o Gerenciar esconde a seção e
    // aprovar ou recusar é recusado.
    await patchState(
      page,
      "const g=s.groups.find(x=>x.id==='g-futebol');g.requests=[{name:'Bruno C.',note:'x'},{name:'Thiago S.',note:'y'}]",
    )
    await go(page, "grupo/g-futebol")
    await action(page, "manage-group", "g-futebol")
    expect(
      !/Pedidos de entrada/.test(await dialogText(page)),
      "Gerenciar mostra pedidos de grupo encerrado",
    )
    const members = (await group(page, "g-futebol")).members
    await page.evaluate(() => {
      const b = document.createElement("button")
      b.dataset.action = "approve-req"
      b.dataset.value = "g-futebol|0"
      b.id = "probe-approve"
      document.body.append(b)
      b.click()
    })
    await settle(page)
    const g = await group(page, "g-futebol")
    expect(g.requests.length === 2 && g.members === members, "aprovou pedido de grupo encerrado")
    expect(/encerrado/i.test(await toast(page)), `sem o aviso: ${await toast(page)}`)
  },

  // ---- 2. Grupo encerrado: leitura só dentro do prazo ----
  async "closed-group-is-readable-only-within-the-period"(page) {
    await patchState(
      page,
      `s.groups.find(x=>x.id==='g-pedal').closedAt=Date.now()-5*${DAY};s.groups.find(x=>x.id==='${GID}').closedAt=Date.now()-40*${DAY};s.groups.find(x=>x.id==='g-futebol').closedAt=Date.now()-2*${DAY}`,
    )
    const s = await stored(page)
    const famPost = s.groups.find((g) => g.id === GID).posts[0].id
    const pedalPost = s.groups.find((g) => g.id === "g-pedal").posts[0].id
    // lista de grupos: dentro do prazo mostra a prévia; fora do prazo, só "Grupo encerrado"
    await go(page, "comunidade")
    await action(page, "community-tab", "grp")
    const list = await mainText(page)
    expect(!/Qual sábado|Pediatra que atenda sábado/.test(list), "prévia de grupo fora do prazo")
    expect(/Treino de 8 km/.test(list), "grupo dentro do prazo perdeu a prévia")
    // publicação: dentro do prazo abre; fora do prazo, indisponível
    await go(page, `publicacao/${GID}~${famPost}`)
    expect(
      /Conteúdo indisponível/.test(await mainText(page)),
      "publicação de grupo fora do prazo abre",
    )
    await go(page, `publicacao/g-pedal~${pedalPost}`)
    expect(/Treino de 8 km/.test(await mainText(page)), "publicação dentro do prazo não abre")
    // busca global sai de qualquer grupo encerrado
    const hit = await page.evaluate(() => window.Bivaque.search("grupo"))
    const pedal = await page.evaluate(() => window.Bivaque.search("Pedal"))
    expect(!pedal.groups.includes("g-pedal"), "a busca acha grupo encerrado")
    expect(!hit.groups.includes(GID), "a busca acha grupo encerrado fora do prazo")
    // Início: "Nos seus grupos" e "Próximo encontro" não usam grupo encerrado
    await go(page, "inicio")
    const home = await mainText(page)
    expect(
      !/Qual sábado|Pediatra que atenda sábado/.test(home),
      "Início mostra post de grupo fora do prazo",
    )
    const next = (await count(page, ".home-event"))
      ? await page.locator(".home-event").innerText()
      : ""
    expect(
      !/Treino de 8 km|Pelada de sábado/.test(next),
      `Próximo encontro usa grupo encerrado: ${next}`,
    )
  },

  // ---- 3. Prévia do grupo ignora o que a moderação removeu ----
  async "group-preview-skips-moderated-posts"(page) {
    await patchState(
      page,
      `const g=s.groups.find(x=>x.id==='${GID}');g.posts.unshift({id:'p-mod',type:'post',author:'Ana P.',ini:'AP',text:'POST-REMOVIDO-R64',at:Date.now(),comments:[],useful:0,liked:false,mine:false,hidden:true})`,
    )
    await go(page, "comunidade")
    await action(page, "community-tab", "grp")
    const text = await mainText(page)
    expect(!/POST-REMOVIDO-R64/.test(text), "a prévia mostra publicação removida pela moderação")
    expect(/Ana: Qual sábado/.test(text), "a prévia não caiu na publicação anterior")
  },

  // ---- 4. Ofertas de grupo seguem a página ----
  async "group-offers-follow-the-business-page"(page) {
    const offer = (extra) =>
      `const g=s.groups.find(x=>x.id==='${GID}');const p=g.posts.find(x=>x.type==='offer');p.at=Date.now();${extra}`
    await patchState(page, offer(""))
    const pid = (await group(page, GID)).posts.find((p) => p.type === "offer").id
    // página aberta: a oferta aparece e a prévia leva o prefixo
    await go(page, `grupo/${GID}`)
    expect(/Kit festa com 10%/.test(await mainText(page)), "a oferta de página aberta sumiu")
    await go(page, "comunidade")
    await action(page, "community-tab", "grp")
    expect(/Cláudia: Oferta · Kit festa/.test(await mainText(page)), "a prévia sem 'Oferta · '")
    await go(page, "inicio")
    expect(/Oferta · Kit festa/.test(await mainText(page)), "Nos seus grupos sem 'Oferta · '")
    // pausada, suspensa ou excluída: a oferta some da lista e do endereço
    for (const [name, extra] of [
      ["pausada", "s.biz.find(b=>b.id==='b4').paused=true"],
      ["suspensa", "s.biz.find(b=>b.id==='b4').suspended=true"],
      ["excluída", "s.biz=s.biz.filter(b=>b.id!=='b4')"],
    ]) {
      await patchState(page, `${offer("")};${extra}`)
      await go(page, `grupo/${GID}`)
      expect(!/Kit festa com 10%/.test(await mainText(page)), `oferta de página ${name} na lista`)
      await go(page, `publicacao/${GID}~${pid}`)
      expect(/Conteúdo indisponível/.test(await mainText(page)), `oferta de página ${name} abre`)
      await go(page, "inicio")
      expect(!/Kit festa com 10%/.test(await mainText(page)), `oferta de página ${name} no Início`)
    }
  },

  // ---- 4. Cota semanal pela conta, não pelo nome ----
  async "offer-quota-survives-a-rename"(page) {
    await patchState(page, MY_BIZ)
    const post = async (text) => {
      await go(page, `grupo/${GID}`)
      await action(page, "new-post")
      await action(page, "post-type", "offer")
      await fill(page, "post-text", text)
      await action(page, "submit-post", GID)
    }
    await post("Orçamento de fiação com 10% para quem é do grupo.")
    expect(/Oferta publicada/.test(await toast(page)), `primeira oferta: ${await toast(page)}`)
    const offerAt = (await group(page, GID)).offerAt
    expect(!("Rafael Souza" in offerAt), "a cota ainda usa o nome como chave")
    // trocar de nome não zera a semana
    await go(page, "voce")
    await action(page, "settings")
    await fill(page, "profile-name", "Rafael S. Souza")
    await action(page, "save-settings")
    expect((await stored(page)).profile.name === "Rafael S. Souza", "o nome não mudou")
    await post("Outra oferta logo depois de trocar o nome.")
    expect(
      /Pode fazer outra em/.test(await toast(page)),
      `trocar o nome zerou a cota: ${await toast(page)}`,
    )
    expect(
      (await group(page, GID)).posts.filter((p) => p.mine && p.type === "offer").length === 1,
      "criou a segunda oferta",
    )
  },

  // ---- 5. Publicação apagada pelo autor ----
  async "deleted-group-post-says-it-was-deleted"(page) {
    await patchState(page, OWN_CONTENT)
    await go(page, `grupo/${GID}`)
    await action(page, "post-menu", `${GID}|p-r64`)
    await action(page, "delete-post", `${GID}|p-r64`)
    await confirmOk(page)
    await go(page, `publicacao/${GID}~p-r64`)
    const text = await mainText(page)
    expect(/Esta publicação foi excluída\./.test(text), `texto: ${text}`)
    expect(!/Conteúdo indisponível/.test(text), "ainda diz 'Conteúdo indisponível'")
  },

  // ---- 6. Menus ⋮: nome acessível e gatilho declarado ----
  async "menus-name-themselves-and-declare-the-popup"(page) {
    await patchState(page, `${OWN_CONTENT};${MY_BIZ}`)
    const s = await stored(page)
    const g = s.groups.find((x) => x.id === GID)
    const question = g.posts.find((p) => p.type === "question")
    await go(page, "pergunta/a1")
    await checkMenu(page, '[data-action="question-other-menu"]', "Ações da pergunta")
    await go(page, "pergunta/a3")
    await checkMenu(page, '[data-action="answer-other-menu"]', "Ações da resposta")
    await checkMenu(page, '[data-action="answer-menu"]', "Ações da resposta")
    await go(page, "pergunta/q-own")
    await checkMenu(page, '[data-action="question-menu"]', "Ações da pergunta")
    await go(page, `grupo/${GID}`)
    await checkMenu(page, '[data-action="post-other-menu"]', "Ações da publicação")
    await checkMenu(page, '[data-action="post-menu"]', "Ações da publicação")
    await checkMenu(page, '[data-action="group-menu"]', "Ações do grupo")
    await go(page, `publicacao/${GID}~${question.id}`)
    await checkMenu(page, '[data-action="comment-other-menu"]', "Ações da resposta")
    await go(page, `publicacao/${GID}~p-r64`)
    await checkMenu(page, '[data-action="comment-menu"]', "Ações do comentário")
    await go(page, "conversas")
    await checkMenu(page, '[data-action="thread-menu"]', "Ações da conversa")
    await go(page, "negocio/b6")
    await checkMenu(page, '[data-action="biz-menu"]', "Ações da página")
  },

  // ---- 7. Ocultar pelo ⋮, sem precisar do gesto ----
  async "question-menu-offers-hide-report-and-block"(page) {
    await snapshot(page)
    await go(page, "pergunta/a1")
    await page.locator('[data-action="question-other-menu"]:visible').first().click()
    await settle(page)
    expect(
      (await menuTitles(page)).join("|") ===
        "Ocultar pergunta|Denunciar pergunta|Bloquear Carla R.",
      `itens do menu: ${await menuTitles(page)}`,
    )
    await page.locator('#create-menu [data-action="hide-question"]').click()
    await settle(page)
    expect(
      typeof (await askOf(page, "a1")).hiddenByMe === "number",
      "Ocultar não gravou hiddenByMe",
    )
    expect(/Pergunta ocultada para você/.test(await toast(page)), "sem o aviso com Desfazer")
    expect(/Você ocultou esta pergunta/.test(await mainText(page)), "sem a faixa de oculta")
    await go(page, "comunidade")
    expect(
      !/Pediatra que atenda pelo plano/.test(await mainText(page)),
      "a pergunta ainda está na lista",
    )
    // já oculta: o menu não oferece Ocultar de novo
    await go(page, "pergunta/a1")
    await page.locator('[data-action="question-other-menu"]:visible').first().click()
    await settle(page)
    expect(
      !(await menuTitles(page)).includes("Ocultar pergunta"),
      "oferece Ocultar numa pergunta oculta",
    )
  },

  // ---- 8. Apagar publicação desconta as indicações dos comentários ----
  async "removing-a-group-post-takes-back-the-recommendations"(page) {
    await patchState(
      page,
      `const g=s.groups.find(x=>x.id==='${GID}');g.posts.unshift({id:'p-r64q',type:'question',author:s.profile.name,ini:'RS',text:'Dentista infantil que atenda aos sábados?',at:Date.now(),comments:[{id:'c1',author:'Ana P.',ini:'AP',text:'Sorriso Kids atende sábado.',biz:'b9',at:Date.now()},{id:'c2',author:'Mônica L.',ini:'ML',text:'Também indico.',biz:'b9',at:Date.now()}],useful:0,liked:false,mine:true})`,
    )
    const before = (await stored(page)).biz.find((b) => b.id === "b9").recN
    await go(page, `grupo/${GID}`)
    await action(page, "post-menu", `${GID}|p-r64q`)
    await action(page, "delete-post", `${GID}|p-r64q`)
    await confirmOk(page)
    const after = (await stored(page)).biz.find((b) => b.id === "b9").recN
    expect(after === before - 2, `recN deveria cair 2: ${before} → ${after}`)
  },

  // ---- 8. Editar publicação enviada à cidade atualiza Indicações ----
  async "editing-a-city-question-post-updates-indications"(page) {
    await patchState(
      page,
      `s.asks.unshift({id:'q-city',q:'Texto antigo da pergunta enviada à cidade?',city:s.homeCity,who:s.profile.name,ini:'RS',mine:true,topic:'x',ctx:'x',status:'open',when:'agora',answers:[],createdAt:Date.now()});const g=s.groups.find(x=>x.id==='${GID}');g.posts.unshift({id:'p-r64c',type:'question',author:s.profile.name,ini:'RS',text:'Texto antigo da pergunta enviada à cidade?',at:Date.now(),comments:[],useful:0,liked:false,mine:true,alsoCity:'q-city'})`,
    )
    await go(page, `grupo/${GID}`)
    await action(page, "post-menu", `${GID}|p-r64c`)
    await action(page, "edit-post", `${GID}|p-r64c`)
    await fill(page, "edit-text", "Texto novo da pergunta enviada à cidade?")
    await action(page, "save-post", `${GID}|p-r64c`)
    const q = await askOf(page, "q-city")
    expect(q.q === "Texto novo da pergunta enviada à cidade?", `Indicações ficou com: ${q.q}`)
    expect(/também em Indicações/.test(await toast(page)), `aviso: ${await toast(page)}`)
  },

  // ---- 8. Links das Configurações não descartam edição sem perguntar ----
  async "settings-links-ask-before-discarding-edits"(page) {
    await snapshot(page)
    const link = (action2, value) =>
      page
        .locator(`#dialog [data-action="${action2}"]${value ? `[data-value="${value}"]` : ""}`)
        .first()
    const confirmOpen = () => page.evaluate(() => document.querySelector("#confirm-dialog")?.open)
    for (const [act, value, route] of [
      ["open-hidden", "", "ocultados"],
      ["open-blocked", "", "bloqueados"],
      ["support-open", "ajuda", "ajuda"],
    ]) {
      await go(page, "voce")
      await action(page, "settings")
      await fill(page, "profile-name", "Nome alterado e não salvo")
      await link(act, value).click()
      await settle(page)
      expect(await confirmOpen(), `${act}: descartou a edição sem perguntar`)
      expect((await routeOf(page)).name === "voce", `${act}: navegou antes de perguntar`)
      expect(
        /Descartar alterações/.test(await page.locator("#confirm-dialog").innerText()),
        `${act}: pergunta`,
      )
      // continuar editando mantém tudo
      await page.locator("#confirm-dialog md-text-button").click()
      await settle(page)
      expect(
        (await page.evaluate(() => document.querySelector("#dialog")?.open)) &&
          (await page.locator("#profile-name input").inputValue()) === "Nome alterado e não salvo",
        `${act}: Continuar editando perdeu a edição`,
      )
      // descartar leva ao destino
      await link(act, value).click()
      await settle(page)
      await confirmOk(page)
      await routeIs(page, route)
      expect((await routeOf(page)).name === route, `${act}: não abriu ${route}`)
      expect(
        (await stored(page)).profile.name !== "Nome alterado e não salvo",
        `${act}: gravou o nome`,
      )
    }
    // sem edição, o link vai direto
    await go(page, "voce")
    await action(page, "settings")
    await link("open-hidden").click()
    await routeIs(page, "ocultados")
    expect((await routeOf(page)).name === "ocultados", "sem edição, o link não abriu direto")
  },

  // ---- 8. Rascunho da entrada não guarda a senha ----
  async "entry-draft-never-keeps-the-password"(page) {
    await startSignup(page)
    await fill(page, "en-name", "Carla Teste")
    await fill(page, "en-email", "carla.teste@exemplo.com")
    await fill(page, "en-pass", "senha1234")
    await page
      .locator('#main label.en-check [data-action="open-legal"][data-value="privacidade"]')
      .click()
    await settle(page)
    expect((await routeOf(page)).name === "privacidade", "a política não abriu")
    await page.locator('#main [data-action="back"]').click()
    await settle(page)
    const value = (id) => page.locator(`#${id}`).evaluate((el) => el.value)
    expect((await routeOf(page)).id === "conta", "não voltou ao cadastro")
    expect(
      (await value("en-name")) === "Carla Teste" &&
        (await value("en-email")) === "carla.teste@exemplo.com",
      "o nome e o e-mail se perderam",
    )
    expect((await value("en-pass")) === "", "a senha voltou preenchida")
  },

  // ---- 8. Sem bairros de Manaus fora de Manaus ----
  // Rodada 66: o campo de bairro virou busca em todas as cidades (shell/hood-picker.js); a prova passa a
  // conferir que fora de Manaus as sugestões são da cidade da pessoa, nunca os bairros de Manaus.
  async "forms-offer-no-manaus-hoods-in-other-cities"(page) {
    const kind = (id) =>
      page.locator(`#${id}`).evaluate((el) => (el.closest(".hood-pick") ? "PICKER" : el.tagName))
    const suggestions = async (id) => {
      await page.locator(`#${id} input`).fill("")
      await page.locator(`#${id}-menu`).waitFor({ state: "visible", timeout: 3000 })
      return page.locator(`#${id}-menu`).innerText()
    }
    // Manaus (controle): campo de busca de bairro
    await snapshot(page)
    await go(page, "inicio")
    await openCreateChoice(page, "create-item")
    expect((await kind("item-hood")) === "PICKER", "Manaus perdeu o campo de bairro")
    expect(
      /Mais escolhidos em Manaus/i.test(await suggestions("item-hood")),
      "Manaus sem sugestões",
    )
    // Esc fecha primeiro as sugestões e depois a janela
    await page.keyboard.press("Escape")
    await page.keyboard.press("Escape")
    await settle(page)
    // Brasília: sugestões de Brasília, sem Ponta Negra & cia.
    await patchState(page, "s.homeCity='Brasília';s.city='Brasília'")
    await go(page, "inicio?cidade=Brasília")
    await openCreateChoice(page, "create-item")
    expect((await kind("item-hood")) === "PICKER", "desapego: bairro sem busca")
    const bsb = await suggestions("item-hood")
    expect(
      /Mais escolhidos em Brasília/i.test(bsb) && !/Ponta Negra|Planalto/.test(bsb),
      `desapego oferece bairros de Manaus: ${bsb}`,
    )
    await choose(page, "item-hood")
    await fill(page, "item-title", "Estante de livros branca")
    await fill(page, "item-price", "150")
    await choose(page, "item-cat")
    await choose(page, "item-cond")
    await fill(page, "item-desc", "Estante em bom estado, retirada combinada.")
    await action(page, "submit-item")
    const item = (await stored(page)).items.find((i) => i.title === "Estante de livros branca")
    expect(
      item &&
        /^(Asa Sul|Asa Norte|Noroeste|Sudoeste|Cruzeiro|Lago Sul|Lago Norte|Guará|Águas Claras)$/.test(
          item.hood,
        ) &&
        item.city === "Brasília",
      `anúncio sem bairro de Brasília: ${JSON.stringify(item)}`,
    )
    await go(page, "inicio?cidade=Brasília")
    await openCreateChoice(page, "create-property")
    expect((await kind("item-hood")) === "PICKER", "imóvel: bairro sem busca")
    await page.keyboard.press("Escape")
    await settle(page)
    await go(page, "inicio?cidade=Brasília")
    await openCreateChoice(page, "create-request")
    expect((await kind("request-hood")) === "PICKER", "pedido: bairro sem busca")
    expect(
      !/Ponta Negra|Planalto/.test(await suggestions("request-hood")),
      "pedido oferece bairros de Manaus",
    )
    await page.keyboard.press("Escape")
    await page.keyboard.press("Escape")
    await settle(page)
    await go(page, "inicio?cidade=Brasília")
    await openCreateChoice(page, "indicate")
    expect((await kind("ind-hood")) === "PICKER", "indicação: bairro sem busca")
  },
}

await runProof(checkpoints, "round64")
