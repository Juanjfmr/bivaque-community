import { enviar, FalhaDaApi, ler } from "../api/cliente"
import { type PedidoDeServico, pedidoDe } from "./negocios"

type Corpo = Record<string, unknown>

function foraDoContrato(): never {
  throw new FalhaDaApi("indisponivel", 0, null, "Resposta do servidor fora do contrato.")
}

function registro(valor: unknown): Corpo {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) foraDoContrato()
  return valor as Corpo
}

function texto(corpo: Corpo, chave: string): string {
  const valor = corpo[chave]
  if (typeof valor !== "string") foraDoContrato()
  return valor
}

function textoOuNulo(corpo: Corpo, chave: string): string | null {
  const valor = corpo[chave]
  if (valor !== null && typeof valor !== "string") foraDoContrato()
  return valor
}

function booleano(corpo: Corpo, chave: string): boolean {
  const valor = corpo[chave]
  if (typeof valor !== "boolean") foraDoContrato()
  return valor
}

function lista(corpo: Corpo, chave: string): readonly unknown[] {
  const valor = corpo[chave]
  if (!Array.isArray(valor)) foraDoContrato()
  return valor
}

// TROCA-005 — a conta e a área de atendimento do PRÓPRIO negócio, e a conversa
// de um pedido recebido. O app não fala com o banco (ADR-20261105 §1): tudo
// passa por `/api/app`, e o contrato é lido do corpo, nunca presumido.

export type ContaDoNegocio = Readonly<{
  email: string | null
  temFicha: boolean
  telefone: string | null
  telefonePublico: boolean
}>

function contaDe(valor: unknown): ContaDoNegocio {
  const corpo = registro(valor)
  return {
    email: textoOuNulo(corpo, "email"),
    temFicha: booleano(corpo, "temFicha"),
    telefone: textoOuNulo(corpo, "telefone"),
    telefonePublico: booleano(corpo, "telefonePublico"),
  }
}

export async function lerContaDoNegocio(
  opcoes: { signal?: AbortSignal } = {},
): Promise<ContaDoNegocio> {
  return contaDe((await ler("/api/app/prestador/conta", opcoes))["conta"])
}

export async function salvarContaDoNegocio(
  dados: Readonly<{ telefone: string | null; telefonePublico: boolean }>,
  opcoes: { signal?: AbortSignal } = {},
): Promise<ContaDoNegocio> {
  return contaDe((await enviar("PATCH", "/api/app/prestador/conta", dados, opcoes))["conta"])
}

export type AtendimentoDoNegocio = Readonly<{
  temFicha: boolean
  alcanceAtivo: boolean
  comunidade: string | null
  cidade: string | null
}>

function atendimentoDe(valor: unknown): AtendimentoDoNegocio {
  const corpo = registro(valor)
  return {
    temFicha: booleano(corpo, "temFicha"),
    alcanceAtivo: booleano(corpo, "alcanceAtivo"),
    comunidade: textoOuNulo(corpo, "comunidade"),
    cidade: textoOuNulo(corpo, "cidade"),
  }
}

export async function lerAtendimento(
  opcoes: { signal?: AbortSignal } = {},
): Promise<AtendimentoDoNegocio> {
  return atendimentoDe((await ler("/api/app/prestador/atendimento", opcoes))["atendimento"])
}

export async function salvarAtendimento(
  ativo: boolean,
  opcoes: { signal?: AbortSignal } = {},
): Promise<AtendimentoDoNegocio> {
  return atendimentoDe(
    (await enviar("PATCH", "/api/app/prestador/atendimento", { ativo }, opcoes))["atendimento"],
  )
}

export type MensagemDoPedido = Readonly<{
  id: string
  minha: boolean
  conteudo: string
  criadoEm: string
}>

function mensagemDe(valor: unknown): MensagemDoPedido {
  const corpo = registro(valor)
  return {
    id: texto(corpo, "id"),
    minha: booleano(corpo, "minha"),
    conteudo: texto(corpo, "conteudo"),
    criadoEm: texto(corpo, "criadoEm"),
  }
}

export type ConversaDoPedido = Readonly<{
  pedido: PedidoDeServico
  mensagens: readonly MensagemDoPedido[]
}>

function conversaDe(corpo: Corpo): ConversaDoPedido {
  return {
    pedido: pedidoDe(corpo["pedido"]),
    mensagens: lista(corpo, "mensagens").map(mensagemDe),
  }
}

export async function lerConversaDoPedido(
  id: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<ConversaDoPedido> {
  return conversaDe(await ler(`/api/app/pedidos/${encodeURIComponent(id)}/mensagens`, opcoes))
}

/** Responde o pedido e devolve o estado GRAVADO (pedido + mensagens). */
export async function responderAoPedido(
  id: string,
  conteudo: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<ConversaDoPedido> {
  return conversaDe(
    await enviar(
      "POST",
      `/api/app/pedidos/${encodeURIComponent(id)}/mensagens`,
      { conteudo },
      opcoes,
    ),
  )
}
