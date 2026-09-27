"use client"

import { Link2 } from "lucide-react"
import { useEffect, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "./avatar"

// A linha de publicar da Comunidade (25/09/2026). Referência do Mobbin: o
// "Post about…" + "Post" do Threads numa linha só. O campo inteiro abre o
// compositor; o link é um atalho que abre já com o campo de URL; "Publicar" é
// a ação explícita para quem procura o botão.

interface FeedComposerProps {
  /** Dica de anexo para o compositor: "link" abre já com o campo de URL
   *  oferecido. Nunca é escolha de formato — o `post_type` sai do anexo real. */
  onOpenModal: (attachment?: string) => void
  /** Para quem a publicação vai, no convite do campo. */
  communityName?: string | null
}

export function FeedComposer({ onOpenModal, communityName = null }: FeedComposerProps) {
  const [avatarLetter, setAvatarLetter] = useState("?")
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createBrowserClient()
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled || !user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle()

      if (cancelled) return
      setAvatarLetter(
        profile?.display_name
          ? profile.display_name.charAt(0).toUpperCase()
          : (user.email?.charAt(0).toUpperCase() ?? "?"),
      )
      setAvatarSrc(`/api/avatar/${user.id}`)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const invitation = communityName ? `Escreva para ${communityName}…` : "Escreva para a comunidade…"

  return (
    <div className="flex items-center gap-2 rounded-ui-lg bg-ui-surface p-2 shadow-ui ring-1 ring-ui-line sm:gap-3 sm:p-3">
      <MemberAvatar name={avatarLetter} src={avatarSrc} className="h-10 w-10 shrink-0 text-sm" />

      <button
        type="button"
        onClick={() => onOpenModal()}
        className="flex min-h-11 min-w-0 flex-1 items-center rounded-full bg-ui-bg px-4 text-left text-sm text-ui-ink-2 transition-colors hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-brand"
      >
        {/* No telefone o nome da comunidade não cabe ao lado do botão: o
            convite fica curto, e o nome completo volta do sm para cima. */}
        <span className="truncate sm:hidden">Escreva algo…</span>
        <span className="hidden truncate sm:inline">{invitation}</span>
      </button>

      <button
        type="button"
        aria-label="Nova publicação com link"
        onClick={() => onOpenModal("link")}
        className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-ui-ink-2 transition-colors hover:bg-ui-subtle hover:text-ui-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-brand sm:inline-flex"
      >
        <Link2 size={18} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => onOpenModal()}
        className="inline-flex h-11 shrink-0 items-center rounded-full bg-ui-brand px-4 text-sm font-semibold text-ui-on-brand transition-colors hover:bg-ui-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-brand"
      >
        Publicar
      </button>
    </div>
  )
}
