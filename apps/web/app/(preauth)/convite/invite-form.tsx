"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { normalizeInviteCode } from "../../../lib/convite/code"
import { ACCOUNT_STEP_FIELDS, CODE_STEP_FIELDS, stageError } from "../../../lib/convite/form-error"
import { EntryError } from "../../components/entry/entry-error"
import { MaterialCheckbox } from "../../components/material/checkbox"
import { MaterialFilledButton } from "../../components/material/filled-button"
import { MaterialOutlinedTextField } from "../../components/material/outlined-text-field"
import { MaterialPasswordField } from "../../components/material/password-field"
import { acceptInviteAction, type InvitePreviewResult, previewInviteAction } from "./actions"

// PORT-006 (lote 4 da entrada): a tela de convite do protótipo
// (`renderEntryInvite` em prototypes/bivaque-html/src/features/entry/login.js),
// em dois estados — o código, e depois a conta.
//
// Diferença deliberada do protótipo, e por quê: lá o e-mail do convite aparece
// pronto e somente leitura, porque o estado de teste guarda o convite inteiro.
// No Next o banco guarda só o digest do e-mail (é o que amarra o convite à
// pessoa — migration 20260815130000); o endereço só existe em claro no e-mail
// entregue. Então o campo é digitado e o rótulo mascarado do convite aparece
// como apoio: quem errar o endereço é recusado pelo banco antes de qualquer
// conta ser criada. Ver o relatório da PORT-006.

type Step = "code" | "account"

type Preview = Extract<InvitePreviewResult, { ok: true }>

type AccountDraft = Readonly<{ consent: boolean; email: string; name: string; password: string }>

const EMPTY_DRAFT: AccountDraft = { consent: false, email: "", name: "", password: "" }

const PROFILE_ROW_HINT =
  "Quem é militar cria o código em Você → Família convidada. O convite vale por 7 dias."

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""
  return `${first}${last}`.toUpperCase() || "BQ"
}

// A etapa da conta, sem estado: recebe o que a tela sabe e devolve eventos.
// Separada do formulário para que o teste de renderização exercite os lugares
// de erro desta etapa — o campo, o código que já saiu da tela e a recusa de
// consentimento — sem dirigir o navegador.
export function InviteAccountStep({
  busy,
  draft,
  error,
  errorField,
  onChange,
  onSubmit,
  preview,
}: Readonly<{
  busy: boolean
  draft: AccountDraft
  error: string | null
  errorField: string | null
  onChange: (patch: Partial<AccountDraft>) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  preview: Preview
}>) {
  const hint = preview.inviteeEmailHint
  const supporting = hint
    ? `O convite vale só para este e-mail: ${hint}`
    : "O convite vale só para o e-mail que recebeu a mensagem."

  return (
    <form className="en en-form" onSubmit={onSubmit} noValidate>
      <div className="en-inv">
        <span className="en-av" aria-hidden="true">
          {initials(preview.inviterName)}
        </span>
        <span>
          <b>{preview.inviterName} convidou você</b>
          para a família no Bivaque.
        </span>
      </div>
      <h1 className="en-h1">Crie sua conta.</h1>
      <p className="en-lead">Quem convidou já foi verificado. Você não precisa de CPF.</p>

      <MaterialOutlinedTextField
        autocomplete="name"
        error={errorField === "name"}
        errorText={errorField === "name" ? (error ?? undefined) : undefined}
        id="en-name"
        label="Nome"
        maxlength={80}
        minlength={2}
        name="name"
        onChange={(value) => onChange({ name: value })}
        required
        value={draft.name}
      />
      <MaterialOutlinedTextField
        autocomplete="email"
        error={errorField === "email"}
        errorText={errorField === "email" ? (error ?? undefined) : undefined}
        id="en-email"
        inputmode="email"
        label="E-mail do convite"
        name="email"
        onChange={(value) => onChange({ email: value })}
        required
        supportingText={supporting}
        type="email"
        value={draft.email}
      />
      <MaterialPasswordField
        autocomplete="new-password"
        error={errorField === "password"}
        errorText={errorField === "password" ? (error ?? undefined) : undefined}
        id="en-pass"
        label="Senha"
        onChange={(value) => onChange({ password: value })}
        supportingText="Ao menos 8 caracteres, com letras e números."
        value={draft.password}
      />

      <MaterialCheckbox
        aria-describedby="en-consent-t"
        checked={draft.consent}
        className="en-check"
        id="en-consent"
        label={
          <span id="en-consent-t">
            Li e aceito a{" "}
            <Link href="/privacidade" target="_blank" rel="noreferrer">
              Política de privacidade
            </Link>{" "}
            e o{" "}
            <Link href="/codigo-de-conduta" target="_blank" rel="noreferrer">
              Código de conduta
            </Link>
            .
          </span>
        }
        onChange={(checked) => onChange({ consent: checked })}
      />

      <EntryError>{stageError(error, errorField, ACCOUNT_STEP_FIELDS)}</EntryError>
      <MaterialFilledButton disabled={busy} type="submit">
        {busy ? "Criando sua conta..." : "Aceitar convite"}
      </MaterialFilledButton>
    </form>
  )
}

