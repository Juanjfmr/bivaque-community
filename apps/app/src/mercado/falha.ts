import { FalhaDaApi } from "@/lib/api/cliente"

/**
 * O que a pessoa lê quando algo do Mercado falha. Mesmo molde de
 * `src/eventos/formulario`: a frase do SERVIDOR vem primeiro, porque é a única
 * que sabe o motivo exato; depois a frase da ação. Copiado aqui porque o
 * formulário dos eventos não é deste lote e não se edita.
 */

export type AcaoDeMercado = "lista" | "detalhe" | "interesse"

const PADRAO: Readonly<Record<AcaoDeMercado, string>> = {
  lista: "Não foi possível carregar os anúncios. Tente de novo.",
  detalhe: "Não foi possível carregar o anúncio. Tente de novo.",
  interesse: "Não foi possível abrir a conversa. Tente de novo.",
}

export function mensagemDaFalha(falha: unknown, acao: AcaoDeMercado): string {
  if (!(falha instanceof FalhaDaApi)) return PADRAO[acao]
  if (falha.codigo === "sem-sessao") return "Sua sessão expirou. Entre de novo para continuar."
  if (falha.codigo === "limite") return "Muitas tentativas seguidas. Espere um pouco."
  if (falha.mensagem !== null) return falha.mensagem
  if (falha.codigo === "nao-encontrado") return "Este anúncio não está mais disponível."
  return PADRAO[acao]
}

/** O anúncio pedido não existe (ou saiu do ar): a tela é de indisponível. */
export function anuncioSumiu(falha: unknown): boolean {
  return falha instanceof FalhaDaApi && falha.codigo === "nao-encontrado"
}
