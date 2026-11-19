import { beforeEach, describe, expect, it, vi } from "vitest"

// AUTHZ-007 — veto de conta nos caminhos de upload de foto, antes do
// service_role. O banco distingue suspenso de exclusão pedida no predicado de
// can_account_write_content (prova por estado no pgTAP); aqui o trio por
// caminho prova que o servidor recusa quando a RPC responde não — e que não
// sobe objeto nenhum.

const mock = vi.hoisted(() => ({
  ID: "10000000-0000-4000-8000-000000000001",
  FICHA: "30000000-0000-4000-8000-000000000001",
  LISTING: "98200000-0000-4000-8000-000000000001",
  erroDaLinha: null as { code?: string; message?: string } | null,
  ssrUser: vi.fn(),
  ssrFrom: vi.fn(),
  ssrRpc: vi.fn(),
  moradiaUser: vi.fn(),
  moradiaFrom: vi.fn(),
  moradiaRpc: vi.fn(),
  appRpc: vi.fn(),
  appFrom: vi.fn(),
  servicoFrom: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock("next/cache", () => ({ revalidatePath: () => {} }))
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: mock.ssrUser },
    from: mock.ssrFrom,
    rpc: mock.ssrRpc,
  }),
}))
vi.mock("web/lib/supabase/server", () => ({
  createServerClient: () => ({
    from: mock.servicoFrom,
    storage: { from: () => ({ upload: mock.upload, remove: mock.remove }) },
  }),
}))
vi.mock("web/lib/storage/sanitize-image", () => ({
  sanitizeImage: async () => Buffer.alloc(4),
}))
vi.mock("web/lib/listings/ssr-client", () => ({
  createListingClient: async () => ({
    auth: { getUser: mock.moradiaUser },
    from: mock.moradiaFrom,
    rpc: mock.moradiaRpc,
  }),
}))
vi.mock("web/lib/app-api/rota-do-app", () => ({
  exigirSessao: async () => ({
    ok: true,
    sessao: {
      cliente: { rpc: mock.appRpc, from: mock.appFrom },
      usuario: { id: mock.ID },
      via: "app",
    },
  }),
  conferirEscrita: () => "ok",
  opcoesDoApp: () => ({}),
  responder: async (_pedido: unknown, corpo: unknown, status: number) => ({ status, corpo }),
  clienteDeServicoOuNulo: () => ({
    storage: { from: () => ({ upload: mock.upload, remove: mock.remove }) },
  }),
}))
vi.mock("web/lib/providers/app-negocio", () => ({
  fichaDoDono: async () => ({ id: mock.FICHA }),
  fotosDaFicha: async () => [],
}))

import { addPortfolioPhotoAction } from "web/app/(provider)/prestador/actions"
import { POST } from "web/app/api/app/negocio/fotos/route"
import { uploadPostPhotoAction } from "web/app/components/bivaque/post-photo-action"
import { enviarFotoDoGrupo } from "web/lib/storage/foto-do-grupo"
import { enviarFotoDoAnuncio } from "web/lib/storage/listing-photo"

const { ID, FICHA, LISTING } = mock

// Consulta encadeável .select().eq()...limit().maybeSingle() com resposta fixa.
function consulta(resposta: unknown) {
  const nivel: Record<string, unknown> = {}
  nivel.eq = () => nivel
  nivel.limit = () => nivel
  nivel.maybeSingle = async () => ({ data: resposta, error: null })
  return { select: () => nivel }
}

// Cliente de sessão injetado (enviarFotoDoAnuncio / enviarFotoDoGrupo): dono
// confirmado e RPC de veto respondendo o estado pedido.
function clienteDaSessao(podeEscrever: boolean | "erro") {
  return {
    rpc: vi.fn(async () =>
      podeEscrever === "erro"
        ? { data: null, error: { code: "PGRST" } }
        : { data: podeEscrever, error: null },
    ),
    from: () => consulta({ id: "entidade-da-sessao" }),
  } as never
}

