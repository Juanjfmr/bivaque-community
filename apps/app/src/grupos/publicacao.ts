import { FalhaDaApi } from "@/lib/api/cliente"

/**
 * O que a pessoa lê quando o servidor recusa uma publicação de grupo (F03,
 * critério 1).
 *
 * A tela ramifica pelo status e pelo código curto que o cliente já traduziu —
 * nunca pelo corpo do erro, que pode carregar código do Postgres, nome de
 * policy ou caminho de bucket. Cada recusa tem a sua frase e diz o próximo
 * passo; o tipo `ação` diz ao compositor o que ele precisa fazer além de
 * mostrar a frase.
 */

/** Códigos de erro que as rotas de grupo devolvem (apps/web) e os do cliente. */
export type CodigoDaRecusa =
  | "rede"
  | "sem-sessao"
  | "recusado"
  | "nao-encontrado"
  | "invalido"
  | "conflito"
  | "limite"
  | "indisponivel"
  | "sem-credencial"
  | "token-invalido"
  | "conflito-de-credencial"
  | "origem-recusada"
  | "cabecalho-ausente"
  | "corpo-invalido"
  | "dados-invalidos"
  | "grupo-nao-encontrado"
  | "nao-membro"
  | "escrita-indisponivel"
  | "ja-publicado"

export type Recusa =
  | {
      /** Recusa de conteúdo ou de estado: a pessoa corrige o texto e envia de novo. */
      readonly tipo: "recusa"
      /** Reenvio vale a pena com o mesmo texto? `false` pede outra ação primeiro. */
      readonly tentavel: boolean
      readonly frase: string
    }
  | {
      /** Falha de conexão ou de servidor: mostrar "Tentar de novo" e repetir o mesmo POST. */
      readonly tipo: "recuperavel"
      readonly frase: string
    }
  | {
      /** O servidor gravou, mas a publicação não chegou à lista: tentar de novo duplicaria. */
      readonly tipo: "sem-confirmacao"
      readonly frase: string
    }

export const NAO_PERMITE_PUBLICAR =
  "Sua conta não pode publicar neste grupo. Só quem participa publica: peça entrada ou fale com quem administra o grupo."

export const SESSAO_VENCIDA =
  "Sua sessão venceu e a publicação não foi enviada. Entre de novo para continuar escrevendo."

/** A frase genérica quando o servidor não explicou o que houve. */
export const NAO_FOI_POSSIVEL =
  "Não foi possível publicar. Seu texto continua aqui; tente enviar de novo."

/** O código certo da rota quando o erro chega sem corpo útil. */
function codigoDaRecusa(status: number): CodigoDaRecusa | null {
  if (status === 400) return "invalido"
  if (status === 401) return "sem-sessao"
  if (status === 403) return "recusado"
  if (status === 404) return "nao-encontrado"
  if (status === 409) return "conflito"
  if (status === 429) return "limite"
  if (status >= 500) return "indisponivel"
  return null
}

/**
 * A recusa do servidor, em frase. Tabela por status e por código:
 *
 * - 401 e qualquer recusa de credencial → sessão vencida, sem "Tentar de novo";
 * - 403 por falta de participação, por código de segurança do app ou pela
 *   policy do banco → não pode publicar, e o próximo passo é pedir entrada;
 * - 400 e 404 → o texto não voltou como o servidor espera; o texto fica e o
 *   compositor continua aberto;
 * - 409 → já publicado, para a pessoa não gravar de novo sem perceber;
 * - rede, 503 e qualquer status desconhecido → recuperável com "Tentar de novo".
 */
export function recusaAoPublicar(falha: unknown): Recusa {
  if (!(falha instanceof FalhaDaApi)) {
    return { tipo: "recuperavel", frase: NAO_FOI_POSSIVEL }
  }
  const codigo = falha.motivoDoServidor ?? codigoDaRecusa(falha.status)
  switch (codigo) {
    case "sem-sessao":
    case "sem-credencial":
    case "token-invalido":
    case "conflito-de-credencial":
      return { tipo: "recusa", tentavel: false, frase: SESSAO_VENCIDA }
    case "recusado":
    case "nao-membro":
      return { tipo: "recusa", tentavel: false, frase: NAO_PERMITE_PUBLICAR }
    case "origem-recusada":
    case "cabecalho-ausente":
      return {
        tipo: "recusa",
        tentavel: false,
        frase:
          "A publicação não saiu por uma conferência de segurança do app. Recarregue a página, entre de novo e envie outra vez.",
      }
    case "invalido":
    case "corpo-invalido":
    case "dados-invalidos":
      return {
        tipo: "recusa",
        tentavel: true,
        frase: "A publicação não foi aceita: confira o texto e as fotos e tente enviar de novo.",
      }
    case "nao-encontrado":
    case "grupo-nao-encontrado":
      return {
        tipo: "recusa",
        tentavel: false,
        frase:
          "Este grupo não está mais disponível para publicar. Volte à lista de grupos e escolha outro.",
      }
    case "conflito":
    case "ja-publicado":
      return {
        tipo: "recusa",
        tentavel: false,
        frase:
          "Esta publicação já foi enviada. Confira a lista do grupo antes de publicar o mesmo texto de novo.",
      }
    case "limite":
      return {
        tipo: "recusa",
        tentavel: true,
        frase: "Muitas publicações seguidas. Espere um pouco e envie de novo.",
      }
    default:
      return { tipo: "recuperavel", frase: NAO_FOI_POSSIVEL }
  }
}

/** Por que a publicação enviada não está na lista que acabou de ser lida. */
export function semConfirmacao(opcoes: {
  /** É possível buscar a página que a publicação abriria por ser a mais recente. */
  readonly primeiros: boolean
}): Recusa {
  return {
    tipo: "sem-confirmacao",
    frase: opcoes.primeiros
      ? "A publicação foi enviada, mas não apareceu na lista. O texto saiu do compositor. Confira a lista e a página seguinte antes de publicar de novo."
      : "A publicação foi enviada, mas não apareceu na lista porque ela está ordenada de outro jeito. O texto saiu do compositor. Volte para Recentes para ver a publicação.",
  }
}
