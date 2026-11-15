import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, type Page, test } from "@playwright/test"
import {
  desfazerTransferenciaDaPersona,
  limparAfiliacaoDaPersona,
  MEMBRO_SEMEADO,
  semearSessaoDeMembro,
} from "./entrada-real-ajuda"

// F10 / RUN-170 — a paridade da transferência de cidade e da afiliação privada,
// contra o Next que serve `/app` e o Supabase local com seed. Pré-requisitos
// (os mesmos de tests/e2e/f10-voce-real.spec.ts):
//   * banco local migrado e semeado (`supabase/seed.sql`);
//   * `npx pnpm@11.18.0 app:export` (o build do app em apps/web/public/app);
//   * `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` no ambiente.
//
//   node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs e2e tests/e2e/f10-voce-paridade-real.spec.ts
//
// @stateful: a persona em transferência do seed é só LIDA; a declaração de
// mudança usa `visual@` e é desfeita no `afterEach` pelo hatch de suporte
// (`reverse_locality_transfer`, service_role) — o produto não tem desfazer
// (ADR-20261116), mas o banco de prova precisa voltar ao seed para a próxima
// largura. Roda no lote serial (--workers=1).

const CAPTURAS = join(process.cwd(), ".visual", "f10-paridade")

/** A persona do seed que já está de saída de Manaus e mora no Rio. */
const EM_TRANSFERENCIA = "membro-transferencia@bivaque.example.invalid"

async function capturar(page: Page, projeto: string, etapa: string): Promise<void> {
  mkdirSync(CAPTURAS, { recursive: true })
  await page.screenshot({
    path: join(CAPTURAS, `${projeto}-${etapa}.png`),
    fullPage: true,
  })
}

