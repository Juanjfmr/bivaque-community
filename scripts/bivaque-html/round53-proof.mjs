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

// Rodada 53: landing pública com a amostra grátis. Quem sai só vê a landing (qualquer rota leva a
// ela); "Entrar" volta ao mesmo perfil; a amostra troca de cidade sem identificar membros.
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
    expect(
      shell.mode && shell.nav === "none" && /Muda a cidade/.test(shell.h1),
      `landing: ${JSON.stringify(shell)}`,
    )
    await go(page, "comunidade")
    expect((await routeOf(page)).name === "entrar", "rota interna abriu sem conta")
  },
  async "free-sample-switches-city"(page) {
    await signOut(page)
    const cards = () => page.locator("#en-cards").innerText()
    expect(
      /Resolvida/.test(await cards()) && /indicaç/.test(await cards()),
      `amostra de Manaus: ${await cards()}`,
    )
    expect(!/Paulo R\.|Carla R\.|Luana M\./.test(await cards()), "a amostra identifica membros")
    await page.locator('#main [data-action="entry-sample-city"][data-value="Natal"]').click()
    await settle(page)
    expect(
      /Ainda reunindo exemplos de Natal/.test(await cards()),
      `amostra de Natal: ${await cards()}`,
    )
  },
  async "sign-in-returns-to-the-same-profile"(page) {
    await signOut(page)
    await page.locator('#main [data-action="entry-login"]').click()
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
