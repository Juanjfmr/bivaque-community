import { FalhaDaApi, ler } from "../api/cliente"

/**
 * A porta do perfil de outra pessoa (F10), no molde das demais: fala só com
 * `/api/app/membros/<id>` e traduz o corpo para o que a tela desenha.
 *
 * O servidor devolve identidade e atividade — nome, bio, publicações e eventos
 * que o LEITOR pode ver. Afiliação, cidade, contadores e selos do alvo não
 * existem neste contrato (BLOCK-AFFILIATION e o contrato do perfil da web).
 */

export type PublicacaoDoPerfil = Readonly<{
  id: string
  texto: string
  criadaEm: string
}>

export type EventoDoPerfil = Readonly<{
  id: string
  titulo: string
  comecaEm: string
}>

export type PerfilDeMembro = Readonly<{
  id: string
  nome: string
  bio: string
  publicacoes: readonly PublicacaoDoPerfil[]
  eventos: readonly EventoDoPerfil[]
}>

type Corpo = Record<string, unknown>

function foraDoContrato(): FalhaDaApi {
  return new FalhaDaApi("indisponivel", 0, null, "Resposta do servidor fora do contrato.")
}

function exigirRegistro(valor: unknown): Corpo {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) throw foraDoContrato()
  return valor as Corpo
}

function texto(valor: unknown): string {
  if (typeof valor !== "string") throw foraDoContrato()
  return valor
}

function lista<T>(valor: unknown, converter: (item: Corpo) => T): readonly T[] {
  if (!Array.isArray(valor)) throw foraDoContrato()
  return valor.map((item) => converter(exigirRegistro(item)))
}

/** O perfil que o leitor pode ver; invisível é 404 e a tela diz isso. */
export async function lerPerfilDeMembro(
  id: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<PerfilDeMembro> {
  const corpo = exigirRegistro(
    (await ler(`/api/app/membros/${encodeURIComponent(id)}`, opcoes))["membro"],
  )
  return {
    id: texto(corpo["id"]),
    nome: texto(corpo["nome"]),
    bio: texto(corpo["bio"]),
    publicacoes: lista(corpo["publicacoes"], (linha) => ({
      id: texto(linha["id"]),
      texto: texto(linha["texto"]),
      criadaEm: texto(linha["criadaEm"]),
    })),
    eventos: lista(corpo["eventos"], (linha) => ({
      id: texto(linha["id"]),
      titulo: texto(linha["titulo"]),
      comecaEm: texto(linha["comecaEm"]),
    })),
  }
}
