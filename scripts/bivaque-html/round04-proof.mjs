import {
  action,
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
  skipPushAsk,
  snapshot,
  stored,
  toast,
} from "./proof-harness.mjs"

// Rodada 04: Comunidades/Grupos e Memória/Indicações. Decisão de produto (2026-10-14):
// em grupo fechado, o pedido fica pendente até o MODERADOR aprovar ou recusar; nada é
// aprovado por tempo. No protótipo, a decisão sobre grupos de terceiros é simulada nos
// Controles do protótipo; quem modera o próprio grupo decide em Gerenciar grupo.
const group = async (page, id) => (await stored(page)).groups.find((g) => g.id === id)
async function findGroup(page, test) {
  const s = await snapshot(page)
  const g = s.groups.find((x) => x.city === s.homeCity && test(x))
  expect(g, "grupo de exemplo não encontrado")
  await go(page, `grupo/${g.id}`)
  return g
}
async function requestClosed(page) {
  const g = await findGroup(page, (x) => x.privacy === "fechado" && !x.on && !x.pending && !x.auto)
  await action(page, "join-group", g.id)
  return g
}
async function moderate(page, gid, decision) {
  await action(page, "prototype")
  await action(page, "simulate-moderation")
  await page.locator(`#dialog [data-action="${decision}"][data-value="${gid}"]`).click()
  await settle(page)
}

