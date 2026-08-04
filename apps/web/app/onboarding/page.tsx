"use client"

import { brandTokens } from "@bivaque/tokens"
import { Button, Form, Input } from "@heroui/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { createBrowserClient } from "../../lib/supabase/client"

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

  const inviteToken = searchParams.get("invite")

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await createBrowserClient().auth.getSession()

      if (inviteToken) {
        setFamilyToken(inviteToken)
        setStep("family")
      } else if (session) {
        setStep("verify")
      } else {
        setStep("verify")
      }
    }

    checkSession()
  }, [inviteToken])

  const handleVerifyCpf = async () => {
    setError(null)
    setLoading(true)

    const {
      data: { session },
    } = await createBrowserClient().auth.getSession()

    if (!session) {
      router.push("/login")
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
        router.push("/community")
      } else {
        const outcome = data["outcome"] as Record<string, unknown>
        if (outcome["status"] === "rejected") {
          setResult(
            "Infelizmente, você não atende aos critérios de elegibilidade para Manaus. Você pode entrar na lista de espera para outras localidades.",
          )
          setStep("waitlist")
        } else if (outcome["status"] === "pending") {
          setResult("Sua verificação está pendente. Isso pode levar alguns instantes.")
          setStep("done")
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
      router.push("/login")
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
      router.push("/login")
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
          locality_id: "00000000-0000-4000-8000-000000000001",
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
    <div className="grid flex-1 place-items-center px-6 py-12">
      <section className="flex w-full max-w-sm flex-col gap-6" aria-labelledby="onboarding-heading">
        <h1 id="onboarding-heading" className="text-2xl font-semibold tracking-tight">
          {brandTokens.productName}
        </h1>

        {step === "done" && result && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {result}
            </div>
          </div>
        )}

        {step === "verify" && (
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
              <Button type="submit" variant="primary" className="w-full" isDisabled={loading}>
                {loading ? "Verificando..." : "Verificar elegibilidade"}
              </Button>
            </Form>

            <div className="text-center">
              <Button variant="tertiary" size="sm" onPress={() => setStep("waitlist")}>
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

            {error && (
              <div
                className="rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
                role="alert"
              >
                {error}
              </div>
            )}

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

        {error && (
          <div
            className="rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
            role="alert"
          >
            {error}
          </div>
        )}

        {step !== "done" && (
          <p className="text-xs text-muted text-center">
            Seus dados s&atilde;o processados exclusivamente pelo servidor. Nenhum dado pessoal
            sens&iacute;vel &eacute; armazenado.
          </p>
        )}
      </section>
    </div>
  )
}