function arquivoFoto() {
  return new File([Buffer.alloc(4)], "foto.jpg", { type: "image/jpeg" })
}

const RECUSA = "Sua conta não pode publicar fotos agora."

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-placeholder")
  mock.erroDaLinha = null

  mock.ssrUser.mockResolvedValue({ data: { user: { id: ID } }, error: null })
  mock.moradiaUser.mockResolvedValue({ data: { user: { id: ID } }, error: null })
  mock.ssrRpc.mockResolvedValue({ data: true, error: null })
  mock.moradiaRpc.mockResolvedValue({ data: true, error: null })
  mock.appRpc.mockResolvedValue({ data: true, error: null })

  mock.servicoFrom.mockImplementation(() => consulta({ id: LISTING }))
  mock.ssrFrom.mockImplementation((tabela: string) => {
    if (tabela === "locality_memberships") return consulta({ locality_id: "localidade" })
    if (tabela === "provider_profiles") return consulta({ id: FICHA })
    if (tabela === "provider_portfolio_photos")
      return {
        select: () => ({ eq: async () => ({ count: 0, error: null }) }),
        insert: async () => ({ error: mock.erroDaLinha }),
      }
    throw new Error(`tabela inesperada: ${tabela}`)
  })
  mock.moradiaFrom.mockImplementation((tabela: string) => {
    if (tabela === "listing_photos") return { insert: async () => ({ error: null }) }
    return consulta({ id: LISTING })
  })
  mock.appFrom.mockImplementation(() => ({
    select: () => ({ eq: async () => ({ count: 0, error: null }) }),
    insert: async () => ({ error: mock.erroDaLinha }),
  }))

  mock.upload.mockResolvedValue({ data: { path: "subido" }, error: null })
  mock.remove.mockResolvedValue({ data: null, error: null })
})

describe("foto de anúncio do Mercado (enviarFotoDoAnuncio)", () => {
  it("conta ativa passa e sobe a foto", async () => {
    const caminho = await enviarFotoDoAnuncio(clienteDaSessao(true), ID, LISTING, 0, arquivoFoto())
    expect(caminho).toContain("/")
    expect(mock.upload).toHaveBeenCalledOnce()
  })

  it("conta suspensa recusa antes do upload, sem objeto no bucket", async () => {
    await expect(
      enviarFotoDoAnuncio(clienteDaSessao(false), ID, LISTING, 0, arquivoFoto()),
    ).rejects.toThrow(RECUSA)
    expect(mock.upload).not.toHaveBeenCalled()
  })

  it("conta com exclusão pedida recusa antes do upload", async () => {
    await expect(
      enviarFotoDoAnuncio(clienteDaSessao(false), ID, LISTING, 0, arquivoFoto()),
    ).rejects.toThrow(RECUSA)
    expect(mock.upload).not.toHaveBeenCalled()
  })

  it("RPC indisponível não deixa subir sem conferir a conta", async () => {
    await expect(
      enviarFotoDoAnuncio(clienteDaSessao("erro"), ID, LISTING, 0, arquivoFoto()),
    ).rejects.toThrow("Não foi possível conferir sua conta")
    expect(mock.upload).not.toHaveBeenCalled()
  })
})

describe("foto de grupo (enviarFotoDoGrupo)", () => {
  it("conta ativa passa e sobe a foto", async () => {
    const resultado = await enviarFotoDoGrupo(
      clienteDaSessao(true),
      ID,
      "98400000-0000-4000-8000-000000000001",
      arquivoFoto(),
    )
    expect("caminho" in resultado).toBe(true)
    expect(mock.upload).toHaveBeenCalledOnce()
  })

  it("conta suspensa recusa antes do upload", async () => {
    const resultado = await enviarFotoDoGrupo(
      clienteDaSessao(false),
      ID,
      "98400000-0000-4000-8000-000000000001",
      arquivoFoto(),
    )
    expect(resultado).toEqual({ recusada: true })
    expect(mock.upload).not.toHaveBeenCalled()
  })

  it("conta com exclusão pedida recusa antes do upload", async () => {
    const resultado = await enviarFotoDoGrupo(
      clienteDaSessao(false),
      ID,
      "98400000-0000-4000-8000-000000000001",
      arquivoFoto(),
    )
    expect(resultado).toEqual({ recusada: true })
    expect(mock.upload).not.toHaveBeenCalled()
  })
})