function emDias(dias: number): string {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * O id do Rio vem do catálogo público, como a tela: nada de uuid copiado de
 * fixture (o pgTAP e o seed são mundos separados).
 */
async function idDoRio(page: Page): Promise<string> {
  const resposta = await page.request.get("/api/localities/RJ")
  expect(resposta.ok(), "o catálogo público precisa responder").toBe(true)
  const corpo = (await resposta.json()) as { municipalities?: { id: string; cityName: string }[] }
  const rio = (corpo.municipalities ?? []).find((cidade) => cidade.cityName === "Rio de Janeiro")
  expect(rio, "o Rio precisa estar no catálogo semeado").toBeDefined()
  return rio?.id ?? ""
}

function cabecalhosDaPorta(page: Page): Record<string, string> {
  return { origin: new URL(page.url()).origin, "x-bivaque-app": "bivaque-spa" }
}

test.describe("F10 — paridade de cidade e afiliação no app", { tag: "@stateful" }, () => {
  test.afterEach(async () => {
    // Rede de segurança: se a tela falhar no meio, o banco volta ao seed antes
    // da próxima largura (o teste não termina com a persona em outro estado).
    await desfazerTransferenciaDaPersona(MEMBRO_SEMEADO)
    await limparAfiliacaoDaPersona(MEMBRO_SEMEADO)
  })

  test("quem já está em transferência vê a saída, não o formulário, e a segunda mudança é recusada", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, EM_TRANSFERENCIA)
    await page.goto("/app/voce")
    await expect(
      page.getByRole("heading", { level: 1, name: "Você" }),
      "a tela real não está em /app/voce: rode `npx pnpm@11.18.0 app:export`",
    ).toBeVisible({ timeout: 30_000 })

    // O GET leva a cidade com id e a saída: o campo aditivo vem do banco.
    const voce = (await (await page.request.get("/api/app/voce")).json()) as {
      perfil: {
        cidade: { id: string; nome: string }
        outbound: { id: string; nome: string; uf: string; endsAt: string; readOnly: boolean } | null
      }
    }
    expect(voce.perfil.cidade.nome).toBe("Rio de Janeiro")
    expect(voce.perfil.cidade.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(voce.perfil.outbound).not.toBeNull()
    expect(voce.perfil.outbound?.nome).toBe("Manaus")
    expect(voce.perfil.outbound?.uf).toBe("AM")
    expect(voce.perfil.outbound?.endsAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(voce.perfil.outbound?.readOnly).toBe(false)

    const cidade = page.locator('[data-secao="sim"]', { hasText: "Sua cidade" })
    const saida = cidade.locator('[data-aviso="saindo"]')
    await expect(saida).toContainText("Você está saindo de Manaus, AM")
    await expect(saida).toContainText("participa de lá até")
    await expect(saida).toContainText("Uma nova mudança fica disponível depois desse prazo.")
    await expect(
      cidade.getByRole("button", { name: "Mudar de cidade" }),
      "com saída em andamento o formulário não aparece",
    ).toHaveCount(0)
    await capturar(page, testInfo.project.name, "voce-em-transferencia")

    // A recusa do banco chega como a mensagem vigente, não como erro cru: a
    // pessoa em transferência que tentar de novo (por outra via) recebe a frase.
    const recusa = await page.request.post("/api/app/voce/cidade", {
      data: { destino: voce.perfil.outbound?.id, prazo: emDias(30) },
      headers: cabecalhosDaPorta(page),
    })
    expect(recusa.status(), "segunda mudança é 23505 na rota").toBe(409)
    expect((await recusa.json()).mensagem).toContain("mudança em andamento")

    // Sem porta, a escrita é CSRF mesmo com sessão válida; e destino fora do
    // formato que a rota aceita é 400 antes de qualquer ida ao banco.
    const semPorta = await page.request.post("/api/app/voce/cidade", {
      data: { destino: voce.perfil.outbound?.id, prazo: emDias(30) },
      headers: { origin: new URL(page.url()).origin },
    })
    expect(semPorta.status(), "escrita sem x-bivaque-app").toBe(403)

    const destinoInvalido = await page.request.post("/api/app/voce/cidade", {
      data: { destino: "manaus", prazo: emDias(30) },
      headers: cabecalhosDaPorta(page),
    })
    expect(destinoInvalido.status(), "destino que não é id de cidade").toBe(400)
  })

  test("declarar a mudança pelo app: a saída aparece, sobrevive ao recarregar e a cidade nova vale", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto("/app/voce")
    await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible({
      timeout: 30_000,
    })
    const rio = await idDoRio(page)

    const cidade = page.locator('[data-secao="sim"]', { hasText: "Sua cidade" })
    await expect(cidade.getByText("Sua cidade é")).toContainText("Manaus")
    await expect(cidade.locator('[data-aviso="saindo"]')).toHaveCount(0)

    await cidade.getByRole("combobox", { name: "Estado" }).click()
    await page.getByRole("option", { name: "RJ", exact: true }).click()
    await cidade.getByRole("combobox", { name: "Cidade" }).click()
    await page.getByRole("option", { name: "Rio de Janeiro", exact: true }).click()

    await cidade.getByRole("button", { name: "Mudar de cidade" }).click()
    const dialogo = page.getByRole("alertdialog")
    await expect(dialogo).toContainText("Mudar para Rio de Janeiro?")
    await expect(dialogo).toContainText("Não dá para desfazer pelo app.")

    const gravou = page.waitForResponse(
      (resposta) =>
        resposta.url().includes("/api/app/voce/cidade") && resposta.request().method() === "POST",
      { timeout: 30_000 },
    )
    await dialogo.getByRole("button", { name: "Mudar", exact: true }).click()
    const resposta = await gravou
    expect(resposta.ok(), "a declaração precisa responder com sucesso").toBe(true)
    const corpo = (await resposta.json()) as {
      perfil: { cidade: { id: string; nome: string }; outbound: { nome: string } | null }
    }
    expect(corpo.perfil.cidade.id, "a resposta devolve o destino que o banco gravou").toBe(rio)
    expect(corpo.perfil.outbound?.nome).toBe("Manaus")

    const saida = cidade.locator('[data-aviso="saindo"]')
    await expect(saida).toContainText("Você está saindo de Manaus, AM")
    await expect(saida).toContainText("participa de lá até")
    await expect(cidade.getByRole("button", { name: "Mudar de cidade" })).toHaveCount(0)
    await expect(page.locator('[data-tela="voce"]')).toContainText("Rio de Janeiro")
    await capturar(page, testInfo.project.name, "voce-mudou-de-cidade")

    // Gravação que sobrevive ao recarregamento: a tela lê do banco.
    await page.reload()
    await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible({
      timeout: 30_000,
    })
    const depois = page.locator('[data-secao="sim"]', { hasText: "Sua cidade" })
    await expect(depois.locator('[data-aviso="saindo"]')).toContainText("Manaus, AM")
    await expect(depois.getByRole("button", { name: "Mudar de cidade" })).toHaveCount(0)
    const relido = (await (await page.request.get("/api/app/voce")).json()) as {
      perfil: { cidade: { nome: string }; outbound: { nome: string } | null }
    }
    expect(relido.perfil.cidade.nome).toBe("Rio de Janeiro")
    expect(relido.perfil.outbound?.nome).toBe("Manaus")
  })

  test("Força Armada e OM: grava privado, sobrevive ao recarregar e limpar apaga", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto("/app/voce")
    await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible({
      timeout: 30_000,
    })

    const secao = page.locator('[data-secao="sim"]', { hasText: "Força Armada e OM" })
    await expect(secao).toContainText("Opcional e privado — outras pessoas não veem.")
    // O seed não declara nada para esta persona: o campo começa vazio.
    await expect(secao.getByRole("combobox", { name: "Força Armada" })).toContainText("Nenhuma")
    await expect(secao.getByLabel("Organização Militar (OM)")).toHaveValue("")

    await secao.getByRole("combobox", { name: "Força Armada" }).click()
    await page.getByRole("option", { name: "Marinha", exact: true }).click()
    await secao.getByLabel("Organização Militar (OM)").fill("12º BIS")
    const gravou = page.waitForResponse(
      (resposta) =>
        resposta.url().includes("/api/app/voce/afiliacao") &&
        resposta.request().method() === "PUT",
      { timeout: 30_000 },
    )
    await secao.getByRole("button", { name: "Gravar Força e OM" }).click()
    expect((await gravou).ok(), "a gravação precisa responder com sucesso").toBe(true)
    await expect(secao.getByRole("status")).toContainText("Salvo.")
    await capturar(page, testInfo.project.name, "voce-afiliacao")

    // O que ficou é privado: `is_visible` é false mesmo sem o corpo pedir nada.
    const lida = (await (await page.request.get("/api/app/voce/afiliacao")).json()) as {
      afiliacao: { armedForce: string | null; om: string | null }
    }
    expect(lida.afiliacao).toEqual({ armedForce: "marinha", om: "12º BIS" })

    // Corpo com campo de visibilidade é recusado: o app não tem toggle.
    const comVisibilidade = await page.request.put("/api/app/voce/afiliacao", {
      data: { armedForce: "marinha", is_visible: true },
      headers: cabecalhosDaPorta(page),
    })
    expect(comVisibilidade.status(), "visibilidade no corpo é 400").toBe(400)

    await page.reload()
    const depois = page.locator('[data-secao="sim"]', { hasText: "Força Armada e OM" })
    await expect(depois.getByRole("combobox", { name: "Força Armada" })).toContainText("Marinha")
    await expect(depois.getByLabel("Organização Militar (OM)")).toHaveValue("12º BIS")

    // Limpar o campo é o apagar que existe: "Nenhuma" e OM em branco.
    await depois.getByRole("combobox", { name: "Força Armada" }).click()
    await page.getByRole("option", { name: "Nenhuma", exact: true }).click()
    await depois.getByLabel("Organização Militar (OM)").fill("")
    await depois.getByRole("button", { name: "Gravar Força e OM" }).click()
    await expect(depois.getByRole("status")).toContainText("Salvo.")

    await page.reload()
    const limpo = page.locator('[data-secao="sim"]', { hasText: "Força Armada e OM" })
    await expect(limpo.getByRole("combobox", { name: "Força Armada" })).toContainText("Nenhuma")
    await expect(limpo.getByLabel("Organização Militar (OM)")).toHaveValue("")
    const apagada = (await (await page.request.get("/api/app/voce/afiliacao")).json()) as {
      afiliacao: { armedForce: string | null; om: string | null }
    }
    expect(apagada.afiliacao, "limpar apaga as linhas").toEqual({ armedForce: null, om: null })
  })
})