"use client"

import { Button, Checkbox } from "@heroui/react"
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

      {/* Rótulo em texto puro: os documentos têm links próprios de 44px acima
          (page.tsx). Link dentro do rótulo de um checkbox é interativo aninhado
          — anti-padrão de a11y e o que disparava os findings a.font-medium. */}
      <Checkbox
        isSelected={accepted}
        onChange={setAccepted}
        isDisabled={loading}
        aria-label="Li e concordo com a Política de privacidade e o Código de conduta do Alpha fechado"
        className="[&_input]:min-h-11 [&_input]:min-w-11 [&_input]:transition-opacity [&_input]:duration-[var(--semantic-motion-duration-fast)]"
      >
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <span className="text-sm text-muted">
            Li e concordo com a Política de privacidade e o Código de conduta do Alpha fechado. Os
            documentos completos estão nos links acima.
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

      {/* styles.note é grid "20px 1fr" (ícone + texto). Sem ícone aqui, o texto
          cairia na coluna de 20px — uma palavra por linha. col-span-full põe o
          texto nas duas colunas. */}
      <p className={styles["note"]}>
        <span className="col-span-full">
          Seu aceite fica registrado com as versões dos documentos apresentados.
        </span>
      </p>
    </div>
  )
}
