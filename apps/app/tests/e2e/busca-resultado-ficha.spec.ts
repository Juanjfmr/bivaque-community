import { expect, test } from "@playwright/test"
import {
  CIDADE_DA_BUSCA,
  caminhoAtual,
  NEGOCIO_DA_PROVA,
  simularBuscaDaProva,
  TERMO_DA_PROVA,
} from "./apoio"

/**
 * RUN-181 — o teste 3 do `global-search-flow` web, que morreu com o painel de
 * serviços: a busca da cidade acha o negócio e a ficha dele abre no app.
 *
 * A prova roda com a busca da prova (`simularBuscaDaProva`), como as demais de
 * tela: o que se mede é o caminho "termo no endereço → resultado de negócio →
 * ficha", não o conteúdo do banco. A negação de RLS que o mesmo teste cobria
 * continua no spec do servidor (`tests/e2e/global-search-flow.spec.ts`).
 *
 * O negócio achado é `negocio-ipiranga` ("Oficina Ipiranga"); a ficha responde
 * pelo contrato de `/api/app/negocios/<id>` que a tela do negócio lê.
 */

const NEGOCIO_DA_BUSCA = "negocio-ipiranga"

test("o resultado da busca abre a ficha do negócio no app", async ({ page }) => {
  await simularBuscaDaProva(page)
  await page.route(/\/api\/app\/negocios\/negocio-ipiranga(?:\?|$)/, async (rota) => {
    await rota.fulfill({
      json: {
        negocio: {
          ...NEGOCIO_DA_PROVA,
          id: NEGOCIO_DA_BUSCA,
          nome: "Oficina Ipiranga",
          categoriaNome: "Serviços",
          cidade: CIDADE_DA_BUSCA,
        },
      },
    })
  })

  await page.goto(`/app/busca?q=${TERMO_DA_PROVA}`)

  // O termo do endereço é a consulta e o resultado de negócio aparece com o
  // nome do negócio, não só a categoria.
  await expect(page.getByText(`5 resultados em ${CIDADE_DA_BUSCA}`)).toBeVisible()
  await expect(page.getByText("Oficina Ipiranga", { exact: true })).toBeVisible()

  // "Ver ficha": a pessoa sai da busca e aterrissa na ficha do negócio no app.
  await page.getByRole("button", { name: "Ver negócio: Oficina Ipiranga" }).click()
  await expect.poll(() => caminhoAtual(page)).toBe(`/app/negocio/${NEGOCIO_DA_BUSCA}`)
  await expect(page.getByRole("heading", { level: 1, name: "Oficina Ipiranga" })).toBeVisible()
})
