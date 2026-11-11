import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"
import { MEMBRO_SEMEADO, semearSessaoDeMembro } from "./entrada-real-ajuda"

const ORIGEM = "http://127.0.0.1:3000"
const CABECALHOS = { origin: ORIGEM, "x-bivaque-app": "bivaque-spa" }

function inscricao() {
  return {
    kind: "web",
    // Endpoint sintético de um serviço de push: nenhum envio real, só a linha
    // no banco. O destino precisa ser de um serviço conhecido (ADR item 1).
    destination: `https://updates.push.services.mozilla.com/wpush/v2/${randomUUID()}`,
    keys: { p256dh: "BOr3D2k9_1x2y3z4", auth: "BOr3D2k9_1x2" },
    label: "E2E",
  }
}

/**
 * RUN-029 — a inscrição de push da web instalada.
 *
 * Prova o ciclo da rota contra o banco com seed: gravar, reinscrever sem
 * duplicar e apagar. Não há envio real: o Web Push depende de chaves VAPID e
 * de um provedor, e o contrato desta rodada é a inscrição e a remoção.
 */
test.describe("RUN-029 — push web real", { tag: "@stateful" }, () => {
  test("grava, reinscreve e apaga a inscrição deste aparelho", async ({ page, context }) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    const corpo = inscricao()

    const primeira = await page.request.post("/api/app/push", {
      headers: CABECALHOS,
      data: corpo,
    })
    expect(primeira.status()).toBe(201)
    expect(await primeira.json()).toEqual({ inscrito: true })

    // Reinscrever o mesmo destino renova a linha, não duplica.
    const segunda = await page.request.post("/api/app/push", {
      headers: CABECALHOS,
      data: corpo,
    })
    expect(segunda.status()).toBe(201)

    const apagar = await page.request.delete("/api/app/push", {
      headers: CABECALHOS,
      data: { destination: corpo.destination },
    })
    expect(apagar.status()).toBe(200)
    expect(await apagar.json()).toEqual({ removidos: 1 })

    const repetido = await page.request.delete("/api/app/push", {
      headers: CABECALHOS,
      data: { destination: corpo.destination },
    })
    expect(await repetido.json()).toEqual({ removidos: 0 })
  })

  test("sem sessão é 401 e escrita sem o cabeçalho do app é recusada", async ({ request }) => {
    expect((await request.get("/api/app/push")).status()).toBe(401)
    expect(
      (
        await request.post("/api/app/push", {
          headers: { origin: ORIGEM },
          data: inscricao(),
        })
      ).status(),
    ).toBe(401)
  })
})
