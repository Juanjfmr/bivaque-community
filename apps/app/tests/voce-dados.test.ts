import { afterEach, describe, expect, it, vi } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import {
  desbloquear,
  desocultar,
  lerBloqueados,
  lerOcultados,
  lerPerfil,
  lerPublicacoes,
  pedirExclusao,
  salvarPerfil,
} from "@/lib/dados/voce"

/**
 * A porta da área "Você" (ADR-20261105 §2): caminho, método, corpo e tradução.
 * Resposta fora do contrato falha alto — lista vazia só quando o servidor diz
 * que a lista está vazia, nunca por campo ausente.
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

const CONTA = {
  perfil: { nome: "Ana Verificada", bio: null, cidade: "Manaus" },
  contagens: { salvos: 2, anuncios: 3, perguntas: 2, grupos: 1 },
  conta: { exclusaoPendente: false },
}

describe("perfil da conta", () => {
  it("traduz o perfil, as contagens e o estado da conta", async () => {
    const buscar = responder(CONTA)
    const conta = await lerPerfil()
    expect(chamada(buscar).caminho).toBe("/api/app/voce")
    expect(conta.perfil.nome).toBe("Ana Verificada")
    expect(conta.contagens.salvos).toBe(2)
    expect(conta.conta.exclusaoPendente).toBe(false)
  })

  it("contagem ausente é falha de formato, nunca zero", async () => {
    responder({ ...CONTA, contagens: { salvos: 2 } })
    await expect(lerPerfil()).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("salva pelo PATCH e devolve o estado gravado", async () => {
    const buscar = responder({
      perfil: { nome: "Ana Editada", bio: "Nova apresentação", cidade: "Manaus" },
    })
    const perfil = await salvarPerfil({ nome: "Ana Editada", bio: "Nova apresentação" })
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/voce")
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(String(init.body))).toEqual({ nome: "Ana Editada", bio: "Nova apresentação" })
    expect(perfil.nome).toBe("Ana Editada")
  })
})

describe("publicações e perguntas", () => {
  it("traduz as duas listas", async () => {
    const buscar = responder({
      publicacoes: [{ id: "p1", texto: "Oi", criadaEm: "2026-11-01T12:00:00Z", grupo: null }],
      perguntas: [
        {
          id: "q1",
          titulo: "Onde?",
          criadaEm: "2026-10-30T10:00:00Z",
          resolvida: true,
          respostas: 3,
        },
      ],
    })
    const lidas = await lerPublicacoes()
    expect(chamada(buscar).caminho).toBe("/api/app/voce/publicacoes")
    expect(lidas.publicacoes[0]?.grupo).toBeNull()
    expect(lidas.perguntas[0]?.respostas).toBe(3)
  })

  it("lista vazia é resposta legítima", async () => {
    responder({ publicacoes: [], perguntas: [] })
    await expect(lerPublicacoes()).resolves.toEqual({ publicacoes: [], perguntas: [] })
  })

  it("pergunta sem contagem de respostas falha alto", async () => {
    responder({ publicacoes: [], perguntas: [{ id: "q1", titulo: "Onde?" }] })
    await expect(lerPublicacoes()).rejects.toBeInstanceOf(FalhaDaApi)
  })
})

describe("bloqueados e ocultados", () => {
  it("lista bloqueados, com nome nulo quando o servidor não tem o nome", async () => {
    const buscar = responder({
      bloqueados: [{ id: "u1", nome: null, bloqueadoEm: "2026-11-03T12:00:00Z" }],
    })
    const lista = await lerBloqueados()
    expect(chamada(buscar).caminho).toBe("/api/app/voce/bloqueados")
    expect(lista[0]?.nome).toBeNull()
  })

  it("desfaz o bloqueio pelo DELETE no id", async () => {
    const buscar = responder({ removido: true })
    await desbloquear("u1")
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/voce/bloqueados/u1")
    expect(init.method).toBe("DELETE")
  })

  it("remoção não confirmada é falha, não sucesso silencioso", async () => {
    responder({ removido: false })
    await expect(desbloquear("u1")).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("lista e desfaz ocultados", async () => {
    const buscar = responder({
      ocultados: [{ id: "q1", titulo: "Onde?", ocultadoEm: "2026-11-02T08:00:00Z" }],
    })
    const lista = await lerOcultados()
    expect(chamada(buscar).caminho).toBe("/api/app/voce/ocultados")
    expect(lista[0]?.titulo).toBe("Onde?")
    responder({ removido: true })
    await desocultar("q1")
  })
})

describe("pedido de exclusão", () => {
  it("registra pelo POST e devolve o prazo do servidor", async () => {
    const buscar = responder({
      pedido: { solicitadoEm: "2026-11-06T12:00:00Z", prazoEm: "2026-12-06T12:00:00Z" },
      pendente: true,
    })
    const pedido = await pedirExclusao()
    expect(chamada(buscar).caminho).toBe("/api/app/voce/apagar-conta")
    expect(chamada(buscar).init.method).toBe("POST")
    expect(pedido.pendente).toBe(true)
    expect(pedido.pedido.prazoEm).toBe("2026-12-06T12:00:00Z")
  })

  it("falha do servidor não vira pedido registrado", async () => {
    responder({ erro: "exclusao-indisponivel" }, 503)
    await expect(pedirExclusao()).rejects.toMatchObject({ codigo: "indisponivel" })
  })
})
