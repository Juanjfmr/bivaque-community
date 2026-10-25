import { createContext, type ReactNode, useContext, useMemo, useRef, useState } from "react"

import type { CargaDaEntrada, CargaPendente } from "@/lib/navegacao/restauracao"

/**
 * A porta por onde a tela entrega a carga dos seus dados.
 *
 * `atual` é a carga da tela montada, lida pelo restaurador. Ela entra por
 * `ativar`, depois do commit do React — nunca no corpo do render — e sai por
 * `desativar`, que só limpa se a marca ainda for a desta tela: a tela que sai
 * não apaga a carga da tela que entrou depois dela. As cargas ficam registradas
 * para que a prova possa liberar também aquelas cuja tela já saiu de cena — é
 * assim que se prova que uma resposta tarde não mexe na tela nova.
 */
export type PortaDeCargas = {
  readonly atual: CargaDaEntrada | null
  registrar(carga: CargaPendente): void
  /** Marca a carga da tela montada, depois do commit do React. */
  ativar(carga: CargaDaEntrada): void
  /** Limpa a marca só se ela ainda for a carga desta tela. */
  desativar(carga: CargaDaEntrada): void
  /** Cada liberação muda o número; a tela montada lê para montar os elementos. */
  liberacoes: number
  liberarTodas(): void
}

const Contexto = createContext<PortaDeCargas | null>(null)

export function ProvedorDeCargas({ children }: { children: ReactNode }) {
  const registro = useRef<Set<CargaPendente>>(new Set())
  const cargaAtiva = useRef<CargaDaEntrada | null>(null)
  const [liberacoes, definirLiberacoes] = useState(0)

  const porta = useMemo<PortaDeCargas>(
    () => ({
      get atual() {
        return cargaAtiva.current
      },
      registrar(carga) {
        registro.current.add(carga)
      },
      ativar(carga) {
        cargaAtiva.current = carga
      },
      desativar(carga) {
        if (cargaAtiva.current === carga) cargaAtiva.current = null
      },
      liberacoes,
      liberarTodas() {
        for (const carga of registro.current) {
          // A tela montada confirma sozinha, depois de montar os elementos.
          if (carga !== cargaAtiva.current) carga.liberarSemTela()
        }
        definirLiberacoes((anterior) => anterior + 1)
      },
    }),
    [liberacoes],
  )

  return <Contexto.Provider value={porta}>{children}</Contexto.Provider>
}

export function usePortaDeCargas(): PortaDeCargas {
  const porta = useContext(Contexto)
  if (!porta) throw new Error("A porta de cargas precisa do provedor")
  return porta
}
