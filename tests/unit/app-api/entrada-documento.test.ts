import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// O envio do documento de identidade pelo app (LAN-F01) reusa o núcleo da web:
// a rota só resolve a sessão, confere a porta da escrita, aplica o teto do corpo
// antes de ler o multipart e traduz o resultado em 200/400/503. O teste troca a
// sessão, o cliente de serviço e o núcleo, e prova o contrato: 401 sem sessão,
// CSRF da escrita, 413 pelo `content-length` declarado, 400 sem arquivo, o id da
// SESSÃO como dono (nunca um `user_id` do FormData), 400 com o motivo nas
// recusas de validação, 503 genérico nas falhas de infraestrutura — sem ecoar
// mensagem crua — e o preflight.

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))
vi.mock("web/lib/onboarding/upload-verification-document", () => ({
  uploadVerificationDocument: vi.fn(),
  ehRecusaDeValidacao: vi.fn(),
}))

import { OPTIONS, POST } from "web/app/api/app/entry/document/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import {
  ehRecusaDeValidacao,
  uploadVerificationDocument,
} from "web/lib/onboarding/upload-verification-document"
import { createServerClient } from "web/lib/supabase/server"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const criarCliente = vi.mocked(createServerClient)
const enviarDocumento = vi.mocked(uploadVerificationDocument)
const ehRecusa = vi.mocked(ehRecusaDeValidacao)

const PESSOA = { id: "10000000-0000-4000-8000-000000000001", email: "pessoa@example.invalid" }
const OUTRA_PESSOA = "10000000-0000-4000-8000-000000000999"
// O NextRequest normaliza o host do URL para localhost no runner de teste; o que
// importa é a origem do cabeçalho bater com a do request, como no runtime.
const ORIGEM = "http://localhost:3000"
const URL_DA_ROTA = `${ORIGEM}/api/app/entry/document`
const DOZE_MB = 12 * 1024 * 1024

