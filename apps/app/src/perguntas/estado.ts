import { FalhaDaApi } from "@/lib/api/cliente"

/** Cada ação desta jornada tem a sua frase quando o servidor não manda uma. */
export type AcaoQueFalha = "lista" | "pergunta" | "resposta"

const PADRAO: Readonly<Record<AcaoQueFalha, string>> = {
  lista: "Não foi possível carregar as perguntas da cidade. Tente de novo.",
  pergunta: "Não foi possível carregar esta pergunta. Tente de novo.",
  resposta: "Não foi possível enviar sua resposta. Seu texto foi mantido.",
}

/**
 * O que a pessoa lê quando a chamada falha.
 *
 * A frase do SERVIDOR vem primeiro — é a única que sabe o motivo exato —, depois
 * o motivo curto e, no fim, a frase da ação. Repetir "tente de novo" para uma
 * sessão vencida manda a pessoa repetir o que não vai funcionar.
 */
export function mensagemDaFalha(falha: unknown, acao: AcaoQueFalha): string {
  if (!(falha instanceof FalhaDaApi)) return PADRAO[acao]
  if (falha.codigo === "sem-sessao") return "Sua sessão expirou. Entre de novo para continuar."
  if (falha.codigo === "limite") return "Muitas tentativas seguidas. Espere um pouco."
  if (falha.mensagem !== null) return falha.mensagem
  if (falha.codigo === "nao-encontrado") return "Esta pergunta não está mais disponível."
  return PADRAO[acao]
}
