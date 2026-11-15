import { enviar, FalhaDaApi, ler } from "../api/cliente"
import { moeda } from "../formato"

/**
 * A porta dos alertas de busca de imóvel (RUN-169): fala só com
 * `/api/app/imoveis/alertas` e traduz o corpo para o que a tela desenha.
 *
 * Regra do molde (ADR-20261105 §2): campo obrigatório que chega torto é FALHA
 * de serviço, nunca lista vazia. O alerta é do dono da sessão — o servidor
 * decide isso pelas policies, e o app nunca manda dono no corpo.
 */

export type TipoDeNegocio = "rent" | "sale"

export type AlertaDeImovel = Readonly<{
  id: string
  nome: string
  bairro: string | null
  tipoNegocio: TipoDeNegocio | null
  valorMaxCents: number | null
  quartos: number | null
  ativo: boolean
  criadoEm: string
  /** As chaves de filtro que a busca do app entende, já no formato dela. */
  busca: Readonly<Record<string, string>>
}>

/** O que o formulário manda: os critérios e a situação, sem dono nem id. */
export type CriteriosDoAlerta = Readonly<{
  nome: string
  bairro: string | null
  tipoNegocio: TipoDeNegocio | null
  valorMaxCents: number | null
  quartos: number | null
  ativo: boolean
}>

type Corpo = Record<string, unknown>
type Opcoes = { signal?: AbortSignal }

function foraDoContrato(): FalhaDaApi {
  return new FalhaDaApi("indisponivel", 0, null, "Resposta do servidor fora do contrato.")
}

function registro(valor: unknown): Corpo {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) throw foraDoContrato()
  return valor as Corpo
}

function texto(corpo: Corpo, chave: string): string {
  const valor = corpo[chave]
  if (typeof valor !== "string" || valor === "") throw foraDoContrato()
  return valor
}

function textoOuNulo(corpo: Corpo, chave: string): string | null {
  const valor = corpo[chave]
  if (valor !== null && typeof valor !== "string") throw foraDoContrato()
  return valor
}

function numeroOuNulo(corpo: Corpo, chave: string): number | null {
  const valor = corpo[chave]
  if (valor !== null && typeof valor !== "number") throw foraDoContrato()
  return valor
}

function booleano(corpo: Corpo, chave: string): boolean {
  const valor = corpo[chave]
  if (typeof valor !== "boolean") throw foraDoContrato()
  return valor
}

function negocioOuNulo(corpo: Corpo, chave: string): TipoDeNegocio | null {
  const valor = corpo[chave]
  if (valor === null) return null
  if (valor !== "rent" && valor !== "sale") throw foraDoContrato()
  return valor
}

function buscaDoCorpo(valor: unknown): Readonly<Record<string, string>> {
  const busca: Record<string, string> = {}
  for (const [chave, item] of Object.entries(registro(valor))) {
    if (typeof item !== "string") throw foraDoContrato()
    busca[chave] = item
  }
  return busca
}

function lerAlerta(valor: unknown): AlertaDeImovel {
  const item = registro(valor)
  return {
    id: texto(item, "id"),
    nome: texto(item, "nome"),
    bairro: textoOuNulo(item, "bairro"),
    tipoNegocio: negocioOuNulo(item, "tipoNegocio"),
    valorMaxCents: numeroOuNulo(item, "valorMaxCents"),
    quartos: numeroOuNulo(item, "quartos"),
    ativo: booleano(item, "ativo"),
    criadoEm: texto(item, "criadoEm"),
    busca: buscaDoCorpo(item["busca"]),
  }
}

function corpoDe(criterios: CriteriosDoAlerta): Corpo {
  return {
    nome: criterios.nome,
    bairro: criterios.bairro,
    tipoNegocio: criterios.tipoNegocio,
    valorMaxCents: criterios.valorMaxCents,
    quartos: criterios.quartos,
    ativo: criterios.ativo,
  }
}

export async function lerAlertas(opcoes: Opcoes = {}): Promise<readonly AlertaDeImovel[]> {
  const corpo = await ler("/api/app/imoveis/alertas", opcoes)
  const lista = corpo["alertas"]
  if (!Array.isArray(lista)) throw foraDoContrato()
  return lista.map(lerAlerta)
}

/** Cria e devolve o alerta GRAVADO — o id e a data vêm do banco. */
export async function criarAlerta(
  criterios: CriteriosDoAlerta,
  opcoes: Opcoes = {},
): Promise<AlertaDeImovel> {
  const corpo = await enviar("POST", "/api/app/imoveis/alertas", corpoDe(criterios), opcoes)
  return lerAlerta(corpo["alerta"])
}

/** Edita os critérios e/ou a situação; 404 é alerta que não é desta pessoa. */
export async function salvarAlerta(
  id: string,
  criterios: CriteriosDoAlerta,
  opcoes: Opcoes = {},
): Promise<AlertaDeImovel> {
  const corpo = await enviar(
    "PATCH",
    `/api/app/imoveis/alertas/${encodeURIComponent(id)}`,
    corpoDe(criterios),
    opcoes,
  )
  return lerAlerta(corpo["alerta"])
}

export async function apagarAlerta(id: string, opcoes: Opcoes = {}): Promise<void> {
  const corpo = await enviar(
    "DELETE",
    `/api/app/imoveis/alertas/${encodeURIComponent(id)}`,
    undefined,
    opcoes,
  )
  if (corpo["removido"] !== true) throw foraDoContrato()
}

/**
 * Os critérios em uma linha: "Aluguel · Até R$ 2.500 · 2+ quartos". O bairro
 * também aparece — ele é critério da entrega, mesmo não sendo filtro da busca
 * do app (a perda do link está declarada no RELATORIO do RUN-169).
 */
export function resumoDoAlerta(alerta: AlertaDeImovel): string {
  const partes: string[] = []
  if (alerta.tipoNegocio === "rent") partes.push("Aluguel")
  if (alerta.tipoNegocio === "sale") partes.push("Venda")
  if (alerta.bairro !== null) partes.push(alerta.bairro)
  if (alerta.valorMaxCents !== null) partes.push(`Até ${moeda(alerta.valorMaxCents / 100)}`)
  if (alerta.quartos !== null) partes.push(`${alerta.quartos}+ quartos`)
  return partes.length > 0 ? partes.join(" · ") : "Todos os imóveis"
}

/** "Ativo · Criado em 20/05/2024" — a linha de situação da lista. */
export function situacaoDoAlerta(alerta: AlertaDeImovel): string {
  const quando = new Date(alerta.criadoEm)
  const situacao = alerta.ativo ? "Ativo" : "Pausado"
  if (Number.isNaN(quando.getTime())) return situacao
  return `${situacao} · Criado em ${quando.toLocaleDateString("pt-BR")}`
}
