"use client"

import { type ReactNode, useActionState } from "react"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { addPortfolioPhotoAction } from "../actions"

export function PortfolioPhotoForm({ children }: { children: ReactNode }) {
  const [state, action, pending] = useActionState(
    async (_previous: { error: string } | null, formData: FormData) => {
      try {
        return (await addPortfolioPhotoAction(formData)) ?? null
      } catch {
        return { error: "Não foi possível publicar a foto. Tente de novo." }
      }
    },
    null,
  )

  return (
    <form action={action} className="mt-4 space-y-3" aria-busy={pending}>
      <fieldset disabled={pending} className="space-y-3">
        {children}
      </fieldset>
      {state?.error ? <FeedbackAlert variant="danger" description={state.error} /> : null}
    </form>
  )
}
