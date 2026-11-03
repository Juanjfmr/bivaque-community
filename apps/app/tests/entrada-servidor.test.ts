import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  aceitarTermos,
  consultarCpf,
  enviarCodigo,
  FalhaDaEntrada,
  lerProgresso,
  lerVerificacao,
  provisionar,
  salvarProgresso,
  verificarCodigo,
} from "../src/entrada/servidor"

// O cliente das rotas /api/app/entry: URL, credenciais, cabeÃ§alho do app e
// traduÃ§Ã£o de cada resposta. O CPF vai no corpo e nunca na URL.

const fetchFalso = vi.fn()

type Chamada = { url: string; init: RequestInit }

function responda(status: number, corpo: unknown = {}) {
  fetchFalso.mockResolvedValue({
    status,
    json: async () => corpo,
  })
}

function ultimaChamada(): Chamada {
  const chamadas = fetchFalso.mock.calls as unknown as [string, RequestInit][]
  const [url, init] = chamadas[chamadas.length - 1] ?? ["", {}]
  return { url, init }
}

beforeEach(() => {
  fetchFalso.mockReset()
  vi.stubGlobal("fetch", fetchFalso)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("progresso", () => {
  it("GET com credencial de sessÃ£o e o cabeÃ§alho do app", async () => {
    responda(200, { autenticado: true, via: "cookie", progresso: { versao: 2, etapa: "porta" } })
    const resposta = await lerProgresso()
    expect(resposta.autenticado).toBe(true)
    const { url, init } = ultimaChamada()
    expect(url).toBe("/api/app/entry/progress")
    expect(init.credentials).toBe("include")
    expect((init.headers as Record<string, string>)["x-bivaque-app"]).toBe("bivaque-spa")
    expect(init.body).toBeUndefined()
  })

  it("401 vira 'sem sessÃ£o', sem erro de tela", async () => {
    responda(401, { autenticado: false })
    expect(await lerProgresso()).toEqual({ autenticado: false })
  })

  it("PUT grava o rascunho no corpo", async () => {
    responda(200, { ok: true })
    await salvarProgresso({ versao: 2, etapa: "cidade", estado: { cidade: "Manaus" } })
    const { url, init } = ultimaChamada()
    expect(url).toBe("/api/app/entry/progress")
    expect(init.method).toBe("PUT")
    expect(JSON.parse(String(init.body))).toEqual({
      versao: 2,
      etapa: "cidade",
      estado: { cidade: "Manaus" },
    })
  })

  it("falha de rede vira FalhaDaEntrada 'rede'", async () => {
    fetchFalso.mockRejectedValue(new Error("offline"))
    await expect(lerProgresso()).rejects.toMatchObject({ codigo: "rede", status: 0 })
  })
})

describe("cÃ³digo", () => {
  it("envio 200 devolve o tempo de reenvio", async () => {
    responda(200, { enviado: true, reenviarEm: 60 })
    expect(await enviarCodigo("pessoa@example.invalid")).toEqual({
      estado: "enviado",
      reenviarEm: 60,
    })
    expect(JSON.parse(String(ultimaChamada().init.body))).toEqual({
      email: "pessoa@example.invalid",
    })
  })

  it("envio 429 devolve limite com segundos", async () => {
    responda(429, { erro: "limite", reenviarEm: 47 })
    expect(await enviarCodigo("pessoa@example.invalid")).toEqual({
      estado: "limite",
      reenviarEm: 47,
    })
  })

  it("verificaÃ§Ã£o 400 Ã© cÃ³digo invÃ¡lido, com a mensagem Ãºnica", async () => {
    responda(400, { erro: "codigo-invalido" })
    expect(await verificarCodigo("pessoa@example.invalid", "123456")).toEqual({
      estado: "codigo-invalido",
    })
  })

  it("verificaÃ§Ã£o 200 autentica", async () => {
    responda(200, { autenticado: true })
    expect(await verificarCodigo("pessoa@example.invalid", "123456")).toEqual({
      estado: "autenticado",
    })
  })
})

describe("aceite, verificaÃ§Ã£o e CPF", () => {
  it("aceite POST sem corpo", async () => {
    responda(200, { aceito: true })
    await aceitarTermos()
    const { url, init } = ultimaChamada()
    expect(url).toBe("/api/app/entry/consent")
    expect(init.method).toBe("POST")
    expect(init.body).toBeUndefined()
  })

  it("status da verificaÃ§Ã£o volta tipado", async () => {
    responda(200, { autenticado: true, status: "pending", membroDaCidade: false, checkedAt: null })
    expect(await lerVerificacao()).toEqual({ status: "pending", membroDaCidade: false })
  })

  it("CPF vai no corpo, nunca na URL, e o resultado nÃ£o traz motivo", async () => {
    responda(200, { outcome: { status: "verified" } })
    const resultado = await consultarCpf("52998224725")
    expect(resultado).toEqual({ status: "verified" })
    const { url, init } = ultimaChamada()
    expect(url).toBe("/api/app/entry/cpf")
    expect(url).not.toContain("52998224725")
    expect(JSON.parse(String(init.body))).toEqual({ cpf: "52998224725" })
  })

  it("CPF recusado pela rota vira FalhaDaEntrada com o cÃ³digo", async () => {
    responda(403, { erro: "aceite-pendente" })
    await expect(consultarCpf("52998224725")).rejects.toBeInstanceOf(FalhaDaEntrada)
  })
})

describe("provisionamento", () => {
  it("manda os campos por nome de contrato", async () => {
    responda(200, { localityMember: true })
    await provisionar({
      ibgeCode: "1302603",
      displayName: "Ana Souza",
      moment: "resident",
    })
    expect(JSON.parse(String(ultimaChamada().init.body))).toEqual({
      ibge_code: "1302603",
      display_name: "Ana Souza",
      moment: "resident",
    })
  })

  it("erro da rota vira FalhaDaEntrada", async () => {
    responda(403, { erro: "verificacao-pendente" })
    await expect(
      provisionar({ ibgeCode: "1302603", displayName: "Ana Souza" }),
    ).rejects.toMatchObject({ codigo: "verificacao-pendente", status: 403 })
  })
})
