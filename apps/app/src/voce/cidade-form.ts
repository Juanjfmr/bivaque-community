/**
 * A conta da mudança de cidade na tela (F10 / RUN-170): datas, o prazo do
 * endereço e a copy da falha.
 *
 * Os números são os do módulo compartilhado `apps/web/lib/locality/move-city.ts`
 * (30 dias de padrão, 180 de teto). Aqui eles são só a afordância do campo —
 * quem decide é a rota, que chama aquele módulo; repetir a regra aqui seria ter
 * duas verdades sobre o teto.
 */

import { FalhaDaApi } from "@/lib/api/cliente"

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

/**
 * O prazo que o campo já traz: 30 dias, como o provisionamento.
 */
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
