import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { simularVoce } from "./voce-ajuda"

// RUN-138 / ADR-20261112: CEP conhecido que nenhuma fonte localiza é guardado
// sem posição. A tela mostra o CEP salvo e avisa, sem jargão, que a distância
// ainda não pode ser calculada. A rota é simulada (mesmo contrato do servidor);
// a captura fica em .visual/run-138 para a conferência de três tamanhos e dois
// temas.
const CAPTURAS = join(process.cwd(), "..", "..", ".visual", "run-138")

test("CEP salvo sem posição avisa que a distância ainda não pode ser calculada", async ({
  page,
}, testInfo) => {
  await simularVoce(page, { distanciaDisponivel: false })
  await page.goto("/app/voce")

  const aviso = page.locator('[data-aviso="cep-sem-distancia"]')
  await expect(aviso).toBeVisible()
  await expect(aviso).toContainText("69020-000")
  await expect(aviso).toContainText("a distância até o seu bairro ainda não pode ser calculada")
  // Sem jargão de geocodificação na cara da pessoa.
  await expect(aviso).not.toContainText(/coordenada|geocodific/i)

  const transbordo = await page.locator("#conteudo").evaluate((elemento) => {
    return elemento.scrollWidth - elemento.clientWidth
  })
  expect(transbordo, "a tela não pode transbordar na horizontal").toBeLessThanOrEqual(1)

  mkdirSync(CAPTURAS, { recursive: true })
  for (const tema of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: tema })
    await page.screenshot({
      path: join(CAPTURAS, `${testInfo.project.name}-voce-cep-sem-coordenada-${tema}.png`),
      fullPage: true,
      animations: "disabled",
    })
  }
})
