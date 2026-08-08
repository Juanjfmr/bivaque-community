"use client"

import { Button, Form, Input, Spinner } from "@heroui/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { PILOT_LOCALITY_ID } from "../../../lib/locality"
import { createBrowserClient } from "../../../lib/supabase/client"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { showToast } from "../../components/bivaque/toast"

type OnboardingStep = "verify" | "family" | "waitlist" | "done" | "loading"

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

const flowLabels: Record<"verify" | "family" | "waitlist", string[]> = {
  verify: ["CPF", "Verificando", "Concluído"],
  family: ["Convite", "Processando", "Concluído"],
  waitlist: ["Cadastro", "Enviando", "Concluído"],
}

function getProgressIndex(step: OnboardingStep, loading: boolean): number {
  if (step === "done") return 2
  if (loading) return 1
  return 0
}

// Segmented progress bar — DESIGN_SPEC §3.2: multi-step with segments, not percent.
function SegmentedProgress({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  return (
    <div
      className="flex w-full flex-col items-center gap-1.5"
      role="progressbar"
      aria-valuenow={activeIndex}
      aria-valuemin={0}
      aria-valuemax={steps.length - 1}
    >
      <div className="flex w-full items-center gap-1">
        {steps.map((label, i) => (
          <div
            key={label}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= activeIndex ? "bg-[var(--accent)]" : "bg-[var(--border)]"
            }`}
          />
        ))}
      </div>
      <div className="flex w-full justify-between">
        {steps.map((label, i) => (
          <span
            key={label}
            className={`text-[0.625rem] leading-tight transition-colors ${
              i <= activeIndex ? "font-medium text-[var(--accent)]" : "text-[var(--muted)]/60"
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

function OnboardingFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<OnboardingStep>("loading")
  const [cpf, setCpf] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [familyToken, setFamilyToken] = useState("")
  const [result, setResult] = useState<string | null>(null)
  const [flow, setFlow] = useState<"verify" | "family" | "waitlist">("verify")

  const inviteToken = searchParams.get("invite")

  useEffect(() => {
    const boot = async () => {
      const {
        data: { session },
      } = await createBrowserClient().auth.getSession()

      if (inviteToken) {
        setFamilyToken(inviteToken)
        setStep("family")
        setFlow("family")
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

        if (data.localityMember || data.status === "verified") {
          router.replace("/community")
          return
        }
        if (data.status === "pending") {
          router.replace("/onboarding/status?state=pending")
          return
        }
        if (data.status === "rejected") {
          router.replace("/onboarding/status?state=rejected")
          return
        }
      } catch {}
    }

    boot()
  }, [inviteToken, router])

  const handleVerifyCpf = async () => {
    setError(null)
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
      sessionStorage.setItem("onboarding:cpf", cpf)
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
        setResult("Verificação concluída! Bem-vindo à comunidade de Manaus.")
        setStep("done")
        router.push("/onboarding/welcome")
      } else {
        const outcome = data["outcome"] as Record<string, unknown>
        if (outcome["status"] === "rejected") {
          setResult(
            "Infelizmente, você não atende aos critérios de elegibilidade para Manaus. Você pode entrar na lista de espera para outras localidades.",
          )
          setFlow("waitlist")
          setStep("waitlist")
        } else if (outcome["status"] === "pending") {
          router.push("/onboarding/status?state=pending")
        } else if (outcome["status"] === "temporary_error") {
          setError(
            `Erro temporário na verificação: ${String(outcome["reason"] ?? "tente novamente")}`,
          )
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
        body: JSON.stringify({ action: "accept-family-invite", token: familyToken }),
      })

      const data = (await response.json()) as Record<string, unknown>

      if (typeof data["error"] === "string") {
        setError(data["error"] as string)
        return
      }

      if (data["localityMember"]) {
        setResult("Convite aceito! Bem-vindo à comunidade de Manaus.")
        setStep("done")
        router.push("/community")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao aceitar convite")
    } finally {
      setLoading(false)
    }
  }

  const handleJoinWaitlist = async () => {
    setError(null)
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
      sessionStorage.setItem("onboarding:email", email)
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
          action: "join-waitlist",
          email,
          locality_id: PILOT_LOCALITY_ID,
        }),
      })

      const data = (await response.json()) as Record<string, unknown>

      if (typeof data["error"] === "string") {
        setError(data["error"] as string)
        return
      }

      setResult(
        "Você foi adicionado à lista de espera. Entraremos em contato quando houver vagas na sua localidade.",
      )
      setStep("done")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao entrar na lista de espera")
    } finally {
      setLoading(false)
    }
  }

  if (step === "loading") {
    return (
      <div className="grid flex-1 place-items-center px-6 py-12">
        <p className="text-sm text-muted">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="grid flex-1 place-items-center overflow-x-hidden px-6 py-12">
      <section
        className="flex w-full max-w-sm min-w-0 flex-col gap-6"
        aria-labelledby="onboarding-heading"
      >
        <SegmentedProgress steps={flowLabels[flow]} activeIndex={getProgressIndex(step, loading)} />

        <h1 id="onboarding-heading" className="break-words text-2xl font-semibold tracking-tight">
          Verificação de elegibilidade
        </h1>

        {step === "verify" && loading && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Spinner size="lg" color="accent" />
            <p className="text-sm text-muted text-center">Verificando sua elegibilidade…</p>
          </div>
        )}

        {step === "done" && result && (
          <div className="flex flex-col gap-4">
            <FeedbackAlert variant="success" description={result} />
          </div>
        )}

        {step === "verify" && !loading && (
          <>
            <p className="text-sm text-muted">
              Para acessar a comunidade de Manaus, precisamos verificar sua elegibilidade como
              militar federal ativo, veterano ou pensionista militar.
            </p>

            <Form
              onSubmit={(e) => {
                e.preventDefault()
                handleVerifyCpf()
              }}
              className="flex flex-col gap-3"
            >
              <Input
                aria-label="CPF"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf((e.target as HTMLInputElement).value)}
                required
                maxLength={14}
              />
              <Button type="submit" variant="primary" className="w-full">
                Verificar elegibilidade
              </Button>
            </Form>

            <div className="text-center">
              <Button
                variant="tertiary"
                size="sm"
                onPress={() => {
                  setFlow("waitlist")
                  setStep("waitlist")
                }}
              >
                Não sou de Manaus — entrar na lista de espera
              </Button>
            </div>
          </>
        )}

        {step === "family" && (
          <>
            <p className="text-sm text-muted">
              Voc&ecirc; foi convidado por um membro da comunidade. Aceite o convite para criar sua
              conta independente.
            </p>

            {error && <FeedbackAlert variant="danger" description={error} />}

            <Button
              variant="primary"
              className="w-full"
              onPress={handleAcceptFamilyInvite}
              isDisabled={loading}
            >
              {loading ? "Processando..." : "Aceitar convite"}
            </Button>
          </>
        )}

        {step === "waitlist" && (
          <>
            {result && <p className="text-sm text-muted">{result}</p>}

            <Form
              onSubmit={(e) => {
                e.preventDefault()
                handleJoinWaitlist()
              }}
              className="flex flex-col gap-3"
            >
              <Input
                type="email"
                aria-label="E-mail"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                required
              />
              <Button type="submit" variant="primary" className="w-full" isDisabled={loading}>
                {loading ? "Enviando..." : "Entrar na lista de espera"}
              </Button>
            </Form>
          </>
        )}

        {error && <FeedbackAlert variant="danger" description={error} />}

        {step !== "done" && !(step === "verify" && loading) && (
          <p className="text-xs text-muted text-center">
            Seus dados s&atilde;o processados exclusivamente pelo servidor. Nenhum dado pessoal
            sens&iacute;vel &eacute; armazenado.
          </p>
        )}
      </section>
    </div>
  )
}
