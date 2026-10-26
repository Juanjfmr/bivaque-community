import type { DadosDaCidade } from "@/lib/dados"
import { normalizar } from "@/lib/texto"

/**
 * Helpers comuns das telas do produto: leitura defensiva do campo Json
 * "apresentacao", normalização de busca e contagem de respostas.
 */

export function registro(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {}
}

export function texto(valor: unknown, reserva = ""): string {
  return typeof valor === "string" ? valor : reserva
}

export function numero(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0
}

export function tamanho(valor: unknown): number {
  return Array.isArray(valor) ? valor.length : 0
}

export function primeiros(valor: unknown): string | null {
  return Array.isArray(valor) && typeof valor[0] === "string" ? valor[0] : null
}

const PARADAS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "em",
  "no",
  "na",
  "para",
  "com",
  "um",
  "uma",
  "por",
  "perto",
])

export function termos(consulta: string): string[] {
  return normalizar(consulta)
    .split(/[^a-z0-9]+/)
    .filter((parte) => parte.length > 1 && !PARADAS.has(parte))
}

/** Todos os termos precisam aparecer no texto; consulta vazia não casa. */
export function combina(consulta: string, texto: string): boolean {
  const partes = termos(consulta)
  if (partes.length === 0) return false
  const palheiro = normalizar(texto)
  return partes.every((parte) => palheiro.includes(parte))
}

/** Quantas respostas cada pergunta tem, pela tabela de respostas. */
export function contagemDeRespostas(dados: DadosDaCidade | null): ReadonlyMap<string, number> {
  const contagem = new Map<string, number>()
  if (dados === null) return contagem
  for (const resposta of dados.respostas) {
    contagem.set(resposta.request_id, (contagem.get(resposta.request_id) ?? 0) + 1)
  }
  return contagem
}

/** Quantos comentários cada publicação tem. */
export function contagemDeComentarios(dados: DadosDaCidade | null): ReadonlyMap<string, number> {
  const contagem = new Map<string, number>()
  if (dados === null) return contagem
  for (const comentario of dados.comentarios) {
    contagem.set(comentario.post_id, (contagem.get(comentario.post_id) ?? 0) + 1)
  }
  return contagem
}

/** "há 5 min", "há 3 h", "ontem", "há 4 dias" (protótipo: gAgo). */
export function quandoDe(valor: unknown): string {
  const at = typeof valor === "number" && Number.isFinite(valor) ? valor : 0
  const minutos = Math.max(1, Math.round((Date.now() - at) / 60000))
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `há ${horas} h`
  const dias = Math.round(horas / 24)
  return dias === 1 ? "ontem" : `há ${dias} dias`
}
