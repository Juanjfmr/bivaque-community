import { useQuery } from "@tanstack/react-query"
import { buscarGrupo } from "@/lib/dados/grupos"
import { buscarAnuncio } from "@/lib/dados/mercado"
import { buscarNegocio } from "@/lib/dados/negocios"
import { moeda } from "@/lib/formato"

/**
 * O item de que a conversa trata (REGUA-003): o anúncio, o negócio ou o grupo
 * em comum, lido pelas leituras que já existem em `lib/dados` a partir do
 * `contextoId` da caixa. Sem rota nova: quando o tipo não tem leitura, ou a
 * leitura falha, a conversa cai no rótulo do tipo (`contexto.ts`).
 */
export type ItemDaConversa = Readonly<{
  titulo: string
  foto: string | null
  /** Preço já escrito em reais, só para anúncio com preço. */
  preco: string | null
}>

const TIPOS_COM_ITEM: ReadonlySet<string> = new Set(["listing", "provider", "shared_group"])

export function temItem(tipo: string, contextoId: string): boolean {
  return TIPOS_COM_ITEM.has(tipo) && contextoId !== ""
}

export async function lerItemDaConversa(
  tipo: string,
  contextoId: string,
  signal?: AbortSignal,
): Promise<ItemDaConversa | null> {
  if (!temItem(tipo, contextoId)) return null
  const opcoes = signal ? { signal } : {}
  if (tipo === "listing") {
    const anuncio = await buscarAnuncio(contextoId, opcoes)
    return {
      titulo: anuncio.titulo,
      foto: anuncio.fotos[0] ?? anuncio.foto,
      preco: anuncio.precoCents === null ? null : moeda(anuncio.precoCents / 100),
    }
  }
  if (tipo === "provider") {
    const negocio = await buscarNegocio(contextoId, opcoes)
    return { titulo: negocio.nome, foto: negocio.foto, preco: null }
  }
  const detalhe = await buscarGrupo(contextoId, opcoes)
  return { titulo: detalhe.grupo.nome, foto: null, preco: null }
}

/** A leitura do item, uma vez por conversa e compartilhada entre caixa e cabeçalho. */
export function useItemDaConversa(tipo: string, contextoId: string): ItemDaConversa | null {
  const consulta = useQuery({
    queryKey: ["item-da-conversa", tipo, contextoId],
    queryFn: ({ signal }) => lerItemDaConversa(tipo, contextoId, signal),
    enabled: temItem(tipo, contextoId),
    retry: false,
    staleTime: 5 * 60_000,
  })
  return consulta.data ?? null
}
