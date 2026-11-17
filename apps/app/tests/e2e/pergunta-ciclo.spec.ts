import { expect, type Page, test } from "@playwright/test"

/**
 * F09 lote 2 (RUN-185) — o ciclo de vida que a tela antiga `/indicacoes/[id]`
 * fazia e o app passa a fazer: editar e excluir a própria pergunta e as próprias
 * respostas, marcar como resolvida sem resposta, compartilhar o link, abrir o
 * verbete do Guia que nasceu de uma resposta e ler a marca "editada".
 *
 * O `vite preview` serve só o build do app — não existe `/api` ali —, então as
 * rotas são simuladas com o mesmo corpo do servidor. O estado é do teste: editar
 * muda o que a próxima leitura devolve, como no banco. A prova negativa é a
 * outra metade: o menu de quem NÃO escreveu o conteúdo não oferece editar nem
 * excluir.
 *
 * Este spec é provado em 375, 768 e 1440 (o ciclo é o mesmo nas três); os outros
 * tamanhos do config ficam de fora para o spec medir o que o contrato pede.
 */

const TAMANHOS = [375, 768, 1440]

const ID_PERGUNTA = "00000000-0000-4000-8000-0000000000a1"
const ID_RESPOSTA = "00000000-0000-4000-8000-0000000000b1"
const ID_VERBETE = "00000000-0000-4000-8000-0000000000c1"
const DATA = "2026-11-01T12:00:00.000Z"

type RespostaSimulada = {
  id: string
  corpo: string
  autor: string
  autorId: string
  propria: boolean
  criadaEm: string
  removida: boolean
  editada: boolean
  verbete: { id: string; nome: string } | null
}

type Opcoes = {
  /** Quem está na sessão escreveu a pergunta. */
  perguntaPropria?: boolean
  /** Quem está na sessão escreveu a resposta. */
  respostaPropria?: boolean
  comResposta?: boolean
  /** A resposta virou verbete aprovado no Guia. */
  comVerbete?: boolean
}

async function simularCiclo(page: Page, opcoes: Opcoes = {}) {
  const pergunta = {
    id: ID_PERGUNTA,
    titulo: "Alguém indica um pediatra que atenda pelo convênio?",
    corpo: "Perto do centro.",
    categoria: "saude_bem_estar",
    criadaEm: DATA,
    editada: false,
    resolvida: false,
    resolvidaPorResposta: null as string | null,
    propria: opcoes.perguntaPropria === true,
    autor: opcoes.perguntaPropria === true ? "Você" : "Ana P.",
    autorId: "00000000-0000-4000-8000-000000000001",
    cidade: "Manaus",
    grupo: null,
    salva: false,
  }
  const respostas: RespostaSimulada[] =
    opcoes.comResposta === true
      ? [
          {
            id: ID_RESPOSTA,
            corpo: "A Dra. Helena atende pelo convênio no centro.",
            autor: opcoes.respostaPropria === true ? "Você" : "Ana P.",
            autorId: "00000000-0000-4000-8000-000000000001",
            propria: opcoes.respostaPropria === true,
            criadaEm: DATA,
            removida: false,
            editada: false,
            verbete: opcoes.comVerbete === true ? { id: ID_VERBETE, nome: "Dra. Helena" } : null,
          },
        ]
      : []

  await page.route(/\/api\/app\/perguntas/, async (rota) => {
    const url = new URL(rota.request().url())
    const [, , , id, acao, respostaId] = url.pathname.split("/").filter(Boolean)
    const metodo = rota.request().method()

    // A lista da Comunidade, para onde a exclusão da pergunta leva.
    if (id === undefined) {
      return rota.fulfill({
        json: { perguntas: [], proximo: null, cidade: "Manaus", resolvidas: 0 },
      })
    }
    if (id !== ID_PERGUNTA) {
      return rota.fulfill({ status: 404, json: { erro: "pergunta-nao-encontrada" } })
    }
    if (acao === "resolucao") {
      pergunta.resolvida = true
      pergunta.resolvidaPorResposta = null
      return rota.fulfill({ json: { resolvida: true, resolvidaPorResposta: null } })
    }
    if (acao === "salvo") {
      return rota.fulfill({ json: { salvo: metodo === "PUT" } })
    }
    if (acao === "respostas" && respostaId !== undefined) {
      const alvo = respostas.find((item) => item.id === respostaId)
      if (alvo === undefined) {
        return rota.fulfill({ status: 404, json: { erro: "resposta-nao-encontrada" } })
      }
      if (metodo === "DELETE") {
        respostas.splice(respostas.indexOf(alvo), 1)
        return rota.fulfill({ json: { removido: true } })
      }
      const corpo = rota.request().postDataJSON() as { texto: string }
      alvo.corpo = corpo.texto
      alvo.editada = true
      return rota.fulfill({
        json: { resposta: { id: alvo.id, corpo: alvo.corpo, editada: true } },
      })
    }
    if (acao === "respostas") {
      const corpo = rota.request().postDataJSON() as { texto: string }
      return rota.fulfill({
        status: 201,
        json: { resposta: { id: "nova", corpo: corpo.texto, criadaEm: DATA } },
      })
    }
    if (metodo === "PATCH") {
      const corpo = rota.request().postDataJSON() as { titulo: string; assunto: string }
      pergunta.titulo = corpo.titulo.trim()
      pergunta.corpo = corpo.assunto.trim()
      pergunta.editada = true
      return rota.fulfill({
        json: {
          pergunta: {
            id: pergunta.id,
            titulo: pergunta.titulo,
            corpo: pergunta.corpo,
            editada: true,
          },
        },
      })
    }
    if (metodo === "DELETE") {
      return rota.fulfill({ json: { removido: true } })
    }
    return rota.fulfill({ json: { pergunta, respostas } })
  })
}

