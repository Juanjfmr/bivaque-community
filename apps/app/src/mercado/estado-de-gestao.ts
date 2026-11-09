import type { AcaoDeSituacao } from "@/lib/dados/mercado"

/**
 * Máquina local do diálogo "Gerenciar anúncio" (F06).
 *
 * Não representa a situação do anúncio no banco: essa é devolvida pela API.
 * Representa exclusivamente a interação em curso. Antes, quatro useState
 * permitiam salvar, transicionar e pedir duas confirmações ao mesmo tempo.
 *
 * Invariantes:
 * - apenas uma operação em andamento por diálogo;
 * - pause/close só executam após confirmação da ação correspondente;
 * - ações rejeitadas mantêm a mesma referência de estado;
 * - terminar a operação libera a interação, inclusive quando a API falha.
 */
export type AcaoQueExigeConfirmacao = "pause" | "close"

export type EstadoDaGestao =
  | Readonly<{ fase: "livre" }>
  | Readonly<{ fase: "confirmando"; acao: AcaoQueExigeConfirmacao }>
  | Readonly<{ fase: "executando"; operacao: "edicao" | AcaoDeSituacao }>

export type EventoDaGestao =
  | Readonly<{ tipo: "pedir-confirmacao"; acao: AcaoQueExigeConfirmacao }>
  | Readonly<{ tipo: "cancelar-confirmacao" }>
  | Readonly<{ tipo: "iniciar-edicao" }>
  | Readonly<{ tipo: "iniciar-situacao"; acao: AcaoDeSituacao }>
  | Readonly<{ tipo: "concluir" }>

export const GESTAO_LIVRE: EstadoDaGestao = { fase: "livre" }

function precisaConfirmar(acao: AcaoDeSituacao): acao is AcaoQueExigeConfirmacao {
  return acao === "pause" || acao === "close"
}

/** Transição pura. Evento inválido não inicia chamada nem altera estado. */
export function transicaoDaGestao(
  atual: EstadoDaGestao,
  evento: EventoDaGestao,
): EstadoDaGestao {
  if (evento.tipo === "concluir") {
    return atual.fase === "executando" ? GESTAO_LIVRE : atual
  }

  if (evento.tipo === "cancelar-confirmacao") {
    return atual.fase === "confirmando" ? GESTAO_LIVRE : atual
  }

  if (atual.fase === "executando") return atual

  if (evento.tipo === "pedir-confirmacao") {
    return atual.fase === "livre" ? { fase: "confirmando", acao: evento.acao } : atual
  }

  if (evento.tipo === "iniciar-edicao") {
    return atual.fase === "livre" ? { fase: "executando", operacao: "edicao" } : atual
  }

  if (precisaConfirmar(evento.acao)) {
    if (atual.fase !== "confirmando" || atual.acao !== evento.acao) return atual
  } else if (atual.fase !== "livre") {
    return atual
  }
  return { fase: "executando", operacao: evento.acao }
}
