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

  // Duas linhas, não três: a saudação é o h1, e lugar e data dividem uma linha
  // de apoio. O feed começa mais perto do topo (referência: Nextdoor).
  return (
    <header>
      {now === null ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-8 w-56 max-w-full rounded-ui" />
          <Skeleton className="h-4 w-72 max-w-full rounded-ui" />
        </div>
      ) : (
        <>
          <h1 className="text-2xl leading-tight font-semibold tracking-tight text-ui-ink sm:text-[1.75rem]">
            {greetingFor(now.getHours())}, {firstNameOf(displayName)}.
          </h1>
          <p className="mt-1 text-sm text-ui-ink-2">
            {communityName ? (
              <>
                <span className="font-medium text-ui-ink">{communityName}</span>
                <span aria-hidden="true"> · </span>
              </>
            ) : null}
            <span className="font-medium text-ui-brand">{current.cityName}</span>
            {/* A data só entra de sm para cima: a 375 ela quebrava a linha. */}
            <span className="hidden sm:inline">
              <span aria-hidden="true"> · </span>
              {formatTodayPtBr(now)}
            </span>
          </p>
        </>
      )}
    </header>
  )
}
