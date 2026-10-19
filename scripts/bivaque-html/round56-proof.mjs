import {
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

// Rodada 56: o passo 3 da entrada (cidade, momento e nome) como página, as boas-vindas, a entrada em
// análise na fila do Painel do Bivaque e "Ver a entrada do zero" nos controles do protótipo.
// Fechamento do lote: perfil novo do zero, paleta fechada para quem saiu, desfazer do dono preso à
// conta, retomar ou começar de novo, e o aceite do Google que não se pula pelo endereço.
const VALID_CPF = "529.982.247-25"
const click = async (page, action, value) => {
  await page
    .locator(`#main [data-action="${action}"]${value ? `[data-value="${value}"]` : ""}`)
    .first()
    .click()
  await settle(page)
}
async function signOut(page, portal = "verified") {
  await snapshot(page)
  await page.evaluate(
    ([k, p]) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.test = { ...(x.test || {}), portal: p }
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, portal],
  )
  await reload(page)
  await go(page, "voce")
  await click(page, "sign-out")
  await confirmOk(page)
}
async function createAccount(page, name = "Carla Teste", email = "carla.teste@exemplo.com") {
  if ((await routeOf(page)).id !== "conta") await click(page, "entry-join")
  await fill(page, "en-name", name)
  await fill(page, "en-email", email)
  await fill(page, "en-pass", "senha1234")
  await page.locator("#en-consent").click()
  await click(page, "entry-signup")
  await fill(page, "en-cpf", VALID_CPF)
  await click(page, "entry-cpf")
}
async function login(page, email) {
  await go(page, "entrar/login")
  await fill(page, "en-email", email)
  await fill(page, "en-pass-login", "senha1234")
  await click(page, "entry-login-submit")
}

