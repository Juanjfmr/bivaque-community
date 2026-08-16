"use client"

import { brandTokens } from "@bivaque/tokens"
import { Button } from "@heroui/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { recordConsentAction } from "./actions"

const CONSENT_VERSION = 1

export default function ConsentPage() {
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
      document.cookie = `bivaque-consent-version=${CONSENT_VERSION}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
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
    <div className="grid flex-1 place-items-center px-6 py-12">
      <section className="flex w-full max-w-md flex-col gap-6" aria-labelledby="consent-heading">
        <h1 id="consent-heading" className="text-2xl font-semibold tracking-tight">
          Termos de uso
        </h1>

        <div className="prose prose-sm max-h-64 overflow-y-auto rounded-lg border border-border p-4 text-sm text-muted">
          <p>
            Bem-vindo ao {brandTokens.productName}, uma comunidade privada para militares federais
            ativos, veteranos e pensionistas militares.
          </p>
          <p>Ao aceitar, voc&ecirc; concorda que:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              Seus dados de verifica&ccedil;&atilde;o ser&atilde;o processados atrav&eacute;s do
              Portal da Transpar&ecirc;ncia.
            </li>
            <li>
              Nenhum dado pessoal sens&iacute;vel (CPF, patente, endere&ccedil;o) ser&aacute;
              armazenado ou exibido publicamente.
            </li>
            <li>
              Voc&ecirc; &eacute; respons&aacute;vel pelo conte&uacute;do que publica na comunidade.
            </li>
            <li>O acesso &eacute; limitado &agrave; sua localidade e grupos autorizados.</li>
          </ul>
        </div>

        {error && <FeedbackAlert variant="danger" description={error} />}

        <Button
          variant="primary"
          className="w-full"
          onPress={handleAccept}
          isDisabled={accepted || loading}
        >
          {accepted ? "Aceito" : loading ? "Registrando..." : "Aceitar e continuar"}
        </Button>

        <p className="text-xs text-muted text-center">
          Ao continuar, voc&ecirc; confirma que leu e concorda com os termos de uso.
        </p>
      </section>
    </div>
  )
}
