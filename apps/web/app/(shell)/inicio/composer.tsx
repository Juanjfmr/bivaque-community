"use client"

import { Button } from "@heroui/react"
import { useEffect, useState } from "react"
import { useMemberContext } from "../../../lib/member-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "../../components/bivaque/avatar"
import { useAvatarSrc } from "./use-avatar-src"

interface InicioComposerProps {
  // Abre o fluxo de publicação que já existe (CreatePostModal, montado pela
  // página). A barra daqui é só a entrada — nenhum mecanismo de publicação é
  // duplicado: mesma audiência, mesma checagem de PII, mesmo insert.
  onOpen: (defaultPostType?: string) => void
}

// Prancha 01: avatar do membro + "O que você quer compartilhar?" + Publicar.
export function InicioComposer({ onOpen }: InicioComposerProps) {
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

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-[var(--semantic-surface)] p-3">
      <MemberAvatar name={displayName} src={avatarSrc} className="h-10 w-10 shrink-0 text-sm" />

      <button
        type="button"
        onClick={() => onOpen()}
        className="flex min-h-11 flex-1 cursor-pointer items-center rounded-lg border border-border bg-[var(--semantic-surface-sunken)] px-3 text-sm text-muted text-left transition-colors duration-[var(--semantic-motion-duration-instant)] hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
      >
        O que você quer compartilhar?
      </button>

      <Button variant="primary" onPress={() => onOpen()} className="shrink-0 min-h-11">
        Publicar
      </Button>
    </div>
  )
}
