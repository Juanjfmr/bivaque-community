/**
 * O catálogo público de cidades, para o formulário de mudança de cidade.
 *
 * Reusa as duas rotas que a entrada já consome (`/api/localities` e
 * `/api/localities/[uf]`) — rota nova de catálogo seria uma segunda fonte de
 * município. O que interessa aqui é o `id` da cidade: o destino da transferência
 * é id, nunca nome (`declare_locality_transfer` recusa id fora do catálogo).
 */

import { FalhaDaApi, ler } from "@/lib/api/cliente"

export type Municipio = Readonly<{ id: string; nome: string }>

function foraDoContrato(): FalhaDaApi {
  return new FalhaDaApi("indisponivel", 0, null, "Resposta do catálogo fora do contrato.")
}

let estados: readonly string[] | null = null
const municipios = new Map<string, readonly Municipio[]>()

export async function carregarEstados(): Promise<readonly string[]> {
  if (estados !== null) return estados
  const corpo = await ler("/api/localities")
  const ufs = corpo["ufs"]
  if (!Array.isArray(ufs)) throw foraDoContrato()
  estados = ufs.filter((uf): uf is string => typeof uf === "string" && uf.length === 2)
  return estados
}

export async function carregarMunicipios(uf: string): Promise<readonly Municipio[]> {
  const guardados = municipios.get(uf)
  if (guardados !== undefined) return guardados
  const corpo = await ler(`/api/localities/${encodeURIComponent(uf)}`)
  const lista = corpo["municipalities"]
  if (!Array.isArray(lista)) throw foraDoContrato()
  const cidades = lista.flatMap((linha): Municipio[] => {
    if (typeof linha !== "object" || linha === null) return []
    const dados = linha as Record<string, unknown>
    return typeof dados["id"] === "string" && typeof dados["cityName"] === "string"
      ? [{ id: dados["id"], nome: dados["cityName"] }]
      : []
  })
  municipios.set(uf, cidades)
  return cidades
}
