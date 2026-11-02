import { describe, expect, it } from "vitest"

import { descritorDaAcao, entradaPadrao } from "../../lib/navegacao/entrada"
import { SELETOR_DO_TITULO } from "../../lib/navegacao/foco"
import {
  type AmbienteDeRestauracao,
  CARGA_CONCLUIDA,
  criarCargaPendente,
  registrarRolagem,
  restaurarEntrada,
} from "../../lib/navegacao/restauracao"

const ITEM = descritorDaAcao("abrir-item", "item-30")
const SELETOR_ITEM = '[data-acao="abrir-item"][data-valor="item-30"]'

function criarAmbienteFalso(alvos: readonly string[] = []) {
  const estado = { scrollado: [] as number[], focado: [] as string[] }
  const ambiente: AmbienteDeRestauracao = {
    scrollar: (para) => {
      estado.scrollado.push(para)
    },
    encontrar: (seletor) => {
      if (seletor === SELETOR_DO_TITULO) return { seletor } as unknown as Element
      return alvos.includes(seletor) ? ({ seletor } as unknown as Element) : null
    },
    visivel: () => true,
    focar: (elemento) => {
      estado.focado.push((elemento as unknown as { seletor: string }).seletor)
    },
  }
  return { ambiente, estado }
}

// A restauração espera um sinal explícito de carga concluída — nada de teto de
// quadros, nada de tempo de parede. Estes testes provam as duas pontas: que não
// aplica nada antes, por mais que a execução renda, e que aplica tudo depois.
describe("restauração de rolagem e foco", () => {
  it("não rola nem foca enquanto a carga da entrada está pendente", async () => {
    const { ambiente, estado } = criarAmbienteFalso([SELETOR_ITEM])
    const carga = criarCargaPendente()
    const restauracao = restaurarEntrada({ rolagem: 700, foco: ITEM, carga, ambiente })

    for (let rendeu = 0; rendeu < 5000; rendeu += 1) await Promise.resolve()
    expect(estado.scrollado).toEqual([])
    expect(estado.focado).toEqual([])

    carga.confirmar()
    const registro = await restauracao
    expect(estado.scrollado).toEqual([700])
    expect(estado.focado).toEqual([SELETOR_ITEM])
    expect(registro).toEqual({
      rolagemAplicada: 700,
      focoAplicado: SELETOR_ITEM,
      alvoAusente: false,
      cancelada: false,
    })
  })

  it("não aplica nada quando a pessoa sai da rota antes da carga terminar", async () => {
    const { ambiente, estado } = criarAmbienteFalso([SELETOR_ITEM])
    const carga = criarCargaPendente()
    const restauracao = restaurarEntrada({ rolagem: 700, foco: ITEM, carga, ambiente })

    carga.cancelar()
    const registro = await restauracao

    expect(registro.cancelada).toBe(true)
    expect(estado.scrollado).toEqual([])
    expect(estado.focado).toEqual([])
    // Cancelar depois de resolver não muda o que já aconteceu.
    const outra = criarCargaPendente()
    outra.confirmar()
    outra.cancelar()
    expect(await outra.concluida).toBe(true)
  })

  it("respeita o sinal de saída quando a resposta chega depois", async () => {
    const { ambiente, estado } = criarAmbienteFalso([SELETOR_ITEM])
    const controle = new AbortController()
    const carga = criarCargaPendente()
    const restauracao = restaurarEntrada({
      rolagem: 700,
      foco: ITEM,
      carga,
      ambiente,
      sinal: controle.signal,
    })

    // A resposta chegou, mas a pessoa já tinha saído da rota antes de a
    // continuação rodar.
    carga.liberarSemTela()
    controle.abort()

    const registro = await restauracao
    expect(registro.cancelada).toBe(true)
    expect(estado.scrollado).toEqual([])
    expect(estado.focado).toEqual([])
  })

  it("aplica rolagem e o alvo guardado quando a carga já está concluída", async () => {
    const { ambiente, estado } = criarAmbienteFalso([SELETOR_ITEM])
    const registro = await restaurarEntrada({
      rolagem: 640,
      foco: ITEM,
      carga: CARGA_CONCLUIDA,
      ambiente,
    })

    expect(estado.scrollado).toEqual([640])
    expect(estado.focado).toEqual([SELETOR_ITEM])
    expect(registro.alvoAusente).toBe(false)
  })

  it("cai no título da tela quando o alvo sumiu depois da carga", async () => {
    const { ambiente, estado } = criarAmbienteFalso([])
    const registro = await restaurarEntrada({
      rolagem: 0,
      foco: ITEM,
      carga: CARGA_CONCLUIDA,
      ambiente,
    })

    expect(estado.focado).toEqual([SELETOR_DO_TITULO])
    expect(registro.focoAplicado).toBe(SELETOR_DO_TITULO)
    expect(registro.alvoAusente).toBe(true)
    expect(registro.cancelada).toBe(false)
  })

  it("sem descritor de foco, foca o título da tela", async () => {
    const { ambiente, estado } = criarAmbienteFalso([])
    const registro = await restaurarEntrada({
      rolagem: 0,
      foco: null,
      carga: CARGA_CONCLUIDA,
      ambiente,
    })

    expect(estado.focado).toEqual([SELETOR_DO_TITULO])
    expect(registro.alvoAusente).toBe(false)
  })

  it("ignora o encolhimento de layout ao registrar a rolagem", () => {
    const base = { ...entradaPadrao(), rolagem: 600 }
    // Sem altura rolável, o evento veio do layout encolhendo, não da pessoa.
    expect(registrarRolagem(base, 0, 0).rolagem).toBe(600)
    expect(registrarRolagem(base, 0, 600).rolagem).toBe(600)
    expect(registrarRolagem(base, 1200, 0).rolagem).toBe(0)
    expect(registrarRolagem(base, 1200, 730).rolagem).toBe(730)
  })
})
