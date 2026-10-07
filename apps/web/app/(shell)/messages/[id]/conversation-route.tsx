"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "../../../../lib/supabase/client"
import threadStyles from "../../../components/bivaque/chat-thread.module.css"
import { ErrorState } from "../../../components/bivaque/error-state"
import { MessageAreaSkeleton } from "../../../components/bivaque/skeleton"
import { ConversationScreen } from "../conversation-screen"

// FIGMA-001 — wrapper cliente da rota de detalhe de conversa: resolve a sessão
// do navegador (identidade real, nunca inferida da URL) e entrega ao screen.
// `backHref` permite que os dois shells (membro e prestador) voltem para a
// própria caixa.
export function ConversationRoute({
  conversationId,
  backHref = "/messages",
}: {
  conversationId: string
  backHref?: string
}) {
  const supabase = createBrowserClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authKey, setAuthKey] = useState(0)

  useEffect(() => {
    // authKey é o gatilho do retry de sessão; a referência explícita é o
    // contrato com useExhaustiveDependencies.
    void authKey
    let cancelled = false
    ;(async () => {
      setAuthError(null)
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      if (cancelled) return
      if (error || !user) {
        setAuthError(
          "Não foi possível confirmar sua sessão agora. Verifique sua conexão e tente novamente.",
        )
        return
      }
      setUserId(user.id)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, authKey])

  if (authError) {
    return (
      <div className={threadStyles["threadView"]}>
        <a href={backHref} className={threadStyles["backButton"]}>
          ← Conversas
        </a>
        <ErrorState message={authError} onRetry={() => setAuthKey((key) => key + 1)} />
      </div>
    )
  }

  if (!userId) {
    return (
      <div className={threadStyles["threadView"]} aria-busy="true">
        <MessageAreaSkeleton />
      </div>
    )
  }

  return (
    <ConversationScreen
      supabase={supabase}
      conversationId={conversationId}
      userId={userId}
      backHref={backHref}
    />
  )
}
