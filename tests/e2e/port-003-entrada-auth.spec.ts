import { expect, test } from "@playwright/test"
import { signInAs } from "./helpers/session"

// PORT-003 (frente A do lote 4) — a entrada do protótipo no Next, de ponta a
// ponta: criar conta, entrar, recuperar, senha nova, o passo Aceite do Google e
// "Você já começou".
//
// O que este arquivo acrescenta aos specs que já existiam:
//
//   - a ORDEM da especificação (Google, "ou com e-mail", formulário), que uma
//     reescrita de layout perde sem quebrar nada;
//   - os estados que só existem na tela: enviado da recuperação, link vencido,
//     aceite recusado;
//   - a retomada da entrada, que o Next não tinha (defeito 5 do mapeamento
//     protótipo × Next, ADR-20261022-entrada-do-prototipo).
//
// `verified-no-membership@` é a persona semeada que está no meio do funil de
// membro: verificada, sem localidade e sem perfil. É o caso de "Você já
// começou", e por isso ela é a sessão injetada aqui.

const NO_MEMBERSHIP = "verified-no-membership@bivaque.example.invalid"

test.describe("criar conta, como no protótipo", () => {
  test("o Google vem primeiro e o e-mail vem depois, com passo e regra da senha", async ({
    page,
  }) => {
    await page.goto("/signup")

    const google = page.getByRole("button", { name: "Continuar com Google" })
    const nameField = page.locator("#en-name")
    await expect(google).toBeVisible()
    await expect(nameField).toBeVisible()

    // Ordem no documento: o Google acima do formulário de e-mail, separados
    // pelo "ou com e-mail" da especificação.
    const googleBox = await google.boundingBox()
    const nameBox = await nameField.boundingBox()
    expect(googleBox?.y ?? 0).toBeLessThan(nameBox?.y ?? 0)

    await expect(page.getByText("ou com e-mail")).toBeVisible()
    await expect(page.getByText("Passo 1 de 3 · Conta")).toBeVisible()
    await expect(page.locator("#en-email")).toBeVisible()
    await expect(page.locator("#en-pass")).toBeVisible()
    await expect(
      page.getByText("Ao menos 8 caracteres, com letras e números.").filter({ visible: true }),
    ).toBeVisible()
    // A nota do Google é do cadastro (`renderEntrySignup` em account.js): quem
    // entra pelo botão do Google marca o aceite no passo seguinte, não aqui.
    await expect(page.getByText("Pelo Google, o aceite vem no passo seguinte.")).toBeVisible()
    // O pé da tela repete a navegação recíproca, como no protótipo.
    await expect(page.getByRole("link", { name: "Entrar" }).first()).toHaveAttribute(
      "href",
      "/login",
    )
  })

  test("o campo de senha deixa ver a senha digitada", async ({ page }) => {
    await page.goto("/signup")
    await page.locator("#en-pass input").fill("senha-forte-123")
    await page.getByRole("button", { name: "Mostrar senha", exact: true }).click()
    await expect(page.locator("#en-pass")).toHaveAttribute("type", "text")
    await expect(page.locator("#en-pass input")).toHaveValue("senha-forte-123")
  })
})

test.describe("entrar, como no protótipo", () => {
  test("traz o Google, o e-mail e os dois caminhos de saída", async ({ page }) => {
    await page.goto("/login")

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Que bom ter você de volta.")
    await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible()
    await expect(page.getByText("ou com e-mail")).toBeVisible()
    await expect(page.getByRole("link", { name: "Esqueci minha senha" })).toHaveAttribute(
      "href",
      "/recuperar-senha",
    )
    await expect(page.getByRole("link", { name: "Criar conta" }).first()).toHaveAttribute(
      "href",
      "/signup",
    )
    // Entrar não pede aceite: o aceite é do cadastro (ADR-20260907).
    await expect(page.getByRole("checkbox")).toHaveCount(0)
  })

  test("e-mail torto é recusado na tela, sem ida ao provedor", async ({ page }) => {
    let tokenRequests = 0
    await page.route("**/auth/v1/token**", async (route) => {
      tokenRequests += 1
      await route.continue()
    })

    await page.goto("/login")
    await page.locator("#en-email input").fill("ana-sem-arroba")
    await page.locator("#en-pass-login input").fill("senha-2026")
    await page.getByRole("button", { name: "Entrar", exact: true }).click()

    await expect(page.locator("#en-err")).toHaveText("E-mail ou senha incorretos.")
    expect(tokenRequests).toBe(0)
  })
})

