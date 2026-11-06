import type { Page } from "@playwright/test"
import { simularInicio } from "./inicio-ajuda"
import { simularPerguntas } from "./perguntas-ajuda"

export async function simularCriar(page: Page) {
  await simularInicio(page)
  await simularPerguntas(page)
  const anuncios: Record<string, unknown>[] = []
  await page.route(/\/api\/app\/mercado(?:\/|\?|$)/, async (rota) => {
    const req = rota.request()
    const url = new URL(req.url())
    if (url.pathname === "/api/app/mercado" && req.method() === "POST") {
      const dados = req.postDataJSON() as {
        chave: string
        titulo: string
        descricao: string
        bairro: string
        preco: string
      }
      const anuncio = {
        id: dados.chave,
        tipo: "item",
        titulo: dados.titulo,
        descricao: dados.descricao,
        bairro: dados.bairro,
        precoCents: Math.round(Number(dados.preco.replace(",", ".")) * 100),
        cidade: "Manaus",
        status: "active",
        condicao: "used",
        categoria: "outros",
        foto: null,
        deal: null,
        quartos: null,
        areaM2: null,
        condoFeeCents: null,
        tipoImovel: null,
        criadoEm: new Date().toISOString(),
      }
      anuncios.push(anuncio)
      return rota.fulfill({ status: 201, json: { anuncio: { id: anuncio.id } } })
    }
    if (url.pathname.endsWith("/meus"))
      return rota.fulfill({ json: { anuncios, proximo: null, cidade: "Manaus" } })
    const anuncio = anuncios.find((item) => url.pathname.endsWith(`/${item["id"]}`))
    return anuncio
      ? rota.fulfill({
          json: {
            anuncio: {
              ...anuncio,
              endereco: null,
              donoNome: "Você",
              fotos: [],
              meu: true,
              salvo: false,
            },
          },
        })
      : rota.fulfill({ status: 404, json: { erro: "nao-encontrado" } })
  })
}
