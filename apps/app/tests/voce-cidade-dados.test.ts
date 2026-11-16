import { afterEach, describe, expect, it, vi } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import {
  cidadeDoLink,
  declararMudancaDeCidade,
  lerAfilicao,
  lerPerfil,
  salvarAfilicao,
} from "@/lib/dados/voce"

/**
 * A porta nova da área "Você" (RUN-170): cidade com id, estado de saída e a
 * afiliação privada. Resposta fora do contrato falha alto — campo aditivo
 * ausente não vira "sem cidade de saída", porque quem está em transferência
 * veria a tela oferecendo uma mudança que o banco vai recusar.
 */

const CIDADE = "00000000-0000-4000-8000-000000000001"
const RIO = "00000000-0000-4000-8000-000000000002"

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

const PERFIL = {
  nome: "Em Transferência",
  bio: null,
  cidade: { id: RIO, nome: "Rio de Janeiro" },
  outbound: {
    id: CIDADE,
    nome: "Manaus",
    uf: "AM",
    endsAt: "2026-12-05",
    readOnly: false,
  },
  localizacao: { cep: null, definida: false },
  distanciaDisponivel: false,
}

const CONTA = {
  perfil: PERFIL,
  contagens: { salvos: 0, anuncios: 0, perguntas: 0, grupos: 0 },
  conta: { exclusaoPendente: false },
}

describe("perfil com cidade e saída", () => {
  it("traduz a cidade com id e a cidade de saída até a data", async () => {
    const buscar = responder(CONTA)
    const conta = await lerPerfil()
    expect(chamada(buscar).caminho).toBe("/api/app/voce")
    expect(conta.perfil.cidade).toEqual({ id: RIO, nome: "Rio de Janeiro" })
    expect(conta.perfil.outbound).toEqual(PERFIL.outbound)
  })

  it("quem não está em transferência recebe outbound nulo", async () => {
    responder({ ...CONTA, perfil: { ...PERFIL, outbound: null } })
    await expect(lerPerfil()).resolves.toMatchObject({ perfil: { outbound: null } })
  })

  it("outbound ausente é falha de contrato, nunca 'sem saída'", async () => {
    const { outbound: _descartada, ...semSaida } = PERFIL
    responder({ ...CONTA, perfil: semSaida })
    await expect(lerPerfil()).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("cidade sem id é falha de contrato: o formulário não tem o que comparar", async () => {
    responder({ ...CONTA, perfil: { ...PERFIL, cidade: { nome: "Rio de Janeiro" } } })
    await expect(lerPerfil()).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("sessão sem cidade vem com id vazio, e não derruba a tela", async () => {
    responder({ ...CONTA, perfil: { ...PERFIL, cidade: { id: "", nome: "" }, outbound: null } })
    await expect(lerPerfil()).resolves.toMatchObject({ perfil: { cidade: { id: "" } } })
  })

  it("saída sem a marca de só leitura é falha de contrato", async () => {
    responder({
      ...CONTA,
      perfil: { ...PERFIL, outbound: { id: CIDADE, nome: "Manaus", uf: "AM", endsAt: "" } },
    })
    await expect(lerPerfil()).rejects.toBeInstanceOf(FalhaDaApi)
  })
})

describe("mudança de cidade", () => {
  it("declara pelo POST com destino e prazo, e devolve o estado novo", async () => {
    const buscar = responder({ perfil: { ...PERFIL, outbound: null } })
    const perfil = await declararMudancaDeCidade(RIO, "2026-12-05")
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/voce/cidade")
    expect(init.method).toBe("POST")
    expect(JSON.parse(String(init.body))).toEqual({ destino: RIO, prazo: "2026-12-05" })
    expect(perfil.cidade).toEqual({ id: RIO, nome: "Rio de Janeiro" })
  })

  it("mudança em andamento sobe com a frase que o servidor mandou", async () => {
    responder(
      {
        erro: "mudanca-em-andamento",
        mensagem: "Você já tem uma mudança em andamento. Espere o prazo da cidade anterior.",
      },
      409,
    )
    await expect(declararMudancaDeCidade(RIO, "2026-12-05")).rejects.toMatchObject({
      codigo: "conflito",
      motivoDoServidor: "mudanca-em-andamento",
      mensagem: "Você já tem uma mudança em andamento. Espere o prazo da cidade anterior.",
    })
  })

  it("resolve a cidade de um link pelos parâmetros do endereço", async () => {
    const buscar = responder({ destino: { id: RIO, nome: "Rio de Janeiro", uf: "RJ" } })
    const cidade = await cidadeDoLink(RIO)
    expect(chamada(buscar).caminho).toBe(`/api/app/voce/cidade?destino=${RIO}`)
    expect(cidade).toEqual({ id: RIO, nome: "Rio de Janeiro", uf: "RJ" })
  })

  it("id fora do catálogo é nulo, nunca cidade inventada", async () => {
    responder({ destino: null })
    await expect(cidadeDoLink(RIO)).resolves.toBeNull()
  })
})

describe("afiliação privada", () => {
  it("lê Força Armada e OM da própria pessoa", async () => {
    const buscar = responder({ afiliacao: { armedForce: "marinha", om: "12º BIS" } })
    const lida = await lerAfilicao()
    expect(chamada(buscar).caminho).toBe("/api/app/voce/afiliacao")
    expect(lida).toEqual({ armedForce: "marinha", om: "12º BIS" })
  })

  it("sem nada declarado são dois nulos, não string vazia", async () => {
    responder({ afiliacao: { armedForce: null, om: null } })
    await expect(lerAfilicao()).resolves.toEqual({ armedForce: null, om: null })
  })

  it("grava pelo PUT e relê o que o servidor devolveu — persistir é reler", async () => {
    const buscar = responder({ afiliacao: { armedForce: "aeronautica", om: "1º COMAR" } })
    const salva = await salvarAfilicao({ armedForce: "aeronautica", om: "1º COMAR" })
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/voce/afiliacao")
    expect(init.method).toBe("PUT")
    expect(JSON.parse(String(init.body))).toEqual({ armedForce: "aeronautica", om: "1º COMAR" })
    expect(salva).toEqual({ armedForce: "aeronautica", om: "1º COMAR" })

    // Recarregar a tela é outra leitura, e ela traz o que ficou gravado.
    responder({ afiliacao: { armedForce: "aeronautica", om: "1º COMAR" } })
    await expect(lerAfilicao()).resolves.toEqual({ armedForce: "aeronautica", om: "1º COMAR" })
  })

  it("limpar manda nulos e devolve o estado apagado", async () => {
    const buscar = responder({ afiliacao: { armedForce: null, om: null } })
    const salva = await salvarAfilicao({ armedForce: null, om: null })
    expect(JSON.parse(String(chamada(buscar).init.body))).toEqual({ armedForce: null, om: null })
    expect(salva).toEqual({ armedForce: null, om: null })
  })

  it("resposta sem o campo afiliacao é falha de contrato", async () => {
    responder({ ok: true })
    await expect(lerAfilicao()).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("recusa do servidor sobe com a frase dele", async () => {
    responder({ erro: "dados-invalidos", mensagem: "A OM não pode conter um CPF." }, 400)
    await expect(salvarAfilicao({ om: "52998224725" })).rejects.toMatchObject({
      status: 400,
      mensagem: "A OM não pode conter um CPF.",
    })
  })
})
