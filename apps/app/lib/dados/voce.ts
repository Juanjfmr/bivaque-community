import { enviar, FalhaDaApi, ler } from "../api/cliente"

export type PerfilDaPessoa = Readonly<{ nome: string; bio: string | null; cidade: string }>
export type ContagensDoPerfil = Readonly<{
  salvos: number
  anuncios: number
  perguntas: number
  grupos: number
}>
export type PerfilDaConta = Readonly<{
  perfil: PerfilDaPessoa
  contagens: ContagensDoPerfil
  conta: Readonly<{ exclusaoPendente: boolean }>
}>
export type PublicacaoDaPessoa = Readonly<{
  id: string
  texto: string
  criadaEm: string
  grupo: string | null
}>
export type PerguntaDaPessoa = Readonly<{
  id: string
  titulo: string
  criadaEm: string
  resolvida: boolean
  respostas: number
}>
export type PublicacoesDaPessoa = Readonly<{
  publicacoes: readonly PublicacaoDaPessoa[]
  perguntas: readonly PerguntaDaPessoa[]
}>
export type PessoaBloqueada = Readonly<{ id: string; nome: string | null; bloqueadoEm: string }>
export type ItemOcultado = Readonly<{ id: string; titulo: string; ocultadoEm: string }>
export type PedidoDeExclusao = Readonly<{
  pedido: Readonly<{ solicitadoEm: string | null; prazoEm: string | null }>
  pendente: boolean
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

function numero(corpo: Corpo, chave: string): number {
  const valor = corpo[chave]
  if (typeof valor !== "number" || !Number.isFinite(valor)) throw foraDoContrato()
  return valor
}

function booleano(corpo: Corpo, chave: string): boolean {
  const valor = corpo[chave]
  if (typeof valor !== "boolean") throw foraDoContrato()
  return valor
}

function lerPerfilDaPessoa(corpo: Corpo): PerfilDaPessoa {
  return {
    nome: texto(corpo, "nome"),
    bio: textoOuNulo(corpo, "bio"),
    cidade: textoOuNulo(corpo, "cidade") ?? "",
  }
}

function lista(corpo: Corpo, chave: string): unknown[] {
  const valor = corpo[chave]
  if (!Array.isArray(valor)) throw foraDoContrato()
  return valor
}

function lerPublicacao(valor: unknown): PublicacaoDaPessoa {
  const item = registro(valor)
  return {
    id: texto(item, "id"),
    texto: texto(item, "texto"),
    criadaEm: texto(item, "criadaEm"),
    grupo: textoOuNulo(item, "grupo"),
  }
}

function lerPergunta(valor: unknown): PerguntaDaPessoa {
  const item = registro(valor)
  return {
    id: texto(item, "id"),
    titulo: texto(item, "titulo"),
    criadaEm: texto(item, "criadaEm"),
    resolvida: booleano(item, "resolvida"),
    respostas: numero(item, "respostas"),
  }
}

export async function lerPerfil(opcoes: Opcoes = {}): Promise<PerfilDaConta> {
  const corpo = await ler("/api/app/voce", opcoes)
  const contagens = registro(corpo["contagens"])
  const conta = registro(corpo["conta"])
  return {
    perfil: lerPerfilDaPessoa(registro(corpo["perfil"])),
    contagens: {
      salvos: numero(contagens, "salvos"),
      anuncios: numero(contagens, "anuncios"),
      perguntas: numero(contagens, "perguntas"),
      grupos: numero(contagens, "grupos"),
    },
    conta: { exclusaoPendente: booleano(conta, "exclusaoPendente") },
  }
}

export async function salvarPerfil(
  dados: { nome?: string; bio?: string },
  opcoes: Opcoes = {},
): Promise<PerfilDaPessoa> {
  const corpo = await enviar("PATCH", "/api/app/voce", dados, opcoes)
  return lerPerfilDaPessoa(registro(corpo["perfil"]))
}

export async function lerPublicacoes(opcoes: Opcoes = {}): Promise<PublicacoesDaPessoa> {
  const corpo = await ler("/api/app/voce/publicacoes", opcoes)
  return {
    publicacoes: lista(corpo, "publicacoes").map(lerPublicacao),
    perguntas: lista(corpo, "perguntas").map(lerPergunta),
  }
}

export async function lerBloqueados(opcoes: Opcoes = {}): Promise<readonly PessoaBloqueada[]> {
  const corpo = await ler("/api/app/voce/bloqueados", opcoes)
  return lista(corpo, "bloqueados").map((valor) => {
    const item = registro(valor)
    return {
      id: texto(item, "id"),
      nome: textoOuNulo(item, "nome"),
      bloqueadoEm: texto(item, "bloqueadoEm"),
    }
  })
}

export async function desbloquear(id: string, opcoes: Opcoes = {}): Promise<void> {
  const corpo = await enviar(
    "DELETE",
    `/api/app/voce/bloqueados/${encodeURIComponent(id)}`,
    undefined,
    opcoes,
  )
  if (corpo["removido"] !== true) throw foraDoContrato()
}

export async function lerOcultados(opcoes: Opcoes = {}): Promise<readonly ItemOcultado[]> {
  const corpo = await ler("/api/app/voce/ocultados", opcoes)
  return lista(corpo, "ocultados").map((valor) => {
    const item = registro(valor)
    return {
      id: texto(item, "id"),
      titulo: texto(item, "titulo"),
      ocultadoEm: texto(item, "ocultadoEm"),
    }
  })
}

export async function desocultar(id: string, opcoes: Opcoes = {}): Promise<void> {
  const corpo = await enviar(
    "DELETE",
    `/api/app/voce/ocultados/${encodeURIComponent(id)}`,
    undefined,
    opcoes,
  )
  if (corpo["removido"] !== true) throw foraDoContrato()
}

export async function pedirExclusao(opcoes: Opcoes = {}): Promise<PedidoDeExclusao> {
  const corpo = await enviar("POST", "/api/app/voce/apagar-conta", undefined, opcoes)
  const pedido = registro(corpo["pedido"])
  return {
    pedido: {
      solicitadoEm: textoOuNulo(pedido, "solicitadoEm"),
      prazoEm: textoOuNulo(pedido, "prazoEm"),
    },
    pendente: booleano(corpo, "pendente"),
  }
}
