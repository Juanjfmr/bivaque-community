"use client"

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react"

import { dadosDoApp } from "@/lib/dados"
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

export const CIDADE_PADRAO = "Manaus"

type PortaDaCasca = EstadoDaCasca & {
  readonly vendoOutraCidade: boolean
  trocarCidade(cidade: string): void
  voltarParaCasa(): void
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
  const [estado, setEstado] = useState<EstadoDaCasca>(() => {
    const semente = sementeDaProva()
    const resumo = modoDeProvaAtivo() ? null : dadosDoApp.resumoDaCasca()
    return {
      cidade: semente.cidade ?? resumo?.cidade ?? CIDADE_PADRAO,
      cidadeDeCasa: semente.cidadeDeCasa ?? resumo?.cidadeDeCasa ?? CIDADE_PADRAO,
      avisos: semente.avisos ?? resumo?.avisos ?? 0,
      conversas: semente.conversas ?? resumo?.conversas ?? 0,
      nomeDaPessoa: semente.nomeDaPessoa ?? resumo?.nomeDaPessoa ?? "",
    }
  })

  const definir = useCallback((pedaco: Partial<EstadoDaCasca>) => {
    setEstado((anterior) => ({ ...anterior, ...pedaco }))
  }, [])

  const trocarCidade = useCallback(
    (cidade: string) => {
      const limpa = cidade.trim()
      if (limpa === "") return
      definir({ cidade: limpa })
    },
    [definir],
  )

  const voltarParaCasa = useCallback(() => {
    setEstado((anterior) => ({ ...anterior, cidade: anterior.cidadeDeCasa }))
  }, [])

  const porta = useMemo<PortaDaCasca>(
    () => ({
      ...estado,
      vendoOutraCidade: estado.cidade !== estado.cidadeDeCasa,
      trocarCidade,
      voltarParaCasa,
      definir,
    }),
    [estado, trocarCidade, voltarParaCasa, definir],
  )

  return <Contexto.Provider value={porta}>{children}</Contexto.Provider>
}

export function useCasca(): PortaDaCasca {
  const porta = useContext(Contexto)
  if (!porta) throw new Error("A casca precisa do provedor")
  return porta
}
