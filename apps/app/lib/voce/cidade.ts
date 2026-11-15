/**
 * O que a tela "Sua cidade" precisa saber sem falar HTTP nem desenhar nada
 * (F10 / RUN-170): o catálogo público de cidades, as datas do prazo e a copy da
 * falha.
 *
 * O catálogo reusa as duas rotas que a entrada já consome (`/api/localities` e
 * `/api/localities/[uf]`) — rota nova de catálogo seria uma segunda fonte de
 * município. O que interessa aqui é o `id` da cidade: o destino da transferência
 * é id, nunca nome (`declare_locality_transfer` recusa id fora do catálogo).
 *
 * Os prazos são os do módulo compartilhado `apps/web/lib/locality/move-city.ts`
 * (30 dias de padrão, 180 de teto). Aqui eles são só a afordância do campo —
 * quem decide é a rota, que chama aquele módulo; repetir a regra aqui seria ter
 * duas verdades sobre o teto.
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

export const DIAS_DE_SAIDA = 30
export const DIAS_MAXIMOS_DE_SAIDA = 180

const DIA_MS = 24 * 60 * 60 * 1000
const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function iso(data: Date): string {
  return data.toISOString().slice(0, 10)
}

/** O prazo que o campo já traz: 30 dias, como o provisionamento. */
export function prazoPadrao(hoje: Date): string {
  return iso(new Date(hoje.getTime() + DIAS_DE_SAIDA * DIA_MS))
}

/** O limite inferior do campo: hoje. */
export function hojeIso(hoje: Date): string {
  return iso(hoje)
}

/** O teto do campo: mais que isso não é mudança, é ter duas cidades. */
export function prazoMaximo(hoje: Date): string {
  return iso(new Date(hoje.getTime() + DIAS_MAXIMOS_DE_SAIDA * DIA_MS))
}

/** `2026-12-05` como "5 de dezembro de 2026"; vazio quando não há data. */
export function dataLegivel(valor: string): string {
  const dia = valor.slice(0, 10)
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia)
  if (partes === null) return ""
  const mes = MESES[Number(partes[2]) - 1]
  if (mes === undefined) return ""
  return `${Number(partes[3])} de ${mes} de ${partes[1]}`
}

/** O destino que o endereço traz (`/app/voce?mudar=<id>`), ou `null`. */
export function destinoDoEndereco(busca: Record<string, unknown>): string | null {
  const valor = busca["mudar"]
  if (typeof valor !== "string") return null
  const id = valor.trim()
  return UUID.test(id) ? id : null
}

/** A falha da mudança dita para a pessoa: o servidor já manda a frase pronta. */
export function mensagemDaMudanca(falha: unknown): string {
  if (falha instanceof FalhaDaApi) {
    if (falha.mensagem !== null) return falha.mensagem
    if (falha.motivoDoServidor === "sem-cidade")
      return "Não encontramos a sua cidade agora. Tente de novo em instantes."
  }
  return "Não foi possível mudar a sua cidade agora. Tente de novo."
}