test.describe("recuperar a senha, como no protótipo", () => {
  test("envia e responde igual tenha conta ou não, com o painel enviado", async ({ page }) => {
    // O provedor trocado por uma resposta neutra: o que se prova aqui é a tela,
    // não o envio de e-mail do GoTrue.
    let recoverRequests = 0
    await page.route("**/auth/v1/recover**", async (route) => {
      recoverRequests += 1
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    })

    await page.goto("/recuperar-senha")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Recuperar a senha.")
    await expect(page.getByText("Mandamos um link para criar uma senha nova.")).toBeVisible()

    await page.locator("#en-email input").fill("quem-pediu@exemplo.invalid")
    await page.getByRole("button", { name: "Enviar link" }).click()

    await expect(page.getByRole("status")).toContainText("puder entrar no Bivaque")
    await expect(page.getByRole("status")).toContainText("Confira também o spam")
    expect(recoverRequests).toBe(1)

    // "Voltar para entrar" leva ao login.
    await expect(page.getByRole("link", { name: "Voltar para entrar" })).toHaveAttribute(
      "href",
      "/login",
    )
    // "Usar outro e-mail" volta ao formulário, mas o relógio de reenvio continua:
    // trocar o endereço não é motivo para furar o limite do provedor. O botão
    // fica "Aguarde mm:ss" e desabilitado até a janela fechar — o que se prova
    // aqui é que o formulário voltou limpo e o limite sobreviveu.
    await page.getByRole("button", { name: "Usar outro e-mail" }).click()
    await expect(page.locator("#en-email input")).toHaveValue("")
    const resend = page.getByRole("button", { name: /^Aguarde \d{2}:\d{2}$/ })
    await expect(resend).toBeVisible()
    await expect(resend).toBeDisabled()
  })

  test("Enter no campo envia o pedido, como o clique", async ({ page }) => {
    // Revisão de 22/10/2026 (P2): o Enter no campo do Material não submetia o
    // formulário, porque o `<input>` vive no shadow root e não tem form owner.
    let recoverRequests = 0
    await page.route("**/auth/v1/recover**", async (route) => {
      recoverRequests += 1
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    })

    await page.goto("/recuperar-senha")
    await page.locator("#en-email input").fill("quem-pediu@exemplo.invalid")
    await page.locator("#en-email input").press("Enter")

    await expect(page.getByRole("status")).toContainText("puder entrar no Bivaque")
    expect(recoverRequests).toBe(1)
  })

  test("e-mail torto não vira 'enviado'", async ({ page }) => {
    await page.goto("/recuperar-senha")
    await page.locator("#en-email input").fill("ana-sem-arroba")
    await page.getByRole("button", { name: "Enviar link" }).click()
    await expect(page.locator("#en-err")).toHaveText("Confira o e-mail.")
    await expect(page.getByRole("status")).toHaveCount(0)
  })
})

test.describe("senha nova", () => {
  test("link sem sessão é honesto e oferece outro", async ({ page }) => {
    await page.goto("/nova-senha")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Este link não vale mais")
    await expect(page.getByRole("link", { name: "Pedir outro link" })).toHaveAttribute(
      "href",
      "/recuperar-senha",
    )
    await expect(page.getByRole("link", { name: "Voltar para entrar" })).toHaveAttribute(
      "href",
      "/login",
    )
  })

  test("Enter no campo aplica a regra da tela, sem ida ao provedor", async ({ page, context }) => {
    // Revisão de 22/10/2026 (P2): o Enter não submetia este formulário.
    await signInAs(context, NO_MEMBERSHIP)
    await page.goto("/nova-senha")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Crie uma senha nova")

    await page.locator("#en-pass input").fill("curta")
    await page.locator("#en-pass input").press("Enter")

    await expect(page.locator("#en-err")).toHaveText(
      "A senha precisa ter ao menos 8 caracteres, com letras e números.",
    )
  })

  test("Enter envia a senha nova ao provedor", async ({ page, context }) => {
    // A resposta é de erro de propósito: trocar a senha semeada e navegar não é
    // o que este caso prova. O que se prova é que o Enter mandou o pedido.
    let updates = 0
    await page.route("**/auth/v1/user**", async (route) => {
      if (route.request().method() !== "PUT") {
        await route.continue()
        return
      }
      updates += 1
      await route.fulfill({
        body: JSON.stringify({ code: 500, msg: "falha simulada" }),
        contentType: "application/json",
        status: 500,
      })
    })

    await signInAs(context, NO_MEMBERSHIP)
    await page.goto("/nova-senha")
    await page.locator("#en-pass input").fill("senha-nova-123")
    await page.locator("#en-pass input").press("Enter")

    await expect(page.locator("#en-err")).toHaveText(
      "Não foi possível salvar a senha agora. Peça outro link e tente de novo.",
    )
    expect(updates).toBe(1)
  })

  test("Enter repetido com o envio pendente sai uma vez só", async ({ page, context }) => {
    // Revisão de 22/10/2026 (P2): o Enter chama requestSubmit() direto e o
    // botão desabilitado não o segura; a trava do envio precisa barrar o
    // segundo Enter enquanto o primeiro pedido ainda não voltou.
    let updates = 0
    let release: () => void = () => undefined
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route("**/auth/v1/user**", async (route) => {
      if (route.request().method() !== "PUT") {
        await route.continue()
        return
      }
      updates += 1
      await pending
      await route.fulfill({
        body: JSON.stringify({ code: 500, msg: "falha simulada" }),
        contentType: "application/json",
        status: 500,
      })
    })

    await signInAs(context, NO_MEMBERSHIP)
    await page.goto("/nova-senha")
    await page.locator("#en-pass input").fill("senha-nova-123")
    await page.locator("#en-pass input").press("Enter")
    await page.locator("#en-pass input").press("Enter")
    await page.locator("#en-pass input").press("Enter")
    await expect.poll(() => updates).toBe(1)
    release()

    await expect(page.locator("#en-err")).toHaveText(
      "Não foi possível salvar a senha agora. Peça outro link e tente de novo.",
    )
    expect(updates).toBe(1)
  })
})

