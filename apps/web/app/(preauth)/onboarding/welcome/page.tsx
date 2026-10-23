"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { type WelcomeBlocks, welcomeBlocks } from "../../../../lib/onboarding/entry-moment"
import type { EntryMoment } from "../../../../lib/onboarding/provision-validation"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { EntryShell } from "../../../components/entry/entry-shell"
import { MaterialFilledButton } from "../../../components/material/filled-button"
import { MaterialIcon } from "../../../components/material/material-icon"
import "../locality/entry-city.css"
import { readMyDepartureCityAction } from "./welcome-actions"

// PORT-005 (lote 4 da entrada) — as boas-vindas do protótipo
// (`renderEntryWelcome`, prototypes/bivaque-html/src/features/entry/arrive.js).
//
// Os blocos mudam conforme o momento declarado na tela anterior: "Chegando"
// leva ao plano de chegada, "Saindo" ao plano de saída (com a cidade de
// destino), "Moro aqui" ao guia da cidade. O momento é lido da tabela do dono —
// a policy de SELECT é a do próprio dono, então quem abre esta tela sem ter
// passado pela entrada não vê o momento de outra pessoa. A cidade de destino,
// que é cidade de OUTRO vínculo, vem de uma action de servidor
// (welcome-actions.ts): a policy de `localities` só libera a cidade do próprio
// vínculo.
//
// Quem entra pelo convite familiar não declara momento: sem linha na tabela, os
// blocos caem em "moro aqui", que é o estado padrão do protótipo.
//
// O protótipo tem um terceiro cartão, a turma (grupo automático de quem chega ou
// sai no mesmo ciclo). O schema do Next não tem turma automática — não existe
// cohort em `groups` —, então o cartão não é renderizado em vez de apontar para
// um grupo inventado. Registrado no relatório da frente.

const BADGE_ICON = "check"

type WelcomeState = { status: "loading" } | { blocks: WelcomeBlocks; status: "ready" }

export default function OnboardingWelcomePage() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserClient(), [])
  const [state, setState] = useState<WelcomeState>({ status: "loading" })
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.replace("/login?return=/onboarding/welcome")
        return
      }

      const userId = session.user.id

      const [momentResult, membershipResult] = await Promise.all([
        supabase.from("member_entry_moments").select("moment").eq("user_id", userId).maybeSingle(),
        supabase
          .from("locality_memberships")
          .select("locality_id")
          .eq("user_id", userId)
          .eq("kind", "current")
          .maybeSingle(),
      ])

      // Falha de leitura não vira tela de boas-vindas com o bloco errado: sem
      // saber o momento, a pessoa entra na comunidade e mantém o que declarou
      // (a linha continua no banco, para a Início). `maybeSingle` devolve
      // `error: null` quando não há linha — só o erro de verdade cai aqui.
      if (membershipResult.error || momentResult.error) {
        router.replace("/community")
        return
      }

      const homeLocalityId = membershipResult.data?.locality_id
      if (!homeLocalityId) {
        // Sem vínculo não há cidade para celebrar: a pessoa volta para a escolha.
        router.replace("/onboarding/locality")
        return
      }

      const moment = (momentResult.data?.moment ?? "resident") as EntryMoment

      // A cidade de destino vem do SERVIDOR: a policy de `localities` só deixa o
      // membro ler a cidade do próprio vínculo, e o destino de quem sai é outra
      // cidade. Lida aqui, voltava vazia e o bloco da saída virava o de "moro
      // aqui". A falha da action não deixa a tela presa no carregamento: cai no
      // mesmo caso "destino não legível" que `welcomeBlocks` já trata, em vez de
      // inventar uma cidade.
      const [homeLocalityResult, destinationCity] = await Promise.all([
        supabase.from("localities").select("city_name").eq("id", homeLocalityId).maybeSingle(),
        moment === "leaving" ? readMyDepartureCityAction().catch(() => null) : null,
      ])

      if (homeLocalityResult.error) {
        router.replace("/community")
        return
      }

      const homeCity = homeLocalityResult.data?.city_name
      if (!homeCity) {
        // A cidade do próprio vínculo não legível é falha de leitura, não tela
        // vazia: a pessoa segue para a comunidade, que é o destino do CTA.
        router.replace("/community")
        return
      }

      setState({
        status: "ready",
        blocks: welcomeBlocks({ moment, homeCity, destinationCity }),
      })
    }
    run()
  }, [router, supabase])

  useEffect(() => {
    if (state.status !== "ready") return
    // O título recebe o foco ao abrir, como no protótipo: o leitor de tela
    // anuncia a tela nova em vez de começar do topo do documento.
    heading.current?.focus()
  }, [state.status])

  if (state.status === "loading") {
    return (
      <EntryShell>
        <div className="en-form">
          <p className="en-sub" role="status">
            Preparando suas boas-vindas...
          </p>
        </div>
      </EntryShell>
    )
  }

  return (
    <EntryShell>
      <div className="en-form en-welcome">
        <div aria-hidden="true" className="en-badge">
          <MaterialIcon name={BADGE_ICON} />
        </div>
        <h1 className="en-h1" ref={heading} tabIndex={-1}>
          Você chegou ao Bivaque.
        </h1>
        <p className="en-lead">{state.blocks.lead}</p>

        {state.blocks.tiles.map((tile) => (
          <Link className="en-tile" href={tile.href} key={tile.href}>
            <MaterialIcon name={tile.icon} />
            <span>
              <b>{tile.title}</b>
              {tile.description}
            </span>
          </Link>
        ))}

        <MaterialFilledButton href="/community">Entrar na comunidade</MaterialFilledButton>
      </div>
    </EntryShell>
  )
}
