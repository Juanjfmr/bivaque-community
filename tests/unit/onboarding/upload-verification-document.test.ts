import { CODE_OF_CONDUCT_VERSION, CONSENT_VERSION } from "@bivaque/domain"
import { beforeEach, describe, expect, it, vi } from "vitest"

// O núcleo do documento de identidade é chamado pelos dois caminhos (a Server
// Action da web e a rota do app) e é onde mora toda a regra: consentimento,
// recusa de quem já tem vínculo, limite de 10 MB, MIME PDF/JPEG/PNG, assinatura
// do PDF byte a byte, sanitize da imagem, varredura de órfãos, upload no bucket
// e registro pela RPC canônica — envio normal ou troca do que está em análise.
//
// O teste troca o cliente de serviço, o leitor de status e o sanitizador e
// prova as recusas de validação (sem tocar no Storage) e o caminho feliz nos
// dois registros, com as RPCs certas. Não há CPF nem documento real: os bytes
// são sintéticos e o único dado pessoal é um id fixo de fixture.

vi.mock("server-only", () => ({}))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))
vi.mock("web/lib/onboarding/document-status", () => ({
  readDocumentPaths: vi.fn(),
  readDocumentStatus: vi.fn(),
}))
vi.mock("web/lib/storage/sanitize-image", () => ({ sanitizeImage: vi.fn() }))

import { readDocumentPaths, readDocumentStatus } from "web/lib/onboarding/document-status"
import {
  ehRecusaDeValidacao,
  uploadVerificationDocument,
} from "web/lib/onboarding/upload-verification-document"
import { sanitizeImage } from "web/lib/storage/sanitize-image"
import { createServerClient } from "web/lib/supabase/server"

const criarCliente = vi.mocked(createServerClient)
const lerCaminhos = vi.mocked(readDocumentPaths)
const lerStatus = vi.mocked(readDocumentStatus)
const sanitizar = vi.mocked(sanitizeImage)

const PESSOA = "fixture-user"
const BUCKET = "verification-documents"

