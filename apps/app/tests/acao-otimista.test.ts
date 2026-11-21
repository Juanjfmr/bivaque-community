import { describe, expect, it } from "vitest"

import { criarAcaoOtimista } from "../lib/acao-otimista"

/** Gravações que só terminam quando a prova mandar. */
function gravacaoRetida() {
  const pendentes: ((falha?: unknown) => void)[] = []
  const chamadas: string[] = []
  return {
    chamadas,
    gravar(nome: string): Promise<unknown> {
      chamadas.push(nome)
      return new Promise((resolver, rejeitar) => {
        pendentes.push((falha?: unknown) =>
          falha === undefined ? resolver(nome) : rejeitar(falha),
        )
      })
    },
    liberar(falha?: unknown) {
      for (const pendente of pendentes.splice(0)) pendente(falha)
    },
  }
}

describe("ação otimista — sucesso", () => {
  it("aplica na hora, grava uma vez e não reverte", async () => {
    const acao = criarAcaoOtimista()
    const visto: boolean[] = []
    let gravacoes = 0
    const resultado = await acao.executar("salvo", {
      aplicar: () => visto.push(true),
      reverter: () => visto.push(false),
      gravar: async () => {
        gravacoes += 1
      },
      mensagemDaRecusa: () => "não deveria aparecer",
      aoGravando: () => {},
    })

    expect(resultado).toEqual({ tipo: "sucesso" })
    expect(visto).toEqual([true])
    expect(gravacoes).toBe(1)
    expect(acao.gravando("salvo")).toBe(false)
  })

  it("mostra e esconde o estado de gravação", async () => {
    const acao = criarAcaoOtimista()
    const marca: boolean[] = []
    await acao.executar("salvo", {
      aplicar: () => {},
      reverter: () => {},
      gravar: async () => {},
      mensagemDaRecusa: () => "",
      aoGravando: (gravando) => marca.push(gravando),
    })

    expect(marca).toEqual([true, false])
  })
})

describe("ação otimista — recusa", () => {
  it("devolve o estado anterior e entrega o motivo", async () => {
    const acao = criarAcaoOtimista()
    const visto: boolean[] = []
    const resultado = await acao.executar("salvo", {
      aplicar: () => visto.push(true),
      reverter: () => visto.push(false),
      gravar: () => Promise.reject(new Error("sem rede")),
      mensagemDaRecusa: () => "Não foi possível salvar. Tente de novo.",
    })

    expect(resultado).toEqual({
      tipo: "recusa",
      mensagem: "Não foi possível salvar. Tente de novo.",
    })
    expect(visto).toEqual([true, false])
    expect(acao.gravando("salvo")).toBe(false)
  })
})

describe("ação otimista — toque repetido", () => {
  it("o segundo toque na mesma chave não grava de novo", async () => {
    const acao = criarAcaoOtimista()
    const gravacao = gravacaoRetida()
    let aplicacoes = 0

    const primeiro = acao.executar("anuncio-1", {
      aplicar: () => {
        aplicacoes += 1
      },
      reverter: () => {},
      gravar: () => gravacao.gravar("primeiro"),
      mensagemDaRecusa: () => "",
    })
    const segundo = await acao.executar("anuncio-1", {
      aplicar: () => {
        aplicacoes += 1
      },
      reverter: () => {},
      gravar: () => gravacao.gravar("segundo"),
      mensagemDaRecusa: () => "",
    })

    expect(segundo).toEqual({ tipo: "ignorado" })
    expect(acao.gravando("anuncio-1")).toBe(true)
    expect(aplicacoes).toBe(1)

    gravacao.liberar()
    expect(await primeiro).toEqual({ tipo: "sucesso" })
    expect(gravacao.chamadas).toEqual(["primeiro"])
  })

  it("chaves diferentes gravam ao mesmo tempo (duas remoções na mesma seção)", async () => {
    const acao = criarAcaoOtimista()
    const gravacao = gravacaoRetida()

    const um = acao.executar("q-1", {
      aplicar: () => {},
      reverter: () => {},
      gravar: () => gravacao.gravar("q-1"),
      mensagemDaRecusa: () => "",
    })
    const outro = acao.executar("q-2", {
      aplicar: () => {},
      reverter: () => {},
      gravar: () => gravacao.gravar("q-2"),
      mensagemDaRecusa: () => "",
    })

    expect(gravacao.chamadas).toEqual(["q-1", "q-2"])
    gravacao.liberar()
    expect(await um).toEqual({ tipo: "sucesso" })
    expect(await outro).toEqual({ tipo: "sucesso" })
    expect(acao.gravando("q-1")).toBe(false)
    expect(acao.gravando("q-2")).toBe(false)
  })
})

describe("ação otimista — Desfazer", () => {
  it("o Desfazer repete a ação com o estado anterior e o grava de verdade", async () => {
    const acao = criarAcaoOtimista()
    let estado = false
    const gravados: boolean[] = []

    const alternar = () => {
      const alvo = !estado
      return acao.executar("salvo", {
        aplicar: () => {
          estado = alvo
        },
        reverter: () => {
          estado = !alvo
        },
        gravar: async () => {
          gravados.push(alvo)
        },
        mensagemDaRecusa: () => "",
      })
    }

    expect(await alternar()).toEqual({ tipo: "sucesso" })
    expect(estado).toBe(true)

    // O Aviso chama de novo: o alvo agora é o estado anterior.
    expect(await alternar()).toEqual({ tipo: "sucesso" })
    expect(estado).toBe(false)
    expect(gravados).toEqual([true, false])
  })
})