// Conteúdo sintético: não é documento de ninguém, só bytes com o cabeçalho que
// a exceção byte a byte do PDF exige.
const PDF = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF
`

function documento(): File {
  return new File([PDF], "documento.pdf", { type: "application/pdf" })
}

function sessaoAutenticada() {
  return {
    estado: "autenticada",
    via: "cookie",
    usuario: PESSOA,
    cliente: { from: vi.fn(), rpc: vi.fn() },
    cabecalhos: {},
  }
}

interface OpcoesDaRequisicao {
  cabecalho?: boolean
  origem?: string
  campo?: string
  arquivo?: File | null
  extras?: Record<string, string>
  contentLength?: string
  corpo?: string | FormData
}

function requisicao(opcoes: OpcoesDaRequisicao = {}) {
  const headers: Record<string, string> = { origin: opcoes.origem ?? ORIGEM }
  if (opcoes.cabecalho !== false) headers["x-bivaque-app"] = "bivaque-spa"
  if (opcoes.contentLength !== undefined) headers["content-length"] = opcoes.contentLength

  let corpo: string | FormData
  if (opcoes.corpo !== undefined) {
    corpo = opcoes.corpo
  } else {
    const formulario = new FormData()
    const arquivo = opcoes.arquivo === undefined ? documento() : opcoes.arquivo
    if (arquivo !== null) formulario.set(opcoes.campo ?? "documento", arquivo)
    for (const [campo, valor] of Object.entries(opcoes.extras ?? {})) formulario.set(campo, valor)
    corpo = formulario
  }

  return new NextRequest(URL_DA_ROTA, { method: "POST", headers, body: corpo })
}

function preflight(origem = ORIGEM) {
  return new NextRequest(URL_DA_ROTA, { method: "OPTIONS", headers: { origin: origem } })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  criarCliente.mockReturnValue({} as never)
  resolver.mockResolvedValue(sessaoAutenticada() as never)
  enviarDocumento.mockResolvedValue({ ok: true })
  ehRecusa.mockReturnValue(false)
})

describe("POST /api/app/entry/document", () => {
  it("sem sessão responde 401 e não chama o núcleo", async () => {
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)

    const resposta = await POST(requisicao())

    expect(resposta.status).toBe(401)
    expect(await resposta.json()).toEqual({ autenticado: false, motivo: "sem-credencial" })
    expect(enviarDocumento).not.toHaveBeenCalled()
  })

  it("escrita por cookie sem o cabeçalho do app é recusada antes de qualquer leitura", async () => {
    const resposta = await POST(requisicao({ cabecalho: false }))

    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "cabecalho-ausente" })
    expect(enviarDocumento).not.toHaveBeenCalled()
  })

  it("origem fora da lista é recusada", async () => {
    const resposta = await POST(requisicao({ origem: "https://evil.example.invalid" }))

    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "origem-recusada" })
    expect(enviarDocumento).not.toHaveBeenCalled()
  })

  it("content-length acima de 12 MB é 413 grande-demais sem ler o corpo", async () => {
    const resposta = await POST(requisicao({ contentLength: String(DOZE_MB + 1) }))

    expect(resposta.status).toBe(413)
    expect(await resposta.json()).toEqual({ erro: "grande-demais" })
    expect(enviarDocumento).not.toHaveBeenCalled()
  })

  it("content-length exatamente no teto de 12 MB segue para o núcleo", async () => {
    const resposta = await POST(requisicao({ contentLength: String(DOZE_MB) }))

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ ok: true })
    expect(enviarDocumento).toHaveBeenCalledOnce()
  })

  it("sem arquivo ou com o campo errado é 400 documento-ausente", async () => {
    const vazio = await POST(requisicao({ arquivo: null }))
    expect(vazio.status).toBe(400)
    expect(await vazio.json()).toEqual({ erro: "documento-ausente" })

    const nomeErrado = await POST(requisicao({ campo: "file" }))
    expect(nomeErrado.status).toBe(400)
    expect(await nomeErrado.json()).toEqual({ erro: "documento-ausente" })

    // Corpo que nem é multipart também não tem campo nenhum.
    const naoMultipart = await POST(requisicao({ corpo: JSON.stringify({ documento: "x" }) }))
    expect(naoMultipart.status).toBe(400)
    expect(await naoMultipart.json()).toEqual({ erro: "documento-ausente" })

    expect(enviarDocumento).not.toHaveBeenCalled()
  })

  it("envia com o id da SESSÃO, ignorando um user_id do FormData", async () => {
    const resposta = await POST(requisicao({ extras: { user_id: OUTRA_PESSOA } }))

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ ok: true })
    expect(enviarDocumento).toHaveBeenCalledOnce()

    const entrada = enviarDocumento.mock.calls[0]?.[0]
    if (entrada === undefined) throw new Error("o núcleo não recebeu o documento")
    expect(entrada.userId).toBe(PESSOA.id)
    expect(entrada.userId).not.toBe(OUTRA_PESSOA)
    expect(entrada.file).toBeInstanceOf(File)
    expect(entrada.file.name).toBe("documento.pdf")
    expect(entrada.file.type).toBe("application/pdf")
    expect(Buffer.from(await entrada.file.arrayBuffer())).toEqual(Buffer.from(PDF))
  })

  it("recusa de validação vira 400 documento-recusado com o motivo", async () => {
    const motivo = "Formato inválido. Envie um PDF, JPEG ou PNG."
    enviarDocumento.mockResolvedValue({ ok: false, error: motivo })
    ehRecusa.mockReturnValue(true)

    const resposta = await POST(requisicao())

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: "documento-recusado", motivo })
    expect(ehRecusa).toHaveBeenCalledWith(motivo)
  })

  it("falha de infraestrutura vira 503 documento-indisponivel sem ecoar a mensagem", async () => {
    const motivo = "Não foi possível enviar o arquivo agora. Tente novamente."
    enviarDocumento.mockResolvedValue({ ok: false, error: motivo })
    ehRecusa.mockReturnValue(false)

    const resposta = await POST(requisicao())

    expect(resposta.status).toBe(503)
    const corpo = await resposta.json()
    expect(corpo).toEqual({ erro: "documento-indisponivel" })
    expect(JSON.stringify(corpo)).not.toContain(motivo)
  })

  it("núcleo que lança vira 503 com log fixo, id e código — nunca 500 nem mensagem crua", async () => {
    const registrado: string[] = []
    const consoleError = vi.spyOn(console, "error").mockImplementation((linha: unknown) => {
      registrado.push(String(linha))
    })
    try {
      enviarDocumento.mockRejectedValue(
        new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"),
      )

      const resposta = await POST(requisicao())

      expect(resposta.status).toBe(503)
      expect(await resposta.json()).toEqual({ erro: "documento-indisponivel" })
      const log = registrado.join("\n")
      expect(log).toContain("entry document unavailable")
      expect(log).toContain(PESSOA.id)
      expect(log).toContain("infraestrutura")
      expect(log).not.toContain("SUPABASE_SERVICE_ROLE_KEY")
    } finally {
      consoleError.mockRestore()
    }
  })
})

describe("OPTIONS da rota", () => {
  it("responde preflight só para origem da lista", () => {
    const sim = OPTIONS(preflight())
    expect(sim.status).toBe(204)
    expect(sim.headers.get("access-control-allow-origin")).toBe(ORIGEM)
    expect(sim.headers.get("access-control-allow-headers")).toContain("x-bivaque-app")

    const nao = OPTIONS(preflight("https://evil.example.invalid"))
    expect(nao.status).toBe(403)
    expect(nao.headers.get("access-control-allow-origin")).toBeNull()
  })
})
