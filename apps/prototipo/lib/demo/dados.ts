// PROTO-001 — a implementação de demonstração da interface das Indicações.
//
// Sem banco e sem login: as perguntas, as respostas e o que a pessoa faz nesta
// sessão vivem aqui, na memória do navegador. Os textos e os números vêm do
// protótipo de HTML (`prototypes/bivaque-html/src/data/demo/source.js`, Manaus).
//
// A forma dos dados é a que o banco devolve — as colunas de `list_indications` e
// de `list_question_replies` mantêm o nome. O que o protótipo mostra e o RPC não
// tem coluna é resolvido ao lado, com o motivo escrito (ver
// `lib/dados/indicacoes.ts`).

import type {
  Autoria,
  Categoria,
  FiltroDeIndicacoes,
  FonteDeIndicacoes,
  Indicacao,
  NovaIndicacao,
  PaginaDeIndicacoes,
  PedidoDeListagem,
  Resposta,
} from "../dados/indicacoes"
import { combina, termosDeBusca } from "../texto"
import { CIDADE, PESSOA } from "./textos"

export const FALHA_DA_DEMONSTRACAO =
  "Não conseguimos carregar as indicações. Tente de novo em alguns minutos."

const UM_DIA = 24 * 60 * 60 * 1000

// ── a semente: as perguntas e respostas do protótipo ───────────────────────

type SementeDeResposta = {
  autor: Autoria
  corpo: string
  util: number
  ajudou: boolean
}

type SementeDePergunta = {
  id: string
  autor: Autoria
  titulo: string
  // o "ctx" do protótipo ("chegou há 3 dias") é o corpo do pedido
  corpo: string
  categoria: Categoria
  bairro: string | null
  diasAtras: number
  // desempate dentro do mesmo dia, em minutos
  minutosAtras: number
  resolvida: boolean
  respostas: SementeDeResposta[]
}

function autoria(id: string, nome: string, iniciais: string): Autoria {
  return { id, nome, iniciais }
}

const SEMENTE: SementeDePergunta[] = [
  {
    id: "a1",
    autor: autoria("autor-carla", "Carla R.", "CR"),
    titulo: "Pediatra que atenda pelo plano da Força perto do Parque 10?",
    corpo: "chegou há 3 dias",
    categoria: "saude_bem_estar",
    bairro: "Parque 10",
    diasAtras: 3,
    minutosAtras: 0,
    resolvida: false,
    respostas: [],
  },
  {
    id: "a6",
    autor: autoria("autor-jessica", "Jéssica L.", "JL"),
    titulo: "Diarista de confiança que atenda no Planalto?",
    corpo: "chegou semana passada",
    categoria: "moradia",
    bairro: "Planalto",
    diasAtras: 5,
    minutosAtras: 0,
    resolvida: false,
    respostas: [],
  },
  {
    id: "a7",
    autor: autoria("autor-diego", "Diego F.", "DF"),
    titulo: "Academia que abra às 5h perto do Dom Pedro?",
    corpo: "chega em dezembro",
    categoria: "esporte_lazer",
    bairro: "Dom Pedro",
    diasAtras: 1,
    minutosAtras: 0,
    resolvida: false,
    respostas: [],
  },
  {
    id: "a8",
    autor: autoria("autor-bruna", "Bruna S.", "BS"),
    titulo: "Pet shop com banho e tosa que busque em casa na Ponta Negra?",
    corpo: "chegou há 2 semanas",
    categoria: "outros",
    bairro: "Ponta Negra",
    diasAtras: 2,
    minutosAtras: 0,
    resolvida: false,
    respostas: [],
  },
  {
    id: "a2",
    autor: autoria("autor-marcos", "Marcos T.", "MT"),
    titulo: "Escola com vaga no 3º ano perto do Planalto?",
    corpo: "chega em novembro",
    categoria: "educacao",
    bairro: "Planalto",
    diasAtras: 1,
    minutosAtras: 30,
    resolvida: false,
    respostas: [
      {
        autor: autoria("autor-ana", "Ana P.", "AP"),
        corpo:
          "Minha filha estuda numa escola particular no Planalto. Tinha vaga no 3º ano em setembro.",
        util: 3,
        ajudou: false,
      },
    ],
  },
  {
    id: "a3",
    autor: autoria("autor-renato", "Renato A.", "RA"),
    titulo: "Mecânico de confiança para Hilux na Zona Centro-Sul",
    corpo: "mora no Adrianópolis",
    categoria: "transporte",
    bairro: "Centro-Sul",
    diasAtras: 2,
    minutosAtras: 45,
    resolvida: false,
    respostas: [
      {
        autor: autoria("autor-paulo", "Paulo R.", "PR"),
        corpo:
          "Oficina do Seu Raimundo, na Djalma Batista. Fez a revisão da minha e cobrou o combinado.",
        util: 5,
        ajudou: false,
      },
      {
        autor: autoria("autor-monica", "Mônica L.", "ML"),
        corpo: "Levo a minha numa autorizada no Distrito. Mais cara, mas com garantia.",
        util: 1,
        ajudou: false,
      },
    ],
  },
  {
    id: "a5",
    autor: autoria("autor-paulo2", "Paulo R.", "PR"),
    titulo: "Veterinário que atende à noite na Zona Oeste",
    corpo: "mora em Flores",
    categoria: "outros",
    bairro: "Zona Oeste",
    diasAtras: 7,
    minutosAtras: 0,
    resolvida: true,
    respostas: [
      {
        autor: autoria("autor-luana", "Luana M.", "LM"),
        corpo: "Tem uma clínica 24 horas na Av. do Turismo. Atenderam meu gato às 23h.",
        util: 8,
        ajudou: true,
      },
    ],
  },
]