const checkpoints = {
  async "join-open-and-leave"(page) {
    const g = await findGroup(page, (x) => x.privacy !== "fechado" && !x.on && !x.auto)
    await action(page, "join-group", g.id)
    expect((await group(page, g.id)).on === true, "não entrou no grupo aberto")
    await action(page, "group-menu", g.id)
    await page.locator(`#create-menu [data-action="leave-group"][data-value="${g.id}"]`).click()
    await settle(page)
    await confirmOk(page)
    expect((await group(page, g.id)).on === false, "não saiu do grupo")
  },
  async "closed-group-waits-for-moderator"(page) {
    const g = await requestClosed(page)
    expect((await group(page, g.id)).pending === true, "pedido não ficou pendente")
    expect(
      /moderador/i.test(await toast(page)),
      `aviso não menciona o moderador: ${await toast(page)}`,
    )
    await page.waitForTimeout(6000)
    const after = await group(page, g.id)
    expect(after.pending === true && !after.on, "grupo fechado aprovou sem decisão do moderador")
    await reload(page)
    expect((await group(page, g.id)).pending === true, "pendência não persistiu")
  },
  async "moderator-approves"(page) {
    const g = await requestClosed(page)
    await moderate(page, g.id, "moderation-approve")
    const s = await stored(page)
    const x = s.groups.find((y) => y.id === g.id)
    expect(x.on && !x.pending, "aprovação não colocou no grupo")
    expect(
      /aprovado/i.test(await toast(page)),
      `confirmação da aprovação encoberta: ${await toast(page)}`,
    )
    expect((await dialogKind(page)) === null, "diálogo do moderador não fechou sem pedidos")
    expect(
      s.notices.some((n) => n.go?.[1] === g.id && /aprovad/i.test(n.text)),
      "sem aviso de aprovação com link para o grupo",
    )
  },
  async "moderator-denies-then-retry"(page) {
    const g = await requestClosed(page)
    await moderate(page, g.id, "moderation-deny")
    let s = await stored(page)
    let x = s.groups.find((y) => y.id === g.id)
    expect(!x.on && !x.pending, "recusa não encerrou o pedido")
    expect(
      s.notices.some((n) => n.go?.[1] === g.id && /não foi aprovad/i.test(n.text)),
      "sem aviso de recusa",
    )
    await go(page, `grupo/${g.id}`)
    await action(page, "join-group", g.id)
    x = await group(page, g.id)
    expect(x.pending === true, "não pôde pedir de novo após recusa")
    s = await stored(page)
  },
  async "moderation-empty-state"(page) {
    await snapshot(page)
    await action(page, "prototype")
    await action(page, "simulate-moderation")
    expect(
      (await dialogKind(page)) !== null || /nenhum pedido/i.test(await toast(page)),
      "simulador sem resposta quando não há pedidos",
    )
    expect(
      /nenhum pedido/i.test((await page.locator("#dialog").innerText()) + (await toast(page))),
      "sem estado vazio",
    )
  },
  async "admin-handles-requests"(page) {
    const s = await snapshot(page)
    const g = s.groups.find(
      (x) => x.role === "admin" && x.privacy === "fechado" && x.requests?.length,
    )
    expect(g, "nenhum grupo administrado com pedidos na demo")
    await go(page, `grupo/${g.id}`)
    await action(page, "manage-group", g.id)
    const members = g.members
    const n = g.requests.length
    await page.locator(`#dialog [data-action="approve-req"][data-value="${g.id}|0"]`).click()
    await settle(page)
    let x = await group(page, g.id)
    expect(x.members === members + 1 && x.requests.length === n - 1, "aprovar não contou o membro")
    if (x.requests.length) {
      await page.locator(`#dialog [data-action="deny-req"][data-value="${g.id}|0"]`).click()
      await settle(page)
      x = await group(page, g.id)
      expect(x.members === members + 1 && x.requests.length === n - 2, "recusar alterou membros")
    }
  },
  async "admin-request-storage-failure"(page) {
    const s = await snapshot(page)
    const g = s.groups.find(
      (x) => x.role === "admin" && x.privacy === "fechado" && x.requests?.length,
    )
    await go(page, `grupo/${g.id}`)
    await action(page, "manage-group", g.id)
    await failStorage(page)
    await page.locator(`#dialog [data-action="approve-req"][data-value="${g.id}|0"]`).click()
    await settle(page)
    expect(!/agora faz parte/i.test(await toast(page)), "anunciou aprovação que não foi gravada")
    expect(
      await page.locator(`#dialog [data-action="approve-req"][data-value="${g.id}|0"]`).count(),
      "pedido sumiu da lista sem ser gravado",
    )
  },
  async "admin-leaves-only-with-moderator"(page) {
    await snapshot(page)
    await action(page, "groups")
    await go(page, "comunidade")
    await action(page, "create-group")
    await fill(page, "group-name", "Corrida da Vila Teste")
    await action(page, "submit-group")
    const r = await routeOf(page)
    const gid = r.id
    expect(
      r.name === "grupo" && (await group(page, gid))?.role === "admin",
      "grupo não criado como admin",
    )
    await action(page, "group-menu", gid)
    await page.locator(`#create-menu [data-action="leave-group"][data-value="${gid}"]`).click()
    await settle(page)
    expect(
      (await group(page, gid)).on && /moderador/i.test(await toast(page)),
      "admin saiu sem moderador",
    )
    await action(page, "manage-group", gid)
    await choose(page, "mod-add", "Paulo R.")
    await action(page, "add-mod", gid)
    expect((await group(page, gid)).mods.includes("Paulo R."), "moderador não nomeado")
    await page.keyboard.press("Escape")
    await settle(page)
    await action(page, "group-menu", gid)
    await page.locator(`#create-menu [data-action="leave-group"][data-value="${gid}"]`).click()
    await settle(page)
    await confirmOk(page)
    expect((await group(page, gid)).on === false, "admin com moderador não saiu")
  },
  async "create-group-validation"(page) {
    await snapshot(page)
    await action(page, "groups")
    await action(page, "create-group")
    await fill(page, "group-name", "Ab")
    await action(page, "submit-group")
    expect(
      (await dialogKind(page)) !== null && /3 letras/i.test(await toast(page)),
      "aceitou nome curto",
    )
    await page.keyboard.press("Escape")
    await settle(page)
    if (await page.evaluate(() => document.querySelector("#confirm-dialog")?.open))
      await confirmOk(page)
    expect((await dialogKind(page)) === null, "editor não fechou ao descartar")
    const s = await snapshot(page)
    const existing = s.groups.find((g) => g.city === s.homeCity)
    await action(page, "groups")
    await action(page, "create-group")
    await fill(page, "group-name", existing.t)
    await action(page, "submit-group")
    expect(/já existe/i.test(await toast(page)), "aceitou grupo duplicado")
  },
  async "post-comment-and-solve"(page) {
    const g = await findGroup(page, (x) => x.on && !x.auto)
    await action(page, "new-post", g.id)
    await action(page, "post-type", "question")
    await fill(page, "post-text", "Onde consertar ar-condicionado perto da base?")
    await action(page, "submit-post", g.id)
    const p = (await group(page, g.id)).posts[0]
    expect(p?.mine && p.type === "question", "publicação não salva")
    await go(page, `publicacao/${g.id}~${p.id}`)
    await fill(page, "comment-input", "Ok")
    await action(page, "send-comment", `${g.id}|${p.id}`)
    expect(
      (await group(page, g.id)).posts[0].comments.length === 0,
      "aceitou comentário de 2 letras",
    )
    await fill(page, "comment-input", "A oficina do Centro atende rápido.")
    await action(page, "send-comment", `${g.id}|${p.id}`)
    expect((await group(page, g.id)).posts[0].comments.length === 1, "comentário não salvo")
  },
  async "business-tag-only-on-questions"(page) {
    // Decisão do usuário (2026-10-15): marcar um negócio só faz sentido ao responder um
    // pedido de indicação. Em evento, oferta ou publicação comum não há campo nem indicação.
    const s = await snapshot(page)
    const mine = (x) => x.city === s.homeCity && x.on
    const g = s.groups.find((x) => mine(x) && x.posts.some((p) => p.type !== "question"))
    expect(g, "sem publicação que não seja pergunta")
    const p = g.posts.find((x) => x.type !== "question")
    const b = s.biz.find((x) => x.city === s.homeCity)
    await go(page, `publicacao/${g.id}~${p.id}`)
    expect(!(await page.locator("#comment-biz").count()), `marcar negócio em publicação ${p.type}`)
    // Tela adulterada: o campo volta com um negócio escolhido; a indicação não pode contar.
    await page.evaluate((id) => {
      const field = document.createElement("select")
      field.id = "comment-biz"
      field.innerHTML = `<option value="${id}" selected>x</option>`
      field.hidden = true
      document.body.append(field)
    }, b.id)
    await fill(page, "comment-input", "Vou levar água para o grupo todo.")
    await action(page, "send-comment", `${g.id}|${p.id}`)
    const after = await stored(page)
    const saved = after.groups.find((x) => x.id === g.id).posts.find((x) => x.id === p.id)
    expect(saved.comments.at(-1)?.text.startsWith("Vou levar"), "comentário não salvo")
    expect(!saved.comments.at(-1).biz, "comentário de publicação comum marcou negócio")
    expect(
      after.biz.find((x) => x.id === b.id).recN === b.recN,
      "publicação comum deu indicação ao negócio",
    )
    // Responder a uma pergunta continua permitindo marcar o negócio.
    await go(page, `grupo/${g.id}`)
    await action(page, "new-post", g.id)
    await action(page, "post-type", "question")
    await fill(page, "post-text", "Alguém indica um eletricista perto da base?")
    await action(page, "submit-post", g.id)
    const q = (await group(page, g.id)).posts[0]
    await go(page, `publicacao/${g.id}~${q.id}`)
    expect(await page.locator("#comment-biz").count(), "pergunta sem campo de marcar negócio")
  },
  async "poll-needs-membership"(page) {
    const s = await snapshot(page)
    const g = s.groups.find(
      (x) =>
        x.city === s.homeCity &&
        !x.on &&
        x.privacy !== "fechado" &&
        x.posts.some((p) => p.poll && p.poll.voted == null),
    )
    if (!g) return
    const p = g.posts.find((y) => y.poll && y.poll.voted == null)
    await go(page, `publicacao/${g.id}~${p.id}`)
    const vote = page.locator(`[data-action="vote-poll"][data-value="${g.id}|${p.id}|0"]:visible`)
    if (await vote.count()) {
      await vote.first().click()
      await settle(page)
      expect(
        (await group(page, g.id)).posts.find((y) => y.id === p.id).poll.voted == null,
        "votou sem ser membro",
      )
    }
  },
  async "ask-answer-solve-reopen"(page) {
    await skipPushAsk(page)
    await go(page, "comunidade")
    await action(page, "ask")
    await fill(page, "ask-input", "Escola")
    await action(page, "submit-ask")
    expect((await dialogKind(page)) !== null, "aceitou pergunta curta")
    await fill(page, "ask-input", "Qual escola bilíngue aceita transferência no meio do ano?")
    await action(page, "submit-ask")
    const r = await routeOf(page)
    expect(r.name === "pergunta", "pergunta não abriu")
    await fill(page, "answer-input", "Boa")
    await action(page, "send-answer", r.id)
    let q = (await stored(page)).asks.find((x) => x.id === r.id)
    expect(q.answers.length === 0, "aceitou resposta curta")
    await fill(page, "answer-input", "A escola do Centro aceitou meu filho em agosto.")
    await action(page, "send-answer", r.id)
    q = (await stored(page)).asks.find((x) => x.id === r.id)
    expect(q.answers.length === 1, "resposta não salva")
    await action(page, "follow-question", r.id)
    expect(
      (await stored(page)).asks.find((x) => x.id === r.id).following !== undefined,
      "acompanhar sem efeito",
    )
  },
  async "solve-reopen-like-origin"(page) {
    await skipPushAsk(page)
    await go(page, "comunidade")
    await action(page, "ask")
    await fill(page, "ask-input", "Onde revisar o carro com preço justo no Centro?")
    await action(page, "submit-ask")
    const qid = (await routeOf(page)).id
    await fill(page, "answer-input", "A oficina da Avenida revisou o meu sem surpresa.")
    await action(page, "send-answer", qid)
    const aid = (await stored(page)).asks.find((x) => x.id === qid).answers[0].id
    await action(page, "solve-question", `${qid}|${aid}`)
    let q = (await stored(page)).asks.find((x) => x.id === qid)
    expect(q.status === "ok" && q.answers[0].solved, "resolver não marcou")
    await action(page, "reopen-question", `${qid}|${aid}`)
    q = (await stored(page)).asks.find((x) => x.id === qid)
    expect(q.status === "open" && !q.answers[0].solved, "reabrir não desmarcou")
    const s = await stored(page)
    const other = s.asks.find((x) => !x.mine && x.city === s.homeCity && x.answers.length)
    expect(other, "sem pergunta de terceiros com resposta")
    const a = other.answers[0]
    await go(page, `pergunta/${other.id}`)
    await action(page, "like-answer", `${other.id}|${a.id}`)
    const liked = (await stored(page)).asks.find((x) => x.id === other.id).answers[0]
    expect(liked.liked && liked.helped === (a.helped || 0) + 1, "curtir não contou")
    await action(page, "answer-origin", `${other.id}|${a.id}`)
    const r = await routeOf(page)
    expect((await dialogKind(page)) !== null || r.name === "pergunta", "origem sem resposta")
  },
}

await runProof(checkpoints, "round04")
