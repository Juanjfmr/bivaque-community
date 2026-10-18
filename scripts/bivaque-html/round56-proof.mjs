import {
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
async function createAccount(page) {
  await click(page, "entry-join")
  await fill(page, "en-name", "Carla Teste")
  await fill(page, "en-email", "carla.teste@exemplo.com")
  await fill(page, "en-pass", "senha1234")
  await page.locator("#en-consent").click()
  await click(page, "entry-signup")
  await fill(page, "en-cpf", VALID_CPF)
  await click(page, "entry-cpf")
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
    expect((await routeOf(page)).id === "boas-vindas", "concluir não abriu as boas-vindas")
    expect(
      await page.evaluate(() => document.body.classList.contains("entry-mode")),
      "boas-vindas fora da tela cheia da entrada",
    )
    const s = await stored(page)
    expect(
      s.profile.name === "Carla Teste" && s.profile.email === "carla.teste@exemplo.com",
      "perfil não veio da conta",
    )
    const raw = await page.evaluate((k) => localStorage.getItem(k), KEY)
    expect(!raw.includes("52998224725") && !raw.includes("senha1234"), "CPF ou senha guardados")
    await click(page, "entry-home", "inicio")
    expect((await routeOf(page)).name === "inicio", "Ver o plano não abriu a Início")
  },
  async "welcome-is-only-for-signed-in"(page) {
    await signOut(page)
    await go(page, "entrar/boas-vindas")
    expect(
      !/Você chegou ao Bivaque/.test(await page.locator("#main").innerText()),
      "boas-vindas abertas sem entrar",
    )
    await go(page, "entrar/cidade")
    expect(
      (await page.locator("#en-city-form").count()) === 0,
      "passo 3 aberto sem conta verificada",
    )
  },
  async "pending-entry-shows-in-owner-queue-and-approve-frees-it"(page) {
    await signOut(page, "pending")
    await createAccount(page)
    expect((await routeOf(page)).id === "analise", "em análise sem a tela")
    // O dono entra com o perfil de exemplo e encontra a entrada na fila de verificações.
    await go(page, "entrar/login")
    await fill(page, "en-email", "rafael@exemplo.com")
    await fill(page, "en-pass-login", "senha1234")
    await click(page, "entry-login-submit")
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
    await go(page, "entrar/login")
    await fill(page, "en-email", "carla.teste@exemplo.com")
    await fill(page, "en-pass-login", "senha1234")
    await click(page, "entry-login-submit")
    expect((await routeOf(page)).id === "cidade", "aprovada não retomou o passo 3")
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