test.describe("passo Aceite, do Google", () => {
  test("sem sessão diz o que falta em vez de oferecer um botão que falha", async ({ page }) => {
    await page.goto("/consent")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Antes de entrar, as regras.")
    await expect(page.getByText("Entre na sua conta para registrar o aceite.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible()
  })

  test("com sessão nomeia a conta que está aceitando", async ({ page, context }) => {
    await signInAs(context, NO_MEMBERSHIP)
    await page.goto("/consent")

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Antes de entrar, as regras.")
    await expect(page.getByText("Passo 1 de 3 · Conta")).toBeVisible()
    // A saudação do protótipo nomeia a conta que está aceitando.
    await expect(page.getByText(`Você entrou com o Google como ${NO_MEMBERSHIP}.`)).toBeVisible()
  })
})

test.describe("Você já começou", () => {
  test("a entrada em andamento é retomável, e não um formulário em branco", async ({
    page,
    context,
  }) => {
    await signInAs(context, NO_MEMBERSHIP)
    await page.goto("/login")

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Você já começou a entrada.")
    await expect(page.getByText(`Conta de ${NO_MEMBERSHIP}`)).toBeVisible()
    // A persona semeada não tem nenhum aceite gravado (`consent_acceptances`
    // não é semeada), então a retomada para no passo Aceite — sem isso a
    // conferência do CPF responderia 403 consent is required. É o caminho da
    // revisão de 22/10/2026, e o destino é uma decisão do servidor.
    const resume = page.getByRole("link", { name: "Continuar de onde parei" })
    await expect(resume).toHaveAttribute("href", "/consent")
    await resume.click()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Antes de entrar, as regras.")

    // O cadastro também mostra a retomada, e não deixa a pessoa criar uma
    // segunda conta sem perceber.
    await page.goto("/signup")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Você já começou a entrada.")
  })

  test("começar com outra conta pede confirmação antes de sair", async ({ page, context }) => {
    await signInAs(context, NO_MEMBERSHIP)
    await page.goto("/login")

    await page.getByRole("button", { name: "Começar com outra conta" }).click()
    // O diálogo é o da base (`confirm-dialog`), com o texto desta tela. Ele
    // prende o foco enquanto está aberto e fecha pelo Esc ou pelo clique fora.
    await expect(page.getByText("Começar com outra conta?", { exact: true })).toBeVisible()
    await expect(page.getByText("Você sai desta conta e volta ao cadastro.")).toBeVisible()

    // Negativa: cancelar não sai da conta nem troca de tela.
    await page.getByRole("button", { name: "Cancelar" }).click()
    await expect(page.getByText("Você sai desta conta e volta ao cadastro.")).toBeHidden()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Você já começou a entrada.")

    // Positiva: confirmar sai da conta e volta ao cadastro.
    await page.getByRole("button", { name: "Começar com outra conta" }).click()
    await page.getByRole("button", { name: "Confirmar" }).click()
    await page.waitForURL(/\/signup$/)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vamos começar.")
  })

  test("quem já é membro não vê a retomada", async ({ page, context }) => {
    // A persona semeada do spec padrão já é membro: a entrada acabou para ela.
    const MEMBER = "membro-1@bivaque.example.invalid"
    await signInAs(context, MEMBER)
    await page.goto("/login")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Que bom ter você de volta.")
  })
})