/** A folha do menu (é o mesmo diálogo para pergunta e resposta). */
function menu(page: Page) {
  return page.getByRole("dialog", { name: /^Opções da/ })
}

test.beforeEach(async ({ page }) => {
  test.skip(
    !TAMANHOS.includes(page.viewportSize()?.width ?? 0),
    "o ciclo é provado em 375, 768 e 1440",
  )
})

test("edita a própria pergunta e a tela mostra 'editada'", async ({ page }) => {
  await simularCiclo(page, { perguntaPropria: true })
  await page.goto(`/app/pergunta/${ID_PERGUNTA}`)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Alguém indica um pediatra que atenda pelo convênio?",
  )

  await page.getByRole("button", { name: "Opções da sua pergunta" }).click()
  await menu(page).getByRole("button", { name: "Editar pergunta", exact: true }).click()
  await page
    .getByLabel("Título da pergunta")
    .fill("Alguém indica pediatra pelo convênio no centro?")
  await page.getByRole("button", { name: "Salvar", exact: true }).click()

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Alguém indica pediatra pelo convênio no centro?",
  )
  await expect(menu(page)).toHaveCount(0)
  // A marca vem do banco (`edited_at`), não do otimismo da tela.
  await expect(page.getByText("Manaus · editada", { exact: true })).toBeVisible()
})

test("edita a própria resposta e a marca acompanha a resposta", async ({ page }) => {
  await simularCiclo(page, { comResposta: true, respostaPropria: true })
  await page.goto(`/app/pergunta/${ID_PERGUNTA}`)

  await page.getByRole("button", { name: "Opções da sua resposta" }).click()
  await menu(page).getByRole("button", { name: "Editar resposta", exact: true }).click()
  // O compositor do fim da tela também se chama "Sua resposta": o campo da
  // edição é o de dentro do diálogo.
  await page
    .getByRole("dialog")
    .getByLabel("Sua resposta")
    .fill("A Dra. Helena atende pelo convênio, no centro.")
  await page.getByRole("button", { name: "Salvar", exact: true }).click()

  await expect(page.getByText("A Dra. Helena atende pelo convênio, no centro.")).toBeVisible()
  await expect(page.getByText("Membro da comunidade · editada", { exact: true })).toBeVisible()
})

