/**
 * Estado da prévia de Grupos: ações puras sobre grupos e publicações. Cada ação
 * tem a forma da chamada que a substitui no servidor; aqui tudo fica em memória.
 */
import {
  type Comentario,
  EU,
  GRUPOS,
  type Grupo,
  PUBLICACOES,
  type Publicacao,
  type Tipo,
} from "./dados"

export type Estado = {
  grupos: readonly Grupo[]
  publicacoes: readonly Publicacao[]
  /** Grupos onde a pessoa ainda não fechou as boas-vindas. */
  boasVindas: readonly string[]
  /** Pedidos de entrada em grupo fechado. */
  pedidos: readonly string[]
  /** Publicações que a pessoa ocultou ou denunciou: somem só para ela. */
  ocultas: readonly string[]
  /** Denúncias enviadas, com o motivo, como a fila da moderação as receberia. */
  denuncias: readonly { publicacao: string; motivo: MotivoDaDenuncia }[]
}

export const MOTIVOS_DA_DENUNCIA = [
  { valor: "ofensa", rotulo: "Ofensa, ameaça ou assédio" },
  { valor: "dado-pessoal", rotulo: "Expõe dado de alguém (endereço, telefone, documento, foto)" },
  { valor: "golpe", rotulo: "Golpe, propaganda ou venda proibida" },
  { valor: "fora-do-grupo", rotulo: "Fora do assunto do grupo" },
  { valor: "outro", rotulo: "Outro motivo" },
] as const
export type MotivoDaDenuncia = (typeof MOTIVOS_DA_DENUNCIA)[number]["valor"]

export const ESTADO_INICIAL: Estado = {
  grupos: GRUPOS,
  publicacoes: PUBLICACOES,
  boasVindas: [],
  pedidos: [],
  ocultas: [],
  denuncias: [],
}

export type Acao =
  | { tipo: "entrar"; grupo: string }
  | { tipo: "pedir"; grupo: string }
  | { tipo: "fechar-boas-vindas"; grupo: string }
  | { tipo: "util"; publicacao: string }
  | { tipo: "util-comentario"; publicacao: string; comentario: string }
  /** Sem `valor`, alterna; com `valor`, fixa (o Desfazer usa o valor de antes). */
  | { tipo: "salvar"; publicacao: string; valor?: boolean }
  | { tipo: "comentar"; publicacao: string; texto: string; respondeA: Comentario | null }
  | { tipo: "resolveu"; publicacao: string; comentario: string }
  | {
      tipo: "publicar"
      grupo: string
      tipoDaPublicacao: Tipo
      texto: string
      fotos: string[]
      /** Id gerado na tela, para o Desfazer achar a publicação. */
      id?: string
    }
  | { tipo: "apagar"; publicacao: string }
  /** `valor: false` é o Desfazer: a publicação volta. */
  | { tipo: "ocultar"; publicacao: string; valor: boolean }
  /** Denunciar também oculta para quem denunciou. */
  | { tipo: "denunciar"; publicacao: string; motivo: MotivoDaDenuncia }

let sequencia = 0
export const novoId = (prefixo: string): string => `${prefixo}-${Date.now()}-${++sequencia}`

const alternarUtil = <T extends { uteis: number; marcouUtil: boolean }>(item: T): T => ({
  ...item,
  marcouUtil: !item.marcouUtil,
  uteis: item.uteis + (item.marcouUtil ? -1 : 1),
})

function naPublicacao(
  estado: Estado,
  id: string,
  mudar: (publicacao: Publicacao) => Publicacao,
): Estado {
  return {
    ...estado,
    publicacoes: estado.publicacoes.map((p) => (p.id === id ? mudar(p) : p)),
  }
}

