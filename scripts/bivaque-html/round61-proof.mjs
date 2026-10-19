import {
  action,
  addChips,
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
  toast,
} from "./proof-harness.mjs"

// Rodada 61 (AUDITORIA_FUNCIONAL_2026-10-18, item C e lote R61): encerrar grupo (só o admin, confirmação
// vermelha, só leitura por 30 dias, reabrir no prazo) e pausar ou excluir a minha página de negócio.
// Maquete aprovada: quadros 11 e 12. Um checkpoint por comportamento. Fixtures entram pelo
// armazenamento (`patchState`, que recarrega); o resto é feito pela tela.
const DAY = 864e5
const MYBIZ_NAME = "Marcenaria Teste"
const MYBIZ_CAT = "Casa e reparos"

const mainText = (page) => page.locator("#main").innerText()
const confirmText = (page) => page.locator("#confirm-dialog").innerText()
const count = (page, selector) => page.locator(selector).count()
const searchOf = (page, q) => page.evaluate((x) => window.Bivaque.search(x), q)
// Só o título de cada item do menu: o item de pausar traz uma frase de apoio embaixo.
const menuTitles = async (page) =>
  (await page.locator("#create-menu .create-menu-label").allInnerTexts()).map((t) =>
    t.split("\n")[0].trim(),
  )
const menuIcons = async (page) =>
  (await page.locator("#create-menu md-icon").allInnerTexts()).map((t) => t.trim())

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
// Cria a minha página pela tela (Você → Criar página do negócio) e devolve o id.
async function createMyBiz(page) {
  await go(page, "voce")
  await action(page, "my-biz")
  await fill(page, "biz-name", MYBIZ_NAME)
  await choose(page, "biz-category", MYBIZ_CAT)
  await fill(page, "biz-hours", "Seg a sex, 8h às 18h")
  await addChips(page, "biz-hoods", ["Centro"])
  await addChips(page, "biz-services", ["Atendimento geral"])
  await action(page, "submit-biz")
  return (await snapshot(page)).myBiz.id
}

