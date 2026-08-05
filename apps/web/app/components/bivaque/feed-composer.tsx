"use client"

import { Button } from "@heroui/react"
import { useEffect, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"

const MANAUS_LOCALITY_ID = "00000000-0000-4000-8000-000000000001"

interface FeedComposerProps {
  onOpenModal: (defaultPostType?: string) => void
}

export function FeedComposer({ onOpenModal }: FeedComposerProps) {
  const [avatarLetter, setAvatarLetter] = useState("?")
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
        .eq("locality_id", MANAUS_LOCALITY_ID)
        .maybeSingle()

      if (cancelled) return
      setAvatarLetter(
        profile?.display_name
          ? profile.display_name.charAt(0).toUpperCase()
          : (user.email?.charAt(0).toUpperCase() ?? "?"),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-[var(--surface)] p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-sm font-medium">
        {avatarLetter}
      </div>

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
          onPress={() => onOpenModal("photo")}
          className="min-h-11 min-w-11"
        >
          Foto
        </Button>
        <Button
          size="sm"
          variant="tertiary"
          onPress={() => onOpenModal("link")}
          className="min-h-11 min-w-11"
        >
          Link
        </Button>
        <Button
          size="sm"
          variant="tertiary"
          onPress={() => onOpenModal("poll")}
          className="min-h-11 min-w-11"
        >
          Enquete
        </Button>
      </div>
    </div>
  )
}
