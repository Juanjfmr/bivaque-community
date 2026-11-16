import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: () => servicoAtual }))
vi.mock("web/lib/storage/sanitize-image", () => ({ sanitizeImage: vi.fn() }))

import {
  PATCH as mover,
  OPTIONS as opcoesDoItem,
  DELETE as remover,
} from "web/app/api/app/negocio/catalogo/[id]/route"
import {
  OPTIONS as opcoesDoCatalogo,
  POST as publicar,
} from "web/app/api/app/negocio/catalogo/route"
import {
  PATCH as editarFoto,
  OPTIONS as opcoesDaFotoUnica,
  DELETE as removerFoto,
} from "web/app/api/app/negocio/fotos/[id]/route"
import { POST as enviarFoto, OPTIONS as opcoesDaFoto } from "web/app/api/app/negocio/fotos/route"
import {
  POST as criar,
  PATCH as editar,
  GET as ler,
  OPTIONS as opcoesDaFicha,
} from "web/app/api/app/negocio/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { sanitizeImage } from "web/lib/storage/sanitize-image"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const sanitizar = vi.mocked(sanitizeImage)
const BASE = "http://localhost:3000/api/app"
const FICHA = "10000000-0000-4000-8000-000000000001"
const ITEM = "10000000-0000-4000-8000-000000000002"
const FOTO = "10000000-0000-4000-8000-000000000003"
const USER = "10000000-0000-4000-8000-000000000010"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
const contexto = (id: string) => ({ params: Promise.resolve({ id }) })

type Opcoes = {
  semFicha?: boolean
  erroTabela?: string
  erroRpc?: string
  erroDaFoto?: boolean
  erroDoUpload?: boolean
  linhaAusente?: boolean
  servicos?: readonly unknown[]
  fotos?: readonly unknown[]
}

const servicoDaFicha = {
  id: ITEM,
  title: "Limpeza completa",
  description: null,
}
const fotoDaFicha = { id: FOTO, photo_path: `${FICHA}/portfolio/foto.jpg`, caption: "Trabalho" }

function servico(opcoes: Opcoes = {}) {
  const upload = vi.fn(async () => ({
    error: opcoes.erroDoUpload ? { message: "segredo do storage" } : null,
  }))
  const remove = vi.fn(async () => ({ error: null }))
  const assinar = vi.fn(async () => ({
    data: opcoes.erroDaFoto ? null : { signedUrl: "https://midia.example.invalid/assinada" },
    error: opcoes.erroDaFoto ? { message: "segredo do storage" } : null,
  }))
  return {
    storage: { from: () => ({ upload, remove, createSignedUrl: assinar }) },
    upload,
    remove,
    assinar,
  }
}

// O cliente de serviço é trocado por teste: `servicoAtual` é lido no momento da
// chamada pela rota (mock dinâmico), não no import.
let servicoAtual: ReturnType<typeof servico>

