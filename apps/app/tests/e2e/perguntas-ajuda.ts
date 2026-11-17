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
    autorId: "u-ana",
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

export async function simularPerguntas(
  page: Page,
  {
    comResposta = false,
    respostaPropria = false,
    perguntaPropria = false,
    jaBloqueada = false,
    falhaNoBloqueio = false,
  }: {
    comResposta?: boolean
    respostaPropria?: boolean
    perguntaPropria?: boolean
    jaBloqueada?: boolean
    falhaNoBloqueio?: boolean
  } = {},
) {
  const perguntas = [...PERGUNTAS]
  await page.route(/\/api\/app\/voce\/bloqueados$/, async (rota) => {
    if (rota.request().method() === "GET")
      return rota.fulfill({ json: { bloqueados: jaBloqueada ? [{ id: "u-ana" }] : [] } })
    if (falhaNoBloqueio)
      return rota.fulfill({ status: 503, json: { erro: "escrita-indisponivel" } })
    return rota.fulfill({ status: 201, json: { bloqueado: { id: "u-ana" } } })
  })
  await page.route(/\/api\/app\/perguntas(?:\/|\?|$)/, async (rota) => {
    const url = new URL(rota.request().url())
    const [, , , id, acao] = url.pathname.split("/").filter(Boolean)
    if (id === undefined) {
      if (rota.request().method() === "POST") {
        const corpo = rota.request().postDataJSON() as { titulo: string; topico?: string }
        const criada = {
          id: "90000000-0000-4000-8000-000000000099",
          titulo: corpo.titulo,
          // O tópico escolhido é a categoria gravada; sem escolha, "outros".
          categoria: corpo.topico ?? "outros",
          criadaEm: new Date().toISOString(),
          autor: "Você",
          propria: true,
          resolvida: false,
          respostas: 0,
        }
        perguntas.unshift(criada)
        return rota.fulfill({ status: 201, json: { pergunta: { id: criada.id } } })
      }
      // O filtro de tópico é do servidor: a simulação respeita a query.
      const brutoTopico = url.searchParams.get("topico")
      const visiveis =
        brutoTopico === null || brutoTopico === ""
          ? perguntas
          : perguntas.filter((item) => item.categoria === brutoTopico)
      return rota.fulfill({
        json: { perguntas: visiveis, proximo: null, cidade: "Manaus", resolvidas: 1 },
      })
    }
    if (acao === "denuncia") {
      return rota.fulfill({ status: 201, json: { denuncia: { id: "denuncia-1" } } })
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
      json: {
        pergunta: { ...pergunta, propria: perguntaPropria, corpo: "", cidade: "Manaus" },
        respostas: comResposta
          ? [
              {
                id: "r-ana",
                corpo: "Resposta de Ana.",
                autor: "Ana P.",
                autorId: "u-ana",
                propria: respostaPropria,
                criadaEm: "2026-11-01T12:00:00.000Z",
                removida: false,
              },
            ]
          : [],
      },
    })
  })
}
