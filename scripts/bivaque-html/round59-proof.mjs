import {
  action,
  confirmOk,
  dialogKind,
  dismissPushAsk,
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

// Rodada 59 (AUDITORIA_FUNCIONAL_2026-10-18, item C): quem publicou edita e exclui o que publicou.
// Perguntas, respostas, publicações e comentários de grupo e encontros. O menu ⋮ só existe para o
// autor. Um checkpoint por comportamento. Fixtures entram pelo armazenamento (`patchState`, que
// recarrega); o que a prova pode criar pela tela, cria (a pergunta, a publicação e o comentário).
const QID = "q-r59"
const GID = "g-familias"
const QTEXT = "Onde encontro professor de xilofone aos sábados?"

// Minha pergunta com três respostas: duas de outras pessoas (uma cita o negócio b9) e uma minha.
const MY_ASK = `s.asks.unshift({id:'q-r59',q:'${QTEXT}',city:s.homeCity,who:s.profile.name,ini:'RS',mine:true,topic:s.homeCity,ctx:'Pergunta de um membro da cidade',status:'open',when:'agora',createdAt:Date.now(),following:true,answers:[{id:'a-r59-1',who:'Jéssica L.',ini:'JL',t:'A Dra. Helena atende sábado até 12h.',helped:0,solved:false,biz:'b9'},{id:'a-r59-2',who:'Mônica L.',ini:'ML',t:'Também recomendo a clínica da esquina.',helped:0,solved:false},{id:'a-r59-m',who:s.profile.name,ini:'RS',t:'Eu fui na clínica da esquina e gostei.',mine:true,helped:0,solved:false}]});s.notices.unshift({id:'n-r59',city:s.homeCity,unread:true,text:'Chegou uma resposta à sua pergunta.',go:['pergunta','q-r59'],when:'Agora'});s.lastViewed={type:'ask',id:'q-r59',city:s.homeCity}`
// Publicações minhas no grupo: texto, enquete sem votos, enquete com votos e encontro com 3 confirmados.
const MY_POSTS = `const g=s.groups.find(x=>x.id==='g-familias');const mk=(id,type,text,extra)=>({id,type,author:s.profile.name,ini:'RS',text,at:Date.now()-36e5,comments:[],useful:0,liked:false,mine:true,...extra});g.posts.unshift(mk('p-r59-note','post','Dica: o pediatra do Parque 10 atende sábado.'),mk('p-r59-poll0','poll','Qual horário para o treino de domingo?',{poll:{options:[['7h',0],['8h',0]],voted:null}}),mk('p-r59-poll1','poll','Qual sabor de bolo para a festa?',{poll:{options:[['Chocolate',3],['Cenoura',2]],voted:0}}),mk('p-r59-event','event','Piquenique das famílias',{event:{date:a,time:'09:00',place:'Praça da Saudade',going:3,on:true}}))`
// Minha pergunta no grupo, com um comentário meu que resolveu e marcou o negócio b9.
const MY_QUESTION_POST = `const g=s.groups.find(x=>x.id==='g-familias');const b=s.biz.find(x=>x.id==='b9');b.recN=(b.recN||0)+1;g.posts.unshift({id:'p-r59-q',type:'question',author:s.profile.name,ini:'RS',text:'Alguém indica dentista infantil?',at:Date.now()-36e5,useful:0,liked:false,mine:true,resolved:true,comments:[{id:'c-r59-1',author:'Ana P.',ini:'AP',text:'Pergunte na Sorriso Kids.',at:Date.now()-3e5},{id:'c-r59-m',author:s.profile.name,ini:'RS',text:'A Sorriso Kids atende sábado.',biz:'b9',solved:true,mine:true,at:Date.now()-2e5}]})`
const OTHER_ANSWER = (q) =>
  `const q=s.asks.find(x=>x.id==='${q}');q.answers.push({id:'a-r59-o',who:s.profile.name,ini:'RS',t:'Eu indico a escola da esquina.',mine:true,helped:0,solved:false})`
const MY_EVENT = `s.events.unshift({id:'e-r59',title:'Churrasco da turma de outubro',date:a,time:'18:00',place:'Praça da Saudade',city:s.homeCity,description:'Churrasco de integração da turma que chegou em outubro.',mine:true,on:true,going:4,max:null,createdAt:Date.now()})`

const mainText = (page) => page.locator("#main").innerText()
const confirmText = (page) => page.locator("#confirm-dialog").innerText()
const askOf = async (page, id) => (await stored(page)).asks.find((a) => a.id === id)
const postOf = async (page, id, gid = GID) =>
  (await stored(page)).groups.find((g) => g.id === gid).posts.find((p) => p.id === id)
const field = (page, id) => page.locator(`#${id}`).evaluate((el) => el.value)
const count = (page, selector) => page.locator(selector).count()
const dayIso = (page, n) =>
  page.evaluate((k) => {
    const d = new Date()
    d.setDate(d.getDate() + k)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }, n)
// Edita o armazenamento (fixture) e recarrega.
async function patchState(page, src, arg) {
  await snapshot(page)
  await page.evaluate(
    ([k, code, a]) => {
      const s = JSON.parse(localStorage.getItem(k))
      new Function("s", "a", code)(s, a)
      localStorage.setItem(k, JSON.stringify(s))
    },
    [
      KEY,
      []
        .concat(src)
        .map((c) => `{${c}}`)
        .join(";"),
      arg,
    ],
  )
  await reload(page)
}
// Abre o ⋮ (barra ou cartão) e toca num item do menu.
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
// A primeira pergunta de outra pessoa na cidade, ainda aberta.
async function otherQuestion(page) {
  const s = await snapshot(page)
  const q = s.asks.find((a) => !a.mine && a.city === s.homeCity && !a.hidden && a.status === "open")
  expect(q, "sem pergunta de outra pessoa nos dados de exemplo")
  return q.id
}

const checkpoints = {
  // ---- Pergunta: menu ⋮ do autor (quadro 1) ----
  async "ask-menu-has-the-four-options-for-the-author"(page) {
    // Cria a pergunta pela tela: quem publicou vê o ⋮.
    await go(page, "comunidade")
    await action(page, "ask")
    await fill(page, "ask-input", QTEXT)
    await action(page, "submit-ask")
    await dismissPushAsk(page)
    const r = await routeOf(page)
    expect(r.name === "pergunta" && r.id, `a pergunta publicada não abriu: ${r.name}`)
    expect(
      (await stored(page)).asks.filter((a) => a.id === r.id).length === 1,
      "id da pergunta repetido",
    )
    expect((await count(page, '#topbar [data-action="question-menu"]:visible')) === 1, "sem o ⋮")
    await openMenu(page, "question-menu", r.id)
    expect(
      JSON.stringify(await menuLabels(page)) ===
        JSON.stringify([
          "Editar pergunta",
          "Marcar como resolvida",
          "Compartilhar",
          "Excluir pergunta",
        ]),
      `rótulos do menu: ${await menuLabels(page)}`,
    )
    const icons = (await page.locator("#create-menu md-icon").allInnerTexts()).map((t) => t.trim())
    expect(
      JSON.stringify(icons) === JSON.stringify(["edit", "check_circle", "share", "delete"]),
      `ícones do menu: ${icons}`,
    )
    expect((await count(page, "#create-menu .danger-action")) === 1, "só Excluir é perigoso")
    expect(
      (await count(page, '#create-menu .danger-action[data-action="delete-question"]')) === 1,
      "o item perigoso não é o Excluir",
    )
    await page.keyboard.press("Escape")
    await settle(page)
    expect(await page.locator("#create-menu").isHidden(), "o menu não fechou")
  },
  async "menus-are-absent-on-content-from-other-people"(page) {
    const other = await otherQuestion(page)
    await go(page, `pergunta/${other}`)
    expect((await count(page, '[data-action="question-menu"]')) === 0, "⋮ na pergunta alheia")
    expect((await count(page, '[data-action="answer-menu"]')) === 0, "⋮ em resposta alheia")
    const s = await snapshot(page)
    const post = s.groups.find((g) => g.id === GID).posts.find((p) => p.comments.length)
    const date = await dayIso(page, 5)
    await go(page, `grupo/${GID}`)
    expect((await count(page, '[data-action="post-menu"]')) === 0, "⋮ em publicação alheia")
    await go(page, `publicacao/${GID}~${post.id}`)
    expect((await count(page, '[data-action="comment-menu"]')) === 0, "⋮ em comentário alheio")
    const agenda = s.events.find((e) => !e.mine && e.city === s.homeCity)
    await go(page, `evento/${agenda.id}`)
    expect(
      (await count(page, '[data-action="edit-event"], [data-action="delete-event"]')) === 0,
      "Editar ou Cancelar em encontro alheio",
    )
    // Com conteúdo meu junto do alheio, o ⋮ aparece só no meu.
    await patchState(page, [OTHER_ANSWER(other), MY_POSTS], date)
    await go(page, `pergunta/${other}`)
    expect((await count(page, '[data-action="answer-menu"]')) === 1, "⋮ só na minha resposta")
    expect(
      (await count(page, '.answer:has([data-action="answer-menu"]) .avatar.me')) === 1,
      "o ⋮ não está na resposta marcada como minha",
    )
    await go(page, `grupo/${GID}`)
    expect(
      (await count(page, '[data-action="post-menu"]:visible')) >= 1 &&
        (await count(page, '[data-action="post-menu"][data-value$="p-r59-note"]')) === 1,
      "sem ⋮ na minha publicação",
    )
    const others = s.groups.find((g) => g.id === GID).posts.filter((p) => !p.mine).length
    expect(
      (await count(page, '.gpost:not(:has(.avatar.me)) [data-action="post-menu"]')) === 0,
      `⋮ em alguma das ${others} publicações alheias`,
    )
  },
  // ---- Pergunta: editar, resolver, excluir ----
  async "edit-question-saves-in-the-same-record-and-marks-edited"(page) {
    await patchState(page, MY_ASK)
    await go(page, `pergunta/${QID}`)
    await pickMenu(page, "question-menu", QID, "edit-question")
    expect((await dialogKind(page)) === "editor", "Editar não abriu o editor")
    expect((await field(page, "edit-text")) === QTEXT, "o editor não veio preenchido")
    // Texto curto demais: nada muda e o editor continua aberto.
    await fill(page, "edit-text", "Xilofone?")
    await action(page, "save-question", QID)
    expect(/contexto/.test(await toast(page)), "sem o aviso de pergunta curta")
    expect((await askOf(page, QID)).q === QTEXT, "texto curto foi salvo")
    expect((await dialogKind(page)) === "editor", "o editor fechou com erro")
    await fill(page, "edit-text", "Onde encontro professor de violino aos sábados?")
    await action(page, "save-question", QID)
    expect(/Pergunta atualizada\./.test(await toast(page)), "sem o aviso de atualizada")
    const s = await stored(page)
    const mine = s.asks.filter((a) => a.id === QID)
    expect(mine.length === 1, "a edição criou outro registro")
    expect(mine[0].q === "Onde encontro professor de violino aos sábados?", "texto não salvo")
    expect(typeof mine[0].edited === "number", "sem a marca de editada")
    expect(
      mine[0].answers.length === 3 && mine[0].following === true && mine[0].mine === true,
      "a edição mexeu no resto do registro",
    )
    const body = await mainText(page)
    expect(/violino/.test(body) && /editada/.test(body), "a página não mostra o texto e 'editada'")
    expect((await routeOf(page)).id === QID, "saiu da pergunta ao salvar")
  },
  async "resolve-and-reopen-from-the-menu"(page) {
    await patchState(page, MY_ASK)
    await go(page, `pergunta/${QID}`)
    await pickMenu(page, "question-menu", QID, "toggle-question")
    expect(/marcada como resolvida/.test(await toast(page)), "sem aviso de resolvida")
    expect((await askOf(page, QID)).status === "ok", "não ficou resolvida")
    expect(/Resolvida/.test(await mainText(page)), "a página não mostra Resolvida")
    await openMenu(page, "question-menu", QID)
    expect((await menuLabels(page))[1] === "Reabrir pergunta", "o menu não oferece Reabrir")
    await page.locator('#create-menu [data-action="toggle-question"]').click()
    await settle(page)
    expect(/Pergunta reaberta/.test(await toast(page)), "sem aviso de reaberta")
    expect((await askOf(page, QID)).status === "open", "não reabriu")
  },
  async "delete-question-confirms-and-leaves-every-list"(page) {
    await patchState(page, MY_ASK)
    // Antes: aparece nas listas, na busca, na página do negócio e o aviso abre.
    const before = await page.evaluate((q) => window.Bivaque.search(q), "xilofone")
    expect(before.asks.includes(QID), "a pergunta não aparecia na busca antes de excluir")
    await go(page, "negocio/b9")
    expect((await mainText(page)).includes(QTEXT), "a página do negócio não citava a pergunta")
    await go(page, `pergunta/${QID}`)
    await pickMenu(page, "question-menu", QID, "delete-question")
    const text = await confirmText(page)
    expect(/Excluir pergunta\?/.test(text), "confirmação sem o título")
    expect(
      /A pergunta e as 3 respostas saem da comunidade\. Isso não pode ser desfeito\./.test(text),
      `texto da confirmação: ${text}`,
    )
    expect(
      (await page.locator("#confirm-dialog md-text-button").innerText()).trim() === "Cancelar" &&
        (await page.locator("#confirm-dialog md-filled-button.danger-fill").innerText()).trim() ===
          "Excluir",
      "botões da confirmação",
    )
    // Cancelar não exclui.
    await page.locator('#confirm-dialog [data-action="cancel-confirm"]').click()
    await settle(page)
    expect(!!(await askOf(page, QID)), "Cancelar excluiu a pergunta")
    await pickMenu(page, "question-menu", QID, "delete-question")
    await confirmOk(page)
    expect(/Pergunta excluída\./.test(await toast(page)), "sem o aviso de excluída")
    const s = await stored(page)
    expect(!s.asks.some((a) => a.id === QID), "a pergunta continua no armazenamento")
    expect(s.lastViewed === null || s.lastViewed?.id !== QID, "Retomar ainda aponta a pergunta")
    expect((await routeOf(page)).name === "comunidade", "não voltou à Comunidade")
    // Depois: some de todas as listas, da busca, da página do negócio; o aviso deixa de abrir.
    await page.locator('[data-action="question-filter"][data-value="mine"]').first().click()
    await settle(page)
    expect(
      (await count(page, `#main [data-action="open-question"][data-value="${QID}"]`)) === 0,
      "continua em Minhas",
    )
    const after = await page.evaluate((q) => window.Bivaque.search(q), "xilofone")
    expect(!after.asks.includes(QID), "a pergunta continua na busca")
    await go(page, "negocio/b9")
    expect(!(await mainText(page)).includes(QTEXT), "a página do negócio ainda cita a pergunta")
    await go(page, "inicio")
    await action(page, "notices")
    await page.locator('#dialog [data-action="notice-open"][data-value="n-r59"]').click()
    await settle(page)
    expect(
      /não está mais disponível/.test(await page.locator("#notice-status").innerText()),
      "o aviso da pergunta excluída ainda abre",
    )
    expect((await routeOf(page)).name === "inicio", "o aviso levou a uma página")
    await page.keyboard.press("Escape")
    await settle(page)
    await go(page, `pergunta/${QID}`)
    expect(/indispon/i.test(await mainText(page)), "o endereço antigo abre a pergunta")
  },
  // ---- Resposta minha ----
  async "edit-and-delete-my-answer-on-someone-elses-question"(page) {
    const other = await otherQuestion(page)
    await patchState(page, OTHER_ANSWER(other))
    await go(page, `pergunta/${other}`)
    const total = (await askOf(page, other)).answers.length
    const value = `${other}|a-r59-o`
    await pickMenu(page, "answer-menu", value, "edit-answer")
    expect(
      (await field(page, "edit-text")) === "Eu indico a escola da esquina.",
      "editor da resposta sem o texto",
    )
    await fill(page, "edit-text", "Eu indico a escola bilíngue da esquina.")
    await action(page, "save-answer", value)
    expect(/Resposta atualizada\./.test(await toast(page)), "sem o aviso de atualizada")
    const a = (await askOf(page, other)).answers.find((x) => x.id === "a-r59-o")
    expect(
      a.t === "Eu indico a escola bilíngue da esquina." && typeof a.edited === "number",
      "não salvou",
    )
    expect(/bilíngue/.test(await mainText(page)) && /editada/.test(await mainText(page)), "tela")
    await pickMenu(page, "answer-menu", value, "delete-answer")
    expect(/Excluir resposta\?/.test(await confirmText(page)), "confirmação sem título")
    await confirmOk(page)
    expect(/Resposta excluída\./.test(await toast(page)), "sem o aviso de excluída")
    const q = await askOf(page, other)
    expect(
      q.answers.length === total - 1 && !q.answers.some((x) => x.id === "a-r59-o"),
      "não removeu",
    )
    expect((await routeOf(page)).id === other, "saiu da pergunta ao excluir a resposta")
    expect(!(await mainText(page)).includes("bilíngue"), "a resposta excluída continua na tela")
  },
  async "deleting-the-solution-answer-puts-the-question-back-to-unsolved"(page) {
    await patchState(page, MY_ASK)
    await go(page, `pergunta/${QID}`)
    await action(page, "solve-question", `${QID}|a-r59-m`)
    let q = await askOf(page, QID)
    expect(q.status === "ok" && q.answers.find((x) => x.id === "a-r59-m").solved, "não resolveu")
    expect(/Resolvida/.test(await mainText(page)), "a página não mostra Resolvida")
    await pickMenu(page, "answer-menu", `${QID}|a-r59-m`, "delete-answer")
    expect(/volta a ficar sem solução/.test(await confirmText(page)), "a confirmação não avisa")
    await confirmOk(page)
    q = await askOf(page, QID)
    expect(q.answers.length === 2, "a resposta não saiu")
    expect(q.status === "open", `a pergunta continua ${q.status}`)
    expect(
      q.answers.every((x) => !x.solved),
      "sobrou resposta marcada como solução",
    )
    const body = await mainText(page)
    expect(/2 respostas/.test(body) && !/Resolvida/.test(body), "tela incoerente")
    expect((await count(page, ".answer.accepted")) === 0, "sobrou resposta destacada")
    // De volta a "sem solução": a pessoa pode marcar outra resposta.
    expect((await count(page, '[data-action="solve-question"]')) === 2, "sem Ajudou a resolver")
  },
  // ---- Publicação de grupo ----
  async "edit-and-delete-my-group-post"(page) {
    // Publica pela tela; edita; exclui.
    await go(page, `grupo/${GID}`)
    await action(page, "new-post")
    await fill(page, "post-text", "Dica: a feira do Parque 10 abre às 6h.")
    await action(page, "submit-post", GID)
    const pid = (await stored(page)).groups.find((g) => g.id === GID).posts[0].id
    expect(
      (await stored(page)).groups.find((g) => g.id === GID).posts.filter((p) => p.id === pid)
        .length === 1,
      "id da publicação repetido",
    )
    const value = `${GID}|${pid}`
    await openMenu(page, "post-menu", value)
    expect(
      JSON.stringify(await menuLabels(page)) ===
        JSON.stringify(["Editar publicação", "Excluir publicação"]),
      `rótulos: ${await menuLabels(page)}`,
    )
    await page.locator('#create-menu [data-action="edit-post"]').click()
    await settle(page)
    expect((await field(page, "edit-text")).startsWith("Dica: a feira"), "editor sem o texto")
    await fill(page, "edit-text", "Dica: a feira do Parque 10 abre às 5h30.")
    await action(page, "save-post", value)
    expect(/Publicação atualizada\./.test(await toast(page)), "sem o aviso de atualizada")
    let p = await postOf(page, pid)
    expect(p.text.endsWith("5h30.") && typeof p.edited === "number" && p.mine, "não salvou")
    expect(/editada/.test(await mainText(page)), "o cartão não mostra 'editada'")
    await pickMenu(page, "post-menu", value, "delete-post")
    const text = await confirmText(page)
    expect(/Excluir publicação\?/.test(text) && /Isso não pode ser desfeito/.test(text), text)
    await confirmOk(page)
    expect(/Publicação excluída\./.test(await toast(page)), "sem o aviso de excluída")
    p = await postOf(page, pid)
    expect(!p, "a publicação continua no grupo")
    expect(!(await mainText(page)).includes("feira do Parque 10"), "continua na tela")
  },
  // ---- Comentário ----
  async "edit-and-delete-my-comment-keeps-the-counters"(page) {
    const s = await snapshot(page)
    const post = s.groups
      .find((g) => g.id === GID)
      .posts.find((p) => p.comments.length && p.type === "question")
    const n = post.comments.length
    await go(page, `publicacao/${GID}~${post.id}`)
    await fill(page, "comment-input", "Eu também procurei e achei no Planalto.")
    await action(page, "send-comment", `${GID}|${post.id}`)
    let p = await postOf(page, post.id)
    const cid = p.comments.at(-1).id
    expect(p.comments.length === n + 1 && p.comments.at(-1).mine, "o comentário não foi publicado")
    expect(new RegExp(`${n + 1} comentários`).test(await mainText(page)), "contador na página")
    const value = `${GID}|${post.id}|${cid}`
    await openMenu(page, "comment-menu", value)
    expect(
      JSON.stringify(await menuLabels(page)) ===
        JSON.stringify(["Editar resposta", "Excluir resposta"]),
      `rótulos: ${await menuLabels(page)}`,
    )
    await page.locator('#create-menu [data-action="edit-comment"]').click()
    await settle(page)
    await fill(page, "edit-text", "Eu também procurei e achei no Planalto, perto da escola.")
    await action(page, "save-comment", value)
    expect(/Resposta atualizada\./.test(await toast(page)), "sem o aviso de atualizada")
    p = await postOf(page, post.id)
    expect(
      p.comments.length === n + 1 &&
        p.comments.at(-1).text.endsWith("da escola.") &&
        p.comments.at(-1).edited,
      "não salvou",
    )
    expect(/editado/.test(await mainText(page)), "o comentário não mostra 'editado'")
    await pickMenu(page, "comment-menu", value, "delete-comment")
    await confirmOk(page)
    expect(/Resposta excluída\./.test(await toast(page)), "sem o aviso de excluída")
    p = await postOf(page, post.id)
    expect(p.comments.length === n && !p.comments.some((c) => c.id === cid), "não removeu")
    expect(new RegExp(`${n} comentários`).test(await mainText(page)), "contador depois de excluir")
    await go(page, `grupo/${GID}`)
    expect(
      (await mainText(page)).includes(`${n} comentários`),
      "contador do feed depois de excluir",
    )
  },
  async "deleting-the-comment-that-solved-reopens-the-post-and-drops-the-indication"(page) {
    await patchState(page, MY_QUESTION_POST)
    const before = (await stored(page)).biz.find((b) => b.id === "b9").recN
    const value = `${GID}|p-r59-q|c-r59-m`
    await go(page, `publicacao/${GID}~p-r59-q`)
    expect(/Resolvida/.test(await mainText(page)), "a publicação de exemplo não está resolvida")
    await pickMenu(page, "comment-menu", value, "delete-comment")
    expect(/volta a ficar sem solução/.test(await confirmText(page)), "sem o aviso na confirmação")
    await confirmOk(page)
    const s = await stored(page)
    const p = s.groups.find((g) => g.id === GID).posts.find((x) => x.id === "p-r59-q")
    expect(p.comments.length === 1 && p.resolved === false, "a publicação continua resolvida")
    expect(s.biz.find((b) => b.id === "b9").recN === before - 1, "a indicação do negócio ficou")
    expect(!/Resolvida/.test(await mainText(page)), "a tela ainda diz Resolvida")
    expect((await count(page, '[data-action="solve-comment"]')) === 1, "sem Resolveu para o outro")
  },
  // ---- Enquete ----
  async "poll-text-edit-keeps-votes-and-locks-the-options"(page) {
    await patchState(page, MY_POSTS, await dayIso(page, 5))
    await go(page, `grupo/${GID}`)
    // Com votos: só o texto muda; as opções e os votos ficam.
    const voted = `${GID}|p-r59-poll1`
    await pickMenu(page, "post-menu", voted, "edit-post")
    expect(
      (await count(page, "#dialog #edit-opt-0")) === 0,
      "enquete com votos deixa editar opções",
    )
    expect(/já tem votos/.test(await page.locator("#dialog").innerText()), "sem o aviso dos votos")
    await fill(page, "edit-text", "Qual sabor de bolo para a festa de fim de ano?")
    await action(page, "save-post", voted)
    expect(/Enquete atualizada\./.test(await toast(page)), "sem o aviso de atualizada")
    let p = await postOf(page, "p-r59-poll1")
    expect(p.text.endsWith("fim de ano?"), "o texto não mudou")
    expect(
      JSON.stringify(p.poll) ===
        JSON.stringify({
          options: [
            ["Chocolate", 3],
            ["Cenoura", 2],
          ],
          voted: 0,
        }),
      `os votos mudaram: ${JSON.stringify(p.poll)}`,
    )
    // Sem votos: as opções também podem mudar.
    const empty = `${GID}|p-r59-poll0`
    await pickMenu(page, "post-menu", empty, "edit-post")
    expect((await field(page, "edit-opt-0")) === "7h", "enquete sem votos não mostra as opções")
    await fill(page, "edit-opt-1", "9h")
    await fill(page, "edit-opt-2", "10h")
    await action(page, "save-post", empty)
    p = await postOf(page, "p-r59-poll0")
    expect(
      JSON.stringify(p.poll.options) ===
        JSON.stringify([
          ["7h", 0],
          ["9h", 0],
          ["10h", 0],
        ]),
      `opções: ${JSON.stringify(p.poll.options)}`,
    )
    // Menos de duas opções não passa.
    await pickMenu(page, "post-menu", empty, "edit-post")
    await fill(page, "edit-opt-1", "")
    await fill(page, "edit-opt-2", "")
    await action(page, "save-post", empty)
    expect(/pelo menos 2 opções/.test(await toast(page)), "aceitou enquete com uma opção")
    expect((await postOf(page, "p-r59-poll0")).poll.options.length === 3, "salvou com uma opção")
  },
  // ---- Encontros ----
  async "group-event-edit-and-cancel-tell-the-people-who-confirmed"(page) {
    await patchState(page, MY_POSTS, await dayIso(page, 5))
    await go(page, `grupo/${GID}`)
    const value = `${GID}|p-r59-event`
    await openMenu(page, "post-menu", value)
    expect(
      JSON.stringify(await menuLabels(page)) ===
        JSON.stringify(["Editar encontro", "Cancelar encontro"]),
      `rótulos: ${await menuLabels(page)}`,
    )
    await page.locator('#create-menu [data-action="edit-post"]').click()
    await settle(page)
    expect((await field(page, "edit-place")) === "Praça da Saudade", "editor sem o local")
    expect(
      /3 pessoas que confirmaram serão avisadas/.test(await page.locator("#dialog").innerText()),
      "editor sem o aviso",
    )
    // Só o texto: ninguém precisa ser avisado.
    await fill(page, "edit-text", "Piquenique das famílias com crianças")
    await action(page, "save-post", value)
    expect(/Encontro atualizado\.$/.test((await toast(page)).trim()), `aviso: ${await toast(page)}`)
    // Mudar o local avisa quem confirmou.
    await pickMenu(page, "post-menu", value, "edit-post")
    await fill(page, "edit-place", "Parque do Mindu")
    await action(page, "save-post", value)
    expect(
      /3 pessoas que confirmaram foram avisadas/.test(await toast(page)),
      `aviso: ${await toast(page)}`,
    )
    let p = await postOf(page, "p-r59-event")
    expect(
      p.event.place === "Parque do Mindu" && p.event.going === 3 && p.event.on === true,
      "não salvou",
    )
    // Data passada não passa.
    await pickMenu(page, "post-menu", value, "edit-post")
    await page.locator("#edit-date").fill(await dayIso(page, -3))
    await action(page, "save-post", value)
    expect(/hoje ou depois/.test(await toast(page)), "aceitou data passada")
    await page.locator('#dialog [data-action="close-dialog"]').first().click()
    await settle(page)
    await confirmOk(page)
    await pickMenu(page, "post-menu", value, "delete-post")
    const text = await confirmText(page)
    expect(
      /Cancelar encontro\?/.test(text) && /3 pessoas que confirmaram serão avisadas/.test(text),
      text,
    )
    await confirmOk(page)
    expect(
      /Encontro cancelado\. 3 pessoas que confirmaram foram avisadas\./.test(await toast(page)),
      `aviso: ${await toast(page)}`,
    )
    p = await postOf(page, "p-r59-event")
    expect(!p, "o encontro continua no grupo")
    expect(!(await mainText(page)).includes("Piquenique"), "continua na tela")
  },
  async "agenda-event-edit-and-cancel-tell-the-people-who-confirmed"(page) {
    await patchState(page, MY_EVENT, await dayIso(page, 6))
    await go(page, "evento/e-r59")
    await action(page, "edit-event", "e-r59")
    expect((await field(page, "event-place")) === "Praça da Saudade", "editor sem o local")
    await fill(
      page,
      "event-desc",
      "Churrasco de integração da turma que chegou em outubro. Traga uma bebida.",
    )
    await action(page, "submit-event")
    expect(/Encontro atualizado\.$/.test((await toast(page)).trim()), `aviso: ${await toast(page)}`)
    await action(page, "edit-event", "e-r59")
    await fill(page, "event-place", "Quadra do Parque 10")
    await action(page, "submit-event")
    expect(
      /3 pessoas que confirmaram foram avisadas/.test(await toast(page)),
      `aviso: ${await toast(page)}`,
    )
    const e = (await stored(page)).events.find((x) => x.id === "e-r59")
    expect(e.place === "Quadra do Parque 10" && e.going === 4, "não salvou")
    await action(page, "delete-event", "e-r59")
    const text = await confirmText(page)
    expect(
      /Cancelar encontro\?/.test(text) && /3 pessoas que confirmaram serão avisadas/.test(text),
      text,
    )
    await confirmOk(page)
    expect(
      /Encontro cancelado\. 3 pessoas que confirmaram foram avisadas\./.test(await toast(page)),
      `aviso: ${await toast(page)}`,
    )
    expect(!(await stored(page)).events.some((x) => x.id === "e-r59"), "o encontro continua")
    expect((await routeOf(page)).name === "agenda", "não voltou à Agenda")
    expect(!(await mainText(page)).includes("Churrasco da turma"), "continua na Agenda")
    const found = await page.evaluate(() => window.Bivaque.search("churrasco"))
    expect(!found.events.includes("e-r59"), "continua na busca")
  },
  // ---- Armazenamento falhando ----
  async "failing-storage-loses-nothing-on-edit-and-delete"(page) {
    await patchState(page, [MY_ASK, MY_POSTS, MY_QUESTION_POST], await dayIso(page, 5))
    const slice = async () => {
      const s = await stored(page)
      return JSON.stringify([s.asks, s.groups, s.biz, s.events])
    }
    const before = await slice()
    await go(page, `pergunta/${QID}`)
    await failStorage(page)
    // Editar: o editor fica aberto com o texto digitado e nada muda.
    await pickMenu(page, "question-menu", QID, "edit-question")
    await fill(page, "edit-text", "Onde encontro professor de violino aos sábados?")
    await action(page, "save-question", QID)
    expect(/Não foi possível salvar/.test(await toast(page)), "sem o aviso de falha ao editar")
    expect((await dialogKind(page)) === "editor", "o editor fechou apesar da falha")
    expect((await field(page, "edit-text")).includes("violino"), "o texto digitado se perdeu")
    await page.locator('#dialog [data-action="close-dialog"]').first().click()
    await settle(page)
    await confirmOk(page)
    // Excluir a pergunta: continua aqui, na mesma página.
    await pickMenu(page, "question-menu", QID, "delete-question")
    await confirmOk(page)
    expect(/Não foi possível salvar/.test(await toast(page)), "sem o aviso de falha ao excluir")
    expect(
      (await routeOf(page)).id === QID && (await mainText(page)).includes(QTEXT),
      "saiu da pergunta",
    )
    // Excluir a resposta minha.
    await pickMenu(page, "answer-menu", `${QID}|a-r59-m`, "delete-answer")
    await confirmOk(page)
    expect(/Não foi possível salvar/.test(await toast(page)), "sem o aviso (resposta)")
    expect((await mainText(page)).includes("gostei"), "a resposta sumiu da tela")
    // Excluir a publicação e o comentário.
    await go(page, `grupo/${GID}`)
    await pickMenu(page, "post-menu", `${GID}|p-r59-note`, "delete-post")
    await confirmOk(page)
    expect(/Não foi possível salvar/.test(await toast(page)), "sem o aviso (publicação)")
    expect((await mainText(page)).includes("pediatra do Parque 10"), "a publicação sumiu da tela")
    await go(page, `publicacao/${GID}~p-r59-q`)
    await pickMenu(page, "comment-menu", `${GID}|p-r59-q|c-r59-m`, "delete-comment")
    await confirmOk(page)
    expect(/Não foi possível salvar/.test(await toast(page)), "sem o aviso (comentário)")
    expect((await mainText(page)).includes("atende sábado"), "o comentário sumiu da tela")
    expect((await slice()) === before, "o armazenamento mudou apesar da falha")
  },
}

await runProof(checkpoints, "round59")
