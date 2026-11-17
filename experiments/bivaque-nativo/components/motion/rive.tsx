import type { ReactNode } from "react"
import { useEffect } from "react"
import Rive, { useRive } from "rive-react-native"
import { ARQUIVOS_RIVE, type NomeRive } from "../../assets/rive"

export interface AnimacaoRiveProps {
  nome: NomeRive
  stateMachine?: string
  entradas?: Record<string, boolean | number>
  fallback: ReactNode
}

export function AnimacaoRive({ nome, stateMachine, entradas, fallback }: AnimacaoRiveProps) {
  const source = ARQUIVOS_RIVE[nome]
  const [ref, rive] = useRive()
  useEffect(() => {
    if (!rive || !stateMachine || !entradas) return
    for (const [nomeEntrada, valor] of Object.entries(entradas)) {
      if (typeof valor === "boolean") rive.setInputState(stateMachine, nomeEntrada, valor)
      else rive.setInputState(stateMachine, nomeEntrada, valor)
    }
  }, [entradas, rive, stateMachine])
  return source === undefined ? (
    fallback
  ) : (
    <Rive ref={ref} source={source} stateMachineName={stateMachine} />
  )
}
