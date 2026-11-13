import type { Page } from "@playwright/test"

/**
 * O apoio do lote RUN-140 (formulários do Criar e destinos).
 *
 * Fica separado do `apoio.ts` porque os lotes de tela rodam em paralelo: aqui
 * mora só o que este lote precisa — a criação de encontro e o vazio de
 * "Resolvidas" na Comunidade. O corpo das respostas é o mesmo dos contratos em
 * `lib/dados/eventos` e `lib/dados/perguntas`; campo obrigatório que faltar
 * derruba o contrato do cliente.
 */

/** A cidade que a casca da prova mostra: os destinos a exibem no cabeçalho. */
export const CIDADE_DO_LOTE = "Manaus"

type EncontroSimulado = {
  id: string
  titulo: string
  descricao: string | null
  local: string | null
  comecaEm: string
  terminaEm: string | null
  situacao: string
  cidade: string
}

/**
 * Simula `/api/app/eventos` (POST e agenda) e `/api/app/eventos/<id>`.
 *
 * `recusas` é quantas criações falham com 503 antes de gravar: a primeira
 * tentativa prova a falha do servidor com o texto preservado, a segunda grava.
 */
export async function simularEncontros(page: Page, opcoes: { recusas?: number } = {}) {
  let recusas = opcoes.recusas ?? 0
  let sequencia = 1
  const encontros = new Map<string, EncontroSimulado>()
  await page.route(/\/api\/app\/eventos(?:\/|\?|$)/, async (rota) => {
    const request = rota.request()
    const url = new URL(request.url())
    const partes = url.pathname
      .replace(/^\/api\/app\/eventos\/?/, "")
      .split("/")
      .filter(Boolean)
    if (partes.length === 0) {
      if (request.method() === "POST") {
        if (recusas > 0) {
          recusas -= 1
          await rota.fulfill({ status: 503, json: { erro: "escrita-indisponivel" } })
          return
        }
        const corpo = request.postDataJSON() as {
          titulo: string
          descricao?: string
          local?: string
          comecaEm: string
        }
        const encontro: EncontroSimulado = {
          id: `90000000-0000-4000-8000-00000000001${sequencia}`,
          titulo: corpo.titulo,
          descricao: corpo.descricao ?? "",
          local: corpo.local ?? "",
          comecaEm: corpo.comecaEm,
          terminaEm: null,
          situacao: "upcoming",
          cidade: CIDADE_DO_LOTE,
        }
        sequencia += 1
        encontros.set(encontro.id, encontro)
        await rota.fulfill({ status: 201, json: { evento: { id: encontro.id } } })
        return
      }
      await rota.fulfill({
        json: {
          eventos: [...encontros.values()].map((encontro) => ({
            id: encontro.id,
            titulo: encontro.titulo,
            local: encontro.local,
            comecaEm: encontro.comecaEm,
            situacao: encontro.situacao,
          })),
          proximo: null,
          cidade: CIDADE_DO_LOTE,
        },
      })
      return
    }
    const encontro = encontros.get(partes[0] ?? "")
    if (encontro === undefined) {
      await rota.fulfill({ status: 404, json: { erro: "nao-encontrado" } })
      return
    }
    await rota.fulfill({
      json: {
        evento: encontro,
        presenca: { confirmados: 0, minha: null },
        souOrganizador: true,
        visitante: false,
      },
    })
  })
}

/**
 * A Comunidade sem nenhuma indicação resolvida: o filtro "Resolvidas" vazio
 * precisa dizer que não há resolvida — não que a cidade não perguntou nada.
 * Registre depois do `simularPerguntas`, que atende o resto.
 */
export async function simularSemResolvidas(page: Page) {
  await page.route(/\/api\/app\/perguntas(?:\/|\?|$)/, async (rota) => {
    const url = new URL(rota.request().url())
    if (rota.request().method() === "GET" && url.searchParams.get("filtro") === "resolvidas") {
      await rota.fulfill({
        json: { perguntas: [], proximo: null, cidade: CIDADE_DO_LOTE, resolvidas: 0 },
      })
      return
    }
    await rota.fallback()
  })
}