describe("foto de post/evento (uploadPostPhotoAction)", () => {
  const formulario = () => {
    const dados = new FormData()
    dados.set("photo", arquivoFoto())
    return dados
  }

  it("conta ativa passa e sobe a foto", async () => {
    const resultado = await uploadPostPhotoAction(formulario())
    expect("photoPath" in resultado).toBe(true)
    expect(mock.upload).toHaveBeenCalledOnce()
  })

  it("conta suspensa recusa antes do upload", async () => {
    mock.ssrRpc.mockResolvedValue({ data: false, error: null })
    const resultado = await uploadPostPhotoAction(formulario())
    expect(resultado).toEqual({
      error: RECUSA,
    })
    expect(mock.upload).not.toHaveBeenCalled()
  })

  it("conta com exclusão pedida recusa antes do upload", async () => {
    mock.ssrRpc.mockResolvedValue({ data: false, error: null })
    const resultado = await uploadPostPhotoAction(formulario())
    expect(resultado).toEqual({ error: RECUSA })
    expect(mock.upload).not.toHaveBeenCalled()
  })
})

describe("foto de portfólio pela porta do app (POST /api/app/negocio/fotos)", () => {
  const pedido = () =>
    ({
      headers: { get: () => "multipart/form-data" },
      formData: async () => {
        const dados = new FormData()
        dados.set("file", arquivoFoto())
        return dados
      },
    }) as never

  it("conta ativa passa e sobe a foto", async () => {
    const resposta = await POST(pedido())
    expect(resposta).toMatchObject({ status: 201 })
    expect(mock.upload).toHaveBeenCalledOnce()
  })

  it("conta suspensa recusa com 403 antes do upload", async () => {
    mock.appRpc.mockResolvedValue({ data: false, error: null })
    const resposta = await POST(pedido())
    expect(resposta).toMatchObject({
      status: 403,
      corpo: { erro: "recusado", mensagem: RECUSA },
    })
    expect(mock.upload).not.toHaveBeenCalled()
  })

  it("conta com exclusão pedida recusa com 403 antes do upload", async () => {
    mock.appRpc.mockResolvedValue({ data: false, error: null })
    const resposta = await POST(pedido())
    expect(resposta).toMatchObject({
      status: 403,
      corpo: { erro: "recusado", mensagem: RECUSA },
    })
    expect(mock.upload).not.toHaveBeenCalled()
  })

  it("linha recusada depois do upload apaga o objeto (defesa extra)", async () => {
    mock.erroDaLinha = { code: "42501" }
    const resposta = await POST(pedido())
    expect(resposta).toMatchObject({ status: 503 })
    expect(mock.remove).toHaveBeenCalledOnce()
    expect(mock.remove.mock.calls[0]?.[0]).toEqual([expect.stringContaining(`${FICHA}/portfolio/`)])
  })

  it("resposta incerta da linha preserva o objeto subido, sem eco do erro", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    mock.erroDaLinha = { message: "gateway sem SQLSTATE" }
    const resposta = await POST(pedido())
    expect(resposta).toMatchObject({ status: 503, corpo: { erro: "escrita-indisponivel" } })
    expect(mock.remove).not.toHaveBeenCalled()
    // Só a categoria fixa vai pro log; o erro incerto não é ecoado.
    expect(log).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledWith(
      "[negocio] resposta incerta ao gravar a linha da foto; objeto preservado",
    )
    log.mockRestore()
  })

  it("contagem falhando depois do upload apaga o objeto sem linha", async () => {
    mock.appFrom.mockImplementation(() => ({
      select: () => ({
        eq: async () => ({ count: 0, error: { code: "XX000", message: "segredo" } }),
      }),
      insert: async () => ({ error: null }),
    }))
    const resposta = await POST(pedido())
    expect(resposta).toMatchObject({ status: 503 })
    expect(mock.remove).toHaveBeenCalledOnce()
    expect(mock.remove.mock.calls[0]?.[0]).toEqual([expect.stringContaining(`${FICHA}/portfolio/`)])
  })
})

