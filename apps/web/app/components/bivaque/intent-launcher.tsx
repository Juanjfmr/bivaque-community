"use client"

import { MapPin, MessageCircle } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useMemberContext } from "../../../lib/member-context"
import { ASK_INDICATION_HREF } from "../../../lib/recommendations/request-tab"
import { createBrowserClient } from "../../../lib/supabase/client"
import { useAvatarSrc } from "../../(shell)/inicio/use-avatar-src"
import { MemberAvatar } from "./avatar"

// DS-006 (prancha 01, ajuste de densidade de 20/09): o lançador de intenções
// da Home. Duas ações distintas, lado a lado, com o mesmo peso:
//
// 1. `Fazer uma pergunta` — abre o compositor que JÁ existe (CreatePostModal,
//    montado pela página). Nada de segundo mecanismo de publicação: a pergunta
//    é uma publicação de texto e passa pelo mesmo insert, pela mesma audiência e
//    pela mesma checagem de PII.
// 2. `Pedir uma indicação` — chega ao painel do Guia em /recommendations pelo
//    parâmetro de aba que o produto já usa (`?aba=`, o mesmo de /salvos).
//
// O lançador não é hero: `compact` é uma faixa de uma linha (o avatar e o
// rótulo da esquerda, as duas ações à direita) que não empurra o primeiro item
// do feed para fora da dobra em 768 e 1440. `explain` existe para o estado novo
// ou sem comunidade aprovada, onde explicar as duas intenções vale o espaço —
// membro ativo nunca recebe esse volume.
//
// HeroUI continua sendo a camada de comportamento (foco visível, alvo de 44px,
// teclado). A composição — ordem, densidade, hierarquia — vem da prancha, não do
// componente: por isso as duas ações são HTML semântico com os tokens do
// produto, e não dois `Card` embrulhando o bloco.

interface IntentLauncherProps {
  /** Abre o compositor existente. A pergunta não tem superfície própria. */
  onAskQuestion: () => void
  variant?: "compact" | "explain"
}

const ACTION_BASE =
  "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"

const ACTION_BORDERED = `${ACTION_BASE} border border-border bg-[var(--semantic-surface)] hover:border-accent hover:bg-[var(--semantic-selected)]`

const ACTION_PRIMARY = `${ACTION_BASE} bg-[var(--semantic-action-primary)] text-white hover:bg-[var(--semantic-action-primary-hover)]`

export function IntentLauncher({ onAskQuestion, variant = "compact" }: IntentLauncherProps) {
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
      <MessageCircle size={18} aria-hidden="true" />
      Fazer uma pergunta
    </button>
  )

  const indicationAction = (className: string) => (
    <Link href={ASK_INDICATION_HREF as Route} data-testid="intent-indicacao" className={className}>
      <MapPin size={18} aria-hidden="true" />
      Pedir uma indicação
    </Link>
  )

  if (variant === "explain") {
    return (
      <section
        aria-labelledby="intent-launcher-titulo"
        className="rounded-xl border border-border bg-[var(--semantic-surface)] p-4 sm:p-5"
      >
        <h2 id="intent-launcher-titulo" className="text-base font-semibold tracking-tight">
          O que você quer fazer?
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Duas coisas funcionam desde já, mesmo antes de você participar de uma comunidade aprovada.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-[var(--semantic-surface-sunken)] p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--semantic-selected)] text-accent">
              <MessageCircle size={18} aria-hidden="true" />
            </span>
            <h3 className="text-sm font-semibold">Fazer uma pergunta</h3>
            <p className="text-sm leading-relaxed text-muted">
              Escreva sua dúvida para a cidade e para os grupos que você já tem.
            </p>
            {askAction(ACTION_PRIMARY)}
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-[var(--semantic-surface-sunken)] p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--semantic-selected)] text-accent">
              <MapPin size={18} aria-hidden="true" />
            </span>
            <h3 className="text-sm font-semibold">Pedir uma indicação</h3>
            <p className="text-sm leading-relaxed text-muted">
              Procure primeiro no Guia da cidade. Se não houver referência, a comunidade responde.
            </p>
            {indicationAction(ACTION_BORDERED)}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="intent-launcher-titulo"
      className="flex items-center gap-3 rounded-xl border border-border bg-[var(--semantic-surface)] p-3"
    >
      <MemberAvatar name={displayName} src={avatarSrc} className="h-10 w-10 shrink-0 text-sm" />
      <div className="min-w-0 flex-1">
        <h2 id="intent-launcher-titulo" className="text-sm font-medium text-muted">
          O que você quer fazer?
        </h2>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          {askAction(ACTION_BORDERED)}
          {indicationAction(ACTION_BORDERED)}
        </div>
      </div>
    </section>
  )
}
