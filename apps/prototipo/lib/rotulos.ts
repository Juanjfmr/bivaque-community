import type { Categoria } from "./dados/indicacoes"

// Os nomes de tela das categorias do banco (`public.recommendation_category`,
// migration 20260802001100). O protótipo escrevia o assunto livre ("Pets",
// "Casa", "Saúde"); o banco tem oito categorias fechadas, e não há "Pets" —
// quem não couber em nenhuma sai como "Outros". É um buraco real entre o
// protótipo e o esquema, não uma escolha de tela.
export const ROTULO_DA_CATEGORIA: Record<Categoria, string> = {
  servicos_locais: "Serviços locais",
  saude_bem_estar: "Saúde",
  educacao: "Educação",
  esporte_lazer: "Esporte",
  alimentacao: "Alimentação",
  transporte: "Carro",
  moradia: "Casa",
  outros: "Outros",
}

export function assuntoDe(categoria: Categoria, bairro: string | null): string {
  const rotulo = ROTULO_DA_CATEGORIA[categoria]
  return bairro ? `${rotulo}, ${bairro}` : rotulo
}
