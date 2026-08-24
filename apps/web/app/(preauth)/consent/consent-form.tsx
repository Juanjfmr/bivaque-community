"use client"

import { Button } from "@heroui/react"
import { ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import styles from "../onboarding/onboarding.module.css"
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
    } catch {
      setError("Não foi possível registrar seu aceite agora. Tente novamente em instantes.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles["stack"]}>
      {error && <FeedbackAlert variant="danger" description={error} />}

      <Button
        variant="primary"
        className={styles["primaryButton"] ?? ""}
        onPress={handleAccept}
        isDisabled={accepted || loading}
      >
        {accepted ? "Acordo registrado" : loading ? "Registrando..." : "Concordar e continuar"}
      </Button>

      <p className={styles["note"]}>
        <ShieldCheck aria-hidden="true" />
        <span>Seu aceite fica registrado com a versão das regras que você leu.</span>
      </p>
    </div>
  )
}