function cliente(opcoes: Opcoes = {}) {
  const gravacoes: { tabela: string; metodo: string; valores?: unknown }[] = []
  const filtros: { tabela: string; coluna: string; valor: unknown }[] = []
  // A ficha passa a existir quando o RPC de criação responde: a rota relê a
  // ficha depois de criar, e o mock precisa acompanhar isso.
  let existe = opcoes.semFicha !== true
  const rpc = vi.fn(async (nome: string) => {
    if (opcoes.erroRpc) return { data: null, error: { code: opcoes.erroRpc, message: "segredo" } }
    if (nome === "can_manage_provider_profile") return { data: true, error: null }
    if (nome === "create_member_business_page") {
      existe = true
      return { data: FICHA, error: null }
    }
    return { data: null, error: null }
  })

  const from = vi.fn((tabela: string) => {
    const erro = () =>
      opcoes.erroTabela === tabela
        ? { data: null, error: { code: "XX000", message: "segredo do Postgres" } }
        : null
    const devolver = (unico: boolean) => {
      if (erro() !== null) return erro()
      if (tabela === "provider_profiles")
        return {
          data: unico
            ? existe
              ? {
                  id: FICHA,
                  display_name: "Climatiza",
                  category: "assistencia_tecnica",
                  bio: "Instalação",
                }
              : null
            : [],
          error: null,
          count: null,
        }
      if (tabela === "provider_catalog_items")
        return {
          data: unico
            ? opcoes.linhaAusente === true
              ? null
              : { id: ITEM }
            : (opcoes.servicos ?? [servicoDaFicha]),
          error: null,
          count: 1,
        }
      if (tabela === "provider_portfolio_photos")
        return {
          data: unico
            ? opcoes.linhaAusente === true
              ? null
              : { photo_path: fotoDaFicha.photo_path }
            : (opcoes.fotos ?? [fotoDaFicha]),
          error: null,
          count: 1,
        }
      throw new Error(`Tabela inesperada: ${tabela}`)
    }

    const consulta: Record<string, unknown> = {}
    consulta["select"] = () => consulta
    consulta["order"] = () => consulta
    consulta["limit"] = () => consulta
    consulta["eq"] = (coluna: string, valor: unknown) => {
      filtros.push({ tabela, coluna, valor })
      return consulta
    }
    consulta["insert"] = (valores: unknown) => {
      gravacoes.push({ tabela, metodo: "insert", valores })
      return consulta
    }
    consulta["update"] = (valores: unknown) => {
      gravacoes.push({ tabela, metodo: "update", valores })
      return consulta
    }
    consulta["delete"] = () => {
      gravacoes.push({ tabela, metodo: "delete" })
      return consulta
    }
    consulta["maybeSingle"] = async () => devolver(true)
    // biome-ignore lint/suspicious/noThenProperty: o builder PostgREST é awaitable
    Object.defineProperty(consulta, "then", {
      value: (resolver: (valor: unknown) => unknown) => Promise.resolve(resolver(devolver(false))),
    })
    return consulta
  })
  return {
    client: {
      from,
      rpc,
      storage: { from: () => ({ createSignedUrl: servicoAtual.assinar }) },
    } as never,
    from,
    rpc,
    gravacoes,
    filtros,
  }
}

function autenticar(mock: ReturnType<typeof cliente>) {
  resolver.mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: USER, email: "membro@example.invalid", appMetadata: {} },
    cliente: mock.client,
    cabecalhos: {},
  } as never)
}

function req(caminho: string, metodo = "GET", body?: BodyInit | FormData, cabecalhos = headers) {
  return new NextRequest(`${BASE}/${caminho}`, {
    method: metodo,
    headers: cabecalhos,
    ...(body === undefined ? {} : { body }),
  })
}

const corpo = JSON.stringify({
  nome: "Climatiza",
  categoria: "assistencia_tecnica",
  descricao: "Instalação e manutenção",
})
const item = JSON.stringify({ titulo: "Limpeza completa", descricao: "Higienização" })

const rotas = [
  ["leitura", () => ler(req("negocio"))],
  ["criação", () => criar(req("negocio", "POST", corpo))],
  ["edição", () => editar(req("negocio", "PATCH", corpo))],
  ["serviço novo", () => publicar(req("negocio/catalogo", "POST", item))],
  ["serviço editado", () => mover(req("negocio/catalogo/x", "PATCH", item), contexto(ITEM))],
  ["serviço removido", () => remover(req("negocio/catalogo/x", "DELETE"), contexto(ITEM))],
  ["foto editada", () => editarFoto(req("negocio/fotos/x", "PATCH", "{}"), contexto(FOTO))],
  ["foto removida", () => removerFoto(req("negocio/fotos/x", "DELETE"), contexto(FOTO))],
] as const

beforeEach(() => {
  vi.clearAllMocks()
  sanitizar.mockReset()
  servicoAtual = servico()
})

