import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// RUN-135, achado (d): a rota do documento confiava só no `content-length` para
// aplicar o teto do corpo. Quem omite ou mente o cabeçalho mandava o corpo
// inteiro e só era recusado depois de `formData()` — ou nem era recusado, se o
// multipart passasse do teto do núcleo por outro caminho. Agora o teto vale na
// LEITURA do fluxo, com ou sem cabeçalho.
//
// Este arquivo prova o caminho do fluxo; `entrada-documento.test.ts` guarda os
// demais contrato da rota (401, CSRF, 400, 503 e o preflight).

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))
vi.mock("web/lib/onboarding/upload-verification-document", () => ({
  uploadVerificationDocument: vi.fn(),
  ehRecusaDeValidacao: vi.fn(),
}))

import { POST } from "web/app/api/app/entry/document/route"
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
const ORIGEM = "http://localhost:3000"
const URL_DA_ROTA = `${ORIGEM}/api/app/entry/document`
const DEZ_MB = 10 * 1024 * 1024

const PDF = `%PDF-1.7
1 0 obj
<< /Type /Catalog >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF
`

function sessaoAutenticada() {
  return {
    estado: "autenticada",
    via: "cookie",
    usuario: PESSOA,
    cliente: { from: vi.fn(), rpc: vi.fn() },
    cabecalhos: {},
  }
}

function fluxoDeBytes(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controlador) {
      controlador.enqueue(bytes)
      controlador.close()
    },
  })
}

/** Um fluxo que produz `total` bytes sem nada guardar inteiro antes da hora. */
function fluxoDoTamanho(total: number): ReadableStream<Uint8Array> {
  const pedaco = new Uint8Array(64 * 1024)
  let enviado = 0
  return new ReadableStream({
    pull(controlador) {
      if (enviado >= total) {
        controlador.close()
        return
      }
      const tamanho = Math.min(pedaco.byteLength, total - enviado)
      enviado += tamanho
      controlador.enqueue(tamanho === pedaco.byteLength ? pedaco : pedaco.subarray(0, tamanho))
    },
  })
}

function requisicaoEmFluxo(
  fluxo: ReadableStream<Uint8Array>,
  opcoes: { tipo: string; contentLength?: string },
): NextRequest {
  const headers: Record<string, string> = {
    origin: ORIGEM,
    "x-bivaque-app": "bivaque-spa",
    "content-type": opcoes.tipo,
  }
  if (opcoes.contentLength !== undefined) headers["content-length"] = opcoes.contentLength

  // `duplex` é exigido pelo Node para corpo em fluxo; o NextRequest repassa ao
  // Request. Não entra no tipo do DOM, daí a conversão.
  return new NextRequest(URL_DA_ROTA, {
    method: "POST",
    headers,
    body: fluxo,
    duplex: "half",
  } as unknown as RequestInit)
}

/** O multipart real de um PDF, como o navegador montaria, e seu content-type. */
async function multipartDoPdf(): Promise<{ bytes: Uint8Array; tipo: string }> {
  const formulario = new FormData()
  formulario.set("documento", new File([PDF], "documento.pdf", { type: "application/pdf" }))
  const resposta = new Response(formulario)
  return {
    bytes: new Uint8Array(await resposta.arrayBuffer()),
    tipo: resposta.headers.get("content-type") ?? "",
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  criarCliente.mockReturnValue({} as never)
  resolver.mockResolvedValue(sessaoAutenticada() as never)
  enviarDocumento.mockResolvedValue({ ok: true })
  ehRecusa.mockReturnValue(false)
})

describe("POST /api/app/entry/document — teto do corpo na leitura", () => {
  it("fluxo acima de 10 MB SEM content-length é 413 sem chegar ao núcleo", async () => {
    const resposta = await POST(
      requisicaoEmFluxo(fluxoDoTamanho(DEZ_MB + 1), {
        tipo: "multipart/form-data; boundary=x",
      }),
    )

    expect(resposta.status).toBe(413)
    expect(await resposta.json()).toEqual({ erro: "grande-demais" })
    expect(enviarDocumento).not.toHaveBeenCalled()
  })

  it("content-length mentiroso (pequeno) não fura o teto: o fluxo grande é 413", async () => {
    const resposta = await POST(
      requisicaoEmFluxo(fluxoDoTamanho(DEZ_MB + 1), {
        tipo: "multipart/form-data; boundary=x",
        contentLength: "1024",
      }),
    )

    expect(resposta.status).toBe(413)
    expect(await resposta.json()).toEqual({ erro: "grande-demais" })
    expect(enviarDocumento).not.toHaveBeenCalled()
  })

  it("fluxo dentro do teto SEM content-length é lido e chega ao núcleo inteiro", async () => {
    const { bytes, tipo } = await multipartDoPdf()

    const resposta = await POST(requisicaoEmFluxo(fluxoDeBytes(bytes), { tipo }))

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ ok: true })
    expect(enviarDocumento).toHaveBeenCalledOnce()

    const entrada = enviarDocumento.mock.calls[0]?.[0]
    if (entrada === undefined) throw new Error("o núcleo não recebeu o documento")
    expect(entrada.userId).toBe(PESSOA.id)
    expect(entrada.file.name).toBe("documento.pdf")
    expect(entrada.file.type).toBe("application/pdf")
    expect(Buffer.from(await entrada.file.arrayBuffer())).toEqual(Buffer.from(PDF))
  })

  it("corpo vazio sem content-length é 400 documento-ausente, não 500", async () => {
    const resposta = await POST(
      requisicaoEmFluxo(fluxoDeBytes(new Uint8Array(0)), {
        tipo: "multipart/form-data; boundary=x",
      }),
    )

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: "documento-ausente" })
    expect(enviarDocumento).not.toHaveBeenCalled()
  })
})
