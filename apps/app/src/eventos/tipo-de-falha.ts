import { acessoNegado, sessaoVencida } from "./formulario"

/** O que a tela mostra quando a leitura falha (F02-001: Busca e Início). */
export type TipoDeFalha = "sessao" | "negado" | "falhou"

/**
 * 401 pede para entrar de novo, 403 diz que a conta não tem acesso, e só o
 * resto (rede, 5xx) oferece tentar de novo. Abortar é tratado antes, por quem chama.
 */
export function tipoDeFalha(falha: unknown): TipoDeFalha {
  if (sessaoVencida(falha)) return "sessao"
  if (acessoNegado(falha)) return "negado"
  return "falhou"
}
