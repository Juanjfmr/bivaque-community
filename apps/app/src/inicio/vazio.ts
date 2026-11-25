import type { InicioDaCidade } from "@/lib/dados/inicio"

/**
 * O estado vazio da Início (BUG-CIDADE-GRUPOS).
 *
 * A tela dizia "A primeira publicação abre a cidade" e oferecia "Ver perguntas"
 * numa cidade onde a consulta acabou de confirmar que não há publicação,
 * negócio, anúncio, grupo nem encontro nenhum. Vazio é o que a consulta
 * confirmou: nenhum conteúdo, nenhuma contagem, nenhum convite a uma lista que
 * não existe. O próximo passo é publicar — a única ação que cria o conteúdo.
 */

export type VazioDoInicio = Readonly<{ titulo: string; texto: string }>

/** A cidade está sem conteúdo quando as cinco seções vieram vazias da consulta. */
export function inicioVazio(dados: InicioDaCidade | null): boolean {
  if (dados === null) return false
  return (
    dados.perguntas.length === 0 &&
    dados.negocios.length === 0 &&
    dados.anuncios.length === 0 &&
    dados.grupos.length === 0 &&
    dados.eventos.length === 0
  )
}

export function vazioDoInicio(cidade: string): VazioDoInicio {
  return {
    titulo: `${cidade} ainda não tem publicações`,
    texto: "Quando alguém publicar nesta cidade, o conteúdo aparece aqui.",
  }
}
