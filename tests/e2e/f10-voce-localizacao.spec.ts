import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, type Page, test } from "@playwright/test"
import {
  limparLocalizacaoSemeada,
  MEMBRO_SEMEADO,
  restaurarPerfilSemeado,
  semearSessaoDeMembro,
} from "./entrada-real-ajuda"

// F10/LOC-IMPL — o CEP do perfil (RUN-029). O CEP é opcional, a coordenada é
// derivada no servidor e nenhuma das duas volta ao cliente.
//
// O CEP usado aqui tem linha em public.cep_geocodes no seed (`69000000`), então
// o PUT resolve pelo cache e o teste não depende de rede nem de chave do Google.
//
// Pré-requisitos: banco local migrado e semeado, `npx pnpm@11.18.0 app:export`
// e o Next servindo `/app`.
//
//   node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs e2e tests/e2e/f10-voce-localizacao.spec.ts
//
// @stateful: grava o CEP da persona do seed e desfaz no fim; roda no lote
// serial (`--workers=1`).

const CAPTURAS = join(process.cwd(), ".visual", "run-029")
const CEP_SEMEADO = "69000-000"
const CEP_DIGITOS = "69000000"
const NOME_SEMEADO = "Ana Verificada"

/** Captura a tela no tema claro e no escuro, na largura do projeto atual. */
async function capturarEmDoisTemas(page: Page, projeto: string, etapa: string): Promise<void> {
  mkdirSync(CAPTURAS, { recursive: true })
  for (const tema of ["claro", "escuro"] as const) {
    await page.emulateMedia({ colorScheme: tema === "claro" ? "light" : "dark" })
    await page.screenshot({
      path: join(CAPTURAS, `${projeto}-${etapa}-${tema}.png`),
      fullPage: true,
    })
  }
  await page.emulateMedia({ colorScheme: "light" })
}

function semCoordenada(valor: unknown): boolean {
  const texto = JSON.stringify(valor)
  return !/latitude|longitude/i.test(texto)
}

test.describe("F10 — CEP do perfil no app", { tag: "@stateful" }, () => {
  // Rede de segurança: uma falha no meio não deixa CEP na persona nem o nome
  // editado para as próximas larguras.
  test.afterEach(async () => {
    await limparLocalizacaoSemeada(MEMBRO_SEMEADO)
    await restaurarPerfilSemeado(MEMBRO_SEMEADO, { nome: NOME_SEMEADO, bio: null })
  })

  test("o CEP grava pela tela, sobrevive ao recarregar e não vaza coordenada", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.goto("/app/voce")
    await expect(
      page.getByRole("heading", { level: 1, name: "Você" }),
      "a tela real não está em /app/voce: rode `npx pnpm@11.18.0 app:export`",
    ).toBeVisible({ timeout: 30_000 })

    // A persona do seed começa sem CEP.
    await page.getByRole("button", { name: "Editar" }).click()
    const campoCep = page.getByLabel("CEP")
    await expect(campoCep).toHaveValue("")

    // Grava o CEP pela tela. A máscara aparece no campo, mas o corpo do PUT vai
    // só com os dígitos — o servidor normaliza de novo, nunca confia no cliente.
    const gravacao = page.waitForResponse(
      (resposta) =>
        resposta.url().includes("/api/app/voce/localizacao") &&
        resposta.request().method() === "PUT",
      { timeout: 30_000 },
    )
    await campoCep.fill(CEP_DIGITOS)
    await expect(campoCep).toHaveValue(CEP_SEMEADO)
    await page.getByRole("button", { name: "Salvar" }).click()
    const respostaDoPut = await gravacao
    // O corpo é lido uma vez e reaproveitado: a mensagem de falha precisa do
    // status e do erro do servidor, e o teste segue com o mesmo JSON.
    const textoDoPut = await respostaDoPut.text()
    expect(
      respostaDoPut.ok(),
      `a gravação do CEP precisa responder com sucesso (HTTP ${respostaDoPut.status()}: ${textoDoPut})`,
    ).toBe(true)

    // O corpo do pedido não leva identidade nem coordenada; o do resposta
    // devolve o CEP formatado e a marca de definida, nunca latitude/longitude.
    const corpoDoPedido = respostaDoPut.request().postDataJSON() as Record<string, unknown>
    expect(corpoDoPedido).toEqual({ cep: CEP_DIGITOS })
    expect(Object.hasOwn(corpoDoPedido, "user_id"), "user_id não vem do corpo").toBe(false)
    const corpoDaResposta = JSON.parse(textoDoPut) as {
      localizacao?: { cep?: string | null; definida?: boolean }
    }
    expect(corpoDaResposta.localizacao).toEqual({ cep: CEP_SEMEADO, definida: true })
    expect(semCoordenada(corpoDaResposta), "a resposta não pode trazer coordenada").toBe(true)

    await expect(page.getByText(NOME_SEMEADO)).toBeVisible({ timeout: 30_000 })
    await capturarEmDoisTemas(page, testInfo.project.name, "voce-cep-gravado")

    // Depois de recarregar, o CEP volta do banco pela leitura da tela; o corpo
    // do GET também não carrega coordenada.
    const leitura = page.waitForResponse(
      (resposta) =>
        resposta.url().endsWith("/api/app/voce") && resposta.request().method() === "GET",
      { timeout: 30_000 },
    )
    await page.reload()
    const respostaDoGet = await leitura
    const corpoDoGet = (await respostaDoGet.json()) as {
      perfil?: { localizacao?: { cep?: string | null; definida?: boolean } }
    }
    expect(corpoDoGet.perfil?.localizacao).toEqual({ cep: CEP_SEMEADO, definida: true })
    expect(semCoordenada(corpoDoGet), "o GET não pode trazer coordenada").toBe(true)

    await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible({
      timeout: 30_000,
    })
    await page.getByRole("button", { name: "Editar" }).click()
    await expect(page.getByLabel("CEP"), "o CEP gravado precisa voltar na edição").toHaveValue(
      CEP_SEMEADO,
    )
    await capturarEmDoisTemas(page, testInfo.project.name, "voce-cep-recarregado")

    // CEP pela metade não pode apagar a localização em silêncio: o Salvar fica
    // desabilitado até os oito dígitos ou o campo vazio (limpeza explícita).
    await page.getByLabel("CEP").fill("690")
    await expect(page.getByRole("button", { name: "Salvar" })).toBeDisabled()
    await page.getByLabel("CEP").fill(CEP_SEMEADO)

    // Limpar apaga a localização: o corpo vai com `cep: null` e a resposta diz
    // que a localização não está mais definida.
    const limpeza = page.waitForResponse(
      (resposta) =>
        resposta.url().includes("/api/app/voce/localizacao") &&
        resposta.request().method() === "PUT",
      { timeout: 30_000 },
    )
    await page.getByLabel("CEP").fill("")
    await page.getByRole("button", { name: "Salvar" }).click()
    const respostaDaLimpeza = await limpeza
    expect(respostaDaLimpeza.ok()).toBe(true)
    expect(
      (respostaDaLimpeza.request().postDataJSON() as Record<string, unknown>)["cep"],
    ).toBeNull()
    const corpoDaLimpeza = (await respostaDaLimpeza.json()) as {
      localizacao?: { cep?: string | null; definida?: boolean }
    }
    expect(corpoDaLimpeza.localizacao).toEqual({ cep: null, definida: false })

    await page.reload()
    await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible({
      timeout: 30_000,
    })
    await page.getByRole("button", { name: "Editar" }).click()
    await expect(page.getByLabel("CEP"), "limpar precisa apagar o CEP").toHaveValue("")
  })
})