describe("F07 — a ficha do próprio negócio exige sessão", () => {
  beforeEach(() => {
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it.each(rotas)("%s sem sessão é 401", async (_nome, chamar) => {
    expect((await chamar()).status).toBe(401)
  })

  it("sessão indisponível é 503, não 500", async () => {
    resolver.mockResolvedValue({ estado: "indisponivel" } as never)
    expect((await ler(req("negocio"))).status).toBe(503)
  })

  it.each([opcoesDaFicha, opcoesDoCatalogo, opcoesDoItem, opcoesDaFoto, opcoesDaFotoUnica])(
    "preflight aceita só a origem permitida",
    (opcoes) => {
      expect(opcoes(req("negocio", "OPTIONS")).status).toBe(204)
      expect(
        opcoes(
          req("negocio", "OPTIONS", undefined, {
            ...headers,
            origin: "https://fora.example.invalid",
          }),
        ).status,
      ).toBe(403)
    },
  )
})

describe("F07 — escrita da ficha pela porta", () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    { ...headers, origin: "https://fora.example.invalid" },
    { ...headers, "x-bivaque-app": "errado" },
    { "content-type": "application/json", origin: headers.origin },
  ])("recusa escrita sem a porta correta antes do banco", async (cabecalhos) => {
    const mock = cliente()
    autenticar(mock)
    expect((await criar(req("negocio", "POST", corpo, cabecalhos))).status).toBe(403)
    expect(mock.from).not.toHaveBeenCalled()
  })

  it.each([
    "{}",
    '{"nome":"A","categoria":"assistencia_tecnica"}',
    '{"nome":"Climatiza","categoria":"inventada"}',
    '{"nome":"Climatiza","categoria":"pets","descricao":17}',
    JSON.stringify({ nome: "Climatiza", categoria: "pets", descricao: "a".repeat(801) }),
    "[]",
    "{",
  ])("recusa corpo inválido antes do banco (%s)", async (body) => {
    const mock = cliente()
    autenticar(mock)
    expect((await criar(req("negocio", "POST", body))).status).toBe(400)
    expect(mock.from).not.toHaveBeenCalled()
  })

  it("exige JSON na escrita", async () => {
    const mock = cliente()
    autenticar(mock)
    expect(
      (await criar(req("negocio", "POST", corpo, { ...headers, "content-type": "text/plain" })))
        .status,
    ).toBe(400)
  })

  it("cria pelo RPC da sessão e devolve a ficha relida", async () => {
    const mock = cliente({ semFicha: true, servicos: [], fotos: [] })
    autenticar(mock)
    const resposta = await criar(req("negocio", "POST", corpo))
    expect(resposta.status).toBe(201)
    expect(mock.rpc).toHaveBeenCalledWith("create_member_business_page", {
      p_display_name: "Climatiza",
      p_category: "assistencia_tecnica",
      p_bio: "Instalação e manutenção",
    })
    const dados = await resposta.json()
    expect(dados.negocio).toMatchObject({ id: FICHA, nome: "Climatiza", servicos: [] })
    expect(dados.categorias.length).toBeGreaterThan(5)
    expect(dados.negocio.fotos).toEqual([])
  })

  it("segunda ficha é 409 sem chamar o RPC", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await criar(req("negocio", "POST", corpo))
    expect(resposta.status).toBe(409)
    expect((await resposta.json()).erro).toBe("ja-tem-ficha")
    expect(mock.rpc).not.toHaveBeenCalled()
  })

  it("edita pelo id do BANCO, não por um id do corpo", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await editar(
      req(
        "negocio",
        "PATCH",
        JSON.stringify({ ...JSON.parse(corpo), id: "10000000-0000-4000-8000-0000000000ff" }),
      ),
    )
    expect(resposta.status).toBe(200)
    expect(mock.rpc).toHaveBeenCalledWith("update_member_business_page", {
      p_provider_id: FICHA,
      p_display_name: "Climatiza",
      p_category: "assistencia_tecnica",
      p_bio: "Instalação e manutenção",
    })
  })

  it("editar sem ficha é 404", async () => {
    const mock = cliente({ semFicha: true })
    autenticar(mock)
    expect((await editar(req("negocio", "PATCH", corpo))).status).toBe(404)
    expect(mock.rpc).not.toHaveBeenCalled()
  })

  it.each([
    ["42501", 403],
    ["22023", 400],
    ["XX000", 503],
  ])("traduz recusa %s do RPC sem eco do Postgres", async (codigo, status) => {
    const mock = cliente({ semFicha: true, erroRpc: codigo })
    autenticar(mock)
    const resposta = await criar(req("negocio", "POST", corpo))
    expect(resposta.status).toBe(status)
    expect(await resposta.text()).not.toContain("segredo")
  })

  it("falha de leitura do banco é 503, nunca ficha vazia", async () => {
    const mock = cliente({ erroTabela: "provider_profiles" })
    autenticar(mock)
    const resposta = await ler(req("negocio"))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo")
  })

  it("quem não tem ficha recebe `null`, e não um erro", async () => {
    autenticar(cliente({ semFicha: true }))
    const resposta = await ler(req("negocio"))
    expect(resposta.status).toBe(200)
    expect((await resposta.json()).negocio).toBeNull()
  })

  it("leitura devolve serviços e fotos assinadas, sem caminho de mídia", async () => {
    servicoAtual = servico()
    const mock = cliente({ semFicha: false })
    autenticar(mock)
    const resposta = await ler(req("negocio"))
    const dados = await resposta.json()
    expect(dados.negocio.servicos).toEqual([
      { id: ITEM, titulo: "Limpeza completa", descricao: null },
    ])
    expect(dados.negocio.fotos).toEqual([
      { id: FOTO, url: "https://midia.example.invalid/assinada", legenda: "Trabalho" },
    ])
    expect(JSON.stringify(dados)).not.toMatch(/portfolio\/|photo_path|owner_user_id/)
    expect(servicoAtual.assinar).toHaveBeenCalledWith(fotoDaFicha.photo_path, 300)
  })

  it("falha ao assinar a foto é falha de leitura, não ficha sem foto", async () => {
    servicoAtual = servico({ erroDaFoto: true })
    autenticar(cliente())
    expect((await ler(req("negocio"))).status).toBe(503)
  })
})

