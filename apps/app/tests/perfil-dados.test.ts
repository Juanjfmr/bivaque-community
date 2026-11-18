import { afterEach, describe, expect, it, vi } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import { lerPerfilDeMembro } from "@/lib/dados/perfil"

/**
 * A porta do perfil de outra pessoa (F10 / RUN-161): caminho, método e tradução.
 * Resposta fora do contrato falha alto — o perfil nunca vira "vazio" por campo
 * ausente. Afiliação/cidade/contadores não existem neste contrato (BLOCK-AFFILIATION).
 */

function responder(corpo: unknown, status = 200) {
  const buscar = vi.fn(async () => new Response(JSON.stringify(corpo), { status }))
  vi.stubGlobal("fetch", buscar)
  return buscar
}

function chamada(buscar: ReturnType<typeof responder>) {
  const [caminho, init] = buscar.mock.calls[0] as unknown as [string, RequestInit]
  return { caminho, init }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const ID = "a0000000-0000-4000-8000-000000000001"
const MEMBRO = {
  id: ID,
  nome: "Ana Verificada",
  bio: "Gosto de trocar livros.",
  publicacoes: [{ id: "p1", texto: "Oi", criadaEm: "2026-11-15T00:00:00Z" }],
  eventos: [{ id: "e1", titulo: "Feira", comecaEm: "2026-11-20T00:00:00Z" }],
}

describe("lerPerfilDeMembro", () => {
  it("lê pelo caminho certo, em GET, e traduz o corpo", async () => {
    const buscar = responder({ membro: MEMBRO })
    const lido = await lerPerfilDeMembro(ID)
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe(`/api/app/membros/${ID}`)
    expect(init.method).toBe("GET")
    expect(lido).toEqual(MEMBRO)
  })

  it("campo ausente falha alto, não vira perfil vazio", async () => {
    const { nome: _nome, ...semNome } = MEMBRO
    responder({ membro: semNome })
    await expect(lerPerfilDeMembro(ID)).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("publicações fora do contrato falham alto", async () => {
    responder({ membro: { ...MEMBRO, publicacoes: "não é lista" } })
    await expect(lerPerfilDeMembro(ID)).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("404 (perfil invisível) propaga a falha", async () => {
    responder({ erro: "membro-nao-encontrado" }, 404)
    await expect(lerPerfilDeMembro(ID)).rejects.toBeInstanceOf(FalhaDaApi)
  })
})
