import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { geocodificarCep } from "web/lib/geo/geocodificador"

const CEP = "69000000"

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status })
}

function ehBrasilApi(url: string): boolean {
  return url.startsWith("https://brasilapi.com.br/api/cep/v2/")
}

function buscarCom(responder: (url: string) => Response | Promise<Response>) {
  return vi.fn(async (url: string) => responder(url)) as unknown as typeof fetch
}

function coordenadas(latitude: unknown, longitude: unknown): Response {
  return resposta({ cep: CEP, location: { coordinates: { latitude, longitude } } })
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("geocodificarCep", () => {
  it("usa a BrasilAPI primeiro e devolve a coordenada do CEP", async () => {
    const buscar = buscarCom(() => coordenadas("-3.119", "-60.0217"))

    const resultado = await geocodificarCep(CEP, { buscar, chaveGoogle: "" })

    expect(resultado).toEqual({
      estado: "encontrado",
      coordenada: { latitude: -3.119, longitude: -60.0217, fonte: "brasilapi" },
    })
    expect(buscar).toHaveBeenCalledTimes(1)
    expect(vi.mocked(buscar).mock.calls[0]?.[0]).toBe(
      "https://brasilapi.com.br/api/cep/v2/69000000",
    )
  })

  it("CEP desconhecido na BrasilAPI é nao-encontrado, sem gastar a reserva", async () => {
    const buscar = buscarCom(() => resposta({}, 404))

    const resultado = await geocodificarCep(CEP, { buscar, chaveGoogle: "" })

    expect(resultado).toEqual({ estado: "nao-encontrado" })
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it("cai para o Google quando a BrasilAPI falha e há chave", async () => {
    const buscar = buscarCom((url) =>
      ehBrasilApi(url)
        ? resposta({}, 503)
        : resposta({
            status: "OK",
            results: [{ geometry: { location: { lat: -3.1, lng: -60 } } }],
          }),
    )

    const resultado = await geocodificarCep(CEP, { buscar, chaveGoogle: "chave-de-teste" })

    expect(resultado).toEqual({
      estado: "encontrado",
      coordenada: { latitude: -3.1, longitude: -60, fonte: "google" },
    })
    const chamadas = vi.mocked(buscar).mock.calls
    expect(chamadas).toHaveLength(2)
    const urlDoGoogle = String(chamadas[1]?.[0])
    expect(urlDoGoogle).toContain("maps.googleapis.com/maps/api/geocode/json")
    expect(urlDoGoogle).toContain("postal_code%3A69000000")
    expect(urlDoGoogle).toContain("key=chave-de-teste")
  })

  it("não chama o Google sem chave, mesmo com a BrasilAPI fora", async () => {
    const buscar = buscarCom(() => resposta({}, 500))

    const resultado = await geocodificarCep(CEP, { buscar, chaveGoogle: "" })

    expect(resultado).toEqual({ estado: "indisponivel" })
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it("lê a chave do ambiente quando o chamador não passa uma", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "chave-do-ambiente")
    const buscar = buscarCom((url) =>
      ehBrasilApi(url) ? resposta({}, 500) : resposta({ status: "ZERO_RESULTS" }),
    )

    const resultado = await geocodificarCep(CEP, { buscar })

    expect(resultado).toEqual({ estado: "indisponivel" })
    expect(String(vi.mocked(buscar).mock.calls[1]?.[0])).toContain("key=chave-do-ambiente")
  })

  it("ambas as fontes fora é indisponivel, não CEP inexistente", async () => {
    const buscar = buscarCom(() => resposta({}, 500))

    const resultado = await geocodificarCep(CEP, { buscar, chaveGoogle: "chave-de-teste" })

    expect(resultado).toEqual({ estado: "indisponivel" })
    expect(buscar).toHaveBeenCalledTimes(2)
  })

  it("CEP que nenhuma fonte conhece é nao-encontrado", async () => {
    const buscar = buscarCom((url) =>
      ehBrasilApi(url) ? resposta({}, 404) : resposta({ status: "ZERO_RESULTS" }),
    )

    const resultado = await geocodificarCep(CEP, { buscar, chaveGoogle: "chave-de-teste" })

    expect(resultado).toEqual({ estado: "nao-encontrado" })
  })

  it("estouro do prazo é indisponivel e não fica pendurado", async () => {
    const buscar = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolver, rejeitar) => {
          init?.signal?.addEventListener("abort", () => rejeitar(new Error("tempo esgotado")))
        }),
    ) as unknown as typeof fetch

    const resultado = await geocodificarCep(CEP, { buscar, chaveGoogle: "", tempoLimiteMs: 5 })

    expect(resultado).toEqual({ estado: "indisponivel" })
  })

  it("coordenada malformada da BrasilAPI não inventa número: o CEP fica sem posição", async () => {
    const buscar = buscarCom(() => coordenadas("sem-numero", "-60.0217"))

    const resultado = await geocodificarCep(CEP, { buscar, chaveGoogle: "" })

    expect(resultado).toEqual({ estado: "sem-coordenada" })
  })

  it("coordenada fora da faixa é recusada e não vira posição inventada", async () => {
    const buscar = buscarCom(() => coordenadas("120", "-60.0217"))

    const resultado = await geocodificarCep(CEP, { buscar, chaveGoogle: "" })

    expect(resultado).toEqual({ estado: "sem-coordenada" })
  })

  it("200 com corpo vazio na BrasilAPI não é prova de que o CEP existe", async () => {
    const buscar = buscarCom(() => resposta({}))

    const resultado = await geocodificarCep(CEP, { buscar, chaveGoogle: "" })

    expect(resultado).toEqual({ estado: "indisponivel" })
  })

  it("200 com CEP diferente do pedido não localiza o CEP pedido", async () => {
    const buscar = buscarCom(() =>
      resposta({
        cep: "69000001",
        location: { coordinates: { latitude: -3.119, longitude: -60.0217 } },
      }),
    )

    const resultado = await geocodificarCep(CEP, { buscar, chaveGoogle: "" })

    expect(resultado).toEqual({ estado: "indisponivel" })
  })

  it("coordenada anômala sem o CEP confirmado não vale como evidência", async () => {
    const buscar = buscarCom(() =>
      resposta({ location: { coordinates: { latitude: "120", longitude: "-60.0217" } } }),
    )

    const resultado = await geocodificarCep(CEP, { buscar, chaveGoogle: "" })

    expect(resultado).toEqual({ estado: "indisponivel" })
  })

  it("BrasilAPI conhece o CEP sem coordenada: sem-coordenada, não CEP inexistente", async () => {
    const buscar = buscarCom((url) =>
      ehBrasilApi(url)
        ? resposta({ cep: CEP, city: "Manaus" })
        : resposta({ status: "ZERO_RESULTS" }),
    )

    const resultado = await geocodificarCep(CEP, { buscar, chaveGoogle: "chave-de-teste" })

    expect(resultado).toEqual({ estado: "sem-coordenada" })
    // O Google é tentado antes de concluir que não há posição.
    expect(buscar).toHaveBeenCalledTimes(2)
  })

  it("Google localiza o CEP que a BrasilAPI conhece sem coordenada", async () => {
    const buscar = buscarCom((url) =>
      ehBrasilApi(url)
        ? resposta({ cep: CEP })
        : resposta({
            status: "OK",
            results: [{ geometry: { location: { lat: -3.1, lng: -60 } } }],
          }),
    )

    const resultado = await geocodificarCep(CEP, { buscar, chaveGoogle: "chave-de-teste" })

    expect(resultado).toEqual({
      estado: "encontrado",
      coordenada: { latitude: -3.1, longitude: -60, fonte: "google" },
    })
  })

  it("Google com coordenada fora da faixa não inventa número e mantém o CEP conhecido", async () => {
    const buscar = buscarCom((url) =>
      ehBrasilApi(url)
        ? resposta({}, 500)
        : resposta({
            status: "OK",
            results: [{ geometry: { location: { lat: -3.1, lng: 300 } } }],
          }),
    )

    const resultado = await geocodificarCep(CEP, { buscar, chaveGoogle: "chave-de-teste" })

    // O Google disse que conhece o CEP: sem posição não é CEP inexistente.
    expect(resultado).toEqual({ estado: "sem-coordenada" })
  })

  it("Google OK com results vazio não é prova: indisponivel, não CEP inexistente", async () => {
    const buscar = buscarCom((url) =>
      ehBrasilApi(url) ? resposta({}, 404) : resposta({ status: "OK", results: [] }),
    )

    const resultado = await geocodificarCep(CEP, { buscar, chaveGoogle: "chave-de-teste" })

    expect(resultado).toEqual({ estado: "indisponivel" })
    expect(buscar).toHaveBeenCalledTimes(2)
  })
})
