import { enviar, FalhaDaApi, ler } from "../api/cliente"

type Corpo = Record<string, unknown>
export type ConversaDaCaixa = Readonly<{
  id: string
  nome: string
  tipo: string
  contextoId: string
  ultima: string
}>
export type Mensagem = Readonly<{ id: string; conteudo: string; minha: boolean; criadaEm: string }>
export type Caixa = Readonly<{ conversas: readonly ConversaDaCaixa[]; proximo: string | null }>
export type DetalheDaConversa = Readonly<{
  conversa: ConversaDaCaixa
  mensagens: readonly Mensagem[]
  anterior: string | null
}>

function invalido(): never {
  throw new FalhaDaApi("indisponivel", 0, null, "Resposta do servidor fora do contrato.")
}
function registro(valor: unknown): Corpo {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return invalido()
  return valor as Corpo
}
function texto(valor: unknown): string {
  if (typeof valor !== "string" || valor === "") return invalido()
  return valor
}
function cursor(valor: unknown): string | null {
  if (valor === null) return null
  return texto(valor)
}
function conversaDe(valor: unknown): ConversaDaCaixa {
  const item = registro(valor)
  return {
    id: texto(item["id"]),
    nome: texto(item["nome"]),
    tipo: texto(item["tipo"]),
    contextoId: texto(item["contextoId"]),
    ultima: typeof item["ultima"] === "string" ? item["ultima"] : "",
  }
}
function mensagemDe(valor: unknown): Mensagem {
  const item = registro(valor)
  if (typeof item["minha"] !== "boolean") return invalido()
  return {
    id: texto(item["id"]),
    conteudo: texto(item["conteudo"]),
    minha: item["minha"],
    criadaEm: texto(item["criadaEm"]),
  }
}
export async function lerConversas(
  opcoes: { signal?: AbortSignal; depois?: string } = {},
): Promise<Caixa> {
  const busca = opcoes.depois === undefined ? "" : `?depois=${encodeURIComponent(opcoes.depois)}`
  const corpo = await ler(`/api/app/conversas${busca}`, opcoes)
  if (!Array.isArray(corpo["conversas"])) return invalido()
  return { conversas: corpo["conversas"].map(conversaDe), proximo: cursor(corpo["proximo"]) }
}
export async function buscarConversa(
  id: string,
  opcoes: { signal?: AbortSignal; antes?: string } = {},
): Promise<DetalheDaConversa> {
  const busca = opcoes.antes === undefined ? "" : `?antes=${encodeURIComponent(opcoes.antes)}`
  const corpo = await ler(`/api/app/conversas/${encodeURIComponent(id)}${busca}`, opcoes)
  if (!Array.isArray(corpo["mensagens"])) return invalido()
  return {
    conversa: conversaDe(corpo["conversa"]),
    mensagens: corpo["mensagens"].map(mensagemDe),
    anterior: cursor(corpo["anterior"]),
  }
}
export async function enviarMensagem(
  id: string,
  conteudo: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<Mensagem> {
  const corpo = await enviar(
    "POST",
    `/api/app/conversas/${encodeURIComponent(id)}/mensagens`,
    { texto: conteudo },
    opcoes,
  )
  return mensagemDe(corpo["mensagem"])
}
