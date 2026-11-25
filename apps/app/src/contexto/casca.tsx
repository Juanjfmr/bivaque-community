"use client"

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { cidadesDaCasca, comCidadeDaSessao, comCidadeTrocada } from "@/lib/casca"
import { dadosDoApp } from "@/lib/dados"
import { lerAvisos } from "@/lib/dados/avisos"
import { lerConversas } from "@/lib/dados/conversas"
import { lerPerfil } from "@/lib/dados/voce"
import { lerProgresso } from "@/src/entrada/servidor"
import { modoDeProvaAtivo } from "@/src/modo-de-prova"

/**
 * O estado da casca: a cidade que a pessoa está vendo e os dois contadores do
 * topo (avisos e conversas não lidas).
 *
 * É uma fonte única porque três lugares dependem do mesmo dado: o chip e a
 * faixa de visita (cidade), o botão de avisos e o ícone de conversas
 * (contadores). O ADR §3.1 põe o chip em todo tamanho de tela; a regra do
 * protótipo que o escondia abaixo de 1024 px (`styles/nav-bar.css:12`) fica
 * substituída, e está registrada em `APP-003-cobertura.md`.
 *
 * Os números de verdade são dado de demonstração (onda 1d) e, depois, do banco.
 * Em **modo de prova**, a bateria pode semear o estado pelo global da janela —
 * é entrada da prova, não medida que o app faz de si mesmo.
 */
export type EstadoDaCasca = {
  /**
   * A cidade consultada. Vazia até a sessão dizer qual é: o chip mostra o rótulo
   * neutro e nenhuma tela afirma uma cidade que não veio da sessão.
   */
  readonly cidade: string
  readonly cidadeDeCasa: string
  readonly avisos: number
  readonly conversas: number
  /**
   * Nome de quem está usando, para o avatar da aba "Você". Vazio enquanto não
   * houver perfil (onda 1d/8): a aba cai no ícone, sem inventar nome.
   */
  readonly nomeDaPessoa: string
}

type PortaDaCasca = EstadoDaCasca & {
  readonly consulta: string
  definirConsulta(consulta: string): void
  readonly conversaNoTopo: { readonly id: string; readonly nome: string } | null
  mostrarConversaNoTopo(conversa: { readonly id: string; readonly nome: string } | null): void
  readonly vendoOutraCidade: boolean
  trocarCidade(cidade: string): void
  voltarParaCasa(): void
  /** A cidade da sessão chegou (perfil ou Início): nunca sobrescreve uma troca. */
  confirmarCidadeDaSessao(cidade: string): void
  definir(pedaco: Partial<EstadoDaCasca>): void
}

const Contexto = createContext<PortaDaCasca | null>(null)

type SementeDeProva = Partial<EstadoDaCasca>

/** A semente da prova, quando ela existe: só em modo de prova. */
export function sementeDaProva(): SementeDeProva {
  if (!modoDeProvaAtivo() || typeof window === "undefined") return {}
  const janela = window as unknown as { __BIVAQUE_CASCA__?: SementeDeProva }
  return janela.__BIVAQUE_CASCA__ ?? {}
}

