"use client"

import { MapPin } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useMemberContext } from "../../../lib/member-context"
import { ASK_INDICATION_HREF } from "../../../lib/recommendations/request-tab"
import { createBrowserClient } from "../../../lib/supabase/client"
import { useAvatarSrc } from "../../(shell)/inicio/use-avatar-src"
import { MemberAvatar } from "./avatar"

// O ponto de publicação da Home — reconstrução de 25/09/2026, com Threads,
// Circle e Nextdoor como referência: UMA linha, não um bloco. Antes eram duas
// ações grandes (e uma variante "explain" com dois cards) que empurravam o
// primeiro post para o meio da tela no telefone.
//
// As duas intenções continuam distintas e reais:
// 1. `Fazer uma pergunta` — o campo inteiro é o botão; abre o compositor que JÁ
//    existe (CreatePostModal, montado pela página), mesmo insert, mesma
//    audiência, mesma checagem de PII.
// 2. `Pedir uma indicação` — ação secundária na mesma linha, para o painel do
//    Guia em /recommendations pelo parâmetro de aba real.

interface IntentLauncherProps {
  /** Abre o compositor existente. A pergunta não tem superfície própria. */
  onAskQuestion: () => void
}

const ACTION_BASE =
  "flex min-h-11 items-center gap-2 rounded-full text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-brand focus-visible:ring-offset-2"

// O campo: parece entrada de texto, é um botão (abre o modal).
const ACTION_FIELD = `${ACTION_BASE} min-w-0 flex-1 bg-ui-bg px-4 text-left text-ui-ink-2 hover:bg-ui-subtle`

// A indicação: só ícone no telefone, ícone e rótulo de sm para cima.
const ACTION_SECONDARY = `${ACTION_BASE} min-w-11 shrink-0 justify-center font-semibold text-ui-brand hover:bg-ui-subtle sm:px-3`

export function IntentLauncher({ onAskQuestion }: IntentLauncherProps) {
  const { displayName } = useMemberContext()
  const [userId, setUserId] = useState<string | null>(null)
  const avatarSrc = useAvatarSrc(userId)
  const supabase = createBrowserClient()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!cancelled && user) setUserId(user.id)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const askAction = (className: string) => (
    <button
      type="button"
      onClick={onAskQuestion}
      data-testid="intent-pergunta"
      className={className}
    >
      <span className="truncate">Fazer uma pergunta…</span>
    </button>
  )

  const indicationAction = (className: string) => (
    <Link href={ASK_INDICATION_HREF as Route} data-testid="intent-indicacao" className={className}>
      <MapPin size={18} className="shrink-0" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">Pedir uma indicação</span>
    </Link>
  )

  return (
    <section
      aria-labelledby="intent-launcher-titulo"
      className="flex items-center gap-3 rounded-ui-lg border border-ui-line bg-ui-surface p-2 pl-3 shadow-ui"
    >
      <h2 id="intent-launcher-titulo" className="sr-only">
        Publicar na comunidade
      </h2>
      <MemberAvatar name={displayName} src={avatarSrc} className="h-9 w-9 shrink-0 text-sm" />
      {askAction(ACTION_FIELD)}
      {indicationAction(ACTION_SECONDARY)}
    </section>
  )
}
