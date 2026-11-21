import { resolve } from "node:path"
import { expect, type Page, test } from "@playwright/test"
import { simularGrupos } from "./grupos-ajuda"

for (const tema of ["claro", "escuro"]) {
  test(`administra pedidos e regras e compartilha no tema ${tema}`, async ({ page }) => {
    await simularGrupos(page, { membro: true })
    await page.emulateMedia({ colorScheme: tema === "escuro" ? "dark" : "light" })
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { value: undefined })
      Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => {} } })
    })
    let regras = "Regra anterior"
    let pedido = true
    await page.route(/\/api\/app\/grupos\/g-futebol(?:\/|\?|$)/, async (route) => {
      const url = new URL(route.request().url())
      const path = url.pathname
      if (path.endsWith("/pedidos/u1")) {
        pedido = false
        await route.fulfill({ status: 204 })
        return
      }
      if (path.endsWith("/pedidos")) {
        await route.fulfill({
          json: {
            pedidos: pedido ? [{ id: "u1", nome: "Ana", motivo: "Quero participar" }] : [],
            proximo: null,
          },
        })
        return
      }
      if (path.endsWith("/membros")) {
        await route.fulfill({
          json: {
            membros: [
              { id: "dono", nome: "Dona", papel: "owner" },
              { id: "u1", nome: "Ana", papel: "member" },
            ],
          },
        })
        return
      }
      if (path.endsWith("/regras")) {
        regras = route.request().postDataJSON().regras
        await route.fulfill({ status: 204 })
        return
      }
      if (path.endsWith("/g-futebol")) {
        await route.fulfill({
          json: {
            grupo: {
              id: "g-futebol",
              nome: "Futebol",
              descricao: "",
              regras,
              fechado: false,
              membro: true,
              pendente: false,
              admin: true,
              dono: true,
              membros: 2,
              fixada: null,
            },
            cidade: "Manaus",
            publicacoes: [],
            proximo: null,
          },
        })
        return
      }
      await route.fallback()
    })
    await page.goto("/app/grupo/g-futebol")
    await page.evaluate((valor) => {
      document.documentElement.dataset["tema"] = valor
    }, tema)
    const largura = page.viewportSize()?.width
    if (largura === 375 || largura === 768 || largura === 1440) {
      await expect(page.getByRole("button", { name: "Convidar" })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await page.screenshot({
        path: resolve(process.cwd(), `../../.visual/troca-003/grupo-${largura}-${tema}.png`),
        fullPage: true,
        animations: "disabled",
      })
    }
    await page.getByRole("button", { name: "Convidar" }).click()
    await expect(page.getByText("Link copiado.")).toBeVisible()
    await page.getByRole("button", { name: "Administrar grupo" }).click()
    await expect(page.getByRole("heading", { name: "Administrar grupo" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Remover" })).toBeVisible()
    if (largura === 375 || largura === 768 || largura === 1440) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await page.screenshot({
        path: resolve(process.cwd(), `../../.visual/troca-003/administrar-${largura}-${tema}.png`),
        fullPage: true,
        animations: "disabled",
      })
    }
    await expect(page.getByText("Quero participar")).toBeVisible()
    await page.getByRole("button", { name: "Aprovar" }).click()
    await expect(page.getByText("Pedido aprovado.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Salvar regras" })).toBeDisabled()
    await expect(page.getByLabel("Regras do grupo")).toHaveValue("Regra anterior")
    await page.getByLabel("Regras do grupo").fill("Nova regra")
    await expect(page.getByRole("button", { name: "Salvar regras" })).toBeEnabled()
    await page.getByRole("button", { name: "Salvar regras" }).click()
    await expect(page.getByText("Regras salvas.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Salvar regras" })).toBeDisabled()
    await page.reload()
    await expect(page.getByLabel("Regras do grupo")).toHaveValue("Nova regra")
  })
}

