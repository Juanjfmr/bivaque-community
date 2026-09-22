// RECON-018 — entrada e confirmação na web (pranchas 36/37).
//
// Execução paralela em andamento: o banco local é compartilhado, então este
// spec NÃO cria contas. Os caminhos de estado real são negativos (credencial
// errada, e-mail duplicado — ambos recusados pelo provedor sem gravar nada) e
// o painel de confirmação usa a sessão do seed + o estado local da tela. O
// reenvio limitado pelo servidor é exercitado com a resposta 429 REAL do
// provedor reproduzida sobre o transporte (a mensagem "after 47 seconds" é o
// formato medido do GoTrue); a geração do 429 em si é do provedor e fica
// registrada como pendência de ambiente no card.
//
// Credenciais: nunca inline — ambiente primeiro, apps/web/.env.local depois
// (mesma regra de persistent-login.spec.ts e do scanner de segredos).

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

function readEnvLocal(key: string): string | undefined {
  try {
    const file = readFileSync(join(process.cwd(), "apps", "web", ".env.local"), "utf-8")
    for (const line of file.split("\n")) {
      const trimmed = line.trim()
      if (trimmed.length === 0 || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      if (trimmed.slice(0, eq).trim() !== key) continue
      return trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
    }
  } catch {
    return undefined
  }
  return undefined
}

const MEMBER_EMAIL =
  process.env["USER_EMAIL"] ??
  readEnvLocal("BIVAQUE_VISUAL_EMAIL") ??
  "visual@bivaque.example.invalid"
const MEMBER_PASSWORD = process.env["USER_PASSWORD"] ?? readEnvLocal("BIVAQUE_VISUAL_PASSWORD")

function requirePassword(): string {
  if (!MEMBER_PASSWORD) {
    throw new Error(
      "USER_PASSWORD (ou BIVAQUE_VISUAL_PASSWORD em apps/web/.env.local) é necessário para este spec.",
    )
  }
  return MEMBER_PASSWORD
}

async function signInThroughForm(page: import("@playwright/test").Page): Promise<void> {
  await page.locator("#bivaque-signin-email").fill(MEMBER_EMAIL)
  await page.locator("#bivaque-signin-password").fill(requirePassword())
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
}

test.describe("prancha 36 — entrar", () => {
  test("a tela oferece exatamente os controles da referência com o mecanismo do ADR", async ({
    page,
  }) => {
    await page.goto("/login")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Que bom ter você de volta.")
    await expect(page.locator("#bivaque-signin-email")).toBeVisible()
    await expect(page.locator("#bivaque-signin-password")).toBeVisible()
    await expect(page.getByRole("button", { name: "Mostrar senha", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Esqueci minha senha" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Criar conta" })).toBeVisible()
    await expect(page.getByRole("button", { name: /Continuar com Google/ })).toBeVisible()
    // Um único h1 na tela (rubrica de acessibilidade do contrato).
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
  })

  test("mostrar e ocultar troca o tipo do campo, sem perder o texto", async ({ page }) => {
    await page.goto("/login")
    await page.locator("#bivaque-signin-password").fill("segredo-123")
    await page.getByRole("button", { name: "Mostrar senha", exact: true }).click()
    await expect(page.locator("#bivaque-signin-password")).toHaveAttribute("type", "text")
    await page.getByRole("button", { name: "Ocultar senha", exact: true }).click()
    await expect(page.locator("#bivaque-signin-password")).toHaveAttribute("type", "password")
    await expect(page.locator("#bivaque-signin-password")).toHaveValue("segredo-123")
  })

  test("credencial errada devolve a mensagem única, sem distinguir conta", async ({ page }) => {
    await page.goto("/login")
    await page.locator("#bivaque-signin-email").fill(MEMBER_EMAIL)
    await page.locator("#bivaque-signin-password").fill("senha-errada-123")
    await page.getByRole("button", { name: "Entrar", exact: true }).click()
    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible()
    // Anti-enumeração: nada na tela pode insinuar que a conta existe ou não.
    await expect(page.getByText(/não encontrada|não cadastrado|não existe/i)).toHaveCount(0)
  })

  test("duplo clique não duplica a request de token", async ({ page }) => {
    let tokenRequests = 0
    await page.route("**/auth/v1/token**", async (route) => {
      tokenRequests += 1
      await route.continue()
    })
    await page.goto("/login")
    await page.locator("#bivaque-signin-email").fill(MEMBER_EMAIL)
    await page.locator("#bivaque-signin-password").fill(requirePassword())
    // Dois submits no MESMO tick: requestSubmit() dispara o onSubmit de forma
    // síncrona, então a segunda chamada chega antes de o primeiro `await`
    // resolver — é exatamente o disparo duplo que o ref segura. Dois clicks do
    // Playwright não são o mesmo tick (a ação é assíncrona), e o segundo cai
    // depois do sucesso, medindo a corrida seguinte — não o guarda de envio em
    // andamento.
    await page.evaluate(() => {
      const form = document.querySelector("form")
      form?.requestSubmit()
      form?.requestSubmit()
    })
    await page.waitForURL(/\/(onboarding|inicio|profile)/, { timeout: 15_000 })
    expect(tokenRequests).toBe(1)
  })

  test("sessão persiste após recarregar e o destino ?redirect= interno é honrado", async ({
    page,
  }) => {
    await page.goto("/login?redirect=/profile")
    await signInThroughForm(page)
    await page.waitForURL("**/profile", { timeout: 15_000 })
    // O waitForURL resolve no início da navegação; recarregar naquele instante
    // aborta o navigation em curso (ERR_ABORTED / frame detached). Esperar o
    // load estabiliza antes do reload — o que o teste quer provar é a sessão
    // sobrevivendo ao reload, não a corrida.
    await page.waitForLoadState("load")
    await page.reload()
    await expect(page).toHaveURL(/\/profile/)
    await expect(page.getByRole("link", { name: "Entrar" })).toHaveCount(0)
  })

  test("destino externo não sai do app", async ({ page }) => {
    await page.goto("/login?redirect=https://exemplo-inimigo.invalid/pescar")
    await signInThroughForm(page)
    // Espera o destino interno em vez de "networkidle": a rota pós-entrada
    // (/onboarding) mantém atividade de rede e a ociosidade nunca chegava — o
    // teste morria por timeout ANTES de provar o que importa, e o timeout podia
    // ser lido como "saiu do app". A asserção do host é a prova real.
    await page.waitForURL((url) => url.hostname === "127.0.0.1", { timeout: 15_000 })
    await expect(page).not.toHaveURL(/exemplo-inimigo/)
    expect(new URL(page.url()).hostname).toBe("127.0.0.1")
  })
})

test.describe("prancha 36 — criar conta", () => {
  test("o aceite é condição: sem ele o botão não envia", async ({ page }) => {
    await page.goto("/signup")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vamos começar.")
    await page.locator("#bivaque-signup-name").fill("Ana de Teste")
    await page.locator("#bivaque-signup-email").fill(MEMBER_EMAIL)
    await page.locator("#bivaque-signup-password").fill("senha-forte-123")
    await expect(page.getByRole("button", { name: "Criar conta", exact: true })).toBeDisabled()
    await page.locator("#bivaque-signup-consent").check()
    await expect(page.getByRole("button", { name: "Criar conta", exact: true })).toBeEnabled()
  })

  test("e-mail já cadastrado sugere entrar, sem criar segunda conta", async ({ page }) => {
    await page.goto("/signup")
    await page.locator("#bivaque-signup-name").fill("Ana de Teste")
    await page.locator("#bivaque-signup-email").fill(MEMBER_EMAIL)
    await page.locator("#bivaque-signup-password").fill("senha-forte-123")
    await page.locator("#bivaque-signup-consent").check()
    await page.getByRole("button", { name: "Criar conta", exact: true }).click()
    await expect(page.getByText("Este e-mail já tem conta no Bivaque.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible()
  })

  test("senha curta é barrada no cliente antes da ida ao provedor", async ({ page }) => {
    let requests = 0
    await page.route("**/auth/v1/signup", async (route) => {
      requests += 1
      await route.abort()
    })
    await page.goto("/signup")
    await page.locator("#bivaque-signup-name").fill("Ana")
    await page.locator("#bivaque-signup-email").fill("curta@exemplo.invalid")
    await page.locator("#bivaque-signup-password").fill("abc123")
    await page.locator("#bivaque-signup-consent").check()
    await page.getByRole("button", { name: "Criar conta", exact: true }).click()
    await expect(page.getByText("Use ao menos 8 caracteres.")).toBeVisible()
    expect(requests).toBe(0)
  })
})

test.describe("prancha 37 — confirmar e-mail", () => {
  // /auth/confirmar-email não está em PUBLIC_PATHS do proxy: sem sessão, o
  // gate devolve para /login. É o bloqueio registrado no card — por isso os
  // testes entram como membro do seed, do mesmo jeito que a captura.
  async function openConfirmar(
    page: import("@playwright/test").Page,
    context: import("@playwright/test").BrowserContext,
    options: { url?: string; pendingEmail?: string | null } = {},
  ): Promise<void> {
    const { seedSession } = await import("./helpers/session")
    await seedSession(context)
    // `null` explícito significa "sem cadastro pendente" — `??` o trocaria pelo
    // padrão e plantaria a flag que o caso negativo precisa NÃO ter.
    const pendingEmail =
      options.pendingEmail === undefined ? "ana@exemplo.invalid" : options.pendingEmail
    if (pendingEmail) {
      await page.addInitScript((email: string) => {
        // Guardado: o init-script roda também no reload, e sobrescrever a flag
        // apagaria o lastResendAt que se quer provar persistente.
        const key = "bivaque:confirmacao-pendente"
        if (!window.sessionStorage.getItem(key)) {
          window.sessionStorage.setItem(key, JSON.stringify({ email, lastResendAt: null }))
        }
      }, pendingEmail)
    }
    await page.goto(options.url ?? "/auth/confirmar-email")
  }

  test("sem cadastro pendente a tela é honesta e não tem caixas de código", async ({
    context,
    page,
  }) => {
    await openConfirmar(page, context, { pendingEmail: null })
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nada para confirmar")
    await expect(page.locator("input")).toHaveCount(0)
  })

  test("painel pendente ecoa o endereço e oferece alterar e reenviar", async ({
    context,
    page,
  }) => {
    await openConfirmar(page, context)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Confira seu e-mail")
    await expect(page.getByText("ana@exemplo.invalid")).toBeVisible()
    await expect(page.getByRole("link", { name: "Alterar e-mail" })).toHaveAttribute(
      "href",
      "/signup",
    )
    await expect(page.getByRole("button", { name: "Reenviar link de confirmação" })).toBeEnabled()
    await expect(page.locator("input")).toHaveCount(0)
  })

  test("reenvio aceito pelo servidor inicia o contador; sem aceite, nada anda", async ({
    context,
    page,
  }) => {
    let resendCalls = 0
    await page.route("**/auth/v1/resend**", async (route) => {
      resendCalls += 1
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    })
    await openConfirmar(page, context)
    await page.getByRole("button", { name: "Reenviar link de confirmação" }).click()
    await expect(page.getByRole("button", { name: /Reenviar em 0[01]:\d\d/ })).toBeDisabled()
    expect(resendCalls).toBe(1)
    // Recarregar não zera o contador: o estado é persistido na sessão, não é
    // animação de enfeite.
    await page.reload()
    await expect(page.getByRole("button", { name: /Reenviar em 00:/ })).toBeDisabled()
  })

  test("429 do servidor manda no contador e a mensagem é distinguível", async ({
    context,
    page,
  }) => {
    await page.route("**/auth/v1/resend**", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          code: 429,
          error_code: "over_email_send_rate_limit",
          msg: "For security purposes, you can only request this after 47 seconds.",
          message: "For security purposes, you can only request this after 47 seconds.",
        }),
      })
    })
    await openConfirmar(page, context)
    await page.getByRole("button", { name: "Reenviar link de confirmação" }).click()
    await expect(page.getByText("Aguarde 47s para pedir outro link.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Reenviar em 00:47" })).toBeDisabled()
    // O limite não se disfarça de enviado: a mensagem neutra não aparece.
    await expect(page.getByText(/já está a caminho/)).toHaveCount(0)
  })

  test("falha de rede não vira contador nem promessa", async ({ context, page }) => {
    await page.route("**/auth/v1/resend**", async (route) => {
      await route.abort("connectionrefused")
    })
    await openConfirmar(page, context)
    await page.getByRole("button", { name: "Reenviar link de confirmação" }).click()
    await expect(page.getByText("Verifique sua conexão e tente de novo.")).toBeVisible()
    await expect(page.getByText(/já está a caminho/)).toHaveCount(0)
  })

  test("painel expirado oferece envio novo, sem material vencido", async ({ context, page }) => {
    await openConfirmar(page, context, { url: "/auth/confirmar-email?estado=expirado" })
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Confira seu e-mail")
    await expect(page.getByText("Este link expirou ou já foi usado.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Enviar novo link" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Preciso de ajuda" })).toHaveAttribute(
      "href",
      "/recuperar-senha",
    )
    await expect(page.locator("input")).toHaveCount(0)
  })
})