/** A resposta entra logo depois do comentário-pai e das respostas que ele já tem. */
export function inserirComentario(
  comentarios: readonly Comentario[],
  novo: Comentario,
): readonly Comentario[] {
  if (novo.respondeA === null) return [...comentarios, novo]
  const ultimoDoFio = comentarios.reduce(
    (ultimo, item, indice) =>
      item.id === novo.respondeA || item.respondeA === novo.respondeA ? indice : ultimo,
    -1,
  )
  if (ultimoDoFio === -1) return [...comentarios, novo]
  return [...comentarios.slice(0, ultimoDoFio + 1), novo, ...comentarios.slice(ultimoDoFio + 1)]
}

export function reduzir(estado: Estado, acao: Acao): Estado {
  switch (acao.tipo) {
    case "entrar":
      return {
        ...estado,
        grupos: estado.grupos.map((g) =>
          g.id === acao.grupo ? { ...g, participa: true, membros: g.membros + 1 } : g,
        ),
        boasVindas: [...estado.boasVindas, acao.grupo],
      }
    case "pedir":
      return { ...estado, pedidos: [...estado.pedidos, acao.grupo] }
    case "fechar-boas-vindas":
      return { ...estado, boasVindas: estado.boasVindas.filter((id) => id !== acao.grupo) }
    case "util":
      return naPublicacao(estado, acao.publicacao, alternarUtil)
    case "util-comentario":
      return naPublicacao(estado, acao.publicacao, (p) => ({
        ...p,
        comentarios: p.comentarios.map((item) =>
          item.id === acao.comentario ? alternarUtil(item) : item,
        ),
      }))
    case "salvar":
      return naPublicacao(estado, acao.publicacao, (p) => ({ ...p, salva: acao.valor ?? !p.salva }))
    case "comentar": {
      // Resposta de resposta fica no mesmo nível, sob o comentário de cima.
      const pai = acao.respondeA === null ? null : (acao.respondeA.respondeA ?? acao.respondeA.id)
      const novo: Comentario = {
        id: novoId("c"),
        autor: EU.curto,
        quando: "agora",
        texto: acao.texto,
        uteis: 0,
        marcouUtil: false,
        respondeA: pai,
        para: acao.respondeA?.autor ?? null,
      }
      return naPublicacao(estado, acao.publicacao, (p) => ({
        ...p,
        comentarios: inserirComentario(p.comentarios, novo),
      }))
    }
    case "resolveu":
      return naPublicacao(estado, acao.publicacao, (p) =>
        p.autor === EU.curto
          ? { ...p, resolvida: p.resolvida === acao.comentario ? null : acao.comentario }
          : p,
      )
    case "publicar": {
      const nova: Publicacao = {
        id: acao.id ?? novoId("p"),
        grupo: acao.grupo,
        autor: EU.curto,
        quando: "agora",
        tipo: acao.tipoDaPublicacao,
        texto: acao.texto,
        fotos: acao.fotos.slice(0, 4),
        uteis: 0,
        marcouUtil: false,
        salva: false,
        resolvida: null,
        comentarios: [],
      }
      return {
        ...estado,
        publicacoes: [nova, ...estado.publicacoes],
        boasVindas: estado.boasVindas.filter((id) => id !== acao.grupo),
      }
    }
    case "ocultar": {
      const sem = estado.ocultas.filter((id) => id !== acao.publicacao)
      return { ...estado, ocultas: acao.valor ? [...sem, acao.publicacao] : sem }
    }
    case "denunciar":
      if (estado.denuncias.some((d) => d.publicacao === acao.publicacao)) return estado
      return {
        ...estado,
        denuncias: [...estado.denuncias, { publicacao: acao.publicacao, motivo: acao.motivo }],
        ocultas: [...estado.ocultas.filter((id) => id !== acao.publicacao), acao.publicacao],
      }
    case "apagar":
      // Só quem publicou apaga (o Desfazer logo depois de publicar).
      return {
        ...estado,
        publicacoes: estado.publicacoes.filter(
          (p) => p.id !== acao.publicacao || p.autor !== EU.curto,
        ),
      }
  }
}
