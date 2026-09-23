// RUN-005 — a foto publicada aparece como foto.
//
// O compositor sempre enviou o arquivo de verdade, e a policy
// `event_photos_select_scoped` sempre autorizou a leitura a quem é membro da
// localidade da publicação. O que faltava era a tela: o cartão desenhava o
// CAMINHO do objeto como texto ("Foto: <path>"). O arquivo subia, a permissão
// existia, e ninguém via a imagem.
//
// A prova percorre o caminho inteiro num navegador — enviar, publicar,
// recarregar, ler de volta — porque o único jeito de provar que a foto aparece
// é vê-la aparecer. @stateful: escreve no feed compartilhado.
import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

// PNG 1x1 válido. O compositor reencoda no canvas antes de enviar (remoção de
// EXIF), então qualquer imagem legível serve de entrada.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

test.describe("@stateful foto da publicação", () => {
  test("a foto publicada aparece como imagem, não como caminho de arquivo", async ({ page }) => {
    await seedSession(page.context())
    await page.goto("/inicio")

    const ask = page.getByTestId("intent-pergunta")
    await expect(ask).toBeVisible({ timeout: 20000 })
    await ask.click()
    const dialog = page.getByRole("dialog", { name: "Criar publicação" })
    await expect(dialog).toBeVisible()

    await dialog.getByRole("button", { name: "Foto", exact: true }).click()
    await dialog.getByLabel("Selecionar foto").setInputFiles({
      name: "prova.png",
      mimeType: "image/png",
      buffer: PNG_1X1,
    })

    // Esperar o envio terminar antes de publicar: "Foto anexada" so aparece
    // quando o objeto ja esta no bucket. Sem isso o formulario publica sem
    // caminho e o cartao sai sem foto — foi o que esta prova pegou.
    await expect(dialog.getByText("Foto anexada")).toBeVisible({ timeout: 30_000 })

    const marker = `prova de foto ${Date.now()}`
    await dialog.getByLabel("Conteúdo").fill(marker)
    await dialog.getByRole("button", { name: "Publicar" }).click()
    await expect(dialog).toBeHidden({ timeout: 20_000 })

    // Recarrega antes de conferir: o feed se atualiza sozinho depois de
    // publicar, mas a corrida entre esse refresh e a asserção é do teste, não
    // do produto — e um teste que depende dela mente de vez em quando.
    await page.reload()
    await expect(page.getByRole("heading", { name: "Na comunidade" })).toBeVisible({
      timeout: 20_000,
    })

    const article = page.locator("article").filter({ hasText: marker }).first()
    await expect(article).toBeVisible({ timeout: 20_000 })

    // A imagem está no cartão, com src assinado do bucket privado.
    const photo = article.locator("img").last()
    await expect(photo).toBeVisible({ timeout: 20_000 })
    await expect(photo).toHaveAttribute("src", /token=|X-Amz-|sign/i)

    // E o caminho do arquivo não aparece mais como texto em lugar nenhum.
    await expect(page.getByText(/^Foto: /)).toHaveCount(0)
  })
})