test("exclui a própria resposta depois de confirmar", async ({ page }) => {
  await simularCiclo(page, { comResposta: true, respostaPropria: true })
  await page.goto(`/app/pergunta/${ID_PERGUNTA}`)
  await expect(page.getByText("A Dra. Helena atende pelo convênio no centro.")).toBeVisible()

  await page.getByRole("button", { name: "Opções da sua resposta" }).click()
  await menu(page).getByRole("button", { name: "Excluir resposta", exact: true }).click()
  await page.getByRole("button", { name: "Excluir resposta", exact: true }).click()

  // A resposta sai da conversa: a tela volta ao vazio de quem não tem resposta.
  await expect(page.getByText("A Dra. Helena atende pelo convênio no centro.")).toHaveCount(0)
  await expect(
    page.getByRole("heading", { name: "A comunidade ainda não respondeu" }),
  ).toBeVisible()
})

test("exclui a própria pergunta e volta para a Comunidade", async ({ page }) => {
  await simularCiclo(page, { perguntaPropria: true })
  await page.goto(`/app/pergunta/${ID_PERGUNTA}`)

  await page.getByRole("button", { name: "Opções da sua pergunta" }).click()
  await menu(page).getByRole("button", { name: "Excluir pergunta", exact: true }).click()
  await page.getByRole("button", { name: "Excluir pergunta", exact: true }).click()

  // A pergunta não existe mais: a entrada vira a lista, não uma tela fantasma.
  await expect(page).toHaveURL(/\/app\/comunidade$/)
})

test("marca como resolvida sem escolher resposta", async ({ page }) => {
  await simularCiclo(page, { perguntaPropria: true })
  await page.goto(`/app/pergunta/${ID_PERGUNTA}`)
  await expect(page.getByText("Sem resposta", { exact: true })).toBeVisible()

  await page.getByRole("button", { name: "Opções da sua pergunta" }).click()
  await menu(page).getByRole("button", { name: "Marcar como resolvida", exact: true }).click()

  // Resolvida sem resposta: a pergunta fecha e o caminho de volta aparece; a
  // etiqueta não entra na asserção porque o ícone vira ligadura no texto.
  await expect(page.getByRole("button", { name: "Reabrir pergunta", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Opções da sua pergunta" }).click()
  await expect(menu(page).getByRole("button", { name: "Marcar como resolvida" })).toHaveCount(0)
})

test("compartilha copiando o link da pergunta no app", async ({ page }) => {
  await simularCiclo(page)
  // Sem a folha do sistema (é o caso do navegador de mesa), o link é copiado.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true })
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: (texto: string) => {
          ;(window as unknown as { __copiado: string }).__copiado = texto
          return Promise.resolve()
        },
      },
      configurable: true,
    })
  })
  await page.goto(`/app/pergunta/${ID_PERGUNTA}`)

  await page.getByRole("button", { name: "Compartilhar", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Link copiado.")
  const copiado = await page.evaluate(
    () => (window as unknown as { __copiado?: string }).__copiado ?? "",
  )
  expect(copiado.endsWith(`/app/pergunta/${ID_PERGUNTA}`)).toBe(true)
})

test("a resposta com verbete leva ao Guia", async ({ page }) => {
  await simularCiclo(page, { comResposta: true, comVerbete: true })
  await page.goto(`/app/pergunta/${ID_PERGUNTA}`)

  await page.getByRole("button", { name: "Dra. Helena no Guia", exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/app/guia/${ID_VERBETE}$`))
})

test("o menu de outra pessoa não oferece editar nem excluir", async ({ page }) => {
  await simularCiclo(page, { comResposta: true })
  await page.goto(`/app/pergunta/${ID_PERGUNTA}`)

  await page.getByRole("button", { name: "Opções da pergunta", exact: true }).click()
  await expect(menu(page).getByRole("button", { name: "Editar pergunta" })).toHaveCount(0)
  await expect(menu(page).getByRole("button", { name: "Excluir pergunta" })).toHaveCount(0)
  await expect(menu(page).getByRole("button", { name: "Marcar como resolvida" })).toHaveCount(0)
  await expect(menu(page).getByRole("button", { name: "Denunciar pergunta" })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(menu(page)).toHaveCount(0)

  await page.getByRole("button", { name: "Opções da resposta", exact: true }).click()
  await expect(menu(page).getByRole("button", { name: "Editar resposta" })).toHaveCount(0)
  await expect(menu(page).getByRole("button", { name: "Excluir resposta" })).toHaveCount(0)
  await expect(menu(page).getByRole("button", { name: "Denunciar resposta" })).toBeVisible()
})
