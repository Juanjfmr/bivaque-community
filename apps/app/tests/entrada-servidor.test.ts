import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  aceitarTermos,
  carregarCidades,
  carregarEstados,
  carregarGrupos,
  consultarCpf,
  enviarCodigo,
  FalhaDaEntrada,
  lerProgresso,
  lerVerificacao,
  previewConvite,
  provisionar,
  registrarCombinado,
  salvarAvisos,
  salvarInteresses,
  salvarProgresso,
  verificarCodigo,
} from "../src/entrada/servidor"

// O cliente das rotas /api/app/entry: URL, credenciais, cabeçalho do app e
// tradução de cada resposta. O CPF vai no corpo e nunca na URL.

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
  it("GET com credencial de sessão e o cabeçalho do app", async () => {
    responda(200, { autenticado: true, via: "cookie", progresso: { versao: 2, etapa: "porta" } })
    const resposta = await lerProgresso()
    expect(resposta.autenticado).toBe(true)
    const { url, init } = ultimaChamada()
    expect(url).toBe("/api/app/entry/progress")
    expect(init.credentials).toBe("include")
    expect((init.headers as Record<string, string>)["x-bivaque-app"]).toBe("bivaque-spa")
    expect(init.body).toBeUndefined()
  })

  it("401 vira 'sem sessão', sem erro de tela", async () => {
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

describe("código", () => {
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

  it("e-mail recusado pelo servidor é 'e-mail inválido', não 'indisponível' (SEC-007)", async () => {
    responda(400, { erro: "email-invalido" })
    expect(await enviarCodigo("x")).toEqual({ estado: "email-invalido" })
  })

  it("400 sem o motivo do e-mail, 403 e 503 continuam indisponíveis", async () => {
    responda(400, { erro: "corpo-invalido" })
    expect(await enviarCodigo("pessoa@example.invalid")).toEqual({ estado: "indisponivel" })
    responda(403, { erro: "origem-recusada" })
    expect(await enviarCodigo("pessoa@example.invalid")).toEqual({ estado: "indisponivel" })
    responda(503, { erro: "indisponivel" })
    expect(await enviarCodigo("pessoa@example.invalid")).toEqual({ estado: "indisponivel" })
  })

  it("verificação 400 é código inválido, com a mensagem única", async () => {
    responda(400, { erro: "codigo-invalido" })
    expect(await verificarCodigo("pessoa@example.invalid", "123456")).toEqual({
      estado: "codigo-invalido",
    })
  })

  it("verificação 200 autentica", async () => {
    responda(200, { autenticado: true })
    expect(await verificarCodigo("pessoa@example.invalid", "123456")).toEqual({
      estado: "autenticado",
    })
  })

  it("falha de rede no envio e na verificação não trava a tela", async () => {
    fetchFalso.mockRejectedValue(new Error("offline"))
    expect(await enviarCodigo("pessoa@example.invalid")).toEqual({ estado: "indisponivel" })
    expect(await verificarCodigo("pessoa@example.invalid", "123456")).toEqual({
      estado: "indisponivel",
    })
  })
})

describe("convite", () => {
  it("prévia válida devolve quem convidou e o e-mail declarado", async () => {
    responda(200, { inviterName: "Maria Souza", email: "familia@example.invalid" })
    expect(await previewConvite("BVQ7K2MA")).toEqual({
      estado: "ok",
      inviterName: "Maria Souza",
      email: "familia@example.invalid",
    })
    expect(ultimaChamada().url).toBe("/api/app/entry/invite/preview")
    expect(JSON.parse(String(ultimaChamada().init.body))).toEqual({ codigo: "BVQ7K2MA" })
  })

  it("falha de rede na prévia vira indisponível, não exceção", async () => {
    fetchFalso.mockRejectedValue(new Error("offline"))
    expect(await previewConvite("BVQ7K2MA")).toEqual({ estado: "indisponivel" })
  })

  it("e-mail de outro convite e limite têm estados próprios", async () => {
    responda(400, { erro: "email-nao-confere" })
    expect(await previewConvite("BVQ7K2MA", "outro@example.invalid")).toEqual({
      estado: "email-nao-confere",
    })
    responda(429, { erro: "convite-limite" })
    expect(await previewConvite("BVQ7K2MA")).toEqual({ estado: "limite" })
  })
})

describe("aceite, verificação e CPF", () => {
  it("aceite POST sem corpo", async () => {
    responda(200, { aceito: true })
    await aceitarTermos()
    const { url, init } = ultimaChamada()
    expect(url).toBe("/api/app/entry/consent")
    expect(init.method).toBe("POST")
    expect(init.body).toBeUndefined()
  })

  it("status da verificação volta tipado", async () => {
    responda(200, { autenticado: true, status: "pending", membroDaCidade: false, checkedAt: null })
    expect(await lerVerificacao()).toEqual({ status: "pending", membroDaCidade: false })
  })

  it("CPF vai no corpo, nunca na URL, e o resultado não traz motivo", async () => {
    responda(200, { outcome: { status: "verified" } })
    const resultado = await consultarCpf("52998224725")
    expect(resultado).toEqual({ status: "verified" })
    const { url, init } = ultimaChamada()
    expect(url).toBe("/api/app/entry/cpf")
    expect(url).not.toContain("52998224725")
    expect(JSON.parse(String(init.body))).toEqual({ cpf: "52998224725" })
  })

  it("CPF recusado pela rota vira FalhaDaEntrada com o código", async () => {
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

describe("fim do onboarding", () => {
  it("interesses manda os grupos no corpo", async () => {
    responda(200, { ok: true, grupos: ["g-1"] })
    await salvarInteresses(["g-1"])
    expect(ultimaChamada().url).toBe("/api/app/entry/interests")
    expect(JSON.parse(String(ultimaChamada().init.body))).toEqual({ grupos: ["g-1"] })
  })

  it("combinado manda a versão do Código de Conduta", async () => {
    responda(200, { ok: true, versao: 2 })
    await registrarCombinado(2)
    expect(JSON.parse(String(ultimaChamada().init.body))).toEqual({ versao: 2 })
  })

  it("avisos manda a escolha", async () => {
    responda(200, { ok: true, avisos: "agora-nao" })
    await salvarAvisos("agora-nao")
    expect(JSON.parse(String(ultimaChamada().init.body))).toEqual({ avisos: "agora-nao" })
  })

  it("falha de gravação vira FalhaDaEntrada", async () => {
    responda(503, { erro: "gravacao-indisponivel" })
    await expect(registrarCombinado(2)).rejects.toMatchObject({
      codigo: "gravacao-indisponivel",
      status: 503,
    })
  })
})

describe("catálogo e grupos", () => {
  it("estados vêm da rota pública de localidades", async () => {
    fetchFalso.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ufs: ["AM", "RR"] }),
    })
    expect(await carregarEstados()).toEqual(["AM", "RR"])
    expect(ultimaChamada().url).toBe("/api/localities")
  })

  it("cidades vêm mapeadas por código IBGE", async () => {
    fetchFalso.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        municipalities: [
          { id: "x", cityName: "Manaus", ibgeCode: "1302603" },
          { id: "y", cityName: 42, ibgeCode: "1302603" },
        ],
      }),
    })
    expect(await carregarCidades("AM")).toEqual([{ ibgeCode: "1302603", cityName: "Manaus" }])
  })

  it("grupos vêm mapeados da rota da entrada", async () => {
    responda(200, {
      autenticado: true,
      grupos: [
        { id: "g-1", nome: "Vizinhança", descricao: "Rua 10" },
        { id: "g-2", nome: "Escola", descricao: null },
        { id: 3, nome: "fora do contrato" },
      ],
    })
    expect(await carregarGrupos()).toEqual([
      { id: "g-1", nome: "Vizinhança", descricao: "Rua 10" },
      { id: "g-2", nome: "Escola", descricao: null },
    ])
    expect(ultimaChamada().url).toBe("/api/app/entry/groups")
  })

  it("sem sessão, grupos falham com 'sem-sessao'", async () => {
    responda(401, { autenticado: false })
    await expect(carregarGrupos()).rejects.toMatchObject({ codigo: "sem-sessao", status: 401 })
  })
})
