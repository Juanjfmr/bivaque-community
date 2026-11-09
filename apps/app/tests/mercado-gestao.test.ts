import { describe, expect, it } from "vitest"
import { GESTAO_LIVRE, transicaoDaGestao } from "@/src/mercado/estado-de-gestao"

describe("máquina de gestão do anúncio", () => {
  it("confirma pausa antes de executar e volta a livre após a resposta", () => {
    const confirmando = transicaoDaGestao(GESTAO_LIVRE, {
      tipo: "pedir-confirmacao",
      acao: "pause",
    })
    expect(confirmando).toEqual({ fase: "confirmando", acao: "pause" })
    const executando = transicaoDaGestao(confirmando, {
      tipo: "iniciar-situacao",
      acao: "pause",
    })
    expect(executando).toEqual({ fase: "executando", operacao: "pause" })
    expect(transicaoDaGestao(executando, { tipo: "concluir" })).toEqual(GESTAO_LIVRE)
  })

  it("não executa pausa/encerramento sem confirmação", () => {
    expect(transicaoDaGestao(GESTAO_LIVRE, { tipo: "iniciar-situacao", acao: "pause" })).toBe(
      GESTAO_LIVRE,
    )
    expect(transicaoDaGestao(GESTAO_LIVRE, { tipo: "iniciar-situacao", acao: "close" })).toBe(
      GESTAO_LIVRE,
    )
  })

  it("confirma somente a ação escolhida, sem trocar pausa por encerramento", () => {
    const confirmando = transicaoDaGestao(GESTAO_LIVRE, {
      tipo: "pedir-confirmacao",
      acao: "pause",
    })
    expect(transicaoDaGestao(confirmando, { tipo: "iniciar-situacao", acao: "close" })).toBe(
      confirmando,
    )
    expect(transicaoDaGestao(confirmando, { tipo: "pedir-confirmacao", acao: "close" })).toBe(
      confirmando,
    )
  })

  it("permite cancelar uma confirmação sem alterar o anúncio", () => {
    const confirmando = transicaoDaGestao(GESTAO_LIVRE, {
      tipo: "pedir-confirmacao",
      acao: "close",
    })
    expect(transicaoDaGestao(confirmando, { tipo: "cancelar-confirmacao" })).toBe(GESTAO_LIVRE)
  })

  it("edita sem confirmação e rejeita outra operação enquanto executa", () => {
    const editando = transicaoDaGestao(GESTAO_LIVRE, { tipo: "iniciar-edicao" })
    expect(editando).toEqual({ fase: "executando", operacao: "edicao" })
    expect(transicaoDaGestao(editando, { tipo: "iniciar-edicao" })).toBe(editando)
    expect(transicaoDaGestao(editando, { tipo: "iniciar-situacao", acao: "sell" })).toBe(editando)
    expect(transicaoDaGestao(editando, { tipo: "pedir-confirmacao", acao: "pause" })).toBe(editando)
  })

  it("não salva enquanto há confirmação pendente", () => {
    const confirmando = transicaoDaGestao(GESTAO_LIVRE, {
      tipo: "pedir-confirmacao",
      acao: "pause",
    })
    expect(transicaoDaGestao(confirmando, { tipo: "iniciar-edicao" })).toBe(confirmando)
    expect(transicaoDaGestao(confirmando, { tipo: "iniciar-situacao", acao: "sell" })).toBe(
      confirmando,
    )
  })

  it("ação sem confirmação executa uma vez e libera para tentar de novo em erro", () => {
    const executando = transicaoDaGestao(GESTAO_LIVRE, {
      tipo: "iniciar-situacao",
      acao: "reactivate",
    })
    expect(executando).toEqual({ fase: "executando", operacao: "reactivate" })
    expect(transicaoDaGestao(executando, { tipo: "iniciar-situacao", acao: "reactivate" })).toBe(
      executando,
    )
    const livre = transicaoDaGestao(executando, { tipo: "concluir" })
    expect(transicaoDaGestao(livre, { tipo: "iniciar-situacao", acao: "reactivate" })).toEqual(
      executando,
    )
  })
})