export function ProvedorDaCasca({ children }: { children: ReactNode }) {
  const [consulta, definirConsulta] = useState("")
  const [conversaNoTopo, mostrarConversaNoTopo] = useState<PortaDaCasca["conversaNoTopo"]>(null)
  const [estado, setEstado] = useState<EstadoDaCasca>(() => {
    const semente = sementeDaProva()
    const resumo = modoDeProvaAtivo() ? null : dadosDoApp.resumoDaCasca()
    // A cidade não vem do dado de demonstração nem de um padrão: o chip nascia
    // "Manaus" para quem tinha vínculo no Rio. Vazio é "ainda não sei", e as
    // leituras abaixo (perfil e Início) preenchem sem sobrescrever uma troca.
    // No modo de prova a base é a demonstração, com a semente por cima: as specs
    // não trazem cidade própria (correção 3 do BUGCID-001). Em produção o modo de
    // prova não existe, então nada disto chega a quem usa.
    const base = modoDeProvaAtivo() ? dadosDoApp.resumoDaCasca() : semente
    const cidades = cidadesDaCasca({
      cidade: base.cidade ?? "",
      cidadeDeCasa: base.cidadeDeCasa ?? "",
      ...semente,
    })
    return {
      cidade: cidades.cidade,
      cidadeDeCasa: cidades.cidadeDeCasa,
      avisos: semente.avisos ?? 0,
      conversas: semente.conversas ?? 0,
      nomeDaPessoa: semente.nomeDaPessoa ?? resumo?.nomeDaPessoa ?? "",
    }
  })

  const confirmarCidadeDaSessao = useCallback((cidade: string) => {
    setEstado((anterior) => ({ ...anterior, ...comCidadeDaSessao(anterior, cidade) }))
  }, [])

  const definir = useCallback((pedaco: Partial<EstadoDaCasca>) => {
    setEstado((anterior) => ({ ...anterior, ...pedaco }))
  }, [])

  // O contador de avisos é o do servidor (a mesma contagem da tela de avisos),
  // não mais o número da demonstração. Em modo de prova a semente manda, e a
  // bateria não fala com a rota. Sem sessão não há aviso a buscar: quem diz se
  // ela existe é a rota de progresso que a entrada já usa. Falha deixa o
  // contador em zero — a tela de avisos é quem mostra o erro e oferece "Tentar
  // de novo".
  useEffect(() => {
    if (modoDeProvaAtivo()) return
    const controle = new AbortController()
    // A demonstração só entra quando a resposta confirma que não há sessão.
    const cidadeDaDemonstracao = () => {
      if (!controle.signal.aborted) confirmarCidadeDaSessao(dadosDoApp.resumoDaCasca().cidade)
    }
    void lerProgresso()
      .then(
        (sessao) => {
          if (controle.signal.aborted) return
          if (sessao.autenticado === false) {
            cidadeDaDemonstracao()
            return
          }
          // A cidade da sessão é a do chip: `lerPerfil` já devolve o vínculo
          // `current` da rota de perfil (nenhuma rota nova). Se esta leitura
          // falhar, a cidade fica vazia — e a consulta do Início devolve a mesma
          // cidade da sessão, que preenche a casca no lugar dela.
          void lerPerfil({ signal: controle.signal })
            .then((conta) => {
              if (controle.signal.aborted) return
              confirmarCidadeDaSessao(conta.perfil.cidade.nome)
            })
            .catch(() => undefined)
          void lerConversas({ signal: controle.signal })
            .then((lista) => {
              if (!controle.signal.aborted) definir({ conversas: lista.porLer })
            })
            .catch(() => undefined)
          void lerAvisos({ limite: "1", signal: controle.signal })
            .then((lista) => {
              if (!controle.signal.aborted) definir({ avisos: lista.naoLidos })
            })
            .catch(() => undefined)
        },
        (erro: unknown) => {
          // 404 é a rota ausente: só acontece na prévia estática do app, sem
          // servidor (capturas e specs visuais). Em produção a rota existe; 503 e
          // falha de rede continuam deixando a cidade vazia.
          // Só a falha da própria leitura de progresso chega aqui: as leituras de
          // dentro do ramo com sessão têm o próprio catch.
          if ((erro as { status?: unknown } | null)?.status === 404) cidadeDaDemonstracao()
        },
      )
      .catch(() => undefined)
    return () => controle.abort()
  }, [definir, confirmarCidadeDaSessao])

  const trocarCidade = useCallback((cidade: string) => {
    setEstado((anterior) => ({ ...anterior, ...comCidadeTrocada(anterior, cidade) }))
  }, [])

  const voltarParaCasa = useCallback(() => {
    setEstado((anterior) => ({ ...anterior, cidade: anterior.cidadeDeCasa }))
  }, [])

  const porta = useMemo<PortaDaCasca>(
    () => ({
      ...estado,
      consulta,
      definirConsulta,
      conversaNoTopo,
      mostrarConversaNoTopo,
      vendoOutraCidade: estado.cidade !== estado.cidadeDeCasa,
      trocarCidade,
      voltarParaCasa,
      confirmarCidadeDaSessao,
      definir,
    }),
    [
      estado,
      consulta,
      conversaNoTopo,
      trocarCidade,
      voltarParaCasa,
      confirmarCidadeDaSessao,
      definir,
    ],
  )

  return <Contexto.Provider value={porta}>{children}</Contexto.Provider>
}

export function useCasca(): PortaDaCasca {
  const porta = useContext(Contexto)
  if (!porta) throw new Error("A casca precisa do provedor")
  return porta
}
