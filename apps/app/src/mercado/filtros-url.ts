/**
 * Filtros na URL do Mercado (LAN-F06): a tela lê `q`, `tipo`, faixa de preço,
 * `quartos` e `pagina` do endereço e os escreve de volta quando a pessoa filtra
 * — link antigo com filtro continua abrindo filtrado, e recarregar não perde a
 * seleção. Lógica pura, sem roteador: é aqui que a leitura é provada por teste.
 *
 * Nomes e unidades honram os links da web antiga: `valor_max` em reais (imóveis,
 * filters.ts), `preco_min`/`preco_max` em centavos (desapegos, catalog.ts),
 * `tipo` também aceito na grafia antiga (`apartment`/`house`).
 */

export type FiltrosDaUrl = Readonly<{
  /** Busca de texto (título/descrição); "" quando ausente. */
  q: string
  /** Tipo de imóvel no vocabulário da tela: "todos" | "apartamento" | "casa". */
  tipoImovel: string
  /** Quartos mínimos; 0 é "qualquer". */
  quartos: number
  /** Total mensal máximo em reais (imóveis); null é "qualquer valor". */
  valorMaxReais: number | null
  /** Faixa de preço dos desapegos, em centavos (unidade do link antigo). */
  precoMinCents: number | null
  precoMaxCents: number | null
  /** Página pedida, 1-based. */
  pagina: number
}>

export const FILTROS_DA_URL_PADRAO: FiltrosDaUrl = {
  q: "",
  tipoImovel: "todos",
  quartos: 0,
  valorMaxReais: null,
  precoMinCents: null,
  precoMaxCents: null,
  pagina: 1,
}

function texto(valor: unknown): string | null {
  if (typeof valor === "string" && valor.trim() !== "") return valor.trim()
  if (typeof valor === "number" && Number.isFinite(valor)) return String(valor)
  return null
}

/** Inteiro não negativo; torto vira null, nunca zero disfarçado. */
function inteiro(valor: unknown): number | null {
  const bruto = texto(valor)
  if (bruto === null || !/^\d+$/.test(bruto)) return null
  const n = Number.parseInt(bruto, 10)
  return Number.isSafeInteger(n) ? n : null
}

export function lerFiltrosDaUrl(busca: Record<string, unknown>): FiltrosDaUrl {
  const tipoBruto = texto(busca["tipo"])?.toLowerCase()
  // shortcut: a tela só conhece apartamento/casa; um `tipo` de link antigo fora
  // disso (studio, room) cai em "todos" — ampliar o seletor é decisão de design.
  const tipoImovel =
    tipoBruto === "apartamento" || tipoBruto === "apartment"
      ? "apartamento"
      : tipoBruto === "casa" || tipoBruto === "house"
        ? "casa"
        : "todos"

  const pagina = inteiro(busca["pagina"])
  return {
    q: texto(busca["q"]) ?? "",
    tipoImovel,
    quartos: inteiro(busca["quartos"]) ?? 0,
    valorMaxReais: inteiro(busca["valor_max"]),
    precoMinCents: inteiro(busca["preco_min"]),
    precoMaxCents: inteiro(busca["preco_max"]),
    pagina: pagina === null || pagina < 1 ? 1 : pagina,
  }
}

/** Normaliza para comparar `q` sem depender de acento ou caixa. */
export function semAcento(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

/**
 * O patch de busca para o roteador: `null` remove a chave (filtro voltando ao
 * padrão sai do endereço), número/string grava. O roteador faz o merge com o
 * resto da URL na navegação.
 */
export function filtrosParaUrl(
  filtros: Partial<FiltrosDaUrl>,
): Record<string, string | number | null> {
  const valores: Record<string, string | number | null> = {}
  if (filtros.q !== undefined) valores["q"] = filtros.q === "" ? null : filtros.q
  if (filtros.tipoImovel !== undefined)
    valores["tipo"] = filtros.tipoImovel === "todos" ? null : filtros.tipoImovel
  if (filtros.quartos !== undefined)
    valores["quartos"] = filtros.quartos > 0 ? filtros.quartos : null
  if (filtros.valorMaxReais !== undefined) valores["valor_max"] = filtros.valorMaxReais ?? null
  if (filtros.pagina !== undefined) valores["pagina"] = filtros.pagina > 1 ? filtros.pagina : null
  return valores
}

/** Merge do patch na busca atual, removendo as chaves zeradas de verdade. */
export function mesclarFiltrosNaUrl(
  atual: Record<string, unknown>,
  valores: Record<string, string | number | null>,
): Record<string, unknown> {
  const saida: Record<string, unknown> = { ...atual }
  for (const [chave, valor] of Object.entries(valores)) {
    if (valor === null) delete saida[chave]
    else saida[chave] = valor
  }
  return saida
}

/**
 * Trocar um filtro volta para a página 1: a posição alcançada pelo cursor não
 * significa nada para o novo filtro (F06). Um `pagina` explícito no patch — a
 * paginação da própria tela — vence a volta.
 */
export function mudarFiltroNaUrl(
  atual: Record<string, unknown>,
  filtros: Partial<FiltrosDaUrl>,
): Record<string, unknown> {
  return mesclarFiltrosNaUrl(atual, filtrosParaUrl({ pagina: 1, ...filtros }))
}