const PDF = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF
`

// Recusas de validação: mensagem fixa que a tela mostra como está.
const MENSAGENS = {
  consentimento: "O aceite da entrada ainda não foi registrado.",
  vinculo: "Sua entrada já está concluída.",
  tamanho: "O arquivo deve ter até 10 MB.",
  formato: "Formato inválido. Envie um PDF, JPEG ou PNG.",
  pdf: "O arquivo não é um PDF válido. Envie um PDF, JPEG ou PNG.",
  imagem: "Não foi possível ler a imagem. Envie um JPEG ou PNG válido de até 10 MB.",
  upload: "Não foi possível enviar o arquivo agora. Tente novamente.",
  duplicado: "Já existe um documento em análise. Aguarde a decisão.",
} as const

const rpc = vi.fn()
const upload = vi.fn()
const remove = vi.fn()
const list = vi.fn()
const storageFrom = vi.fn(() => ({ upload, remove, list }))
const eq = vi.fn()
const maybeSingle = vi.fn()

const vinculo = {
  select: () => vinculo,
  eq: (coluna: string, valor: string) => {
    eq(coluna, valor)
    return vinculo
  },
  limit: () => vinculo,
  maybeSingle,
}

const servico = {
  from: vi.fn(() => vinculo),
  rpc,
  storage: { from: storageFrom },
}

function pdf(): File {
  return new File([PDF], "documento.pdf", { type: "application/pdf" })
}

function foto(): File {
  return new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], "foto.jpg", { type: "image/jpeg" })
}

beforeEach(() => {
  vi.clearAllMocks()
  criarCliente.mockReturnValue(servico as never)
  eq.mockReturnValue(undefined)
  maybeSingle.mockResolvedValue({ data: null, error: null })
  rpc.mockImplementation(async (name: string) => {
    if (name === "has_accepted_consent") return { data: true, error: null }
    return { data: null, error: null }
  })
  lerCaminhos.mockResolvedValue([])
  lerStatus.mockResolvedValue({ situation: "none", uploadedAt: null })
  sanitizar.mockResolvedValue(Buffer.from("imagem-sanitizada"))
  upload.mockResolvedValue({ error: null })
  remove.mockResolvedValue({ error: null })
  list.mockResolvedValue({ data: [], error: null })
})

describe("recusas de validação do documento", () => {
  it("recusa PDF sem o cabeçalho %PDF- e não toca no Storage", async () => {
    const arquivo = new File(["isto nao e um pdf"], "documento.pdf", {
      type: "application/pdf",
    })

    await expect(uploadVerificationDocument({ userId: PESSOA, file: arquivo })).resolves.toEqual({
      ok: false,
      error: MENSAGENS.pdf,
    })
    expect(sanitizar).not.toHaveBeenCalled()
    expect(upload).not.toHaveBeenCalled()
  })

  it("recusa MIME fora da lista antes de ler os bytes", async () => {
    const arquivo = new File([new Uint8Array([1, 2, 3])], "documento.webp", {
      type: "image/webp",
    })

    await expect(uploadVerificationDocument({ userId: PESSOA, file: arquivo })).resolves.toEqual({
      ok: false,
      error: MENSAGENS.formato,
    })
    expect(sanitizar).not.toHaveBeenCalled()
    expect(upload).not.toHaveBeenCalled()
  })

  it("recusa arquivo vazio e arquivo acima de 10 MB", async () => {
    const vazio = new File([], "documento.pdf", { type: "application/pdf" })
    await expect(uploadVerificationDocument({ userId: PESSOA, file: vazio })).resolves.toEqual({
      ok: false,
      error: MENSAGENS.tamanho,
    })

    const grande = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "documento.pdf", {
      type: "application/pdf",
    })
    await expect(uploadVerificationDocument({ userId: PESSOA, file: grande })).resolves.toEqual({
      ok: false,
      error: MENSAGENS.tamanho,
    })

    expect(upload).not.toHaveBeenCalled()
  })

  it("recusa sem o aceite registrado", async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === "has_accepted_consent") return { data: false, error: null }
      return { data: null, error: null }
    })

    await expect(uploadVerificationDocument({ userId: PESSOA, file: pdf() })).resolves.toEqual({
      ok: false,
      error: MENSAGENS.consentimento,
    })
    expect(rpc).toHaveBeenCalledWith("has_accepted_consent", {
      p_user_id: PESSOA,
      p_consent_version: CONSENT_VERSION,
      p_code_of_conduct_version: CODE_OF_CONDUCT_VERSION,
    })
    expect(upload).not.toHaveBeenCalled()
  })

  it("recusa quem já tem vínculo com cidade", async () => {
    maybeSingle.mockResolvedValue({ data: { locality_id: "fixture-locality" }, error: null })

    await expect(uploadVerificationDocument({ userId: PESSOA, file: pdf() })).resolves.toEqual({
      ok: false,
      error: MENSAGENS.vinculo,
    })
    expect(eq).toHaveBeenCalledWith("user_id", PESSOA)
    expect(upload).not.toHaveBeenCalled()
  })

  it("recusa imagem que o sanitizador não consegue ler", async () => {
    sanitizar.mockRejectedValue(new Error("Não foi possível ler a imagem."))

    await expect(uploadVerificationDocument({ userId: PESSOA, file: foto() })).resolves.toEqual({
      ok: false,
      error: MENSAGENS.imagem,
    })
    expect(upload).not.toHaveBeenCalled()
  })
})

describe("caminho feliz do documento", () => {
  it("envia PDF byte a byte e registra pelo submit_verification_document", async () => {
    await expect(uploadVerificationDocument({ userId: PESSOA, file: pdf() })).resolves.toEqual({
      ok: true,
    })

    expect(criarCliente).toHaveBeenCalledOnce()
    expect(storageFrom).toHaveBeenCalledWith(BUCKET)
    expect(upload).toHaveBeenCalledOnce()

    const [caminho, corpo, opcoes] = upload.mock.calls[0] as [
      string,
      Uint8Array,
      { contentType: string; upsert: boolean },
    ]
    expect(caminho).toMatch(new RegExp(`^${PESSOA}/`))
    expect(Buffer.from(corpo)).toEqual(Buffer.from(PDF))
    expect(opcoes).toEqual({ contentType: "application/pdf", upsert: false })
    expect(sanitizar).not.toHaveBeenCalled()

    const chamadas = rpc.mock.calls.map(([nome]) => nome)
    expect(chamadas).toContain("submit_verification_document")
    expect(chamadas).not.toContain("replace_verification_document")
    expect(rpc).toHaveBeenCalledWith("submit_verification_document", {
      p_user_id: PESSOA,
      p_storage_object_path: caminho,
      p_mime_type: "application/pdf",
    })
    expect(remove).not.toHaveBeenCalled()
  })

  it("limpa a imagem e registra com o contentType do arquivo", async () => {
    await expect(uploadVerificationDocument({ userId: PESSOA, file: foto() })).resolves.toEqual({
      ok: true,
    })

    expect(sanitizar).toHaveBeenCalledOnce()
    const [caminho, corpo, opcoes] = upload.mock.calls[0] as [
      string,
      Uint8Array,
      { contentType: string },
    ]
    expect(caminho).toMatch(new RegExp(`^${PESSOA}/`))
    expect(Buffer.from(corpo)).toEqual(Buffer.from("imagem-sanitizada"))
    expect(opcoes.contentType).toBe("image/jpeg")
  })

  it("troca o documento em análise pela replace_verification_document e fecha a fila", async () => {
    const antigo = `${PESSOA}/documento-antigo.pdf`
    lerStatus.mockResolvedValue({ situation: "in_review", uploadedAt: null })
    rpc.mockImplementation(async (name: string) => {
      if (name === "has_accepted_consent") return { data: true, error: null }
      if (name === "replace_verification_document") {
        return {
          data: [{ document_id: "fixture-document", replaced_storage_object_path: antigo }],
          error: null,
        }
      }
      return { data: null, error: null }
    })

    await expect(uploadVerificationDocument({ userId: PESSOA, file: pdf() })).resolves.toEqual({
      ok: true,
    })

    const chamadas = rpc.mock.calls.map(([nome]) => nome)
    expect(chamadas).toContain("replace_verification_document")
    expect(chamadas).not.toContain("submit_verification_document")
    expect(remove).toHaveBeenCalledWith([antigo])
    expect(rpc).toHaveBeenCalledWith("complete_verification_document_removal", {
      p_storage_object_path: antigo,
    })
  })
})

describe("falhas de infraestrutura do documento", () => {
  it("devolve a mensagem fixa quando o upload no bucket falha", async () => {
    upload.mockResolvedValue({ error: { message: "storage unavailable" } })

    await expect(uploadVerificationDocument({ userId: PESSOA, file: pdf() })).resolves.toEqual({
      ok: false,
      error: MENSAGENS.upload,
    })

    const chamadas = rpc.mock.calls.map(([nome]) => nome)
    expect(chamadas).not.toContain("submit_verification_document")
  })

  it("devolve a mensagem de documento em análise no 23505 e remove o objeto novo", async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === "has_accepted_consent") return { data: true, error: null }
      if (name === "submit_verification_document") {
        return { data: null, error: { code: "23505", message: "duplicate key" } }
      }
      return { data: null, error: null }
    })

    await expect(uploadVerificationDocument({ userId: PESSOA, file: pdf() })).resolves.toEqual({
      ok: false,
      error: MENSAGENS.duplicado,
    })

    const caminho = upload.mock.calls[0]?.[0] as string
    expect(remove).toHaveBeenCalledWith([caminho])
  })

  it("classifica recusa de validação separada de falha de infraestrutura", async () => {
    for (const mensagem of [
      MENSAGENS.consentimento,
      MENSAGENS.vinculo,
      MENSAGENS.tamanho,
      MENSAGENS.formato,
      MENSAGENS.pdf,
      MENSAGENS.imagem,
    ]) {
      expect(ehRecusaDeValidacao(mensagem)).toBe(true)
    }
    for (const mensagem of [MENSAGENS.upload, MENSAGENS.duplicado]) {
      expect(ehRecusaDeValidacao(mensagem)).toBe(false)
    }
  })
})