test("membro não vê administração e recebe recusa ao abrir o endereço", async ({ page }) => {
  await simularGrupos(page, { membro: true })
  await page.goto("/app/grupo/g-pets")
  await expect(page.getByRole("button", { name: "Administrar grupo" })).toHaveCount(0)
  await page.goto("/app/grupo/g-pets/administrar")
  await expect(page.getByText("Você não administra este grupo.")).toBeVisible()
})

async function administracaoSimulada(page: Page, dono = true, falha = 0) {
  await simularGrupos(page, { membro: true })
  const chamadas: string[] = []
  await page.route(/\/api\/app\/grupos\/g-futebol(?:\/|\?|$)/, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() !== "GET") {
      chamadas.push(`${request.method()} ${path}`)
      await route.fulfill({
        status: falha || 204,
        ...(falha ? { json: { erro: "recusado" } } : {}),
      })
    } else if (path.endsWith("/membros")) {
      await route.fulfill({
        json: {
          membros: [
            { id: "dono", nome: "Dona", papel: "owner" },
            { id: "moderador", nome: "Moderadora", papel: "moderator" },
            { id: "membro", nome: "Pessoa", papel: "member" },
          ],
        },
      })
    } else if (path.endsWith("/pedidos")) {
      await route.fulfill({ json: { pedidos: [], proximo: null } })
    } else if (path.endsWith("/g-futebol")) {
      await route.fulfill({
        json: {
          grupo: {
            id: "g-futebol",
            nome: "Futebol",
            descricao: "",
            regras: "Regra anterior",
            fechado: false,
            membro: true,
            pendente: false,
            admin: true,
            dono,
            membros: 3,
            fixada: null,
          },
          cidade: "Manaus",
          publicacoes: [],
          proximo: null,
        },
      })
    } else {
      await route.fallback()
    }
  })
  return chamadas
}