// ── a demonstração ─────────────────────────────────────────────────────────

type OpcoesDaDemonstracao = {
  // O atraso existe para o caminho de carregamento ser visível e verificável.
  atrasoMs?: number
  // Com `?estado=erro` na barra de endereço, a PRIMEIRA leitura falha de
  // propósito: é o caminho de erro do protótipo, e o "Tentar de novo" tem o que
  // tentar — a leitura seguinte passa.
  falharQuandoPedido?: () => boolean
  agora?: () => number
}

function pedidoNaBarraDeEndereco(): boolean {
  if (typeof window === "undefined") return false
  return new URLSearchParams(window.location.search).get("estado") === "erro"
}

function somarAtras(dias: number, minutos: number, agora: number): string {
  return new Date(agora - dias * UM_DIA - minutos * 60 * 1000).toISOString()
}

export function criarFonteDeDemonstracao(opcoes: OpcoesDaDemonstracao = {}): FonteDeIndicacoes {
  const atrasoMs = opcoes.atrasoMs ?? 450
  const falharQuandoPedido = opcoes.falharQuandoPedido ?? pedidoNaBarraDeEndereco
  const agora = opcoes.agora ?? Date.now
  const criadoEm = agora()

  const indicacoes: Indicacao[] = []
  const respostas = new Map<string, Resposta[]>()
  let proximo = 1
  let falhaConsumida = false

  for (const semente of SEMENTE) {
    const created_at = somarAtras(semente.diasAtras, semente.minutosAtras, criadoEm)
    // A resposta chega depois da pergunta; a hora exata não aparece na tela.
    const respondida_em = new Date(Date.parse(created_at) + 60 * 60 * 1000).toISOString()
    const comunidade = semente.respostas.map((resposta, indice) => {
      return {
        id: `${semente.id}-r${indice + 1}`,
        author_id: resposta.autor.id,
        body: resposta.corpo,
        created_at: respondida_em,
        edited_at: null,
        is_removed: false,
        autor: resposta.autor,
        minha: false,
        util: resposta.util,
        marcada_util: false,
        ajudou: resposta.ajudou,
      } satisfies Resposta
    })
    respostas.set(semente.id, comunidade)
    const resolvida = comunidade.find((resposta) => resposta.ajudou)
    indicacoes.push({
      id: semente.id,
      title: semente.titulo,
      body: semente.corpo,
      category: semente.categoria,
      created_at,
      is_resolved: semente.resolvida,
      group_id: null,
      group_name: null,
      reply_count: comunidade.length,
      resolved_reply_body: resolvida?.body ?? null,
      matched_reply_body: null,
      autor: semente.autor,
      bairro: semente.bairro,
      minha: false,
      seguindo: false,
    })
  }

  async function esperar(): Promise<void> {
    if (atrasoMs > 0) await new Promise((resolve) => setTimeout(resolve, atrasoMs))
    if (!falhaConsumida && falharQuandoPedido()) {
      falhaConsumida = true
      throw new Error(FALHA_DA_DEMONSTRACAO)
    }
  }

  function achar(indicacaoId: string): Indicacao {
    const indicacao = indicacoes.find((item) => item.id === indicacaoId)
    if (!indicacao) throw new Error(FALHA_DA_DEMONSTRACAO)
    return indicacao
  }

  function respostasDe(indicacaoId: string): Resposta[] {
    const existente = respostas.get(indicacaoId)
    if (existente) return existente
    const nova: Resposta[] = []
    respostas.set(indicacaoId, nova)
    return nova
  }

  function ordenar(filtro: FiltroDeIndicacoes, lista: Indicacao[]): Indicacao[] {
    const copia = [...lista]
    if (filtro === "para-ajudar") {
      // "Para ajudar": quem não recebeu resposta aparece primeiro
      // (`list_indications`, p_mine = false e p_resolved = false).
      copia.sort(
        (a, b) =>
          a.reply_count - b.reply_count || Date.parse(b.created_at) - Date.parse(a.created_at),
      )
      return copia
    }
    copia.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    return copia
  }

  function filtrar(filtro: FiltroDeIndicacoes): Indicacao[] {
    if (filtro === "para-ajudar") {
      return indicacoes.filter((item) => !item.is_resolved && !item.minha)
    }
    if (filtro === "resolvidas") return indicacoes.filter((item) => item.is_resolved)
    return indicacoes.filter((item) => item.minha)
  }

  return {
    async listar(pedido: PedidoDeListagem): Promise<PaginaDeIndicacoes> {
      await esperar()
      const lista = ordenar(pedido.filtro, filtrar(pedido.filtro))
      return {
        itens: lista.slice(pedido.deslocamento, pedido.deslocamento + pedido.limite),
        total: lista.length,
        resolvidas: indicacoes.filter((item) => item.is_resolved).length,
      }
    },

    async obter(id: string): Promise<Indicacao | null> {
      await esperar()
      return indicacoes.find((item) => item.id === id) ?? null
    },

    async respostas(indicacaoId: string): Promise<Resposta[]> {
      await esperar()
      return [...respostasDe(indicacaoId)]
    },

    async publicar(entrada: NovaIndicacao): Promise<Indicacao> {
      await esperar()
      const nova: Indicacao = {
        id: `p${proximo++}`,
        title: entrada.titulo,
        body: entrada.corpo,
        category: "outros",
        created_at: new Date(agora()).toISOString(),
        is_resolved: false,
        group_id: null,
        group_name: null,
        reply_count: 0,
        resolved_reply_body: null,
        matched_reply_body: null,
        autor: autoria(PESSOA.id, PESSOA.nome, PESSOA.iniciais),
        bairro: entrada.bairro,
        minha: true,
        seguindo: true,
      }
      indicacoes.unshift(nova)
      respostas.set(nova.id, [])
      return nova
    },

    async responder(indicacaoId: string, corpo: string): Promise<Resposta> {
      await esperar()
      const indicacao = achar(indicacaoId)
      const resposta: Resposta = {
        id: `${indicacaoId}-r${proximo++}`,
        author_id: PESSOA.id,
        body: corpo,
        created_at: new Date(agora()).toISOString(),
        edited_at: null,
        is_removed: false,
        autor: autoria(PESSOA.id, PESSOA.nome, PESSOA.iniciais),
        minha: true,
        util: 0,
        marcada_util: false,
        ajudou: false,
      }
      respostasDe(indicacaoId).push(resposta)
      indicacao.reply_count = respostasDe(indicacaoId).length
      return resposta
    },

    async marcarUtil(respostaId: string): Promise<void> {
      await esperar()
      for (const lista of respostas.values()) {
        const resposta = lista.find((item) => item.id === respostaId)
        if (!resposta) continue
        // "Útil" alterna e o contador anda junto, como no protótipo
        // (`app/handlers.js`, like-answer).
        resposta.marcada_util = !resposta.marcada_util
        resposta.util += resposta.marcada_util ? 1 : -1
        return
      }
    },

    async resolver(indicacaoId: string, respostaId: string): Promise<void> {
      await esperar()
      const indicacao = achar(indicacaoId)
      const lista = respostasDe(indicacaoId)
      const escolhida = lista.find((item) => item.id === respostaId)
      indicacao.is_resolved = true
      indicacao.resolved_reply_body = escolhida?.body ?? null
      for (const resposta of lista) resposta.ajudou = resposta.id === respostaId
    },

    async reabrir(indicacaoId: string): Promise<void> {
      await esperar()
      const indicacao = achar(indicacaoId)
      indicacao.is_resolved = false
      indicacao.resolved_reply_body = null
      for (const resposta of respostasDe(indicacaoId)) resposta.ajudou = false
    },

    async definirSeguindo(indicacaoId: string, seguindo: boolean): Promise<void> {
      await esperar()
      achar(indicacaoId).seguindo = seguindo
    },

    async minhas(_cidade: string): Promise<Indicacao[]> {
      await esperar()
      // O histórico do protótipo é o que a pessoa perguntou ou respondeu
      // (`features/profile/views.js`, mineQuestionList).
      const lista = indicacoes.filter(
        (item) => item.minha || respostasDe(item.id).some((resposta) => resposta.minha),
      )
      return ordenar("minhas", lista)
    },

    async parecidas(texto: string, _cidade: string): Promise<Indicacao[]> {
      await esperar()
      if (termosDeBusca(texto).length < 1) return []
      const termos = termosDeBusca(texto).slice(0, 3).join(" ")
      return indicacoes
        .filter((item) => item.is_resolved && combina(termos, `${item.title} ${item.body}`))
        .slice(0, 2)
    },
  }
}

export const CIDADE_DA_DEMONSTRACAO = CIDADE
