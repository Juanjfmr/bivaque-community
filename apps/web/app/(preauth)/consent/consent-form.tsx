"use client"

import { Button, Checkbox } from "@heroui/react"
import type { Route } from "next"
import Link from "next/link"
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
    if (!accepted) {
      setError("Leia os documentos e marque o aceite para continuar.")
      return
    }

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

      <Checkbox isSelected={accepted} onChange={setAccepted} isDisabled={loading}>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <span className="text-sm text-muted">
            Li e concordo com a{" "}
            <Link
              href={"/privacidade" as Route}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline underline-offset-4"
              onClick={(event) => event.stopPropagation()}
            >
              Política de privacidade
            </Link>{" "}
            e o{" "}
            <Link
              href={"/codigo-de-conduta" as Route}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline underline-offset-4"
              onClick={(event) => event.stopPropagation()}
            >
              Código de conduta
            </Link>{" "}
            do Alpha fechado.
          </span>
        </Checkbox.Content>
      </Checkbox>

      <Button
        variant="primary"
        className={styles["primaryButton"] ?? ""}
        onPress={handleAccept}
        isDisabled={!accepted || loading}
      >
        {loading ? "Registrando..." : "Concordar e continuar"}
      </Button>

      <p className={styles["note"]}>
        <span>Seu aceite fica registrado com as versões dos documentos apresentados.</span>
      </p>
    </div>
  )
}
