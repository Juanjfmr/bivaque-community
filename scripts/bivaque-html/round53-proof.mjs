import {
  confirmOk,
  expect,
  go,
  routeOf,
  runProof,
  settle,
  snapshot,
  stored,
  toast,
} from "./proof-harness.mjs"

// Rodada 53: landing pública. Quem sai só vê a landing (qualquer rota leva a ela); "Entrar" volta ao
// mesmo perfil. Rodada 71: a landing é a v8 (título F) e a amostra por cidade saiu — a única conversa
// da página é ilustrativa, então quem está fora não lê o Bivaque (decisão do dono).
async function signOut(page) {
  await snapshot(page)
  await go(page, "voce")
  await page.locator('#main [data-action="sign-out"]').click()
  await settle(page)
  await confirmOk(page)
  await settle(page)
}

const checkpoints = {
  async "sign-out-shows-only-the-landing"(page) {
    await signOut(page)
    expect((await routeOf(page)).name === "entrar", "Sair não levou à landing")
    expect((await stored(page)).signedOut === true, "Sair não ficou gravado")
    const shell = await page.evaluate(() => ({
      mode: document.body.classList.contains("entry-mode"),
      nav: getComputedStyle(document.querySelector("#nav")).display,
      h1: document.querySelector("#main h1")?.textContent,
    }))
    // R71: o título da v8 substitui "Muda a cidade. Fica a sua rede.".
    expect(
      shell.mode && shell.nav === "none" && /Juntos somos mais fortes/.test(shell.h1),
      `landing: ${JSON.stringify(shell)}`,
    )
    await go(page, "comunidade")
    expect((await routeOf(page)).name === "entrar", "rota interna abriu sem conta")
  },
  async "landing-shows-only-the-illustrative-conversation"(page) {
    // R71: no lugar da amostra por cidade, a landing não pode vazar conteúdo da comunidade. A única
    // conversa é a ilustrativa, e a decisão do dono é que quem está fora não lê o Bivaque.
    await signOut(page)
    const state = await stored(page)
    const text = await page.locator("#main").innerText()
    expect(/Conversa ilustrativa/.test(text), "sem a conversa ilustrativa")
    expect(
      /Resolvida · Marina marcou a indicação que funcionou/.test(text),
      "a conversa ilustrativa perdeu o desfecho",
    )
    expect(
      !(await page.locator('#main [data-action="entry-sample-city"], #main #en-cards').count()),
      "a amostra por cidade continua na landing",
    )
    expect(!/Amostra/i.test(text), "a landing ainda fala em amostra")
    const published = state.asks
      .filter((ask) => ask.city === state.homeCity && ask.status === "ok")
      .slice(0, 3)
      .map((ask) => ask.q)
    expect(published.length > 0, "os exemplos da comunidade não têm perguntas resolvidas")
    for (const question of published)
      expect(!text.includes(question), `a landing mostra uma pergunta da comunidade: ${question}`)
  },
  async "sign-in-returns-to-the-same-profile"(page) {
    await signOut(page)
    await page.locator('#main [data-action="entry-login"]').first().click()
    await settle(page)
    // Desde a Rodada 55, Entrar tem formulário (modo teste: o e-mail do perfil de exemplo).
    await page.locator("#en-email input").fill("rafael@exemplo.com")
    await page.locator("#en-pass-login input").fill("senha1234")
    await page.locator('#main [data-action="entry-login-submit"]').click()
    await settle(page)
    expect((await routeOf(page)).name === "inicio", "Entrar não voltou para a Início")
    expect(/Você entrou como Rafael Souza/.test(await toast(page)), `aviso: ${await toast(page)}`)
    expect(
      !(await page.evaluate(() => document.body.classList.contains("entry-mode"))),
      "ficou no modo da landing",
    )
  },
  async "landing-is-not-shown-to-members"(page) {
    await snapshot(page)
    await go(page, "entrar")
    expect((await routeOf(page)).name === "inicio", "quem está dentro ficou na landing")
  },
}

await runProof(checkpoints, "round53")
