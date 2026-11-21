import { enviar, FalhaDaApi, ler } from "../api/cliente"

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
  if (typeof valor !== "string" || valor === "") foraDoContrato()
  return valor
}

function textoOuNulo(corpo: Corpo, chave: string): string | null {
  const valor = corpo[chave]
  if (valor !== null && typeof valor !== "string") foraDoContrato()
  return valor
}

// TROCA-005 — o convite de prestador aberto pela entrada do app. O estado é o do
// banco (`read_provider_invitation`): pendente, aceito, revogado ou expirado.

export type EstadoDoConvite = "pendente" | "aceito" | "revogado" | "expirado"

export type ConviteDePrestador = Readonly<{
  comunidade: string
  estado: EstadoDoConvite
  emailDaSessao: string | null
}>

function conviteDe(corpo: Corpo): ConviteDePrestador {
  const convite = registro(corpo["convite"])
  const estado = convite["estado"]
  if (
    estado !== "pendente" &&
    estado !== "aceito" &&
    estado !== "revogado" &&
    estado !== "expirado"
  ) {
    foraDoContrato()
  }
  return {
    comunidade: texto(convite, "comunidade"),
    estado,
    emailDaSessao: textoOuNulo(corpo, "emailDaSessao"),
  }
}

export async function lerConviteDePrestador(
  token: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<ConviteDePrestador> {
  const corpo = await ler(`/api/app/prestador-convite/${encodeURIComponent(token)}`, opcoes)
  return conviteDe(corpo)
}

/** Aceita com a sessão; recusa do servidor sobe como FalhaDaApi com o motivo. */
export async function aceitarConviteDePrestador(
  token: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<void> {
  const corpo = await enviar(
    "POST",
    `/api/app/prestador-convite/${encodeURIComponent(token)}`,
    undefined,
    opcoes,
  )
  if (corpo["aceito"] !== true) foraDoContrato()
}