const checkpoints = {
  // ---- Encerrar (quadro 11): só o admin; confirmação vermelha; Cancelar não encerra ----
  async "close-group-is-admin-only-and-asks-red-confirmation"(page) {
    await snapshot(page)
    await go(page, "grupo/g-familias")
    expect((await count(page, '[data-action="manage-group"]')) === 0, "não-admin vê Gerenciar")
    expect((await count(page, '[data-action="close-group"]')) === 0, "não-admin vê Encerrar")
    await go(page, "grupo/g-futebol")
    await action(page, "manage-group", "g-futebol")
    const sheet = await page.locator("#dialog").innerText()
    expect(
      /Encerrar o grupo/.test(sheet) &&
        /As publicações ficam só para leitura por 30 dias\./.test(sheet),
      `seção Encerrar do admin: ${sheet}`,
    )
    await action(page, "close-group", "g-futebol")
    expect(/Encerrar o grupo\?/.test(await confirmText(page)), "encerrar não pede confirmação")
    expect(
      (await count(page, "#confirm-dialog .danger-fill")) === 1,
      "confirmação sem botão vermelho",
    )
    await page.locator("#confirm-dialog md-text-button").click()
    await settle(page)
    expect(
      !(await snapshot(page)).groups.find((g) => g.id === "g-futebol").closedAt,
      "Cancelar encerrou o grupo",
    )
    await action(page, "manage-group", "g-futebol")
    await action(page, "close-group", "g-futebol")
    await confirmOk(page)
    const closedAt = (await snapshot(page)).groups.find((g) => g.id === "g-futebol").closedAt
    expect(typeof closedAt === "number", "Encerrar não gravou o grupo")
    expect(
      /Grupo encerrado em \d{2}\/\d{2}\./.test(await mainText(page)),
      "sem a faixa de encerrado",
    )
  },

  // ---- Grupo encerrado: nada de publicar, comentar, votar, marcar presença ----
  async "closed-group-stops-publish-comment-vote-event-and-like"(page) {
    await snapshot(page)
    await patchState(
      page,
      "for (const id of ['g-familias','g-futebol']) s.groups.find((g) => g.id === id).closedAt = a",
      await page.evaluate(() => Date.now()),
    )
    await go(page, "grupo/g-familias")
    expect(/Grupo encerrado em \d{2}\/\d{2}\./.test(await mainText(page)), "sem a faixa no grupo")
    expect((await count(page, ".g-compose")) === 0, "ainda oferece escrever no grupo")
    expect((await count(page, '[data-action="vote-poll"]')) === 0, "a enquete ainda aceita voto")
    expect((await count(page, '[data-action="like-post"]')) === 0, "ainda aceita Útil")
    const question = (await snapshot(page)).groups
      .find((g) => g.id === "g-familias")
      .posts.find((p) => p.author === "Luana M.")
    await go(page, `publicacao/g-familias~${question.id}`)
    expect((await count(page, "#comment-input")) === 0, "ainda aceita comentário")
    expect((await count(page, '[data-action="send-comment"]')) === 0, "ainda envia comentário")
    await go(page, "grupo/g-futebol")
    expect(
      (await count(page, '[data-action="attend-post"]')) === 0,
      "ainda aceita presença em encontro",
    )
    expect(
      (await count(page, '[data-action="new-post"],[data-action="new-post-empty"]')) === 0,
      "ainda abre uma publicação nova",
    )
  },

  // ---- Sugestões e Descobrir saem; Meus grupos segue com a marca Encerrado ----
  async "closed-group-leaves-suggestions-and-search-and-is-marked-in-my-groups"(page) {
    await snapshot(page)
    await patchState(
      page,
      "s.groups.find((g) => g.id === 'g-familias').closedAt = a; s.groups.find((g) => g.id === 'g-culinaria').closedAt = a",
      await page.evaluate(() => Date.now()),
    )
    await go(page, "comunidade")
    await action(page, "community-tab", "grp")
    expect(
      !(await mainText(page)).includes("Culinária e marmitas"),
      "grupo encerrado ainda aparece nas sugestões ou nas populares",
    )
    const mine = page.locator(".g-row", { hasText: "Famílias com crianças pequenas" })
    expect(/Encerrado/.test(await mine.first().innerText()), "Meus grupos sem a marca Encerrado")
    await fill(page, "group-search", "marmitas")
    await settle(page)
    expect((await count(page, "#group-results")) === 1, "a busca de grupos não respondeu")
    expect(
      !(await mainText(page)).includes("Culinária e marmitas") &&
        /Nenhum grupo com esse nome/.test(await mainText(page)),
      "grupo encerrado ainda aparece em Descobrir grupos",
    )
  },

  // ---- Reabrir: enquanto estiver no prazo; depois do prazo, não ----
  async "admin-reopens-within-deadline-and-cannot-after-it"(page) {
    await snapshot(page)
    await patchState(
      page,
      "s.groups.find((g) => g.id === 'g-futebol').closedAt = a",
      await page.evaluate(() => Date.now()),
    )
    await go(page, "grupo/g-futebol")
    await action(page, "manage-group", "g-futebol")
    expect((await count(page, '[data-action="reopen-group"]')) === 1, "sem Reabrir no prazo")
    expect(
      (await count(page, '[data-action="close-group"]')) === 0,
      "encerrado ainda oferece Encerrar",
    )
    await action(page, "reopen-group", "g-futebol")
    expect(
      !(await snapshot(page)).groups.find((g) => g.id === "g-futebol").closedAt,
      "Reabrir não gravou",
    )
    expect((await count(page, ".g-closed")) === 0, "a faixa continua depois de reabrir")
    expect((await count(page, ".g-compose")) === 1, "não voltou a publicar depois de reabrir")
    await patchState(
      page,
      "s.groups.find((g) => g.id === 'g-futebol').closedAt = a",
      (await page.evaluate(() => Date.now())) - 31 * DAY,
    )
    await go(page, "grupo/g-futebol")
    expect(
      /deixaram de estar disponíveis/.test(await mainText(page)),
      "sem o aviso depois do prazo",
    )
    expect((await count(page, ".gpost")) === 0, "mostra publicações depois do prazo")
    await action(page, "manage-group", "g-futebol")
    expect((await count(page, '[data-action="reopen-group"]')) === 0, "reabre depois do prazo")
  },

  // ---- Pausar: sai do catálogo e da busca; reativar devolve ----
  async "paused-business-leaves-catalog-and-search-and-reactivates"(page) {
    await snapshot(page)
    const id = await createMyBiz(page)
    await go(page, `negocio/${id}`)
    await openMenu(page, "biz-menu", id)
    expect(
      JSON.stringify(await menuTitles(page)) ===
        JSON.stringify(["Editar página", "Pausar página", "Excluir página"]),
      `itens do ⋮: ${await menuTitles(page)}`,
    )
    expect(
      JSON.stringify(await menuIcons(page)) ===
        JSON.stringify(["edit", "visibility_off", "delete"]),
      `ícones do ⋮: ${await menuIcons(page)}`,
    )
    await page.locator('#create-menu [data-action="pause-biz"]').click()
    await settle(page)
    expect(/Página pausada/.test(await mainText(page)), "a página não mostra Página pausada")
    expect((await count(page, '[data-action="resume-biz"]')) === 1, "pausada sem Reativar")
    await go(page, "negocios")
    expect(!(await mainText(page)).includes(MYBIZ_NAME), "pausada ainda aparece no catálogo")
    expect(
      !((await searchOf(page, "Marcenaria")).biz || []).includes(id),
      "pausada ainda aparece na busca",
    )
    await go(page, `negocio/${id}`)
    await action(page, "resume-biz", id)
    expect(!/Página pausada/.test(await mainText(page)), "Reativar não tirou a faixa")
    await go(page, "negocios")
    expect(await mainText(page).then((t) => t.includes(MYBIZ_NAME)), "reativada sumiu do catálogo")
    expect(
      ((await searchOf(page, "Marcenaria")).biz || []).includes(id),
      "reativada não voltou à busca",
    )
  },

  // ---- Excluir: a página some, propostas abertas viram retiradas, concluídas ficam; aviso e Você ----
  async "deleted-business-withdraws-open-proposals-and-keeps-history"(page) {
    await snapshot(page)
    const id = await createMyBiz(page)
    await patchState(
      page,
      `s.requests = [
        { id: "rq-open", city: "Manaus", cat: "Casa e reparos", spec: null, hood: "Centro",
          desc: "Preciso de reforma pequena na cozinha com troca de pia.", when: { kind: "asap", date: null },
          photos: [], status: "open", createdAt: a.now, expiresAt: a.now + 7 * 864e5,
          proposals: [{ id: "pp-open", bizId: a.id, price: { kind: "fixed", min: 300, max: null },
            date: "2026-10-25", duration: "2 dias", validUntil: "2026-11-30",
            msg: "Atendemos o Centro com visita prévia.", status: "sent", at: a.now }],
          who: "Carla M.", mine: true },
        { id: "rq-done", city: "Manaus", cat: "Casa e reparos", spec: null, hood: "Centro",
          desc: "Troca de fechadura feita no mês passado.", when: { kind: "asap", date: null },
          photos: [], status: "done", doneAt: a.now, chosen: "pp-done", createdAt: a.now, expiresAt: a.now,
          proposals: [{ id: "pp-done", bizId: a.id, price: { kind: "fixed", min: 200, max: null },
            date: "2026-10-01", duration: "1 dia", validUntil: "2026-10-10",
            msg: "Serviço feito no mês passado.", status: "chosen", at: a.now }],
          who: "Paulo R.", mine: true },
        ...(s.requests || []).filter((r) => r.id !== "rq-open" && r.id !== "rq-done")
      ]`,
      { id, now: await page.evaluate(() => Date.now()) },
    )
    await go(page, `negocio/${id}`)
    await openMenu(page, "biz-menu", id)
    await page.locator('#create-menu [data-action="delete-biz"]').click()
    await settle(page)
    expect(/Excluir página\?/.test(await confirmText(page)), "excluir não pede confirmação")
    expect(
      (await count(page, "#confirm-dialog .danger-fill")) === 1,
      "confirmação sem botão vermelho",
    )
    await page.locator("#confirm-dialog md-text-button").click()
    await settle(page)
    expect((await snapshot(page)).myBiz?.id === id, "Cancelar excluiu a página")
    await openMenu(page, "biz-menu", id)
    await page.locator('#create-menu [data-action="delete-biz"]').click()
    await settle(page)
    await confirmOk(page)
    // A navegação e o aviso chegam logo depois da confirmação: espera por eles, sem ler antes.
    await page
      .waitForFunction(() => window.Bivaque?.inspect().route.name === "voce", null, {
        timeout: 3000,
      })
      .catch(() => {})
    await page
      .waitForFunction(
        () => /Página excluída/.test(document.querySelector("#snackbar")?.innerText ?? ""),
        null,
        { timeout: 3000 },
      )
      .catch(() => {})
    const s = await snapshot(page)
    expect(!s.myBiz, "a página não saiu de state.myBiz")
    const open = s.requests.find((r) => r.id === "rq-open").proposals[0].status
    expect(open === "withdrawn", `proposta aberta ficou como ${open}`)
    const done = s.requests.find((r) => r.id === "rq-done").proposals[0].status
    expect(done === "chosen", `histórico concluído mudou para ${done}`)
    expect((await routeOf(page)).name === "voce", "não voltou para Você")
    expect(/Página excluída/.test(await toast(page)), "sem o aviso de página excluída")
  },
}

await runProof(checkpoints, "round61")