describe("foto de portfólio pela tela web antiga (addPortfolioPhotoAction)", () => {
  const formulario = () => {
    const dados = new FormData()
    dados.set("file", arquivoFoto())
    dados.set("caption", "Legenda")
    return dados
  }

  it("conta ativa passa e sobe a foto", async () => {
    await expect(addPortfolioPhotoAction(formulario())).resolves.toBeUndefined()
    expect(mock.upload).toHaveBeenCalledOnce()
  })

  it("conta suspensa recusa antes do upload", async () => {
    mock.ssrRpc.mockImplementation(async (nome: string) =>
      nome === "can_account_write_content"
        ? { data: false, error: null }
        : { data: true, error: null },
    )
    await expect(addPortfolioPhotoAction(formulario())).resolves.toEqual({ error: RECUSA })
    expect(mock.upload).not.toHaveBeenCalled()
  })

  it("conta com exclusão pedida recusa antes do upload", async () => {
    mock.ssrRpc.mockImplementation(async (nome: string) =>
      nome === "can_account_write_content"
        ? { data: false, error: null }
        : { data: true, error: null },
    )
    await expect(addPortfolioPhotoAction(formulario())).resolves.toEqual({ error: RECUSA })
    expect(mock.upload).not.toHaveBeenCalled()
  })

  it("linha recusada depois do upload apaga o objeto (defesa extra)", async () => {
    mock.erroDaLinha = { code: "42501" }
    await expect(addPortfolioPhotoAction(formulario())).rejects.toThrow("Falha ao registrar a foto")
    expect(mock.remove).toHaveBeenCalledOnce()
    expect(mock.remove.mock.calls[0]?.[0]).toEqual([expect.stringContaining(`${FICHA}/portfolio/`)])
  })

  it("resposta incerta da linha preserva o objeto subido, sem eco do erro", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    mock.erroDaLinha = { message: "gateway sem SQLSTATE" }
    await expect(addPortfolioPhotoAction(formulario())).rejects.toThrow(
      "Não foi possível confirmar a foto",
    )
    expect(mock.remove).not.toHaveBeenCalled()
    // Só a categoria fixa vai pro log; o erro incerto não é ecoado.
    expect(log).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledWith(
      "[prestador] resposta incerta ao gravar a linha da foto; objeto preservado",
    )
    log.mockRestore()
  })

  it("contagem falhando depois do upload apaga o objeto sem linha", async () => {
    mock.ssrFrom.mockImplementation((tabela: string) => {
      if (tabela === "locality_memberships") return consulta({ locality_id: "localidade" })
      if (tabela === "provider_profiles") return consulta({ id: FICHA })
      if (tabela === "provider_portfolio_photos")
        return {
          select: () => ({
            eq: async () => ({ count: 0, error: { code: "XX000", message: "segredo" } }),
          }),
          insert: async () => ({ error: null }),
        }
      throw new Error(`tabela inesperada: ${tabela}`)
    })
    await expect(addPortfolioPhotoAction(formulario())).rejects.toThrow(
      "Falha a contar o portfólio",
    )
    expect(mock.remove).toHaveBeenCalledOnce()
    expect(mock.remove.mock.calls[0]?.[0]).toEqual([expect.stringContaining(`${FICHA}/portfolio/`)])
  })
})
