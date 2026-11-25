import { afterEach, describe, expect, it, vi } from "vitest"
import {
  enviarDenuncia,
  lerAlvosDeDenuncia,
  lerDenuncia,
  lerDenuncias,
} from "@/lib/dados/denuncias"

const denuncia = {
  id: "d1",
  targetType: "post",
  targetLabel: "Publicação",
  targetPreview: "Oferta repetida",
  targetHref: "/app/publicacao/p1",
  reason: "Spam: oferta repetida",
  status: "open",
  createdAt: "2026-11-05T12:00:00Z",
  resolvedAt: null,
}

function responder(corpo: unknown, status = 200) {
  const fetch = vi.fn(
    async (_caminho: string, _init: RequestInit) => new Response(JSON.stringify(corpo), { status }),
  )
  vi.stubGlobal("fetch", fetch)
  return fetch
}

afterEach(() => vi.unstubAllGlobals())

describe("TROCA-005 — porta das denúncias", () => {
  it("lê a lista do próprio denunciante", async () => {
    const fetch = responder({ denuncias: [denuncia], proximo: null })
    const lidas = await lerDenuncias()
    expect(lidas.denuncias[0]).toMatchObject({
      id: "d1",
      rotuloDoAlvo: "Publicação",
      resolvida: false,
    })
    expect(lidas.proximo).toBeNull()
    expect(fetch).toHaveBeenCalledWith("/api/app/denuncias", expect.anything())
  })

  it("envia o cursor de paginação na query", async () => {
    const depois = "2026-11-05T12:00:00+00:00"
    const fetch = responder({ denuncias: [], proximo: null })
    const lidas = await lerDenuncias({ depois })
    expect(lidas).toEqual({ denuncias: [], proximo: null })
    expect(fetch).toHaveBeenCalledWith(
      `/api/app/denuncias?depois=${encodeURIComponent(depois)}`,
      expect.anything(),
    )
  })

  it("proximo ausente é falha de contrato", async () => {
    responder({ denuncias: [denuncia] })
    await expect(lerDenuncias()).rejects.toMatchObject({
      mensagem: "Resposta do servidor fora do contrato.",
    })
  })

  it("lê o detalhe com motivo separado", async () => {
    responder({
      denuncia: { ...denuncia, motivo: { label: "Spam", explanation: "oferta repetida" } },
    })
    const lida = await lerDenuncia("d1")
    expect(lida.motivo).toBe("Spam")
    expect(lida.explicacao).toBe("oferta repetida")
  })

  it("lê os alvos da folha", async () => {
    responder({
      alvos: [
        { tipo: "post", id: "p1", titulo: "Oferta repetida" },
        { tipo: "group", id: "g1", titulo: "Vizinhos" },
      ],
    })
    const alvos = await lerAlvosDeDenuncia()
    expect(alvos.map((alvo) => alvo.tipo)).toEqual(["post", "group"])
  })

  it("alvo com tipo fora do contrato é falha", async () => {
    responder({ alvos: [{ tipo: "perfil", id: "x", titulo: "Alguém" }] })
    await expect(lerAlvosDeDenuncia()).rejects.toMatchObject({
      mensagem: "Resposta do servidor fora do contrato.",
    })
  })

  it("envia a denúncia com sinal e devolve o id gravado", async () => {
    const fetch = responder({ denuncia: { id: "d9" } }, 201)
    const controle = new AbortController()
    const id = await enviarDenuncia(
      { tipo: "post", alvo: "p1", motivo: "spam", explicacao: "Oferta repetida" },
      { signal: controle.signal },
    )
    expect(id).toBe("d9")
    expect(fetch).toHaveBeenCalledWith(
      "/api/app/denuncias",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          tipo: "post",
          alvo: "p1",
          motivo: "spam",
          explicacao: "Oferta repetida",
        }),
        signal: controle.signal,
      }),
    )
  })

  it("resposta sem id é falha, não sucesso presumido", async () => {
    responder({ denuncia: {} })
    await expect(
      enviarDenuncia({ tipo: "post", alvo: "p1", motivo: "spam", explicacao: "" }),
    ).rejects.toMatchObject({ mensagem: "Resposta do servidor fora do contrato." })
  })
})
