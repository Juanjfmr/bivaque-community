import type { Page } from "@playwright/test"

export const ID_ANA = "00000000-0000-4000-8000-000000000001"
export const ID_PERGUNTA = "00000000-0000-4000-8000-000000000002"
export const ID_RESPOSTA = "00000000-0000-4000-8000-000000000003"

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
    id: ID_PERGUNTA,
    titulo: "Alguém indica um pediatra que atenda por convênio perto do centro?",
    categoria: "saude_bem_estar",
    criadaEm: "2026-11-01T12:00:00.000Z",
    autor: "Ana P.",
    propria: false,
    resolvida: false,
    respostas: 0,
    autorId: ID_ANA,
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    titulo: "Qual escola aceita matrícula de criança de quatro anos no contraturno?",
    categoria: "educacao",
    criadaEm: "2026-10-30T09:00:00.000Z",
    autor: "Carlos M.",
    propria: false,
    resolvida: true,
    respostas: 2,
    autorId: "00000000-0000-4000-8000-000000000005",
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
    falhaNaLeituraDeBloqueados = false,
  }: {
    comResposta?: boolean
    respostaPropria?: boolean
    perguntaPropria?: boolean
    jaBloqueada?: boolean
    falhaNoBloqueio?: boolean
    falhaNaLeituraDeBloqueados?: boolean
  } = {},
) {
  const perguntas = [...PERGUNTAS]
  let tentativasDeBloqueio = 0
  await page.route(/\/api\/app\/voce\/bloqueados$/, async (rota) => {
    if (rota.request().method() === "GET" && falhaNaLeituraDeBloqueados)
      return rota.fulfill({ status: 503, json: { erro: "leitura-indisponivel" } })
    if (rota.request().method() === "GET")
      return rota.fulfill({
        json: {
          bloqueados: jaBloqueada
            ? [{ id: ID_ANA, nome: "Ana P.", bloqueadoEm: "2026-11-01T12:00:00.000Z" }]
            : [],
        },
      })
    tentativasDeBloqueio += 1
    if (falhaNoBloqueio && tentativasDeBloqueio === 1)
      return rota.fulfill({ status: 503, json: { erro: "escrita-indisponivel" } })
    return rota.fulfill({ status: 201, json: { bloqueado: { id: ID_ANA } } })
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
          autorId: "00000000-0000-4000-8000-000000000001",
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
      const corpo = rota.request().postDataJSON() as { respostaId?: string }
      if (
        id !== ID_PERGUNTA ||
        (corpo.respostaId !== undefined && corpo.respostaId !== ID_RESPOSTA)
      )
        return rota.fulfill({ status: 404, json: { erro: "conteudo-nao-encontrado" } })
      return rota.fulfill({
        status: 201,
        json: { denuncia: { id: "00000000-0000-4000-8000-000000000006" } },
      })
    }
    if (acao === "respostas") {
      const corpo = (rota.request().postDataJSON() as { texto: string }).texto
      return rota.fulfill({
        status: 201,
        json: {
          resposta: { id: ID_RESPOSTA, corpo, criadaEm: new Date().toISOString() },
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
                id: ID_RESPOSTA,
                corpo: "Resposta de Ana.",
                autor: "Ana P.",
                autorId: ID_ANA,
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
