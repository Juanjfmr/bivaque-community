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
 *
 * Validade (SEC-016): a linha mais velha que 180 dias volta marcada como
 * `vencida`. O chamador a trata como ausente — consulta o provedor e regrava com
 * `fetched_at` novo —, mas guarda a coordenada velha como rede: se o provedor
 * falhar ou o limite negar, o CEP continua resolvendo (CEP raramente muda de
 * lugar). Não há expurgo agendado: a tabela é por CEP, sem dono e sem dado de
 * pessoa, e a regravação mantém cada linha viva.
 */

type Cliente = SupabaseClient<Database>

export const VALIDADE_MS = 180 * 24 * 60 * 60 * 1000

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
  /** `fetched_at` mais velho que `VALIDADE_MS`: consultar o provedor de novo. */
  vencida: boolean
}>

function fonte(valor: string): FonteDaCoordenada {
  if (valor === "brasilapi" || valor === "google") return valor
  throw new Error("fonte de coordenada desconhecida no cache")
}

/** O que já se sabe deste CEP, ou `null`. Erro de banco sobe. */
export async function lerCepDoCache(
  client: Cliente,
  cep: string,
  agora: number = Date.now(),
): Promise<CoordenadaEmCache | null> {
  const { data, error } = await client
    .from("cep_geocodes")
    .select("latitude,longitude,source,neighborhood,fetched_at")
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
    vencida: agora - Date.parse(data.fetched_at) > VALIDADE_MS,
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
