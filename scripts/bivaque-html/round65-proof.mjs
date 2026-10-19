import {
  action,
  choose,
  confirmOk,
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

// Rodada 65 (revisão do Lote Funcional, correções de pedidos, propostas, planos, página de negócio e
// apagar a conta). Um checkpoint por comportamento corrigido; cada um reproduz o defeito da revisão
// (o estado que o causava) e confere a correção. Fixtures entram pelo armazenamento (`patchState`,
// que recarrega); o que a prova pode fazer pela tela, faz pela tela.
const DAY = 864e5
const BIZ = "b6"

const mainText = (page) => page.locator("#main").innerText()
const dialogText = (page) => page.locator("#dialog").innerText()
const count = (page, selector) => page.locator(selector).count()
const req = async (page, id) => (await stored(page)).requests.find((r) => r.id === id)
const proposal = (r, id) => r.proposals.find((p) => p.id === id)
async function patchState(page, code) {
  await snapshot(page)
  await page.evaluate(
    ([k, src]) => {
      const s = JSON.parse(localStorage.getItem(k))
      new Function("s", `{${src}}`)(s)
      localStorage.setItem(k, JSON.stringify(s))
    },
    [KEY, code],
  )
  await reload(page)
}
// Aciona uma ação cujo botão a tela já não mostra (o que a revisão chamou de "ainda dá para acionar").
async function fire(page, name, value) {
  await page.evaluate(
    ([n, v]) => {
      const b = document.createElement("button")
      b.type = "button"
      b.id = "fired"
      b.dataset.action = n
      b.dataset.value = v
      document.querySelector("#main").appendChild(b)
    },
    [name, value],
  )
  // O clique vem do próprio elemento: no celular a barra de baixo cobriria o botão acrescentado.
  await page.evaluate(() => document.querySelector("#fired").click())
  await settle(page)
  await page.evaluate(() => document.querySelector("#fired")?.remove())
}

// ---------- fixtures ----------
const ISO = `const iso=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};`
// Pedido meu (mk) e propostas (pr); A, B, C, D são empresas de exemplo da cidade da pessoa.
const REQ = `${ISO}
const pr=(id,bizId,status,over={})=>({id,bizId,price:{kind:'fixed',min:300,max:null},date:iso(2),validUntil:iso(7),duration:'1 dia',msg:'Atendemos o bairro com material incluso.',status,at:Date.now()-36e5,...over});
const mk=(id,over)=>({id,city:s.homeCity,cat:'Casa e reparos',spec:null,hood:'Centro',desc:'Preciso de um eletricista para trocar a fiação do quarto, com material incluso.',when:{kind:'asap',date:null},photos:[],status:'open',createdAt:Date.now()-36e5,expiresAt:Date.now()+5*864e5,who:s.profile.name,mine:true,proposals:[],...over});
const [A,B,C,D]=s.biz.filter(b=>b.city===s.homeCity&&b.claimed!==false);s.requests=[];`
const REPORT_PROPOSAL = (id) =>
  `s.reports=[{id:'rp-65',type:'proposal',target:'${id}',reason:'fraud',details:'',at:Date.now()-36e5,status:'open'}];`
// A página da pessoa (a de Jorge Eletricista, assumida), como no fluxo "Sou o responsável".
const MY_BIZ = `const b=s.biz.find(x=>x.id==='${BIZ}');s.myBiz={...b,spon:false,mine:true,live:true,claimed:true,owner:'Rafael Souza · responsável de teste'};s.biz=s.biz.filter(x=>x.id!=='${BIZ}');`
const SPOT = (tier) =>
  `s.subscription={tier:'${tier}',month:iso(0).slice(0,7),repliedThreadIds:[],boosts:0,spot:{from:Date.now(),until:Date.now()+7*864e5,bizId:s.myBiz.id}};`
const SIX_THREADS = `s.threads=[...[1,2,3,4,5,6].map(n=>({id:'t-r65-'+n,who:['Marina L.','Caio R.','Helena P.','Otávio S.','Bianca F.','Lúcio M.'][n-1],ini:'XX',city:s.homeCity,about:{type:'biz',id:s.myBiz.id},snapshot:{title:s.myBiz.name,city:s.homeCity},msgs:[{me:false,t:'Olá! Atendem no meu bairro?',at:Date.now()-n*1e5}],unread:true,updatedAt:Date.now()-n*1e5})),...s.threads];`

// ---------- Painel ----------
const queueId = (page, prefix) =>
  page
    .locator(`#main [data-action="owner-review"][data-value^="${prefix}"]`)
    .first()
    .getAttribute("data-value")
async function decide(page, prefix, d, reason = "golpe") {
  await go(page, "dono/filas")
  await page.locator('#main [data-action="owner-status"][data-value="open"]').click()
  await settle(page)
  const id = await queueId(page, prefix)
  expect(!!id, `sem a denúncia ${prefix} na fila`)
  await page.locator(`#main [data-action="owner-review"][data-value="${id}"]`).click()
  await settle(page)
  if (reason) await choose(page, "owner-reason", reason)
  await page.locator(`#dialog [data-action="owner-decide"][data-value="${id}~${d}"]`).click()
  await settle(page)
  return id
}
async function undoDecision(page, id) {
  await go(page, "dono/filas")
  await page.locator('#main [data-action="owner-status"][data-value="done"]').click()
  await settle(page)
  await page.locator(`#main [data-action="owner-undo"][data-value="${id}"]`).click()
  await settle(page)
}

// ---------- conta e página ----------
async function deleteMyPage(page) {
  await go(page, `negocio/${BIZ}`)
  await action(page, "biz-menu", BIZ)
  await page.locator('#create-menu [data-action="delete-biz"]').click()
  await page.waitForFunction(() => document.querySelector("#confirm-dialog")?.open)
  await settle(page)
  await confirmOk(page)
  await page.waitForFunction(() => window.Bivaque.inspect().route.name === "voce")
}
// "Sou o responsável" numa página de exemplo ainda não assumida: cria a página nova da pessoa (e fecha o editor).
async function claimPage(page, id) {
  await patchState(page, `s.biz.find(x=>x.id==='${id}').claimed=false;`)
  await go(page, `negocio/${id}`)
  await action(page, "claim-biz", id)
  await page.locator('#dialog [data-action="confirm-claim"]').click()
  await settle(page)
  await page.locator('#dialog [data-action="close-dialog"]').first().click()
  await settle(page)
  // Fechar o editor não redesenha a página aberta: sai e volta, como a pessoa faria.
  await go(page, "voce")
}
async function deleteAccount(page) {
  await go(page, "apagar-conta")
  await fill(page, "delete-word", "APAGAR")
  await page.locator('[data-action="account-delete"]').click()
  await settle(page)
}

const checkpoints = {
  // ---- 1: proposta removida pelo Painel ----
  async "panel-removal-of-the-chosen-proposal-returns-the-other-valid-ones"(page) {
    await patchState(
      page,
      `${REQ}D.paused=true;
       s.requests=[
        mk('r-65',{status:'chosen',chosen:'p1',proposals:[pr('p1',A.id,'chosen'),pr('p2',B.id,'declined'),pr('p3',C.id,'declined',{validUntil:iso(-1)}),pr('p4',D.id,'declined')]}),
        mk('r-65-open',{proposals:[pr('o1',A.id,'sent'),pr('o2',B.id,'declined')]})];
       ${REPORT_PROPOSAL("p1")}`,
    )
    // "Escolher" só aparece em proposta enviada: a recusada de um pedido aberto não tem o botão.
    await go(page, "pedido/r-65-open")
    expect(
      (await count(page, '#main [data-action="choose-proposal"]')) === 1,
      "a proposta recusada oferece 'Escolher'",
    )
    await decide(page, "report:proposal|p1:", "remove")
    const r = await req(page, "r-65")
    expect(r.status === "open" && !r.chosen && !r.threadId, `o pedido não reabriu: ${r.status}`)
    expect(proposal(r, "p1").status === "removed", "a proposta não foi removida")
    expect(proposal(r, "p2").status === "sent", "a outra proposta válida não voltou à lista")
    expect(proposal(r, "p3").status === "declined", "voltou a proposta vencida")
    expect(proposal(r, "p4").status === "declined", "voltou a proposta de página pausada")
    await go(page, "pedido/r-65")
    const buttons = await page
      .locator('#main [data-action="choose-proposal"]')
      .evaluateAll((els) => els.map((e) => e.dataset.value))
    expect(
      buttons.join() === "r-65|p2",
      `'Escolher' deveria aparecer só na proposta válida: ${buttons}`,
    )
  },
  async "panel-removal-does-not-reopen-a-done-request"(page) {
    await patchState(
      page,
      `${REQ}
       s.requests=[mk('r-65-done',{status:'done',chosen:'d1',doneAt:Date.now()-1e5,proposals:[pr('d1',A.id,'chosen'),pr('d2',B.id,'declined')]})];
       ${REPORT_PROPOSAL("d1")}`,
    )
    await decide(page, "report:proposal|d1:", "remove")
    const r = await req(page, "r-65-done")
    expect(proposal(r, "d1").status === "removed", "a proposta não foi removida")
    expect(r.status === "done", `reabriu o pedido concluído: ${r.status}`)
    expect(proposal(r, "d2").status === "declined", "devolveu proposta a um pedido concluído")
    await go(page, "pedido/r-65-done")
    expect(/Concluído/.test(await mainText(page)), "o pedido concluído mudou de estado na tela")
  },

  // ---- 2: Desfazer no Painel ----
  async "panel-undo-only-restores-while-the-request-is-as-the-decision-left-it"(page) {
    await patchState(
      page,
      `${REQ}
       s.requests=[mk('r-65',{status:'chosen',chosen:'p1',proposals:[pr('p1',A.id,'chosen'),pr('p2',B.id,'declined')]})];
       ${REPORT_PROPOSAL("p1")}`,
    )
    // desfazer logo depois: tudo volta como era
    const id = await decide(page, "report:proposal|p1:", "remove")
    expect((await req(page, "r-65")).status === "open", "a remoção não reabriu o pedido")
    await undoDecision(page, id)
    let r = await req(page, "r-65")
    expect(
      r.status === "chosen" && r.chosen === "p1" && proposal(r, "p1").status === "chosen",
      `o desfazer não restaurou a escolha: ${r.status}`,
    )
    expect(
      proposal(r, "p2").status === "declined",
      "a outra proposta ficou enviada depois do desfazer",
    )
    // remove de novo, a pessoa escolhe a outra proposta, e o desfazer passa a ser recusado
    await decide(page, "report:proposal|p1:", "remove")
    await go(page, "pedido/r-65")
    await page.locator('[data-action="choose-proposal"][data-value="r-65|p2"]').click()
    await settle(page)
    await confirmOk(page)
    r = await req(page, "r-65")
    expect(r.status === "chosen" && r.chosen === "p2", "a nova escolha não foi salva")
    await undoDecision(page, id)
    expect(/já mudou/.test(await toast(page)), `sem aviso de recusa: ${await toast(page)}`)
    r = await req(page, "r-65")
    expect(r.chosen === "p2" && r.status === "chosen", "o desfazer mexeu na escolha nova")
    expect(proposal(r, "p1").status === "removed", "o desfazer devolveu a proposta removida")
    expect(!!(await stored(page)).owner.decisions[id], "a decisão saiu da lista mesmo recusada")
  },

  // ---- 3: página fechada nas propostas ----
  async "suspended-paused-or-deleted-page-proposals-cannot-be-chosen"(page) {
    await patchState(
      page,
      `${REQ}A.suspended=true;B.paused=true;
       s.requests=[mk('r-65',{proposals:[pr('s1',A.id,'sent'),pr('s2',B.id,'sent'),pr('s3',C.id,'sent'),pr('s4','b-gone','sent')]})];`,
    )
    await go(page, "pedido/r-65")
    const buttons = await page
      .locator('#main [data-action="choose-proposal"]')
      .evaluateAll((els) => els.map((e) => e.dataset.value))
    expect(buttons.join() === "r-65|s3", `'Escolher' deveria aparecer só em s3: ${buttons}`)
    for (const [pid, reason] of [
      ["s1", /não está recebendo/],
      ["s2", /não está recebendo/],
      ["s4", /não existe mais/],
    ]) {
      await fire(page, "choose-proposal", `r-65|${pid}`)
      expect(reason.test(await toast(page)), `${pid}: aviso errado: ${await toast(page)}`)
      expect((await dialogKind(page)) === null, `${pid}: abriu a confirmação da escolha`)
      expect((await req(page, "r-65")).status === "open", `${pid}: o pedido foi escolhido`)
    }
  },
  async "give-up-does-not-bring-back-proposals-of-closed-pages"(page) {
    await patchState(
      page,
      `${REQ}A.suspended=true;
       s.requests=[mk('r-65',{status:'chosen',chosen:'g1',proposals:[pr('g1',C.id,'chosen'),pr('g2',A.id,'declined'),pr('g3','b-gone','declined'),pr('g4',D.id,'declined')]})];`,
    )
    await go(page, "pedido/r-65")
    await action(page, "give-up-proposal", "r-65")
    await confirmOk(page)
    const r = await req(page, "r-65")
    expect(r.status === "open" && !r.chosen, `o pedido não reabriu: ${r.status}`)
    expect(proposal(r, "g4").status === "sent", "a proposta válida não voltou")
    expect(proposal(r, "g2").status === "declined", "voltou a proposta de página suspensa")
    expect(proposal(r, "g3").status === "declined", "voltou a proposta de página excluída")
    expect(/1 proposta/.test(await toast(page)), `aviso: ${await toast(page)}`)
  },
  async "deleting-the-page-withdraws-open-and-declined-proposals-and-the-sponsorship"(page) {
    await patchState(
      page,
      `${MY_BIZ}${REQ}${SPOT("moment")}
       const mine=s.myBiz.id,other=[A,B,C,D].find(b=>b.id!==mine);
       s.requests=[
        mk('t-open',{mine:false,who:'Família Andrade',cat:s.myBiz.cat,proposals:[pr('x1',mine,'sent'),pr('x2',mine,'declined')]}),
        mk('t-chosen',{mine:false,who:'Carla M.',status:'chosen',chosen:'y1',cat:s.myBiz.cat,proposals:[pr('y1',other.id,'chosen'),pr('y2',mine,'declined')]}),
        mk('t-done',{mine:false,who:'Carla M.',status:'done',chosen:'z1',cat:s.myBiz.cat,proposals:[pr('z1',other.id,'chosen'),pr('z2',mine,'declined')]})];`,
    )
    await deleteMyPage(page)
    const s = await stored(page)
    expect(s.myBiz === null, "a página não foi excluída")
    const status = (rid, pid) =>
      proposal(
        s.requests.find((r) => r.id === rid),
        pid,
      ).status
    expect(status("t-open", "x1") === "withdrawn", "a proposta enviada não saiu")
    expect(status("t-open", "x2") === "withdrawn", "a recusada de pedido aberto ficou")
    expect(status("t-chosen", "y2") === "withdrawn", "a recusada de pedido escolhido ficou")
    expect(status("t-chosen", "y1") === "chosen", "mexeu na proposta de outra empresa")
    expect(status("t-done", "z2") === "declined", "mexeu no histórico de pedido concluído")
    expect(!s.subscription.spot, "o patrocínio sobrou depois da exclusão")
  },
  async "suspended-or-paused-page-does-not-see-new-requests-or-propose"(page) {
    await patchState(
      page,
      `${MY_BIZ}${REQ}
       s.requests=[mk('t-new',{mine:false,who:'Família Andrade',cat:s.myBiz.cat,hood:'Outro bairro'})];`,
    )
    await go(page, "pedidos")
    expect(
      (await count(page, '#main [data-action="open-request"][data-value="t-new"]')) === 1,
      "a página aberta não vê o pedido (a fixture está errada)",
    )
    for (const [flag, reason] of [
      ["suspended", /suspensa/],
      ["paused", /pausada/],
    ]) {
      await patchState(page, `s.myBiz.suspended=false;s.myBiz.paused=false;s.myBiz.${flag}=true;`)
      await go(page, "pedidos")
      expect(
        (await count(page, '#main [data-action="open-request"][data-value="t-new"]')) === 0,
        `${flag}: a página ainda vê o pedido novo`,
      )
      await fire(page, "propose", "t-new")
      expect(reason.test(await toast(page)), `${flag}: aviso errado: ${await toast(page)}`)
      expect((await dialogKind(page)) === null, `${flag}: abriu o editor da proposta`)
    }
  },
  async "chat-with-provider-opens-the-chosen-thread-or-explains-why-not"(page) {
    await patchState(
      page,
      `${REQ}A.suspended=true;
       s.threads.unshift({id:'t-65',who:A.name,ini:'XX',city:s.homeCity,about:{type:'biz',id:A.id},snapshot:{title:A.name,city:s.homeCity},msgs:[{me:true,t:'Olá! Escolhi sua proposta.',at:Date.now()-1e5}],unread:false,updatedAt:Date.now()-1e5});
       s.requests=[mk('r-65',{status:'chosen',chosen:'c1',threadId:'t-65',proposals:[pr('c1',A.id,'chosen')]}),
        mk('r-65-gone',{status:'chosen',chosen:'c2',threadId:null,proposals:[pr('c2','b-gone','chosen')]})];`,
    )
    const threads = (await stored(page)).threads.length
    // a conversa da escolha abre mesmo com a página suspensa depois
    await go(page, "pedido/r-65")
    await action(page, "chat-provider", "r-65")
    const route = await routeOf(page)
    expect(route.name === "conversa" && route.id === "t-65", `abriu ${route.name}/${route.id}`)
    expect((await stored(page)).threads.length === threads, "criou outra conversa")
    // sem conversa e sem página: explica, sem abrir nada
    await go(page, "pedido/r-65-gone")
    await action(page, "chat-provider", "r-65-gone")
    expect(/não existe mais/.test(await toast(page)), `aviso: ${await toast(page)}`)
    expect((await routeOf(page)).name === "pedido", "navegou sem conversa")
    expect((await stored(page)).threads.length === threads, "criou conversa com página excluída")
  },

  // ---- 4: Patrocinado e suspensão presos à conta ----
  async "sponsorship-belongs-to-the-page-that-activated-it"(page) {
    await patchState(page, `${ISO}${MY_BIZ}${SPOT("moment")}`)
    await go(page, `negocio/${BIZ}`)
    expect(
      /^patrocinado/i.test(await page.locator(".detail-hero .pill").innerText()),
      "a página com destaque ativo não aparece como Patrocinado",
    )
    await deleteMyPage(page)
    expect(!(await stored(page)).subscription.spot, "excluir a página não zerou o patrocínio")
    // um patrocínio guardado de outra página não vale para a página nova
    await patchState(
      page,
      `s.subscription.spot={from:Date.now(),until:Date.now()+${7 * DAY},bizId:'b-old'};`,
    )
    await claimPage(page, "b9")
    expect((await stored(page)).myBiz?.id === "b9", "a página nova não foi criada")
    await go(page, "negocio/b9")
    expect(
      !/patrocinado/i.test(await page.locator(".detail-hero .pill").innerText()),
      "a página nova herdou o patrocínio",
    )
  },
  async "suspension-stays-on-the-account-when-the-page-is-deleted-and-recreated"(page) {
    await patchState(page, `${MY_BIZ}s.myBiz.suspended=true;`)
    await go(page, `negocio/${BIZ}`)
    expect(/suspensa pela moderação/.test(await mainText(page)), "a fixture não está suspensa")
    await deleteMyPage(page)
    expect((await stored(page)).bizSuspended === true, "a suspensão não ficou na conta")
    await claimPage(page, "b9")
    const s = await stored(page)
    expect(s.myBiz?.id === "b9" && s.myBiz.suspended === true, "a página nova não nasceu suspensa")
    await go(page, "negocio/b9")
    expect(
      /suspensa pela moderação/.test(await mainText(page)),
      "a página nova não mostra a suspensão",
    )
  },

  // ---- 5: planos ----
  async "moment-plan-keeps-the-five-new-conversations-limit"(page) {
    await patchState(
      page,
      `${ISO}${MY_BIZ}${SIX_THREADS}${SPOT("moment")}s.subscription.repliedThreadIds=['x1','x2','x3','x4','x5'];`,
    )
    await go(page, `negocio/${BIZ}`)
    expect(
      /5 de 5 conversas novas respondidas/.test(await mainText(page)),
      "o destaque de momento não mostra o limite de conversas",
    )
    const reply = async (n) => {
      await go(page, `conversa/t-r65-${n}`)
      await fill(page, "chat-input", "Olá! Atendemos sim.")
      await action(page, "send-message", `t-r65-${n}`)
    }
    const msgs = async (n) => (await stored(page)).threads.find((t) => t.id === `t-r65-${n}`).msgs
    await reply(6)
    expect((await msgs(6)).length === 1, "enviou a sexta conversa nova no destaque de momento")
    expect((await dialogKind(page)) === "plan-limit", "sem o aviso do limite")
    expect(/Plano do negócio/.test(await dialogText(page)), "o aviso não aponta o plano sem limite")
    await action(page, "close-dialog")
    await go(page, `negocio/${BIZ}`)
    await action(page, "plans")
    await page.locator('#dialog md-radio[value="plan"]').click()
    await action(page, "activate-plan")
    expect(/Conversas novas sem limite/.test(await mainText(page)), "o plano não é ilimitado")
    await reply(6)
    expect((await msgs(6)).length === 2, "o Plano do negócio não liberou a sexta conversa")
  },
  async "back-to-free-ends-the-boost-even-with-a-paused-or-suspended-page"(page) {
    await patchState(page, MY_BIZ)
    for (const flag of ["paused", "suspended"]) {
      await patchState(
        page,
        `${ISO}${SPOT("moment")}s.myBiz.paused=false;s.myBiz.suspended=false;s.myBiz.${flag}=true;`,
      )
      await go(page, `negocio/${BIZ}`)
      await action(page, "plans")
      // os planos pagos continuam pedindo página aberta
      await page.locator('#dialog md-radio[value="plan"]').click()
      await action(page, "activate-plan")
      expect(/página/.test(await toast(page)), `${flag}: plano pago sem página aberta`)
      expect((await stored(page)).subscription.tier === "moment", `${flag}: trocou de plano`)
      await page.locator('#dialog md-radio[value="free"]').click()
      await action(page, "activate-plan")
      const sub = (await stored(page)).subscription
      expect(sub.tier === "free", `${flag}: não voltou ao Grátis`)
      expect(!sub.spot, `${flag}: o destaque continuou em andamento`)
      expect(/destaque terminou/.test(await toast(page)), `${flag}: aviso: ${await toast(page)}`)
    }
  },

  // ---- 6: apagar a conta ----
  async "delete-account-clears-blocks-reports-offers-and-names-in-the-panel"(page) {
    await patchState(
      page,
      `${MY_BIZ}${REQ}
       const own=s.profile.name,other=[A,B,C,D].find(b=>b.id!==s.myBiz.id);
       s.blocked=[{name:'Ana P.',at:Date.now()}];
       s.reports=[{id:'rp-65',type:'ask',target:s.asks[0].id,reason:'abuse',label:'x',details:'Texto digitado r65 sobre golpe',at:Date.now(),status:'open'}];
       s.bizSuspended=true;
       s.owner={decisions:{'dec-65':{d:'dismiss',reason:'',at:Date.now()-1e5,title:'Resposta de '+own+' · “oi”',kind:'report',city:''}},log:[{at:Date.now()-1e5,text:'Resposta de '+own+' · “oi”: dispensado'}]};
       s.asks.unshift({id:'q-65',q:'Pergunta r65 que vira publicação?',city:s.homeCity,who:own,ini:'RS',mine:true,topic:'Saúde',ctx:'x',status:'open',when:'agora',createdAt:Date.now(),following:true,answers:[]});
       const g=s.groups.find(x=>x.id==='g-familias');
       g.offerAt={[own]:Date.now()-864e5,'Outra Pessoa':Date.now()-864e5};
       g.posts.unshift({id:'p-65-offer',type:'offer',author:own,ini:'RS',text:'Oferta r65 do meu negócio',at:Date.now()-36e5,comments:[],useful:0,liked:false,mine:true,biz:s.myBiz.id},
        {id:'p-65-q',type:'question',author:'Mônica L.',ini:'ML',text:'Pergunta de grupo r65',at:Date.now()-72e5,comments:[],useful:0,liked:false,mine:false,alsoCity:'q-65'});
       s.requests=[mk('r-t',{mine:false,who:'Família Andrade',cat:s.myBiz.cat,proposals:[pr('t1',s.myBiz.id,'sent'),pr('t2',s.myBiz.id,'declined')]}),
        mk('r-t2',{mine:false,who:'Carla M.',status:'chosen',chosen:'t3',cat:s.myBiz.cat,proposals:[pr('t3',other.id,'chosen'),pr('t4',s.myBiz.id,'declined')]})];`,
    )
    await deleteAccount(page)
    const s = await stored(page)
    expect(s.signedOut === true, "não saiu da conta")
    expect((s.blocked || []).length === 0, "sobraram bloqueios")
    expect((s.reports || []).length === 0, "sobraram denúncias")
    expect(!s.bizSuspended, "sobrou a suspensão da conta")
    const g = s.groups.find((x) => x.id === "g-familias")
    expect(!g.offerAt?.["Rafael Souza"], "sobrou o prazo de oferta da pessoa")
    expect(!!g.offerAt?.["Outra Pessoa"], "apagou o prazo de oferta de outra pessoa")
    expect(!g.posts.some((p) => p.id === "p-65-offer"), "sobrou a oferta da página")
    expect(
      !("alsoCity" in g.posts.find((p) => p.id === "p-65-q")),
      "sobrou alsoCity de pergunta apagada",
    )
    expect(
      s.requests.find((r) => r.id === "r-t").proposals.every((p) => p.status === "withdrawn"),
      "sobraram propostas da página em pedido de terceiros",
    )
    const t2 = s.requests.find((r) => r.id === "r-t2")
    expect(proposal(t2, "t4").status === "withdrawn", "sobrou a recusada em pedido escolhido")
    expect(proposal(t2, "t3").status === "chosen", "mexeu na proposta de outra empresa")
    expect(
      s.owner.decisions["dec-65"].title.includes("Membro que saiu") &&
        s.owner.log[0].text.includes("Membro que saiu"),
      "o Painel ainda traz o nome da pessoa",
    )
    const dump = JSON.stringify(s)
    for (const gone of ["Rafael Souza", "Texto digitado r65"])
      expect(!dump.includes(gone), `sobrou "${gone}"`)
  },
  async "delete-account-hands-the-group-over-or-closes-it-and-keeps-the-base-totals"(page) {
    await patchState(
      page,
      `${ISO}
       const fut=s.groups.find(x=>x.id==='g-futebol');fut.role='admin';fut.mods=['Renato A.','Paulo X.'];
       const fam=s.groups.find(x=>x.id==='g-familias');fam.role='admin';fam.on=true;fam.mods=[];fam.pending=false;fam.requests=[{name:'Fulana T.',note:'Quer entrar'}];
       fam.posts.unshift({id:'p-65-poll',type:'poll',author:'Ana P.',ini:'AP',text:'Enquete alheia r65',at:Date.now()-72e5,comments:[],useful:0,liked:false,mine:false,poll:{options:[['A',2],['B',4]],voted:1}},
        {id:'p-65-ev',type:'event',author:'Paulo R.',ini:'PR',text:'Encontro alheio r65',at:Date.now()-72e5,comments:[],useful:0,liked:false,mine:false,event:{date:iso(6),time:'09:00',place:'Praça',going:12,on:true}});`,
    )
    await deleteAccount(page)
    const s = await stored(page)
    const fut = s.groups.find((x) => x.id === "g-futebol")
    expect(fut.role === null && !fut.closedAt, "o grupo com moderador foi encerrado")
    expect(
      fut.admin === "Renato A.",
      `a administração não passou ao primeiro moderador: ${fut.admin}`,
    )
    expect(fut.mods.join() === "Paulo X.", `moderadores: ${fut.mods}`)
    const fam = s.groups.find((x) => x.id === "g-familias")
    expect(typeof fam.closedAt === "number", "o grupo sem moderador não foi encerrado")
    expect(
      fam.requests.length === 0 && !fam.pending,
      "o grupo encerrado manteve pedidos de entrada",
    )
    const poll = fam.posts.find((p) => p.id === "p-65-poll").poll
    expect(poll.voted === null, "o voto da pessoa ficou")
    expect(
      poll.options[0][1] === 2 && poll.options[1][1] === 4,
      `o total-base mudou: ${poll.options}`,
    )
    const ev = fam.posts.find((p) => p.id === "p-65-ev").event
    expect(ev.on === false && ev.going === 12, `presença: on ${ev.on}, going ${ev.going}`)
  },

  // ---- 7: chamados sem conta ----
  async "tickets-without-an-account-show-only-the-confirmation"(page) {
    await patchState(page, "s.signedOut=true;")
    await go(page, "ajuda")
    expect(
      (await count(page, '#main [data-action="support-open"][data-value="chamados"]')) === 0,
      "Ajuda sem conta oferece Meus chamados",
    )
    await go(page, "chamados")
    expect((await routeOf(page)).name === "ajuda", "Meus chamados abriu sem conta")
    await go(page, "contato")
    await fill(page, "support-text", "Não consigo entrar com meu e-mail novo.")
    await fill(page, "support-email", "visita@exemplo.com")
    await page.locator('[data-action="support-send"]').click()
    await settle(page)
    expect(((await stored(page)).tickets || []).length === 1, "o chamado não foi guardado")
    expect((await routeOf(page)).name === "contato", "foi para Meus chamados")
    const text = await mainText(page)
    expect(/Recebemos/.test(text), "sem a confirmação")
    expect(!text.includes("Não consigo entrar"), "mostrou o chamado de volta")
    await page.locator('#main [data-action="support-open"][data-value="ajuda"]').click()
    await settle(page)
    expect((await routeOf(page)).name === "ajuda", "a confirmação não volta à Ajuda")
  },
  async "tickets-with-an-account-still-open-my-tickets"(page) {
    await snapshot(page)
    await go(page, "ajuda")
    expect(
      (await count(page, '#main [data-action="support-open"][data-value="chamados"]')) === 1,
      "Ajuda com conta perdeu Meus chamados",
    )
    await go(page, "chamados")
    expect((await routeOf(page)).name === "chamados", "Meus chamados não abriu com conta")
    await go(page, "contato")
    await fill(page, "support-text", "Quero trocar o e-mail da minha conta.")
    await page.locator('[data-action="support-send"]').click()
    await settle(page)
    expect((await routeOf(page)).name === "chamados", "o envio com conta não levou a Meus chamados")
    expect((await mainText(page)).includes("Quero trocar o e-mail"), "o chamado não aparece")
  },
}

await runProof(checkpoints, "round65")
