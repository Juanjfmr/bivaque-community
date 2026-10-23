"use client"

import { isValidCpf } from "@bivaque/domain"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { formatCpfInput } from "../../../lib/onboarding/elegibility"
import { purgeCpfResidue } from "../../../lib/onboarding/storage"
import { verificationErrorMessage } from "../../../lib/portal/verification-copy"
import { createBrowserClient } from "../../../lib/supabase/client"
import { SUPPORT_EMAIL } from "../../../lib/support"
import { EntryError } from "../../components/entry/entry-error"
import { EntryShell } from "../../components/entry/entry-shell"
import { EntrySteps } from "../../components/entry/entry-steps"
import { MaterialFilledButton } from "../../components/material/filled-button"
import { MaterialIcon } from "../../components/material/material-icon"
import { MaterialOutlinedButton } from "../../components/material/outlined-button"
import { MaterialOutlinedTextField } from "../../components/material/outlined-text-field"
import { EntryHeading } from "./components/entry-heading"
import { EntrySignOut } from "./components/entry-signout"
import "./components/entry-elegibilidade.css"

// PORT-004 (lote 4, frente B) — a elegibilidade como no protótipo
// (`renderEntryCpf` e `renderEntryResult` em
// prototypes/bivaque-html/src/features/entry/account.js).
//
// O que mudou em relação à tela anterior: a pergunta "Como você deseja
// verificar seu acesso?" com as quatro opções saiu — o CPF é digitado direto,
// com o bloco "Por que o CPF" e o link do convite de familiar no lugar do
// ramo "Recebi um convite familiar". A categoria (ativa, veterano, pensionista)
// continua vindo da fonte oficial; o corpo enviado a `/api/onboarding` é o
// mesmo (`{ action: "verify-cpf", cpf }`), sem tipo de vínculo — a rota nunca
// recebeu esse campo, e isso está registrado no relatório da frente.
//
// O resultado deixou de ser uma mensagem na mesma tela do formulário: são as
// três telas do protótipo, no mesmo endereço `/onboarding`, como os passos de
// `entryNext()`. Quem foi confirmado segue para a cidade, quem está em análise
// vai para `/onboarding/status`, e quem não foi localizado ou não pôde ser
// consultado fica aqui, com o caminho do documento.
//
// O CPF não é guardado em lugar nenhum: o campo é limpo antes de sair do passo
// (`purgeCpfResidue` continua rodando na entrada) e a consulta sai do ambiente
// do navegador assim que a resposta chega.

type Step = "loading" | "cpf" | "notfound" | "unavailable"

const CPF_INVALID = "CPF inválido. Confira os 11 dígitos."

function apiErrorMessage(code: string): string {
  switch (code) {
    case "cpf is invalid":
      return CPF_INVALID
    case "cpf is required":
      return "Digite seu CPF para continuar."
    case "consent is required":
      return "O aceite da entrada não está registrado. Volte ao cadastro para aceitar de novo."
    case "unauthorized":
      return "Sua sessão expirou. Entre novamente para continuar."
    default:
      return "Não foi possível conferir agora. Tente de novo."
  }
}

// O título de cada passo recebe o foco ao abrir (EntryHeading), como
// `entryFocusTitle` no protótipo: o leitor de tela anuncia o passo novo em vez
// de deixar a pessoa procurando onde a tela mudou.

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <EntryShell>
          <div className="en-form">
            <p className="en-lead">Carregando…</p>
          </div>
        </EntryShell>
      }
    >
      <OnboardingFlow />
    </Suspense>
  )
}

function OnboardingFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("invite")

  const [step, setStep] = useState<Step>("loading")
  const [cpf, setCpf] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    purgeCpfResidue(sessionStorage)

    // O convite de familiar é uma tela própria (`/convite`, frente D). O link
    // antigo (`/onboarding?invite=<token>`) continua chegando: em vez de
    // aceitar o convite aqui, ele é encaminhado com o código no caminho.
    if (inviteToken) {
      router.replace(`/convite/${encodeURIComponent(inviteToken)}`)
      return
    }

    const boot = async () => {
      const {
        data: { session },
      } = await createBrowserClient().auth.getSession()

      if (!session) {
        router.replace("/login?return=/onboarding")
        return
      }

      try {
        const res = await fetch("/api/onboarding/status", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) {
          setStep("cpf")
          return
        }

        const data = (await res.json()) as {
          status: "pending" | "verified" | "rejected" | "temporary_error" | null
          localityMember: boolean
        }

        if (data.localityMember) {
          router.replace("/community")
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
        // `rejected` é a fonte oficial sem o vínculo: `entryNext()` do
        // protótipo leva de volta ao resultado, não ao formulário. Quem volta
        // depois vê a mesma resposta e o mesmo caminho do documento.
        setStep(data.status === "rejected" ? "notfound" : "cpf")
      } catch {
        setStep("cpf")
      }
    }

    void boot()
  }, [inviteToken, router])

  const restart = () => {
    setCpf("")
    setErrorCode("")
    setFieldError(null)
    setStep("cpf")
  }

  const verify = async () => {
    if (loading) return
    setFieldError(null)

    if (!isValidCpf(cpf)) {
      setFieldError(CPF_INVALID)
      return
    }

    setLoading(true)

    const {
      data: { session },
    } = await createBrowserClient().auth.getSession()

    if (!session) {
      setLoading(false)
      setFieldError("Sua sessão expirou. Entre novamente para continuar.")
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
        setFieldError(apiErrorMessage(data["error"]))
        return
      }

      if (data["localityMember"]) {
        router.push("/onboarding/welcome")
        return
      }

      const outcome = data["outcome"] as Record<string, unknown>
      const status = outcome["status"]

      if (status === "verified") {
        // O nome sugerido pelo Portal atravessa a fronteira em memória (D11) e
        // fica em sessionStorage descartável para o passo seguinte. Nunca é
        // persistido no banco.
        const suggested =
          typeof outcome["suggestedName"] === "string" ? outcome["suggestedName"] : ""
        if (suggested.length > 0) {
          window.sessionStorage.setItem("onboarding:suggestedName", suggested)
        }
        router.push("/onboarding/locality")
        return
      }

      if (status === "pending") {
        router.push("/onboarding/status")
        return
      }

      // O CPF sai da memória da tela antes de qualquer coisa ser mostrada.
      setCpf("")

      if (status === "rejected") {
        setStep("notfound")
        return
      }

      setErrorCode(typeof outcome["errorCode"] === "string" ? outcome["errorCode"] : "")
      setStep("unavailable")
    } catch {
      setFieldError("Não foi possível conferir agora. Verifique sua conexão e tente de novo.")
    } finally {
      setLoading(false)
    }
  }

  if (step === "loading") {
    return (
      <EntryShell action={<EntrySignOut />}>
        <div className="en-form">
          <EntrySteps label="Elegibilidade" step={2} />
          <p className="en-lead">Preparando o próximo passo…</p>
        </div>
      </EntryShell>
    )
  }

  if (step === "notfound") {
    return (
      <EntryShell action={<EntrySignOut />}>
        <div className="en-form">
          <EntrySteps label="Elegibilidade" step={2} />
          <EntryHeading>Não localizamos o vínculo.</EntryHeading>
          <p className="en-lead">
            A fonte oficial não confirmou o vínculo deste CPF. Isso acontece com quem passou para a
            reserva há pouco ou com pensionistas recentes.
          </p>
          <Link className="en-file" href="/onboarding/documento">
            <MaterialIcon name="upload" />
            <span>
              <b>Enviar um documento</b>
              PDF, JPG ou PNG, até 10 MB. A equipe responde em até 2 dias úteis.
            </span>
          </Link>
          <MaterialOutlinedButton id="onboarding-cpf-retry" onClick={restart}>
            Conferir o CPF de novo
          </MaterialOutlinedButton>
        </div>
      </EntryShell>
    )
  }

  if (step === "unavailable") {
    // A fonte oficial fora do ar é um resultado distinto da rejeição. A cópia
    // do protótipo serve à indisponibilidade; quando o motivo é limite de
    // consultas ou demora, `verificationErrorMessage` diz a verdade sem expor
    // código nenhum (o contrato do módulo é não transformar falha de
    // infraestrutura em rejeição aparente).
    const lead =
      errorCode === "RATE_LIMITED" || errorCode === "TIMEOUT" || errorCode === "HTTP_ERROR"
        ? verificationErrorMessage(errorCode, SUPPORT_EMAIL)
        : "A fonte oficial está fora do ar. Tente de novo em alguns minutos."

    return (
      <EntryShell action={<EntrySignOut />}>
        <div className="en-form">
          <EntrySteps label="Elegibilidade" step={2} />
          <EntryHeading>Não conseguimos consultar agora.</EntryHeading>
          <p className="en-lead">{lead}</p>
          <MaterialFilledButton id="onboarding-retry" onClick={restart}>
            Tentar de novo
          </MaterialFilledButton>
          <p className="en-sub">Se continuar, fale com a gente: {SUPPORT_EMAIL}.</p>
          {/* ADR-20260922-identidade-quando-portal-falha: com o Portal fora, a
              identidade é oferecida na hora, sem consumir nova tentativa. */}
          <Link className="en-file" href="/onboarding/documento">
            <MaterialIcon name="upload" />
            <span>
              <b>Enviar um documento</b>
              PDF, JPG ou PNG, até 10 MB. A equipe responde em até 2 dias úteis.
            </span>
          </Link>
        </div>
      </EntryShell>
    )
  }

  const canSubmit = cpf.replace(/\D/g, "").length === 11

  return (
    <EntryShell action={<EntrySignOut />}>
      <div className="en-form">
        <EntrySteps label="Elegibilidade" step={2} />
        <EntryHeading>Confirme seu vínculo.</EntryHeading>
        <p className="en-lead">
          Para militares federais ativos, veteranos e pensionistas militares.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void verify()
          }}
          onKeyDown={(event) => {
            // O campo do Material vive num shadow root: o Enter não chega ao
            // formulário sozinho. O protótipo faz o mesmo enlace à mão.
            if (event.key !== "Enter" || event.nativeEvent.isComposing) return
            event.preventDefault()
            void verify()
          }}
        >
          <MaterialOutlinedTextField
            autocomplete="off"
            error={fieldError !== null}
            id="onboarding-cpf"
            inputmode="numeric"
            label="CPF"
            maxlength={14}
            onChange={(value) => {
              setFieldError(null)
              setCpf(value.replace(/\D/g, "").slice(0, 11))
            }}
            placeholder="000.000.000-00"
            required
            value={formatCpfInput(cpf)}
          />
          <EntryError id="onboarding-error">{fieldError}</EntryError>
          <MaterialFilledButton
            disabled={loading || !canSubmit}
            id="onboarding-cpf-submit"
            type="submit"
          >
            {loading ? "Conferindo…" : "Conferir e continuar"}
          </MaterialFilledButton>
        </form>

        <div className="en-why">
          <MaterialIcon name="verified_user" />
          <span>
            <b>Por que o CPF</b>
            Com ele confirmamos o vínculo na fonte oficial, sem pedir posto nem organização. O
            número não fica salvo.
          </span>
        </div>

        <Link className="en-link" href="/convite">
          <MaterialIcon name="group" />
          <span>
            <b>É cônjuge ou dependente?</b>
            Você entra pelo convite de quem é militar, sem CPF.
          </span>
        </Link>
      </div>
    </EntryShell>
  )
}
