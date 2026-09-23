"use client"

import { isValidCpf } from "@bivaque/domain"
import { Button, Form, Input, Radio, RadioGroup, Spinner } from "@heroui/react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { purgeCpfResidue } from "../../../lib/onboarding/storage"
import { verificationErrorMessage } from "../../../lib/portal/verification-copy"
import { createBrowserClient } from "../../../lib/supabase/client"
import { SUPPORT_EMAIL } from "../../../lib/support"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { showToast } from "../../components/bivaque/toast"
import { AdmissionShell } from "./components/admission-shell"
import styles from "./onboarding.module.css"

type OnboardingStep = "verify" | "family" | "done" | "loading"

type RoleId = "military" | "veteran" | "pensioner" | "family"

const ROLE_OPTIONS: ReadonlyArray<{ id: RoleId; label: string }> = [
  { id: "military", label: "Sou militar das Forças Armadas" },
  { id: "veteran", label: "Sou veterano" },
  { id: "pensioner", label: "Sou pensionista" },
  { id: "family", label: "Recebi um convite familiar" },
]

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
  const [role, setRole] = useState<RoleId>("military")
  const [cpf, setCpf] = useState("")
  const [error, setError] = useState<string | null>(null)
  // ADR-20260922-identidade-quando-portal-falha: com o Portal indisponível, a identidade
  // é oferecida na hora, abaixo da mensagem de instabilidade.
  const [offerIdentity, setOfferIdentity] = useState(false)
  const [loading, setLoading] = useState(false)
  const [familyToken, setFamilyToken] = useState("")
  const [familyName, setFamilyName] = useState("")
  const [result, setResult] = useState<string | null>(null)

  const inviteToken = searchParams.get("invite")

  useEffect(() => {
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
          router.replace("/inicio")
          return
        }
        if (data.status === "verified") {
          router.replace("/onboarding/locality")
          return
        }
        if (data.status === "pending") {
          router.replace("/onboarding/status")
          return
        }
      } catch {}
    }

    boot()
  }, [inviteToken, router])

  const handleVerifyCpf = async () => {
    setError(null)
    setOfferIdentity(false)

    if (role === "family") {
      setStep("family")
      if (familyToken.length === 0) {
        setError("Abra o link do convite que você recebeu para concluir por aqui.")
      }
      return
    }

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
        // O nome que o Portal sugeriu atravessa a fronteira em memória (D11) e é
        // guardado em sessionStorage descartável para o passo pós-elegibilidade.
        // Nunca é persistido no banco.
        if (outcome["status"] === "verified") {
          const suggested =
            typeof outcome["suggestedName"] === "string" ? outcome["suggestedName"] : ""
          if (suggested.length > 0) {
            window.sessionStorage.setItem("onboarding:suggestedName", suggested)
          }
          router.push("/onboarding/locality")
        } else if (outcome["status"] === "rejected") {
          router.push("/onboarding/documento")
        } else if (outcome["status"] === "pending") {
          router.push("/onboarding/status")
        } else if (outcome["status"] === "temporary_error") {
          const errorCode = typeof outcome["errorCode"] === "string" ? outcome["errorCode"] : ""
          setError(verificationErrorMessage(errorCode, SUPPORT_EMAIL))
          setOfferIdentity(true)
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
    if (familyToken.length === 0) {
      setError("Abra o link do convite que você recebeu para concluir por aqui.")
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
        router.push("/inicio")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao aceitar convite")
    } finally {
      setLoading(false)
    }
  }

  if (step === "loading") {
    return (
      <AdmissionShell
        stage="access"
        titleId="onboarding-loading-heading"
        title="Preparando o próximo passo."
      >
        <div className={styles["loadingState"]}>
          <Spinner size="lg" color="accent" />
          <p>Consultando o estado da sua entrada...</p>
        </div>
      </AdmissionShell>
    )
  }

  const isFamily = step === "family"
  const canSubmit = cpf.replace(/\D/g, "").length > 0

  return (
    <AdmissionShell
      stage="access"
      titleId="onboarding-heading"
      title={isFamily ? "Aceite seu convite." : "Verificar meu acesso"}
      description={
        isFamily
          ? "Seu convite cria uma conta independente, ligada ao membro que convidou você."
          : "Vamos conferir seu acesso à comunidade."
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
            <div className={styles["verifyBlock"]}>
              <p className={styles["verifyLegend"]}>Como você deseja verificar seu acesso?</p>
              <RadioGroup
                aria-label="Como você deseja verificar seu acesso?"
                className={styles["radioList"] ?? ""}
                value={role}
                onChange={(value) => setRole(value as RoleId)}
              >
                {ROLE_OPTIONS.map((option) => (
                  <Radio
                    key={option.id}
                    value={option.id}
                    aria-label={option.label}
                    className={styles["radioRow"] ?? ""}
                  >
                    <Radio.Content>
                      <Radio.Control>
                        <Radio.Indicator />
                      </Radio.Control>
                      <span>{option.label}</span>
                    </Radio.Content>
                  </Radio>
                ))}
              </RadioGroup>
            </div>

            <div className={styles["cpfField"]}>
              <label className={styles["fieldLabel"]} htmlFor="onboarding-cpf">
                Digite seu CPF
              </label>
              <Input
                id="onboarding-cpf"
                className={styles["control"] ?? ""}
                aria-label="CPF"
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoComplete="off"
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
              <p className={styles["cpfSupport"]}>
                A verificação por CPF é praticamente instantânea.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              className={`${styles["primaryButton"]} ${styles["submitButton"]}`}
              isDisabled={!canSubmit}
            >
              Verificar acesso
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

        {offerIdentity && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">
              Você não precisa esperar: envie sua identidade militar digital e a equipe analisa. A
              análise por identidade leva mais tempo que a conferência por CPF.
            </p>
            <Link href="/onboarding/documento" className={styles["primaryLink"] ?? ""}>
              Enviar identidade agora
            </Link>
          </div>
        )}

        {step !== "done" && !(step === "verify" && loading) && (
          <p className={styles["documentFooterNote"]}>
            {isFamily
              ? "O convite é conferido pelo e-mail ao qual foi enviado."
              : "Se não conseguirmos confirmar, você poderá enviar sua identidade."}
          </p>
        )}
      </div>
    </AdmissionShell>
  )
}
