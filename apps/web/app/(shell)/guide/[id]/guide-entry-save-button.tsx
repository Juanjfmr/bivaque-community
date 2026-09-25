"use client"

import { Bookmark } from "lucide-react"
import { useState } from "react"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"

interface GuideEntrySaveButtonProps {
  entryId: string
  initiallySaved: boolean
  initialSaveError?: string | null
}

export function GuideEntrySaveButton({
  entryId,
  initiallySaved,
  initialSaveError = null,
}: GuideEntrySaveButtonProps) {
  const [saved, setSaved] = useState(initiallySaved)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(initialSaveError)

  async function toggleSaved() {
    if (pending) return
    setPending(true)
    setError(null)

    const supabase = createBrowserClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      setError("Entre novamente para salvar esta referência.")
      setPending(false)
      return
    }

    const result = saved
      ? await supabase
          .from("guide_entry_saves")
          .delete()
          .eq("user_id", user.id)
          .eq("entry_id", entryId)
      : await supabase.from("guide_entry_saves").insert({ user_id: user.id, entry_id: entryId })

    if (result.error) {
      setError("Não foi possível atualizar os salvos. Tente novamente.")
    } else {
      setSaved((current) => !current)
    }
    setPending(false)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={toggleSaved}
        disabled={pending || Boolean(initialSaveError)}
        aria-pressed={saved}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm font-medium text-[var(--semantic-action-primary)] transition-colors hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] disabled:cursor-wait disabled:opacity-60"
      >
        <Bookmark size={16} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        {saved ? "Salvo" : "Salvar"}
      </button>
      {error ? <FeedbackAlert variant="danger" description={error} /> : null}
    </div>
  )
}
