import { expect, test } from "@playwright/test"
import { simularVoce } from "./voce-ajuda"

// A jornada "Você" no app de prova (F10): mesmos componentes e mesmos estados
// da produção, com `/api/app/voce/*` simulado no lugar do banco (ver
// voce-ajuda.ts). A prova com banco de verdade é tests/e2e/f10-voce-real.spec.ts.

test("o perfil vem da rota, a edição sobrevive ao recarregar e o desfazer some da lista", async ({
  page,
}) => {
  await simularVoce(page)
  await page.goto("/app/voce")

  await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible()
  await expect(page.getByText("Ana Verificada")).toBeVisible()
  await expect(page.getByText("perfil de demonstração")).toHaveCount(0)
  await expect(page.locator('[data-tela="voce"]')).toContainText("Manaus")

  // A barra e a tela leem a mesma pessoa (REGUA-002): o avatar da aba "Você"
  // é o da leitura do perfil, não o da demonstração.
  const avatarDaBarra = page.locator(
    '[data-nav="principal"] [data-aba="voce"] [data-avatar="membro"]',
  )
  await expect(avatarDaBarra).toHaveText("AV")

  await page.getByRole("button", { name: "Editar" }).click()
  await page.getByLabel("Nome").fill("Ana Editada")
  await page.getByLabel("Apresentação").fill("Nova apresentação do teste.")
  await page.getByRole("button", { name: "Salvar" }).click()
  await expect(page.getByText("Ana Editada")).toBeVisible()
  await expect(avatarDaBarra, "o nome gravado também muda o avatar da barra").toHaveText("AE")

  await page.reload()
  await expect(page.getByText("Ana Editada"), "o nome gravado volta no recarregar").toBeVisible()
  await expect(page.getByText("Nova apresentação do teste.")).toBeVisible()
  await expect(avatarDaBarra).toHaveText("AE")

  await page.goto("/app/bloqueados")
  const linha = page.locator('[data-tela="bloqueados"] [data-linha="bloqueado"]')
  await expect(linha).toHaveCount(1)
  await expect(linha).toContainText("Maria Souza")
  await expect(linha).toContainText("Bloqueio desde 3 de novembro")
  const desbloquear = page.getByRole("button", { name: "Desbloquear Maria Souza" })
  // A ação que conclui a tela é ardósia (--acao), não o contorno pálido (M10).
  await expect(desbloquear).toHaveAttribute("data-tom", "principal")
  await desbloquear.click()
  await expect(page.getByText("Ninguém bloqueado ainda")).toBeVisible()
  await page.reload()
  await expect(
    page.locator('[data-tela="bloqueados"] [data-linha="bloqueado"]'),
    "o desbloqueio precisa sobreviver ao recarregar",
  ).toHaveCount(0)

  await page.goto("/app/ocultados")
  await expect(page.locator('[data-tela="ocultados"] [data-linha="lista"]')).toContainText(
    "Obra na rua das Palmeiras",
  )
  await page.getByText("Mostrar de novo").click()
  await expect(page.getByText("Nada oculto por aqui")).toBeVisible()
})