export function InviteForm({ initialCode }: Readonly<{ initialCode: string }>) {
  const [step, setStep] = useState<Step>("code")
  const [code, setCode] = useState(initialCode)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [draft, setDraft] = useState<AccountDraft>(EMPTY_DRAFT)
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Um clique duplo com o request voando contaria duas tentativas contra o
  // limite do código; o ref segura isso no mesmo tick.
  const sending = useRef(false)

  // Qualquer edição limpa o erro: a mensagem que ficou na tela descrevia o
  // valor anterior.
  function updateDraft(patch: Partial<AccountDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
    setError(null)
    setErrorField(null)
  }

  async function runPreview(form: FormData) {
    if (sending.current) return
    sending.current = true
    setBusy(true)
    setError(null)
    setErrorField(null)
    try {
      const result = await previewInviteAction(form)
      if (result.ok) {
        setPreview(result)
        setCode(String(form.get("code") ?? code))
        setStep("account")
        return
      }
      setError(result.message)
      setErrorField("code")
    } catch {
      setError("Não foi possível conferir o convite agora. Tente novamente.")
      setErrorField("code")
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  async function handleCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData()
    form.set("code", normalizeInviteCode(code))
    await runPreview(form)
  }

  async function handleAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending.current) return
    sending.current = true
    setBusy(true)
    setError(null)
    setErrorField(null)

    const form = new FormData()
    form.set("code", code)
    form.set("name", draft.name)
    form.set("email", draft.email)
    form.set("password", draft.password)
    if (draft.consent) form.set("consent", "on")

    try {
      const result = await acceptInviteAction(form)
      if (result.ok) {
        // Request de documento, não navegação de cliente: o cookie de sessão
        // que a Server Action gravou só vale no próximo request do documento.
        window.location.assign("/inicio")
        return
      }
      setError(result.message)
      setErrorField(result.field ?? null)
    } catch {
      setError("Não foi possível concluir o convite agora. Tente novamente.")
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  if (step === "code" || !preview) {
    return (
      <form className="en en-form" onSubmit={handleCode} noValidate>
        <h1 className="en-h1">Entre pelo convite.</h1>
        <p className="en-lead">
          Cônjuges e dependentes entram pelo convite de quem é militar, sem CPF.
        </p>
        <MaterialOutlinedTextField
          autocomplete="off"
          error={errorField === "code"}
          errorText={errorField === "code" ? (error ?? undefined) : undefined}
          id="en-code"
          label="Código do convite"
          maxlength={20}
          name="code"
          onChange={(value) => {
            setCode(value)
            setError(null)
            setErrorField(null)
          }}
          required
          value={code}
        />
        <EntryError>{stageError(error, errorField, CODE_STEP_FIELDS)}</EntryError>
        <MaterialFilledButton disabled={busy} type="submit">
          {busy ? "Conferindo..." : "Continuar"}
        </MaterialFilledButton>
        <p className="en-hint">{PROFILE_ROW_HINT}</p>
      </form>
    )
  }

  return (
    <InviteAccountStep
      busy={busy}
      draft={draft}
      error={error}
      errorField={errorField}
      onChange={updateDraft}
      onSubmit={handleAccount}
      preview={preview}
    />
  )
}
