import type { Momento, Progresso } from "../previa-f01/fluxo"

/**
 * Regras da etapa canônica "Onde você está?" (lote B do F01).
 *
 * A tela coleta o modelo que o provisionamento exige: cidade pelo código IBGE
 * do catálogo, momento do fluxo e data de calendário real em `YYYY-MM-DD`.
 * Datas e destino que não se aplicam ao momento vão como `null`, para limpar
 * um valor antigo do rascunho em vez de deixá-lo passar.
 *
 * Vive num módulo sem DOM (só tipo importado do fluxo) para o teste rodar em
 * nó puro, sem React, rede ou relógio de parede: `hoje` é parâmetro.
 */

const CODIGO_IBGE = /^\d{7}$/
const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/
const MOMENTOS: readonly string[] = ["chegando", "morando", "saindo"]

export type CampoDaCidade =
  | "uf"
  | "cidade"
  | "momento"
  | "dataChegada"
  | "dataSaida"
  | "destinoIbge"

/** O que a tela tem em mãos antes de qualquer regra. */
export type EntradaDaCidade = Readonly<{
  uf: string
  cidadeIbge: string
  cidadeNome: string
  /** `Momento` do fluxo; texto solto porque um rascunho antigo pode trazer outro valor. */
  momento: string
  dataChegada: string
  dataSaida: string
  destinoIbge: string
}>

export type EscolhaDaCidade =
  | Readonly<{ ok: true; mudancas: Partial<Progresso> }>
  | Readonly<{ ok: false; campo: CampoDaCidade; texto: string }>

type FalhaDaData = Readonly<{
  ok: false
  campo: "dataChegada" | "dataSaida"
  texto: string
}>

function ehMomento(valor: string): valor is Momento {
  return MOMENTOS.includes(valor)
}

/** Data ISO `YYYY-MM-DD` que existe no calendário (2026-02-30 não passa). */
function dataDeCalendario(valor: string): boolean {
  const achado = DATA_ISO.exec(valor)
  if (achado === null) return false
  const ano = Number(achado[1])
  const mes = Number(achado[2])
  const dia = Number(achado[3])
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  )
}

function conferirData(
  valor: string,
  campo: "dataChegada" | "dataSaida",
  nome: "chegada" | "saída",
  hoje: string,
): FalhaDaData | null {
  const data = valor.trim()
  if (data === "") return { ok: false, campo, texto: `Escolha a data da ${nome}.` }
  if (!dataDeCalendario(data)) {
    return { ok: false, campo, texto: "Essa data não existe. Confira o dia e o mês." }
  }
  if (data < hoje) {
    return { ok: false, campo, texto: `A data da ${nome} não pode ser anterior a hoje.` }
  }
  return null
}

/**
 * Monta as mudanças do `Progresso` a partir do que a tela coletou, ou diz qual
 * campo impede o envio. `hoje` é injetado para o teste não depender do relógio.
 */
export function montarEscolhaDaCidade(
  entrada: EntradaDaCidade,
  hoje: string = new Date().toISOString().slice(0, 10),
): EscolhaDaCidade {
  if (entrada.uf.trim() === "") return { ok: false, campo: "uf", texto: "Escolha o estado." }

  const cidadeIbge = entrada.cidadeIbge.trim()
  const cidade = entrada.cidadeNome.trim()
  if (cidade === "" || !CODIGO_IBGE.test(cidadeIbge)) {
    return { ok: false, campo: "cidade", texto: "Escolha a cidade." }
  }

  if (!ehMomento(entrada.momento)) {
    return { ok: false, campo: "momento", texto: "Escolha um momento." }
  }
  const base = { cidade, cidadeIbge, momento: entrada.momento }

  if (entrada.momento === "chegando") {
    const problema = conferirData(entrada.dataChegada, "dataChegada", "chegada", hoje)
    if (problema !== null) return problema
    return {
      ok: true,
      mudancas: {
        ...base,
        dataChegada: entrada.dataChegada.trim(),
        dataSaida: null,
        destinoIbge: null,
      },
    }
  }

  if (entrada.momento === "saindo") {
    const problema = conferirData(entrada.dataSaida, "dataSaida", "saída", hoje)
    if (problema !== null) return problema
    const destinoIbge = entrada.destinoIbge.trim()
    if (!CODIGO_IBGE.test(destinoIbge)) {
      return { ok: false, campo: "destinoIbge", texto: "Escolha a cidade de destino." }
    }
    return {
      ok: true,
      mudancas: { ...base, dataChegada: null, dataSaida: entrada.dataSaida.trim(), destinoIbge },
    }
  }

  // Moro aqui: sem data e sem destino, limpando o que tiver ficado de antes.
  return {
    ok: true,
    mudancas: { ...base, dataChegada: null, dataSaida: null, destinoIbge: null },
  }
}