test("falha de leitura mostra um único aviso e a tela segue de pé", async ({ page }) => {
  await simularVoce(page)
  await page.route("**/api/app/voce", (rota) => rota.abort())
  await page.goto("/app/voce")

  const aviso = page.locator('[data-aviso="perfil"]')
  await expect(aviso).toBeVisible()
  await expect(aviso).toContainText("Não foi possível carregar seu perfil.")
  const tentar = page.getByRole("button", { name: "Tentar de novo" })
  await expect(tentar).toBeVisible()
  // A saída é pílula, como no resto do app (REGUA-003).
  await expect(tentar).toHaveClass(/rounded-full/)
  await expect(page.locator('[data-estado="erro"]')).toHaveCount(0)
  // Sem leitura não há identidade: a barra cai no ícone, sem nome herdado.
  await expect(
    page.locator('[data-nav="principal"] [data-aba="voce"] [data-avatar="membro"]'),
  ).toHaveCount(0)
  // A estrutura é a da tela de sucesso: as seções continuam na tela.
  await expect(page.getByRole("heading", { name: "Seu Bivaque" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Família" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Avisos" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Privacidade e ajuda" })).toBeVisible()
  // A linha "Mudar de cidade" continua na falha (REGUA-003); sem perfil o
  // toque tenta a leitura de novo, porque o formulário depende dela.
  await expect(page.getByRole("button", { name: /Mudar de cidade/ })).toBeVisible()

  await page.unroute("**/api/app/voce")
  await page.getByRole("button", { name: "Tentar de novo" }).click()
  await expect(page.getByText("Ana Verificada")).toBeVisible()
  await expect(page.locator('[data-aviso="perfil"]')).toHaveCount(0)
})

// REGUA-002, achado 2 da revisão de código: o gesto central da aceitação 4 —
// bloquear pelo perfil de membro — precisava de prova em runtime, positiva e
// negativa, pela rota existente POST /api/app/voce/bloqueados.
test("bloquear pelo perfil de membro: espera visível, menu fora e estado bloqueado", async ({
  page,
}) => {
  await simularVoce(page)
  // A resposta demora o bastante para a espera aparecer na tela (achado 5).
  await page.route(/\/api\/app\/voce\/bloqueados$/, async (rota) => {
    if (rota.request().method() !== "POST") return rota.fallback()
    await new Promise((espera) => setTimeout(espera, 1500))
    return rota.fallback()
  })

  // A capa do topo: se a arte falha, a faixa continua com fundo neutro — a
  // área não fica vazia (revisão cega R1, G4). O bloqueio entra antes do
  // goto para o pedido da imagem realmente falhar.
  await page.route(/\/ilustracoes\/cidade\.webp$/, (rota) => rota.abort())

  await page.goto("/app/perfil/u-paulo")
  await expect(page.getByRole("heading", { name: "Paulo Roberto" })).toBeVisible()

  const capa = page.locator('[data-tela="perfil"] [data-capa="membro"]')
  await expect(capa).toBeVisible()
  expect(
    await capa.evaluate((elemento) => getComputedStyle(elemento).backgroundColor),
    "capa sem arte continua com fundo neutro",
  ).not.toBe("rgba(0, 0, 0, 0)")
  await page.unroute(/\/ilustracoes\/cidade\.webp$/)

  await page.getByRole("button", { name: "Opções" }).click()
  await page.getByRole("menuitem", { name: "Bloquear Paulo Roberto" }).click()

  const dialogo = page.getByRole("alertdialog")
  await expect(dialogo).toContainText("Bloquear Paulo Roberto?")
  const gravou = page.waitForResponse(
    (resposta) =>
      resposta.url().endsWith("/api/app/voce/bloqueados") && resposta.request().method() === "POST",
  )
  await dialogo.getByRole("button", { name: "Bloquear", exact: true }).click()

  // Durante o envio: a espera é visível e o item do menu não aceita outro
  // disparo — desabilitado e marcado com aria-busy (achado 5). A resposta
  // só é aguardada DEPOIS: esperar antes consumiria a espera que se mede.
  await expect(page.getByRole("status")).toContainText("Bloqueando…")
  await page.getByRole("button", { name: "Opções" }).click()
  await expect(page.getByRole("menuitem", { name: /Paulo Roberto/ })).toBeDisabled()
  await expect(page.getByRole("menuitem", { name: /Paulo Roberto/ })).toHaveAttribute(
    "aria-busy",
    "true",
  )
  await page.keyboard.press("Escape")

  // Sucesso: o menu sai da tela e o estado bloqueado fica, com o que acontece.
  expect((await gravou).ok(), "o bloqueio precisa responder com sucesso").toBe(true)
  await expect(page.getByRole("status")).toContainText("Você bloqueou Paulo Roberto")
  await expect(page.getByRole("button", { name: "Opções" })).toHaveCount(0)
})

test("bloquear pelo perfil com o servidor fora: o alerta diz para tentar e o menu continua", async ({
  page,
}) => {
  await simularVoce(page, { respostaDoBloqueio: "indisponivel" })

  await page.goto("/app/perfil/u-paulo")
  await expect(page.getByRole("heading", { name: "Paulo Roberto" })).toBeVisible()
  await page.getByRole("button", { name: "Opções" }).click()
  await page.getByRole("menuitem", { name: "Bloquear Paulo Roberto" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Bloquear", exact: true }).click()

  await expect(page.getByRole("alert")).toContainText("Não foi possível bloquear agora")
  // A falha não finge sucesso: sem estado de bloqueado, com a saída à mão.
  await expect(page.getByRole("status")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Opções" })).toBeVisible()
})

// REGUA-003: o menu do perfil tem Bloquear e Denunciar. "Mensagem" só aparece
// quando já existe conversa com a pessoa — não há rota para começar uma — e a
// denúncia leva a essa conversa ou explica onde denunciar.
function simularCaixa(page: import("@playwright/test").Page, outroId: string | null) {
  return page.route(/\/api\/app\/conversas(?:\?|$)/, (rota) =>
    rota.fulfill({
      json: {
        conversas:
          outroId === null
            ? []
            : [
                {
                  id: "c-paulo",
                  nome: "Paulo Roberto",
                  outroId,
                  tipo: "direct",
                  contextoId: "c-paulo",
                  ultima: "Até amanhã.",
                  porLer: false,
                },
              ],
        proximo: null,
        porLer: 0,
      },
    }),
  )
}

test("perfil de membro com conversa: Mensagem abre a conversa e Denunciar está no menu", async ({
  page,
}) => {
  await simularVoce(page)
  await simularCaixa(page, "u-paulo")
  await page.goto("/app/perfil/u-paulo")
  await expect(page.getByRole("heading", { name: "Paulo Roberto" })).toBeVisible()

  const mensagem = page.getByRole("button", { name: "Mensagem" })
  await expect(mensagem).toBeVisible()
  // Mensagem e Opções cabem na largura: a tela não rola para o lado (375).
  const vazaParaOLado = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(vazaParaOLado).toBe(false)
  await expect(page.getByRole("button", { name: "Opções" })).toBeInViewport({ ratio: 1 })
  // E não cobrem o nome: a caixa do nome e a do botão não se cruzam.
  const nomeCaixa = await page.getByRole("heading", { name: "Paulo Roberto" }).boundingBox()
  const botaoCaixa = await mensagem.boundingBox()
  expect(nomeCaixa).not.toBeNull()
  expect(botaoCaixa).not.toBeNull()
  if (nomeCaixa && botaoCaixa) {
    const cruzam =
      nomeCaixa.x < botaoCaixa.x + botaoCaixa.width &&
      botaoCaixa.x < nomeCaixa.x + nomeCaixa.width &&
      nomeCaixa.y < botaoCaixa.y + botaoCaixa.height &&
      botaoCaixa.y < nomeCaixa.y + nomeCaixa.height
    expect(cruzam).toBe(false)
  }
  // O nome também não transborda a própria caixa (o texto escaparia por baixo do botão).
  const nomeTransborda = await page
    .getByRole("heading", { name: "Paulo Roberto" })
    .evaluate((h) => h.scrollWidth > h.clientWidth + 1)
  expect(nomeTransborda).toBe(false)
  expect(nomeCaixa?.width ?? 0).toBeGreaterThanOrEqual(120)
  await page.getByRole("button", { name: "Opções" }).click()
  await expect(page.getByRole("menuitem", { name: "Bloquear Paulo Roberto" })).toBeVisible()
  await expect(page.getByRole("menuitem", { name: "Denunciar" })).toBeVisible()
  await page.keyboard.press("Escape")

  await mensagem.click()
  await expect(page).toHaveURL(/\/app\/conversa\/c-paulo$/)
})

test("perfil de membro sem conversa: sem Mensagem e a denúncia explica o caminho", async ({
  page,
}) => {
  await simularVoce(page)
  await simularCaixa(page, null)
  await page.goto("/app/perfil/u-paulo")
  await expect(page.getByRole("heading", { name: "Paulo Roberto" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Mensagem" })).toHaveCount(0)

  await page.getByRole("button", { name: "Opções" }).click()
  await page.getByRole("menuitem", { name: "Denunciar" }).click()
  await expect(page.locator('[data-aviso="denunciar"]')).toContainText("Denunciar no menu dela")
  await expect(page.getByRole("menu")).toHaveCount(0)
})

// RUN-184: o aviso da exclusão é o mesmo da tela antiga da web (o que sai agora, o
// que sai no prazo, o que permanece e por quê), e o pedido registrado fica na própria
// tela. Os seis tamanhos da config do app (320 a 1440, com 375/768/1440 entre eles)
// rodam este caso.
test("o aviso completo da exclusão, a palavra que libera e o pedido que fica na tela", async ({
  page,
}) => {
  await simularVoce(page)
  await page.goto("/app/apagar-conta")

  const tela = page.locator('[data-tela="apagar-conta"]')
  await expect(tela.getByRole("heading", { level: 1, name: "Apagar a conta" })).toBeVisible()
  await expect(tela.getByText(/permanente e não pode ser desfeita/)).toBeVisible()

  await expect(tela.getByText("Ao confirmar, agora:")).toBeVisible()
  await expect(tela.getByText(/sua sessão é encerrada/)).toBeVisible()
  await expect(tela.getByText("Em até 15 dias, contados do pedido:")).toBeVisible()
  await expect(tela.getByText(/apagamos a conta, as credenciais/)).toBeVisible()
  await expect(tela.getByText(/dados anonimizados/)).toBeVisible()
  await expect(tela.getByText(/6 meses/)).toBeVisible()
  await expect(tela.getByText(/MCI, art\. 15/)).toBeVisible()
  await expect(tela.getByRole("button", { name: "Abrir a Ajuda" })).toBeVisible()

  // A confirmação continua sendo a palavra digitada, e nada acontece sem ela.
  const apagar = tela.getByRole("button", { name: "Apagar minha conta" })
  await expect(apagar).toBeDisabled()
  await tela.getByLabel("Escreva APAGAR para confirmar").fill("APAGAR")
  await expect(apagar).toBeEnabled()
  await apagar.click()

  // O prazo vem do banco (a simulação devolve o mesmo `due_at` da rota real) e sai
  // por extenso; a conta é a mesma do sistema de quem roda a prova, então o rótulo
  // é calculado aqui em vez de escrito à mão.
  const prazo = new Date("2026-12-06T12:00:00.000Z").toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const estado = tela.locator('[role="status"]')
  await expect(estado).toContainText("Pedido registrado")
  await expect(estado).toContainText(prazo)
  expect(prazo).toContain("de dezembro de 2026")
  // "Pedido registrado" continua na tela, e a ação não é oferecida de novo.
  await expect(page).toHaveURL(/\/app\/apagar-conta$/)
  await expect(apagar).toBeDisabled()
  await expect(tela.getByText(`Até ${prazo}, contados do pedido:`)).toBeVisible()
})

test("sair da conta volta para a entrada e o cache local do aparelho sai junto", async ({
  page,
}) => {
  await simularVoce(page)
  await page.goto("/app/voce")
  await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible()

  // O que a pessoa deixa no aparelho: rascunho de criação e buscas recentes.
  await page.evaluate(() => {
    sessionStorage.setItem("bivaque:criacao-rascunhos:manaus", "[]")
    localStorage.setItem("bivaque:buscas-recentes", '["pediatra"]')
  })

  await page.getByRole("button", { name: "Sair da conta" }).click()
  await expect(page.getByRole("alertdialog")).toContainText("Sair da conta?")
  await page.getByRole("button", { name: "Sair", exact: true }).click()

  await expect(page).toHaveURL(/\/app\/entrar$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "A comunidade militar da sua cidade." }),
  ).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("data-tema", "claro")
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#F3F5F6")
  const guardado = await page.evaluate(() => ({
    rascunhos: sessionStorage.getItem("bivaque:criacao-rascunhos:manaus"),
    recentes: localStorage.getItem("bivaque:buscas-recentes"),
  }))
  expect(guardado, "o cache do aparelho não pode sobreviver à saída").toEqual({
    rascunhos: null,
    recentes: null,
  })
})

test("sair com a sessão já encerrada (401) também leva à entrada e limpa o cache", async ({
  page,
}) => {
  await simularVoce(page, { respostaDoSair: "ja-saiu" })
  await page.goto("/app/voce")
  await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible()

  await page.evaluate(() => {
    sessionStorage.setItem("bivaque:criacao-rascunhos:manaus", "[]")
    localStorage.setItem("bivaque:buscas-recentes", '["pediatra"]')
  })

  await page.getByRole("button", { name: "Sair da conta" }).click()
  await page.getByRole("button", { name: "Sair", exact: true }).click()

  // Já não há sessão: o que a pessoa pediu já é o estado atual, então a tela
  // segue para a entrada em vez de mostrar falha.
  await expect(page).toHaveURL(/\/app\/entrar$/)
  await expect(page.locator('[data-tela="voce"] [role="alert"]')).toHaveCount(0)
  const guardado = await page.evaluate(() => ({
    rascunhos: sessionStorage.getItem("bivaque:criacao-rascunhos:manaus"),
    recentes: localStorage.getItem("bivaque:buscas-recentes"),
  }))
  expect(guardado, "o cache do aparelho sai mesmo sem sessão no servidor").toEqual({
    rascunhos: null,
    recentes: null,
  })
})

test("sair com o servidor fora mantém a pessoa na conta, com a mensagem", async ({ page }) => {
  await simularVoce(page, { respostaDoSair: "indisponivel" })
  await page.goto("/app/voce")
  await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible()

  await page.getByRole("button", { name: "Sair da conta" }).click()
  await page.getByRole("button", { name: "Sair", exact: true }).click()

  await expect(page.locator('[data-tela="voce"] [role="alert"]')).toContainText(
    "Não foi possível sair agora",
  )
  await expect(page, "a sessão não foi encerrada no aparelho").toHaveURL(/\/app\/voce$/)
  await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible()
})

test("a família vem da rota: convite enviado entra na lista e a revogação some", async ({
  page,
}) => {
  await simularVoce(page)
  await page.goto("/app/voce")

  const familia = page.locator('[data-secao="sim"]', { hasText: "Família" })
  await expect(familia.getByText("Convites pendentes (1 de 5)")).toBeVisible()
  await expect(familia.getByText("ma***@gm***.com")).toBeVisible()

  // Enviar: o que aparece é o convite GRAVADO, devolvido pelo servidor.
  await familia.getByLabel("E-mail do familiar").fill("familiar@example.invalid")
  await familia.getByRole("button", { name: "Enviar convite" }).click()
  await expect(familia.getByRole("status")).toContainText(
    "Convite enviado para fa***@ex***.invalid.",
  )
  await expect(familia.getByText("Convites pendentes (2 de 5)")).toBeVisible()
  await expect(
    familia.locator('[data-linha="lista"]').filter({ hasText: "fa***@ex***.invalid" }),
  ).toHaveCount(1)

  // Recarregar prova a gravação: a lista volta do servidor, não do estado local.
  await page.reload()
  await expect(familia.getByText("Convites pendentes (2 de 5)")).toBeVisible()

  // Revogar: a linha sai da lista e o código deixa de valer.
  await familia
    .getByRole("button", { name: /Revogar/ })
    .last()
    .click()
  await expect(familia.getByRole("status")).toContainText("Convite revogado")
  await expect(familia.getByText("Convites pendentes (1 de 5)")).toBeVisible()
})
