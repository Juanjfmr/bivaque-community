"use client"

import { useEffect, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { useMemberContext } from "../../../lib/member-context"
import { Skeleton } from "../../components/bivaque/skeleton"
import { firstNameOf, formatTodayPtBr, greetingFor } from "./formatters"

interface InicioGreetingProps {
  // Nome da comunidade primária resolvido pela página (mesma consulta do
  // feed). null = ainda não resolvida ou o membro não participa de nenhuma —
  // nesse caso a linha de contexto mostra só a cidade, que é sempre real.
  communityName: string | null
}

// Prancha 01: linha "comunidade · cidade", h1 "Bom dia, Carlos." e a data de
// hoje em pt-BR. O único h1 da tela é a saudação.
//
// A hora do dia e a data vêm de useState preenchido em useEffect: o servidor
// e o navegador podem divergir em fuso ou minuto, e um Date lido durante o
// render hidrataria com texto diferente do SSR. Antes de montar, a área
// reserva a altura com skeleton — nenhum texto provisorio é chumbado.
export function InicioGreeting({ communityName }: InicioGreetingProps) {
  const { displayName } = useMemberContext()
  const { current } = useLocalityContext()
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
  }, [])

  return (
    <header className="pt-2">
      <p className="text-sm text-muted">
        {communityName ? (
          <>
            <span className="font-medium text-foreground">{communityName}</span>
            {" · "}
          </>
        ) : null}
        {current.cityName}
      </p>
      {now === null ? (
        <div className="mt-1 space-y-2" aria-busy="true">
          <Skeleton className="h-9 w-64 max-w-full rounded-lg" />
          <Skeleton className="h-4 w-40 max-w-full rounded" />
        </div>
      ) : (
        <>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {greetingFor(now.getHours())}, {firstNameOf(displayName)}.
          </h1>
          <p className="mt-1 text-sm text-muted">{formatTodayPtBr(now)}</p>
        </>
      )}
    </header>
  )
}
