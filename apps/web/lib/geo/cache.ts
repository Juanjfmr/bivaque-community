import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import type { CoordenadaDoCep, FonteDaCoordenada } from "./geocodificador"

/**
 * O cache de CEP do servidor (`public.cep_geocodes`).
 *
 * É tabela de serviço: nenhuma sessão lê nem escreve nela — só o cliente de
 * serviço das rotas. O cache é por CEP, nunca por pessoa.
 *
 * O bairro que a fonte devolve junto do CEP é guardado aqui (RUN-179): sem ele,
 * só a primeira geocodificação de cada CEP no país teria bairro e todo o resto da
 * base cairia no cache hit sem `region` no pedido.
 */

type Cliente = SupabaseClient<Database>

export type CoordenadaEmCache = Readonly<{
  cep: string
  latitude: number
  longitude: number
  fonte: FonteDaCoordenada
  /**
   * Texto da fonte; `null`/ausente nas linhas gravadas antes desta coluna
   * existir (o caminho do perfil ainda grava só a coordenada).
   */
  bairro?: string | null
}>

function fonte(valor: string): FonteDaCoordenada {
  if (valor === "brasilapi" || valor === "google") return valor
  throw new Error("fonte de coordenada desconhecida no cache")
}

/** O que já se sabe deste CEP, ou `null`. Erro de banco sobe. */
export async function lerCepDoCache(
  client: Cliente,
  cep: string,
): Promise<CoordenadaEmCache | null> {
  const { data, error } = await client
    .from("cep_geocodes")
    .select("latitude,longitude,source,neighborhood")
    .eq("cep", cep)
    .maybeSingle()
  if (error) throw error
  if (data === null) return null
  return {
    cep,
    latitude: data.latitude,
    longitude: data.longitude,
    fonte: fonte(data.source),
    bairro: data.neighborhood,
  }
}

/** Guarda a coordenada recém-geocodificada (e o bairro, quando veio). Erro sobe. */
export async function gravarCepNoCache(
  client: Cliente,
  cep: string,
  coordenada: CoordenadaDoCep,
  bairro: string | null = null,
): Promise<void> {
  const { error } = await client.from("cep_geocodes").upsert({
    cep,
    latitude: coordenada.latitude,
    longitude: coordenada.longitude,
    source: coordenada.fonte,
    neighborhood: bairro,
    fetched_at: new Date().toISOString(),
  })
  if (error) throw error
}
