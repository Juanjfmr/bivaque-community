import { expect, test } from "@playwright/test"
import { simularConversas } from "./conversas-ajuda"
import { simularGrupos } from "./grupos-ajuda"
import { simularVoce } from "./voce-ajuda"

/** Reproduz cliques duplos antes do próximo render, não apenas dois clicks do Playwright. */
test("conversa: duas submissões no mesmo quadro geram uma mensagem", async ({ page }) => {
  await simularConversas(page)
  let liberar: () => void = () => {
    throw new Error("Envio ainda não iniciado")
  }
  const pendente = new Promise<void>((resolve) => {
    liberar = resolve
  })
  const textos: string[] = []
  await page.route(/\/api\/app\/conversas\/t1\/mensagens$/, async (rota) => {
    const corpo = rota.request().postDataJSON() as { texto: string }
    textos.push(corpo.texto)
    await pendente
    await rota.fulfill({
      status: 201,
      json: {
        mensagem: {
          id: "mensagem-1",
          conteudo: corpo.texto,
          minha: true,
          criadaEm: "2026-11-09T12:00:00.000Z",
        },
      },
    })
  })

  await page.goto("/app/conversa/t1")
  const compositor = page.locator('[data-compositor-conversa="sim"]')
  const campo = compositor.locator("#mensagem-da-conversa")
  await campo.fill("Posso buscar o item amanhã?")
  await compositor.locator("form").evaluate((formulario) => {
    formulario.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    formulario.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
  })
  await expect.poll(() => textos).toEqual(["Posso buscar o item amanhã?"])
  await expect(compositor.locator('[data-acao="enviar-mensagem"]')).toBeDisabled()
  await expect(campo).toHaveValue("Posso buscar o item amanhã?")
  liberar()
  await expect(page.locator('[data-mensagens="historico"]')).toContainText(
    "Posso buscar o item amanhã?",
  )
  await expect(campo).toHaveValue("")
  expect(textos).toHaveLength(1)
})

test("grupo fechado: solicitação duplicada não envia dois PUTs nem fecha o diálogo", async ({
  page,
}) => {
  await simularGrupos(page)
  let liberar: () => void = () => {
    throw new Error("Pedido ainda não iniciado")
  }
  const pendente = new Promise<void>((resolve) => {
    liberar = resolve
  })
  const pedidos: unknown[] = []
  await page.route(/\/api\/app\/grupos\/g-cmm\/participacao$/, async (rota) => {
    pedidos.push(rota.request().postDataJSON())
    await pendente
    await rota.fulfill({
      json: {
        grupo: {
          id: "g-cmm",
          nome: "Famílias do CMM",
          descricao: "Famílias da escola.",
          regras: "Assuntos da escola e das turmas.",
          fechado: true,
          membro: false,
          pendente: true,
          admin: false,
          membros: null,
          fixada: null,
        },
      },
    })
  })

  await page.goto("/app/grupo/g-cmm")
  await page.locator('[data-acao="grupo-participar"]').click()
  const dialogo = page.locator('[data-dialogo="pedir-grupo"]')
  await expect(dialogo).toBeVisible()
  await dialogo.locator("#motivo-grupo").fill("Sou responsável por um aluno.")
  await dialogo.getByRole("button", { name: "Enviar pedido" }).evaluate((botao) => {
    const botaoDeEnvio = botao as HTMLButtonElement
    botaoDeEnvio.click()
    botaoDeEnvio.click()
  })
  await expect.poll(() => pedidos.length).toBe(1)
  await expect(dialogo).toHaveAttribute("aria-busy", "true")
  await expect(dialogo.getByRole("button", { name: "Cancelar" })).toBeDisabled()
  await page.keyboard.press("Escape")
  await expect(dialogo).toBeVisible()
  liberar()
  await expect(page.locator('[data-estado-participacao="pendente"]')).toBeVisible()
  expect(pedidos).toHaveLength(1)
})

test("família: convites duplicados e revogação concorrente ficam bloqueados", async ({ page }) => {
  await simularVoce(page)
  let liberar: () => void = () => {
    throw new Error("Convite ainda não iniciado")
  }
  const pendente = new Promise<void>((resolve) => {
    liberar = resolve
  })
  const convites: unknown[] = []
  await page.route(/\/api\/app\/voce\/familia$/, async (rota) => {
    // Encaminha o GET à simulação de família já instalada; continue() ignora essa rota.
    if (rota.request().method() !== "POST") return rota.fallback()
    convites.push(rota.request().postDataJSON())
    await pendente
    await rota.fulfill({
      status: 201,
      json: {
        convite: {
          id: "c2",
          emailMascarado: "fa***@ex***.invalid",
          criadoEm: "2026-11-09T12:00:00.000Z",
          expiraEm: "2026-11-16T12:00:00.000Z",
        },
      },
    })
  })

  await page.goto("/app/voce")
  const familia = page.locator('[data-secao="sim"]', { hasText: "Família" })
  await expect(familia.getByText("Convites pendentes (1 de 5)")).toBeVisible()
  await familia.getByLabel("E-mail do familiar").fill("familiar@example.invalid")
  await familia.locator("form").evaluate((formulario) => {
    formulario.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    formulario.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
  })
  await expect.poll(() => convites.length).toBe(1)
  await expect(familia.getByLabel("E-mail do familiar")).toBeDisabled()
  await expect(familia.getByRole("button", { name: /Revogar/ })).toBeDisabled()
  liberar()
  await expect(familia.getByText("Convites pendentes (2 de 5)")).toBeVisible()
  await expect(familia.getByRole("button", { name: /Revogar/ }).first()).toBeEnabled()
  expect(convites).toHaveLength(1)
})
