"use client"

import { isValidCpf } from "@bivaque/domain"
import { Button, Form, Input, Spinner } from "@heroui/react"
import { ShieldCheck } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { purgeCpfResidue } from "../../../lib/onboarding/storage"
import { verificationErrorMessage } from "../../../lib/portal/verification-copy"
import { createBrowserClient } from "../../../lib/supabase/client"
import { SUPPORT_EMAIL } from "../../../lib/support"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { showToast } from "../../components/bivaque/toast"
import { OnboardingShell } from "./components/onboarding-shell"
import styles from "./onboarding.module.css"

type OnboardingStep = "verify" | "family" | "done" | "loading"

function formatCpf(digits: string): string {
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="grid flex-1 place-items-center px-6 py-12">
          <p className="text-sm text-muted">Carregando...</p>
        </div>
      }
    >
      <OnboardingFlow />
    </Suspense>
  )
}

function OnboardingFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<OnboardingStep>("loading")
  const [cpf, setCpf] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [familyToken, setFamilyToken] = useState("")
  const [familyName, setFamilyName] = useState("")
  const [result, setResult] = useState<string | null>(null)

  const inviteToken = searchParams.get("invite")

  useEffect(() => {
    // A versão anterior do fluxo gravava o CPF aqui; quem já passou por ela
    // pode ter a chave no navegador. Removemos no boot, sem ler de volta.
    purgeCpfResidue(sessionStorage)

    const boot = async () => {
      const {
        data: { session },
      } = await createBrowserClient().auth.getSession()

      if (inviteToken) {
        setFamilyToken(inviteToken)
        setStep("family")
        return
      }

      if (!session) {
        setStep("verify")
        return
      }

      setStep("verify")

      try {
        const res = await fetch("/api/onboarding/status", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) return

        const data = (await res.json()) as {
          status: "pending" | "verified" | "rejected" | "temporary_error" | null
          localityMember: boolean
        }

        if (data.localityMember) {
          router.replace("/community")
          return
        }
        // P0 Task 4: verified without membership is a real state — the person
        // must choose a locality at the post-eligibility step, not the feed.
        if (data.status === "verified") {
          router.replace("/onboarding/locality")
          return
        }
        if (data.status === "pending") {
          router.replace("/onboarding/status")
          return
        }
        if (data.status === "rejected") {
          router.replace("/onboarding/status")
          return
        }
      } catch {}
    }

    boot()
  }, [inviteToken, router])

  const handleVerifyCpf = async () => {
    setError(null)
    if (!isValidCpf(cpf)) {
      setError("CPF inválido. Confira os 11 dígitos.")
      return
    }
    setLoading(true)

    const {
      data: { session },
    } = await createBrowserClient().auth.getSession()

    if (!session) {
      showToast({
        title: "Sua sessão expirou",
        description: "Vamos levar você de volta ao login.",
        variant: "warning",
      })
      router.push("/login?return=/onboarding")
      return
    }

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "verify-cpf", cpf: cpf.replace(/\D/g, "") }),
      })

      const data = (await response.json()) as Record<string, unknown>

      if (typeof data["error"] === "string") {
        setError(data["error"] as string)
        return
      }

      if (data["localityMember"]) {
        setResult("Verificação concluída. Sua entrada está pronta.")
        setStep("done")
        router.push("/onboarding/welcome")
      } else {
        const outcome = data["outcome"] as Record<string, unknown>
        // P0 Task 5: o nome que o Portal sugeriu atravessa a fronteira em
        // memória (D11) e é guardado em sessionStorage descartável para o passo
        // pós-elegibilidade preencher o campo. Nunca é persistido no banco.
        if (outcome["status"] === "verified") {
          const suggested =
            typeof outcome["suggestedName"] === "string" ? outcome["suggestedName"] : ""
          if (suggested.length > 0) {
            window.sessionStorage.setItem("onboarding:suggestedName", suggested)
          }
          router.push("/onboarding/locality")
        } else if (outcome["status"] === "rejected") {
          // P0 Task 8: rejection is not geographic. The rejected member goes
          // to /onboarding/status, where the canonical rejected screen is
          // rendered without a waitlist detour.
          router.push("/onboarding/status")
        } else if (outcome["status"] === "pending") {
          router.push("/onboarding/status")
        } else if (outcome["status"] === "temporary_error") {
          const errorCode = typeof outcome["errorCode"] === "string" ? outcome["errorCode"] : ""
          setError(verificationErrorMessage(errorCode, SUPPORT_EMAIL))
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro na verificação")
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptFamilyInvite = async () => {
    setError(null)
    if (familyName.trim().length < 2) {
      setError("Informe seu nome para aceitar o convite.")
      return
    }
    setLoading(true)

    const {
      data: { session },
    } = await createBrowserClient().auth.getSession()

    if (!session) {
      showToast({
        title: "Sua sessão expirou",
        description: "Vamos levar você de volta ao login.",
        variant: "warning",
      })
      sessionStorage.setItem("onboarding:familyToken", familyToken)
      router.push("/login?return=/onboarding")
      return
    }

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "accept-family-invite",
          token: familyToken,
          display_name: familyName.trim(),
        }),
      })

      const data = (await response.json()) as Record<string, unknown>

      if (typeof data["error"] === "string") {
        setError(data["error"] as string)
        return
      }

      if (data["localityMember"]) {
        setResult("Convite aceito. Sua conta está pronta.")
        setStep("done")
        router.push("/community")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao aceitar convite")
    } finally {
      setLoading(false)
    }
  }

  if (step === "loading") {
    return (
      <OnboardingShell
        stage="eligibility"
        titleId="onboarding-loading-heading"
        eyebrow="Sua entrada"
        title="Preparando o próximo passo."
        asideEyebrow="Uma entrada de cada vez"
        asideTitle="Você está a poucos passos de chegar."
        asideDescription="Regras claras, elegibilidade conferida e uma localidade escolhida por você."
      >
        <div className={styles["loadingState"]}>
          <Spinner size="lg" color="accent" />
          <p>Consultando o estado da sua entrada...</p>
        </div>
      </OnboardingShell>
    )
  }

  const isFamily = step === "family"

  return (
    <OnboardingShell
      stage="eligibility"
      titleId="onboarding-heading"
      eyebrow={isFamily ? "Convite familiar" : "Segundo passo"}
      title={isFamily ? "Aceite seu convite." : "Confirme sua elegibilidade."}
      description={
        isFamily
          ? "Seu convite cria uma conta independente, ligada ao membro que convidou você."
          : "O Bivaque é para militares federais ativos, veteranos e pensionistas militares. A cidade vem no próximo passo."
      }
      asideEyebrow="Uma entrada clara para cada pessoa"
      asideTitle={
        isFamily ? "Seu vínculo começa com um convite." : "A comunidade começa com confiança."
      }
      asideDescription={
        isFamily
          ? "Familiares entram pelo convite recebido e seguem com uma conta própria."
          : "Uma consulta confirma a elegibilidade sem transformar dados pessoais em perfil público."
      }
    >
      <div className={styles["stack"]}>
        {step === "verify" && loading && (
          <div className={styles["loadingState"]}>
            <Spinner size="lg" color="accent" />
            <p>Consultando a fonte oficial...</p>
          </div>
        )}

        {step === "done" && result && <FeedbackAlert variant="success" description={result} />}

        {step === "verify" && !loading && (
          <Form
            onSubmit={(e) => {
              e.preventDefault()
              handleVerifyCpf()
            }}
            className={styles["form"] ?? ""}
          >
            <div className={styles["fieldGroup"]}>
              <p className={styles["fieldLabel"]}>CPF</p>
              <Input
                className={styles["control"] ?? ""}
                aria-label="CPF"
                placeholder="000.000.000-00"
                value={formatCpf(cpf)}
                onChange={(e) => {
                  const digits = (e.target as HTMLInputElement).value
                    .replace(/\D/g, "")
                    .slice(0, 11)
                  setCpf(digits)
                }}
                required
                maxLength={14}
              />
            </div>
            <Button type="submit" variant="primary" className={styles["primaryButton"] ?? ""}>
              Conferir e continuar
            </Button>
          </Form>
        )}

        {step === "family" && (
          <>
            <div className={styles["fieldGroup"]}>
              <p className={styles["fieldLabel"]}>Como você quer ser chamado</p>
              <Input
                className={styles["control"] ?? ""}
                aria-label="Seu nome"
                placeholder="Seu nome"
                value={familyName}
                onChange={(e) => setFamilyName((e.target as HTMLInputElement).value)}
                required
                maxLength={80}
              />
            </div>

            <Button
              variant="primary"
              className={styles["primaryButton"] ?? ""}
              onPress={handleAcceptFamilyInvite}
              isDisabled={loading}
            >
              {loading ? "Processando..." : "Aceitar convite"}
            </Button>
          </>
        )}

        {error && <FeedbackAlert variant="danger" description={error} />}

        {step !== "done" && !(step === "verify" && loading) && (
          <p className={styles["note"]}>
            <ShieldCheck aria-hidden="true" />
            <span>
              {isFamily
                ? "O convite é conferido pelo e-mail ao qual foi enviado."
                : "O CPF é usado nesta consulta e não fica salvo no Bivaque."}
            </span>
          </p>
        )}
      </div>
    </OnboardingShell>
  )
}
