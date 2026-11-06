import type { Page } from "@playwright/test"

/**
 * Simula `/api/app/perguntas` para os specs que medem a tela da Comunidade e da
 * pergunta. O `vite preview` serve só o build do app — não existe `/api` ali —,
 * e sem isto as duas telas abrem no estado de falha.
 *
 * O corpo é o mesmo do servidor (`apps/web/app/api/app/perguntas`): campo
 * obrigatório que faltar derruba o contrato em `lib/dados/perguntas`.
 */
const PERGUNTAS = [
  {
    id: "a1",
    titulo: "Alguém indica um pediatra que atenda por convênio perto do centro?",
    categoria: "saude_bem_estar",
    criadaEm: "2026-11-01T12:00:00.000Z",
    autor: "Ana P.",
    propria: false,
    resolvida: false,
    respostas: 0,
  },
  {
    id: "q2",
    titulo: "Qual escola aceita matrícula de criança de quatro anos no contraturno?",
    categoria: "educacao",
    criadaEm: "2026-10-30T09:00:00.000Z",
    autor: "Carlos M.",
    propria: false,
    resolvida: true,
    respostas: 2,
  },
]

export async function simularPerguntas(page: Page) {
  const perguntas = [...PERGUNTAS]
  await page.route(/\/api\/app\/perguntas(?:\/|\?|$)/, async (rota) => {
    const url = new URL(rota.request().url())
    const [, , , id, acao] = url.pathname.split("/").filter(Boolean)
    if (id === undefined) {
      if (rota.request().method() === "POST") {
        const corpo = rota.request().postDataJSON() as { titulo: string }
        const criada = {
          id: "90000000-0000-4000-8000-000000000099",
          titulo: corpo.titulo,
          categoria: "outros",
          criadaEm: new Date().toISOString(),
          autor: "Você",
          propria: true,
          resolvida: false,
          respostas: 0,
        }
        perguntas.unshift(criada)
        return rota.fulfill({ status: 201, json: { pergunta: { id: criada.id } } })
      }
      return rota.fulfill({
        json: { perguntas, proximo: null, cidade: "Manaus", resolvidas: 1 },
      })
    }
    if (acao === "respostas") {
      const corpo = (rota.request().postDataJSON() as { texto: string }).texto
      return rota.fulfill({
        status: 201,
        json: {
          resposta: { id: `resposta-${Date.now()}`, corpo, criadaEm: new Date().toISOString() },
        },
      })
    }
    const pergunta = perguntas.find((item) => item.id === id)
    if (pergunta === undefined) {
      return rota.fulfill({ status: 404, json: { erro: "pergunta-nao-encontrada" } })
    }
    return rota.fulfill({
      json: { pergunta: { ...pergunta, corpo: "", cidade: "Manaus" }, respostas: [] },
    })
  })
}
