import type { AnuncioDaLista } from "@/lib/dados/mercado"
import { moeda } from "@/lib/formato"

/**
 * A leitura do anúncio real para os campos que os cartões da tela já consomem.
 * Só mapeia: não inventa atributo que o anúncio não informou.
 */

/** O filtro da tela fala o rótulo visto; o banco traz a chave do enum. */
export const ROTULOS_DE_TIPO_IMOVEL: Readonly<Record<string, string>> = {
  apartment: "Apartamento",
  house: "Casa",
  studio: "Kitnet/Studio",
  room: "Quarto",
  land: "Terreno",
  commercial: "Comercial",
}

export function ehImovel(anuncio: AnuncioDaLista): boolean {
  return anuncio.tipo === "property"
}

export function precoEmReais(anuncio: AnuncioDaLista): number | null {
  return anuncio.precoCents === null ? null : anuncio.precoCents / 100
}

export function eAluguel(anuncio: AnuncioDaLista): boolean {
  return anuncio.deal === "rent"
}

/**
 * Total por mês: aluguel + condomínio. Sem aluguel não há mensal, e condomínio
 * que não consta do anúncio não vira zero — quem não informou fica de fora do
 * filtro em vez de aparecer como "R$ 0 de condomínio".
 */
export function totalMensal(anuncio: AnuncioDaLista): number | null {
  if (anuncio.precoCents === null || !eAluguel(anuncio)) return null
  return (anuncio.precoCents + (anuncio.condoFeeCents ?? 0)) / 100
}

export function doTipo(anuncio: AnuncioDaLista, tipo: string): boolean {
  const rotulo =
    anuncio.tipoImovel === null
      ? ""
      : (ROTULOS_DE_TIPO_IMOVEL[anuncio.tipoImovel] ?? anuncio.tipoImovel)
  if (rotulo.toLocaleLowerCase("pt-BR") === tipo) return true
  return anuncio.titulo.toLocaleLowerCase("pt-BR").includes(tipo)
}

/** Só atributos explicitamente informados por quem anuncia. */
export function atributosDoImovel(anuncio: AnuncioDaLista): string[] {
  const itens: string[] = []
  if (anuncio.quartos !== null) {
    itens.push(`${anuncio.quartos} ${anuncio.quartos === 1 ? "quarto" : "quartos"}`)
  }
  if (anuncio.areaM2 !== null) itens.push(`${anuncio.areaM2} m²`)
  const tipo = anuncio.tipoImovel === null ? null : ROTULOS_DE_TIPO_IMOVEL[anuncio.tipoImovel]
  if (tipo !== null && tipo !== undefined) itens.push(tipo)
  return itens
}

export function complementoDoImovel(anuncio: AnuncioDaLista): string | undefined {
  return anuncio.condoFeeCents === null
    ? undefined
    : `Condomínio ${moeda(anuncio.condoFeeCents / 100)}`
}

/** A pílula da capa, derivada do estado e do tipo reais do anúncio. */
export function rotuloDaCapa(anuncio: AnuncioDaLista): string | undefined {
  if (anuncio.status === "reserved") return "Reservado"
  if (anuncio.status === "sold" || anuncio.status === "closed") {
    return ehImovel(anuncio) ? "Indisponível" : "Vendido"
  }
  if (anuncio.status === "paused" || anuncio.status === "draft") return "Indisponível"
  if (ehImovel(anuncio)) return anuncio.deal === "rent" ? "Aluguel" : "Venda"
  return undefined
}
