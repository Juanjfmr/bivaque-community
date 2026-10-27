import { idLocal } from "@/lib/id"

/** Projeção local de rascunho, sem escrita no banco e sem dados pessoais de contato. */
export type RascunhoImovel = {
  readonly id: string
  readonly cidade: string
  readonly titulo: string
  readonly tipo: "apartamento" | "casa"
  readonly finalidade: "aluguel" | "venda"
  readonly bairro: string
  readonly preco: number
  readonly quartos: number
  readonly area: number
  readonly vagas: number
  readonly descricao: string
  readonly criadoEm: string
}

export type DadosDoRascunho = Omit<RascunhoImovel, "id" | "cidade" | "criadoEm">

function chave(cidade: string): string {
  return `bivaque:rascunhos-imoveis:${cidade.trim().toLocaleLowerCase("pt-BR")}`
}

function ehRascunho(valor: unknown): valor is RascunhoImovel {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return false
  const x = valor as Record<string, unknown>
  return (
    typeof x["id"] === "string" &&
    x["id"].startsWith("rascunho-imovel-") &&
    typeof x["cidade"] === "string" &&
    typeof x["titulo"] === "string" &&
    (x["tipo"] === "casa" || x["tipo"] === "apartamento") &&
    (x["finalidade"] === "aluguel" || x["finalidade"] === "venda") &&
    typeof x["bairro"] === "string" &&
    typeof x["preco"] === "number" &&
    Number.isFinite(x["preco"]) &&
    typeof x["quartos"] === "number" &&
    typeof x["area"] === "number" &&
    typeof x["vagas"] === "number" &&
    typeof x["descricao"] === "string" &&
    typeof x["criadoEm"] === "string"
  )
}

export function lerRascunhosImoveis(cidade: string): RascunhoImovel[] {
  if (typeof window === "undefined") return []
  try {
    const valor: unknown = JSON.parse(window.sessionStorage.getItem(chave(cidade)) ?? "[]")
    return Array.isArray(valor)
      ? valor.filter((item): item is RascunhoImovel => ehRascunho(item) && item.cidade === cidade)
      : []
  } catch {
    return []
  }
}

/** Retorna null se o armazenamento da sessão estiver indisponível; nunca declara publicação. */
export function salvarRascunhoImovel(
  cidade: string,
  dados: DadosDoRascunho,
): RascunhoImovel | "limite" | null {
  if (
    cidade.trim() === "" ||
    dados.titulo.trim().length < 10 ||
    dados.bairro.trim().length < 2 ||
    !Number.isFinite(dados.preco) ||
    dados.preco <= 0 ||
    !Number.isFinite(dados.area) ||
    dados.area <= 0 ||
    !Number.isInteger(dados.quartos) ||
    dados.quartos < 0 ||
    !Number.isInteger(dados.vagas) ||
    dados.vagas < 0
  )
    return null
  const novo: RascunhoImovel = {
    ...dados,
    id: idLocal("rascunho-imovel-"),
    cidade,
    titulo: dados.titulo.trim(),
    bairro: dados.bairro.trim(),
    descricao: dados.descricao.trim(),
    criadoEm: new Date().toISOString(),
  }
  try {
    const anteriores = lerRascunhosImoveis(cidade)
    if (anteriores.length >= 10) return "limite"
    window.sessionStorage.setItem(chave(cidade), JSON.stringify([novo, ...anteriores]))
    return novo
  } catch {
    return null
  }
}

export function excluirRascunhoImovel(cidade: string, id: string): boolean {
  try {
    const restantes = lerRascunhosImoveis(cidade).filter((item) => item.id !== id)
    window.sessionStorage.setItem(chave(cidade), JSON.stringify(restantes))
    return true
  } catch {
    return false
  }
}