const checkpoints = {
  async "verified-cpf-leads-to-step-3-and-welcome"(page) {
    await signOut(page)
    await createAccount(page)
    expect((await routeOf(page)).id === "cidade", "CPF confirmado não abriu o passo 3")
    const text = await page.locator("#main").innerText()
    expect(/Passo 3 de 3/.test(text) && /Onde e em que momento/.test(text), "passo 3 sem título")
    expect(
      (await page.locator("#en-name input").inputValue()) === "Carla Teste",
      "nome da conta não veio preenchido",
    )
    await page.locator("#en-date").fill("2026-12-01")
    await click(page, "entry-finish")
    expect(/cidade/i.test(await page.locator("#en-err").innerText()), "concluiu sem cidade")
    await choose(page, "en-city", "Manaus")
    await click(page, "entry-finish")
    expect((await routeOf(page)).id === "boas-vindas", "concluir não abriu as boas-vindas")
    expect(
      await page.evaluate(() => document.body.classList.contains("entry-mode")),
      "boas-vindas fora da tela cheia da entrada",
    )
    // Perfil novo do zero: nada de vínculo, Força ou interesses da conta anterior.
    const s = await stored(page)
    expect(
      s.profile.name === "Carla Teste" &&
        s.profile.email === "carla.teste@exemplo.com" &&
        !s.profile.role &&
        !s.profile.force &&
        s.profile.interests.length === 0,
      `perfil herdou a conta anterior: ${JSON.stringify(s.profile)}`,
    )
    const raw = await page.evaluate((k) => localStorage.getItem(k), KEY)
    expect(!raw.includes("52998224725") && !raw.includes("senha1234"), "CPF ou senha guardados")
    await click(page, "entry-home", "inicio")
    expect((await routeOf(page)).name === "inicio", "Ver o plano não abriu a Início")
    await go(page, "voce")
    const me = await page.locator("#main .profile-box").innerText()
    expect(/Vínculo confirmado/.test(me) && !/Aeronáutica/.test(me), `perfil em Você: ${me}`)
  },
  async "welcome-and-steps-follow-the-entry-state"(page) {
    await signOut(page)
    await go(page, "entrar/boas-vindas")
    expect(
      !/Você chegou ao Bivaque/.test(await page.locator("#main").innerText()),
      "boas-vindas abertas sem entrar",
    )
    await go(page, "entrar/cidade")
    expect((await routeOf(page)).id === "conta", "passo 3 aberto sem conta")
    // O aceite do Google não se pula pelo endereço.
    await click(page, "entry-google", "conta")
    await go(page, "entrar/cpf")
    expect((await routeOf(page)).id === "aceite", "o endereço pulou o aceite do Google")
    // Quem já começou retoma ou recomeça; o cadastro em andamento não some sem querer.
    await go(page, "entrar")
    await click(page, "entry-join")
    expect(
      /Você já começou a entrada/.test(await page.locator("#main").innerText()),
      "Quero fazer parte apagou a entrada em andamento",
    )
    await click(page, "entry-resume")
    expect((await routeOf(page)).id === "aceite", "continuar não voltou ao passo")
  },
  async "signed-out-cannot-use-the-command-palette"(page) {
    await signOut(page)
    await page.keyboard.press("Control+k")
    await settle(page)
    expect(
      await page.evaluate(() => {
        const p = document.querySelector("#palette")
        return !p || p.hidden
      }),
      "a paleta abriu para quem saiu",
    )
  },
  async "pending-entry-shows-in-owner-queue-and-approve-frees-it"(page) {
    await signOut(page, "pending")
    await createAccount(page)
    expect((await routeOf(page)).id === "analise", "em análise sem a tela")
    // O dono entra com o perfil de exemplo e encontra a entrada na fila de verificações.
    await login(page, "rafael@exemplo.com")
    await go(page, "dono")
    await page.locator('#main [data-action="owner-tab"][data-value="verify"]').first().click()
    await settle(page)
    const review = page.locator('#main [data-action="owner-review"][data-value^="verify:entry-"]')
    expect((await review.count()) > 0, "entrada em análise fora da fila do dono")
    await review.first().click()
    await settle(page)
    expect(
      /O CPF não fica guardado/.test(await page.locator("#dialog").innerText()),
      "revisão da entrada sem o aviso do CPF",
    )
    await page.locator('#dialog [data-action="owner-decide"][data-value$="~approve"]').click()
    await settle(page)
    expect((await stored(page)).entry.eligibility === "verified", "aprovar não liberou a entrada")
    expect(/aprovado/.test(await toast(page)), "sem confirmação da aprovação")
    // Quem estava em análise volta e cai no passo 3.
    await go(page, "voce")
    await click(page, "sign-out")
    await confirmOk(page)
    await login(page, "carla.teste@exemplo.com")
    expect((await routeOf(page)).id === "cidade", "aprovada não retomou o passo 3")
  },
  async "owner-undo-never-moves-a-decision-to-another-account"(page) {
    await signOut(page, "pending")
    await createAccount(page)
    await login(page, "rafael@exemplo.com")
    await go(page, "dono")
    await page.locator('#main [data-action="owner-tab"][data-value="verify"]').first().click()
    await settle(page)
    await page
      .locator('#main [data-action="owner-review"][data-value^="verify:entry-"]')
      .first()
      .click()
    await settle(page)
    await page.locator('#dialog [data-action="owner-decide"][data-value$="~approve"]').click()
    await settle(page)
    // Outra pessoa começa a entrada no mesmo aparelho.
    await go(page, "voce")
    await click(page, "sign-out")
    await confirmOk(page)
    await click(page, "entry-join")
    await click(page, "entry-restart")
    await confirmOk(page)
    await createAccount(page, "Bruno Teste", "bruno.teste@exemplo.com")
    expect((await routeOf(page)).id === "analise", "segunda conta não foi para a análise")
    await login(page, "rafael@exemplo.com")
    await go(page, "dono/filas")
    await page.locator('#main [data-action="owner-status"][data-value="done"]').first().click()
    await settle(page)
    await page
      .locator('#main [data-action="owner-undo"][data-value^="verify:entry-"]')
      .first()
      .click()
    await settle(page)
    expect(/não pode mais ser desfeita/.test(await toast(page)), "desfazer valeu em outra conta")
    const e = (await stored(page)).entry
    expect(e.account.email === "bruno.teste@exemplo.com" && !e.doc, "a entrada de Bruno mudou")
  },
  async "prototype-restarts-the-entry-from-zero"(page) {
    await snapshot(page)
    await go(page, "voce")
    await page.locator('[data-action="prototype"]:visible').first().click()
    await settle(page)
    const restart = page.locator('#dialog [data-action="onboarding"]')
    expect(/Ver a entrada do zero/.test(await restart.innerText()), "controle sem o novo nome")
    await restart.click()
    await settle(page)
    expect(
      (await routeOf(page)).id === "conta",
      `não recomeçou pela conta: ${JSON.stringify(await routeOf(page))}`,
    )
    const s = await stored(page)
    expect(s.signedOut === true && !s.entry?.account, "entrada anterior não foi limpa")
    expect(s.profile.name === "Rafael Souza", "dados de teste apagados")
  },
}

await runProof(checkpoints, "round56")