describe("F07 — catálogo e fotos da ficha", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    servicoAtual = servico()
  })

  it("publica serviço na posição do fim e devolve a lista ordenada", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await publicar(req("negocio/catalogo", "POST", item))
    expect(resposta.status).toBe(201)
    expect(mock.gravacoes).toContainEqual({
      tabela: "provider_catalog_items",
      metodo: "insert",
      valores: {
        provider_id: FICHA,
        title: "Limpeza completa",
        description: "Higienização",
        position: 1,
      },
    })
    expect((await resposta.json()).servicos[0].titulo).toBe("Limpeza completa")
  })

  it.each([
    "{}",
    '{"titulo":"A"}',
    JSON.stringify({ titulo: "Limpeza", descricao: "a".repeat(601) }),
    '{"titulo":"Limpeza","descricao":9}',
  ])("recusa serviço inválido antes do banco (%s)", async (body) => {
    const mock = cliente()
    autenticar(mock)
    expect((await publicar(req("negocio/catalogo", "POST", body))).status).toBe(400)
    expect(mock.gravacoes).toHaveLength(0)
  })

  it("mover é PATCH com direcao e lista nova", async () => {
    const segundo = {
      id: "10000000-0000-4000-8000-000000000004",
      title: "Instalação",
      description: null,
    }
    const mock = cliente({ servicos: [servicoDaFicha, segundo] })
    autenticar(mock)
    const resposta = await mover(
      req("negocio/catalogo/x", "PATCH", JSON.stringify({ direcao: "cima" })),
      contexto(segundo.id),
    )
    expect(resposta.status).toBe(200)
    expect(mock.gravacoes).toContainEqual({
      tabela: "provider_catalog_items",
      metodo: "update",
      valores: { position: 0 },
    })
    expect((await resposta.json()).servicos).toHaveLength(2)
  })

  it("mover item de outra ficha é 404", async () => {
    const mock = cliente({ servicos: [] })
    autenticar(mock)
    expect(
      (await mover(req("negocio/catalogo/x", "PATCH", '{"direcao":"cima"}'), contexto(ITEM)))
        .status,
    ).toBe(404)
  })

  it("remover item inexistente é 404", async () => {
    const mock = cliente({ linhaAusente: true })
    autenticar(mock)
    expect((await remover(req("negocio/catalogo/x", "DELETE"), contexto(ITEM))).status).toBe(404)
  })

  it("envia a foto por multipart, sanitizada e no bucket da ficha", async () => {
    sanitizar.mockResolvedValue(Buffer.from([1, 2, 3]))
    const mock = cliente()
    autenticar(mock)
    const formulario = new FormData()
    formulario.set("file", new File([new Uint8Array([1])], "foto.png", { type: "image/png" }))
    formulario.set("legenda", "Trabalho")
    const resposta = await enviarFoto(
      req("negocio/fotos", "POST", formulario, {
        origin: headers.origin,
        "x-bivaque-app": headers["x-bivaque-app"],
      }),
    )
    expect(resposta.status).toBe(201)
    expect(sanitizar).toHaveBeenCalledOnce()
    expect(servicoAtual.upload).toHaveBeenCalledOnce()
    expect(servicoAtual.upload.mock.calls[0]?.[0]).toMatch(
      new RegExp(`^${FICHA}/portfolio/[0-9a-f-]+\\.png$`),
    )
    expect(mock.rpc).toHaveBeenCalledWith("can_manage_provider_profile", {
      p_provider_id: FICHA,
    })
  })

  it.each([
    ["image/gif", new Uint8Array([1])],
    ["image/jpeg", new Uint8Array(5242881)],
  ])("recusa %s acima do contrato sem gravar", async (tipo, bytes) => {
    const mock = cliente()
    autenticar(mock)
    const formulario = new FormData()
    formulario.set("file", new File([bytes], "foto", { type: tipo }))
    const resposta = await enviarFoto(
      req("negocio/fotos", "POST", formulario, {
        origin: headers.origin,
        "x-bivaque-app": headers["x-bivaque-app"],
      }),
    )
    expect(resposta.status).toBe(400)
    expect(servicoAtual.upload).not.toHaveBeenCalled()
    expect(mock.gravacoes).toHaveLength(0)
  })

  it("exige multipart na foto", async () => {
    autenticar(cliente())
    expect((await enviarFoto(req("negocio/fotos", "POST", "texto"))).status).toBe(400)
  })

  it("imagem recusada pelo sanitizador não vira foto", async () => {
    sanitizar.mockRejectedValue(new Error("A imagem processada passa do tamanho permitido."))
    autenticar(cliente())
    const formulario = new FormData()
    formulario.set("file", new File([new Uint8Array([1])], "foto.jpeg", { type: "image/jpeg" }))
    const resposta = await enviarFoto(
      req("negocio/fotos", "POST", formulario, {
        origin: headers.origin,
        "x-bivaque-app": headers["x-bivaque-app"],
      }),
    )
    expect(resposta.status).toBe(400)
    expect((await resposta.json()).mensagem).toContain("tamanho permitido")
    expect(servicoAtual.upload).not.toHaveBeenCalled()
  })

  it("falha do Storage é 503 sem eco", async () => {
    sanitizar.mockResolvedValue(Buffer.from([1]))
    servicoAtual = servico({ erroDoUpload: true })
    autenticar(cliente())
    const formulario = new FormData()
    formulario.set("file", new File([new Uint8Array([1])], "foto.webp", { type: "image/webp" }))
    const resposta = await enviarFoto(
      req("negocio/fotos", "POST", formulario, {
        origin: headers.origin,
        "x-bivaque-app": headers["x-bivaque-app"],
      }),
    )
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo")
  })

  it("legenda e remoção da foto pela ficha do dono", async () => {
    const mock = cliente()
    autenticar(mock)
    const legenda = await editarFoto(
      req("negocio/fotos/x", "PATCH", '{"legenda":"Novo"}'),
      contexto(FOTO),
    )
    expect(legenda.status).toBe(200)
    expect(mock.gravacoes).toContainEqual({
      tabela: "provider_portfolio_photos",
      metodo: "update",
      valores: { caption: "Novo" },
    })

    const remocao = await removerFoto(req("negocio/fotos/x", "DELETE"), contexto(FOTO))
    expect(remocao.status).toBe(200)
    expect(servicoAtual.remove).toHaveBeenCalledWith([fotoDaFicha.photo_path])
  })

  it("remover foto de outra ficha é 404 sem tocar o Storage", async () => {
    autenticar(cliente({ linhaAusente: true }))
    expect((await removerFoto(req("negocio/fotos/x", "DELETE"), contexto(FOTO))).status).toBe(404)
    expect(servicoAtual.remove).not.toHaveBeenCalled()
  })

  it.each([
    ["negocio/catalogo", "POST", "provider_catalog_items"],
    ["negocio/fotos", "POST", "provider_portfolio_photos"],
  ] as const)("%s com banco fora é 503 sem eco", async (caminho, metodo, tabela) => {
    const mock = cliente({ erroTabela: tabela })
    autenticar(mock)
    const formulario = new FormData()
    formulario.set("file", new File([new Uint8Array([1])], "foto.jpeg", { type: "image/jpeg" }))
    const resposta =
      caminho === "negocio/fotos"
        ? await enviarFoto(
            req(caminho, metodo, formulario, {
              origin: headers.origin,
              "x-bivaque-app": headers["x-bivaque-app"],
            }),
          )
        : await publicar(req(caminho, metodo, item))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo")
  })
})
