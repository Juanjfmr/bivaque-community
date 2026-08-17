"use client"

import { Button } from "@heroui/react"
import { useEffect, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "./avatar"

interface FeedComposerProps {
  onOpenModal: (defaultPostType?: string) => void
}

export function FeedComposer({ onOpenModal }: FeedComposerProps) {
  const [avatarLetter, setAvatarLetter] = useState("?")
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    let cancelled = false
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
  }, [supabase])

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-[var(--surface)] p-3">
      <MemberAvatar name={avatarLetter} src={avatarSrc} className="h-10 w-10 text-sm" />

      <button
        type="button"
        onClick={() => onOpenModal()}
        className="flex min-h-11 flex-1 cursor-pointer items-center rounded-lg border border-border bg-[var(--surface-sunken)] px-3 text-sm text-muted text-left transition-colors duration-[var(--duration-instant)] hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
      >
        No que voce esta pensando?
      </button>

      <div className="hidden gap-1.5 sm:flex">
        <Button
          size="sm"
          variant="tertiary"
          aria-label="Nova publicacao com link"
          onPress={() => onOpenModal("link")}
          className="min-h-11 min-w-11"
        >
          Link
        </Button>
      </div>
    </div>
  )
}
