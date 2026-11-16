import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { GET, POST } from "web/app/api/app/grupos/[id]/perguntas/route"
import {
  autenticar,
  BASE,
  context,
  headers,
  ID,
  membro,
  mockClient,
  pergunta,
  req,
  semSessao,
  USER,
} from "./apoio"

const URL_DAS_PERGUNTAS = `${BASE}/${ID}/perguntas`
const CORPO = { titulo: "Alguém indica veterinário perto do centro?", assunto: "Pet" }
const CIDADE = "00000000-0000-4000-8000-000000000001"

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

// RUN-178 — a pergunta feita num grupo Aberto é uma linha de origem dupla:
// nasce no grupo e aparece nas Indicações da cidade com o nome dele.
describe("perguntas do grupo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    semSessao()
  })

  it("recusa ausência de sessão nas duas rotas", async () => {
    expect((await GET(req("GET", URL_DAS_PERGUNTAS), context)).status).toBe(401)
    expect((await POST(req("POST", URL_DAS_PERGUNTAS, CORPO), context)).status).toBe(401)
  })

  it("a escrita exige a porta do app", async () => {
    const mock = mockClient()
    autenticar(mock)
    const resposta = await POST(
      req("POST", URL_DAS_PERGUNTAS, CORPO, { ...headers, origin: "https://fora.example" }),
      context,
    )
    expect(resposta.status).toBe(403)
    expect(mock.chamadas.filter((c) => c.metodo === "insert")).toHaveLength(0)
  })

  it("id fora do formato é 404, sem consultar o banco", async () => {
    const mock = mockClient()
    autenticar(mock)
    const invalido = { params: Promise.resolve({ id: "nao-e-uuid" }) }
    expect((await POST(req("POST", URL_DAS_PERGUNTAS, CORPO), invalido)).status).toBe(404)
    expect((await GET(req("GET", URL_DAS_PERGUNTAS), invalido)).status).toBe(404)
    expect(mock.from).not.toHaveBeenCalled()
  })

  it("sem JSON é 400 antes de qualquer leitura", async () => {
    const mock = mockClient()
    autenticar(mock)
    const resposta = await POST(
      req("POST", URL_DAS_PERGUNTAS, CORPO, {
        origin: "http://localhost:3000",
        "x-bivaque-app": "bivaque-spa",
        "content-type": "text/plain",
      }),
      context,
    )
    expect(resposta.status).toBe(400)
    expect(mock.from).not.toHaveBeenCalled()
  })

  it("cria a linha com a cidade e o grupo do BANCO, ignorando a origem do corpo", async () => {
    // O corpo tenta trocar cidade, grupo e autoria: nada disso é lido.
    const mock = mockClient()
    autenticar(mock)
    const resposta = await POST(
      req("POST", URL_DAS_PERGUNTAS, {
        ...CORPO,
        locality_id: "00000000-0000-4000-8000-0000000000bb",
        group_id: "40000000-0000-4000-8000-0000000000cc",
        author_id: "20000000-0000-4000-8000-0000000000dd",
      }),
      context,
    )
    expect(resposta.status).toBe(201)
    const insert = mock.chamadas.find((c) => c.tabela === "recommendation_requests")
    expect(insert?.metodo).toBe("insert")
    expect(insert?.args[0]).toMatchObject({
      title: CORPO.titulo,
      body: CORPO.assunto,
      author_id: USER,
      locality_id: CIDADE,
      group_id: ID,
    })
    const corpo = await json(resposta)
    expect(corpo["pergunta"]).toMatchObject({
      id: pergunta.id,
      titulo: CORPO.titulo,
      resolvida: false,
      respostas: 0,
      propria: true,
      grupo: { id: ID, nome: "Famílias" },
    })
  })

  it("não membro recebe 403 sem gravar", async () => {
    const mock = mockClient({ membro: { ...membro, status: "pending" } })
    autenticar(mock)
    const resposta = await POST(req("POST", URL_DAS_PERGUNTAS, CORPO), context)
    expect(resposta.status).toBe(403)
    expect(await json(resposta)).toEqual({ erro: "nao-membro" })
    expect(mock.chamadas.filter((c) => c.metodo === "insert")).toHaveLength(0)
  })

  it("título fora da régua é 400 sem gravar", async () => {
    const mock = mockClient()
    autenticar(mock)
    const resposta = await POST(req("POST", URL_DAS_PERGUNTAS, { titulo: "oi" }), context)
    expect(resposta.status).toBe(400)
    expect(mock.chamadas.filter((c) => c.metodo === "insert")).toHaveLength(0)
  })

  it("a recusa da policy vira 403 com o próximo passo, sem eco do Postgres", async () => {
    // Os quatro vetos (não membro, grupo Fechado, grupo fora do ar, cidade
    // diferente) moram na policy; aqui o que se prova é a tradução da recusa.
    const mock = mockClient({
      perguntaErro: { code: "42501", message: 'violates row-level security policy "x"' },
    })
    autenticar(mock)
    const resposta = await POST(req("POST", URL_DAS_PERGUNTAS, CORPO), context)
    expect(resposta.status).toBe(403)
    const corpo = await json(resposta)
    expect(String(corpo["mensagem"])).toContain("grupo aberto")
    expect(JSON.stringify(corpo)).not.toMatch(/row-level security/)
  })

  it("grupo inexistente é 404", async () => {
    const mock = mockClient({ grupo: null })
    autenticar(mock)
    expect((await POST(req("POST", URL_DAS_PERGUNTAS, CORPO), context)).status).toBe(404)
    expect((await GET(req("GET", URL_DAS_PERGUNTAS), context)).status).toBe(404)
  })

  it("a leitura devolve as perguntas do grupo com a origem nomeada", async () => {
    const mock = mockClient({ perguntas: [pergunta] })
    autenticar(mock)
    const resposta = await GET(req("GET", URL_DAS_PERGUNTAS), context)
    expect(resposta.status).toBe(200)
    const corpo = await json(resposta)
    expect(corpo["perguntas"]).toEqual([
      {
        id: pergunta.id,
        titulo: pergunta.title,
        categoria: "servicos_locais",
        criadaEm: "2026-11-06T12:00:00.000Z",
        resolvida: false,
        respostas: 2,
        propria: true,
        autor: "Ana",
        autorId: USER,
        grupo: { id: ID, nome: "Famílias" },
      },
    ])
  })

  it("grupo fechado sem participação não entrega pergunta nenhuma", async () => {
    const mock = mockClient({
      grupo: {
        id: ID,
        name: "Famílias",
        description: "",
        rules: "",
        visibility: "private",
        locality_id: CIDADE,
        owner_user_id: "20000000-0000-4000-8000-0000000000aa",
        pinned_post_id: null,
      },
      membro: null,
    })
    autenticar(mock)
    const corpo = await json(await GET(req("GET", URL_DAS_PERGUNTAS), context))
    expect(corpo).toEqual({ perguntas: [] })
    expect(mock.chamadas.some((c) => c.tabela === "recommendation_requests")).toBe(false)
  })

  it("falha de leitura é 503, nunca lista vazia", async () => {
    const mock = mockClient({ erro: "recommendation_requests" })
    autenticar(mock)
    const resposta = await GET(req("GET", URL_DAS_PERGUNTAS), context)
    expect(resposta.status).toBe(503)
    expect(JSON.stringify(await json(resposta))).not.toContain("segredo-do-banco")
  })
})