for (const dono of [true, false]) {
  test(`${dono ? "dono" : "moderador"} vê apenas suas ações e não age sobre si`, async ({
    page,
  }) => {
    await administracaoSimulada(page, dono)
    await page.goto("/app/grupo/g-futebol/administrar")
    await expect(page.getByText("Pedidos de entrada")).toBeVisible()
    await expect(page.getByLabel("Regras do grupo")).toBeVisible()
    const pessoa = page
      .locator("div")
      .filter({ has: page.getByText("Pessoa", { exact: true }) })
      .filter({ has: page.getByRole("button", { name: "Remover" }) })
      .last()
    await expect(pessoa.getByRole("button", { name: "Remover" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Passar a administração" })).toHaveCount(
      dono ? 2 : 0,
    )
    await expect(page.getByRole("button", { name: "Excluir grupo" })).toHaveCount(dono ? 1 : 0)
    const proprio = page.getByText(dono ? "Dona" : "Moderadora", { exact: true }).locator("..")
    await expect(
      proprio.getByRole("button", { name: /Remover|Passar a administração/ }),
    ).toHaveCount(0)
  })
}

for (const acao of ["Remover", "Passar a administração", "Excluir grupo"]) {
  test(`${acao}: cancelar não envia e confirmar envia uma vez`, async ({ page }) => {
    const chamadas = await administracaoSimulada(page)
    await page.goto("/app/grupo/g-futebol/administrar")
    const botao =
      acao === "Excluir grupo"
        ? page.getByRole("button", { name: acao })
        : page
            .getByText("Pessoa", { exact: true })
            .locator("..")
            .getByRole("button", { name: acao })
    await botao.click()
    const dialogo = page.getByRole("dialog")
    await expect(dialogo).toBeVisible()
    await dialogo.getByRole("button", { name: "Cancelar" }).click()
    expect(chamadas).toHaveLength(0)
    await botao.click()
    await dialogo.getByRole("button", { name: "Confirmar" }).click()
    await expect.poll(() => chamadas.length).toBe(1)
    const esperado =
      acao === "Remover"
        ? "DELETE /api/app/grupos/g-futebol/membros/membro"
        : acao === "Excluir grupo"
          ? "DELETE /api/app/grupos/g-futebol"
          : "POST /api/app/grupos/g-futebol/administracao"
    expect(chamadas).toEqual([esperado])
  })
}

for (const status of [500, 403]) {
  test(`falha ${status} ao remover preserva a lista`, async ({ page }) => {
    const chamadas = await administracaoSimulada(page, true, status)
    await page.goto("/app/grupo/g-futebol/administrar")
    await page
      .getByText("Pessoa", { exact: true })
      .locator("..")
      .getByRole("button", { name: "Remover" })
      .click()
    const dialogo = page.getByRole("dialog")
    await dialogo.getByRole("button", { name: "Confirmar" }).click()
    await expect(dialogo.getByRole("alert")).toContainText("Não foi possível concluir")
    await dialogo.getByRole("button", { name: "Cancelar" }).click()
    await expect(page.getByText("Pessoa", { exact: true })).toBeVisible()
    expect(chamadas).toHaveLength(1)
  })
  test(`falha ${status} ao salvar regras preserva o texto salvo`, async ({ page }) => {
    const chamadas = await administracaoSimulada(page, true, status)
    await page.goto("/app/grupo/g-futebol/administrar")
    await page.getByLabel("Regras do grupo").fill("Tentativa de alteração")
    await page.getByRole("button", { name: "Salvar regras" }).click()
    await expect(page.getByRole("alert")).toContainText("Não foi possível salvar as regras")
    await page.reload()
    await expect(page.getByLabel("Regras do grupo")).toHaveValue("Regra anterior")
    expect(chamadas).toHaveLength(1)
  })
}

test("excluir volta à Comunidade e avisa uma única vez", async ({ page }) => {
  await administracaoSimulada(page)
  await page.goto("/app/grupo/g-futebol/administrar")
  await page.getByRole("button", { name: "Excluir grupo" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Confirmar" }).click()
  await expect(page).toHaveURL(/\/app\/comunidade/)
  await expect(page.getByText("Grupo excluído.")).toHaveCount(1)
  await page.reload()
  await expect(page.getByText("Grupo excluído.")).toHaveCount(0)
})

for (const compartilhar of [true, false]) {
  test(`convite ${compartilhar ? "compartilha" : "copia"} somente o link do grupo`, async ({
    page,
  }) => {
    await administracaoSimulada(page)
    await page.addInitScript((usarShare) => {
      Object.defineProperty(navigator, "share", {
        value: usarShare
          ? async (dados: ShareData) => {
              sessionStorage.setItem("share-teste", dados.url ?? "")
            }
          : undefined,
      })
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async (url: string) => {
            sessionStorage.setItem("clipboard-teste", url)
          },
        },
      })
    }, compartilhar)
    await page.goto("/app/grupo/g-futebol?token=falso")
    await page.getByRole("button", { name: "Convidar" }).click()
    await expect
      .poll(() =>
        page.evaluate(
          (chave) => sessionStorage.getItem(chave),
          compartilhar ? "share-teste" : "clipboard-teste",
        ),
      )
      .toBe(new URL("/app/grupo/g-futebol", page.url()).href)
    if (!compartilhar) await expect(page.getByText("Link copiado.")).toBeVisible()
  })
}

test("pessoa de outra cidade recebe recusa sem ações do grupo", async ({ page }) => {
  await simularGrupos(page)
  await page.route(/\/api\/app\/grupos\/g-futebol(?:\?|$)/, (route) =>
    route.fulfill({ status: 403, json: { erro: "negado" } }),
  )
  await page.goto("/app/grupo/g-futebol")
  await expect(page.getByText("Sua conta não tem acesso a este grupo.")).toBeVisible()
  await expect(
    page.getByRole("button", {
      name: /Convidar|Administrar grupo|Remover|Excluir grupo|Passar a administração/,
    }),
  ).toHaveCount(0)
})
