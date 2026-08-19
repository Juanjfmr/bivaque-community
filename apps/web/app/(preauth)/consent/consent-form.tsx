"use client"

import { Button } from "@heroui/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { recordConsentAction } from "./actions"

export function ConsentForm({ consentVersion }: { consentVersion: number }) {
  const router = useRouter()
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = async () => {
    setError(null)
    setLoading(true)
    try {
      await recordConsentAction()
      // biome-ignore lint/suspicious/noDocumentCookie: consent cookie requires direct cookie access
      document.cookie = `bivaque-consent-version=${consentVersion}; path=/; max-age=${90 * 24 * 60 * 60}; SameSite=Lax`
      setAccepted(true)
      router.push("/onboarding")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao registrar consentimento. Tente novamente.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <FeedbackAlert variant="danger" description={error} />}

      <Button
        variant="primary"
        className="w-full"
        onPress={handleAccept}
        isDisabled={accepted || loading}
      >
        {accepted ? "Aceito" : loading ? "Registrando..." : "Aceitar e continuar"}
      </Button>
    </div>
  )
}
