import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

type Cliente = SupabaseClient<Database>

/** Validade das URLs do Início: curta, como na ficha do negócio. */
export const VALIDADE_DA_FOTO = 300

type FotoDeAnuncio = { path: string; position: number }

/** A capa do anúncio é a foto de menor posição. */
export function capaDoAnuncio(fotos: readonly FotoDeAnuncio[] | null | undefined): string | null {
  const ordenadas = [...(fotos ?? [])].sort((a, b) => a.position - b.position)
  return ordenadas[0]?.path ?? null
}

/**
 * Assina caminhos de um bucket privado num lote só. A policy de select do
 * storage reconfere o acesso: a assinatura não é uma segunda autorização. Um
 * caminho que o storage não assina fica sem foto; nenhum caminho cru sai da rota.
 */
export async function assinar(
  client: Cliente,
  bucket: "listing-photos" | "provider-photos",
  caminhos: readonly string[],
): Promise<Map<string, string>> {
  const unicos = [...new Set(caminhos)]
  const assinadas = new Map<string, string>()
  if (unicos.length === 0) return assinadas
  const { data } = await client.storage.from(bucket).createSignedUrls(unicos, VALIDADE_DA_FOTO)
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) assinadas.set(item.path, item.signedUrl)
  }
  return assinadas
}

/**
 * A primeira foto de portfólio de cada negócio, sob a RLS da sessão. Falha de
 * leitura é falha da rota, não negócio sem foto.
 */
export async function capasDosNegocios(
  client: Cliente,
  ids: readonly string[],
): Promise<Map<string, string>> {
  const capas = new Map<string, string>()
  if (ids.length === 0) return capas
  const { data, error } = await client
    .from("provider_portfolio_photos")
    .select("provider_id,photo_path,position")
    .in("provider_id", [...ids])
    .order("position", { ascending: true })
  if (error) throw error
  for (const linha of data ?? []) {
    if (!capas.has(linha.provider_id)) capas.set(linha.provider_id, linha.photo_path)
  }
  return capas
}
