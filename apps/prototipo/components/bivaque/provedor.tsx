"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import type { Indicacao } from "@/lib/dados/indicacoes"
import { PERGUNTAR } from "@/lib/demo/textos"
import { DialogoDePerguntar } from "./dialogo-de-perguntar"

// O que a jornada inteira compartilha: abrir o diálogo de perguntar (o Criar da
// barra e os botões "Perguntar" das telas) e devolver um aviso a quem agiu. O
// aviso é uma região viva, então quem usa leitor de tela ouve o retorno.
type ContextoDoBivaque = {
  abrirPerguntar: () => void
  avisar: (texto: string) => void
}

const Contexto = createContext<ContextoDoBivaque | null>(null)

export function useBivaque(): ContextoDoBivaque {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error("useBivaque precisa estar dentro de ProvedorDoBivaque")
  return contexto
}

export function ProvedorDoBivaque({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [perguntarAberto, setPerguntarAberto] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null)

  const avisar = useCallback((texto: string) => {
    setAviso(texto)
    if (relogio.current) clearTimeout(relogio.current)
    relogio.current = setTimeout(() => setAviso(null), 4000)
  }, [])

  const abrirPerguntar = useCallback(() => setPerguntarAberto(true), [])

  const aoPublicar = useCallback(
    (indicacao: Indicacao) => {
      setPerguntarAberto(false)
      avisar(PERGUNTAR.publicada)
      router.push(`/comunidade/pergunta/${indicacao.id}`)
    },
    [avisar, router],
  )

  const valor = useMemo(() => ({ abrirPerguntar, avisar }), [abrirPerguntar, avisar])

  return (
    <Contexto.Provider value={valor}>
      {children}
      <DialogoDePerguntar
        aberto={perguntarAberto}
        aoMudarAberto={setPerguntarAberto}
        aoPublicar={aoPublicar}
      />
      {aviso !== null && (
        <p
          role="status"
          className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-xl bg-(--inverse-surface) px-4 py-2 text-sm text-(--inverse-on-surface) shadow-[0_4px_16px_var(--shadow-strong)] md:bottom-6"
        >
          {aviso}
        </p>
      )}
    </Contexto.Provider>
  )
}
