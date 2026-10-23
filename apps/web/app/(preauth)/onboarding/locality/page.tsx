"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  ENTRY_MOMENT_OPTIONS,
  provisionErrorMessage,
} from "../../../../lib/onboarding/entry-moment"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { EntryError } from "../../../components/entry/entry-error"
import { EntryShell } from "../../../components/entry/entry-shell"
import { EntrySteps } from "../../../components/entry/entry-steps"
import { MaterialFilledButton } from "../../../components/material/filled-button"
import { MaterialOutlinedTextField } from "../../../components/material/outlined-text-field"
import {
  clearEntryDraft,
  EMPTY_ENTRY_DRAFT,
  type EntryDraft,
  readEntryDraft,
  writeEntryDraft,
} from "../city-storage"
import { CityPicker } from "./city-picker"
import "./entry-city.css"

// PORT-005 (lote 4 da entrada) — ADR-20261022-entrada-do-prototipo, item 3:
// cidade e momento numa tela, como `renderEntryCity` do protótipo
// (prototypes/bivaque-html/src/features/entry/arrive.js). Ordem dos campos,
// textos e validações são os de lá: cidade, "Seu momento", a data que o momento
// pede, o destino (só em "Saindo") e "Como você quer ser chamado".
//
// O que NÃO mora mais aqui: avatar, Força e interesses. O protótipo os tirou da
// entrada ("vínculo, Força e verificação não são mais escolhidos aqui"), e a
// tela perfil/ virou desvio para cá — o que é do perfil fica no perfil.
//
// O vínculo de localidade continua nascendo no `provision` da rota, que exige
// verificação `verified` no servidor. Esta tela só coleta; quem decide é o
// servidor, e o erro dele é traduzido por `provisionErrorMessage`.

const SUGGESTED_NAME_KEY = "onboarding:suggestedName"

type BootState = "loading" | "ready"

function localToday(): string {
  // Data local, não UTC: às 22h em Manaus o UTC já é amanhã, e um `min` de
  // amanhã impediria a pessoa de escolher hoje. O servidor compara com o dia
  // UTC, que é igual ou posterior a este — nunca recusa uma data válida aqui.
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

function suggestedNameFrom(session: { user: { user_metadata: unknown } }): string {
  const metadata = (session.user.user_metadata ?? {}) as Record<string, unknown>
  for (const key of ["display_name", "name", "full_name"]) {
    const value = metadata[key]
    if (typeof value === "string" && value.trim().length > 0) return value
  }
  return ""
}

export default function OnboardingCityPage() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserClient(), [])

  const [boot, setBoot] = useState<BootState>("loading")
  const [draft, setDraft] = useState<EntryDraft>(EMPTY_ENTRY_DRAFT)
  const [today, setToday] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setToday(localToday())
  }, [])

  useEffect(() => {
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.replace("/login?return=/onboarding/locality")
        return
      }

      try {
        const statusRes = await fetch("/api/onboarding/status", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (statusRes.ok) {
          const status = (await statusRes.json()) as { localityMember?: boolean }
          if (status.localityMember) {
            router.replace("/community")
            return
          }
        }
      } catch {
        // Falha ao ler o estado não impede preencher a entrada; o servidor
        // continua sendo quem decide o vínculo no `provision`.
      }

      const stored = readEntryDraft(window.sessionStorage)
      const suggested = window.sessionStorage.getItem(SUGGESTED_NAME_KEY)
      window.sessionStorage.removeItem(SUGGESTED_NAME_KEY)

      const name =
        stored?.name && stored.name.trim().length > 0
          ? stored.name
          : (suggested ?? suggestedNameFrom(session))

      setDraft({
        ...(stored ?? EMPTY_ENTRY_DRAFT),
        name: name.slice(0, 80),
      })
      setBoot("ready")
    }
    run()
  }, [router, supabase])

  // O rascunho acompanha o formulário: recarregar a página não apaga o que já
  // foi digitado. É o "entryCityDraft" do protótipo, que lá vive só em memória.
  useEffect(() => {
    if (boot !== "ready") return
    writeEntryDraft(window.sessionStorage, draft)
  }, [boot, draft])

  const update = (patch: Partial<EntryDraft>) => {
    setError("")
    setDraft((current) => ({ ...current, ...patch }))
  }

  const fail = (message: string, fieldId: string) => {
    setError(message)
    const field = document.getElementById(fieldId)
    if (field instanceof HTMLElement) field.focus()
  }

  const finish = async () => {
    if (submitting) return
    setError("")

    const city = draft.city
    const destination = draft.destination
    const name = draft.name.trim().replace(/\s+/g, " ")
    const leaving = draft.moment === "leaving"

    // As quatro validações de `entryFinish`, na mesma ordem e com as mesmas
    // frases.
    if (!city) return fail("Escolha sua cidade.", "en-city")
    if (draft.moment === "arriving" && !draft.arrivalDate) {
      return fail("Informe a data de chegada.", "en-date")
    }
    if (leaving && !draft.departureDate) {
      return fail("Informe a data da saída.", "en-date")
    }
    if (leaving && (!destination || destination.ibgeCode === city.ibgeCode)) {
      return fail("Escolha um destino diferente da sua cidade atual.", "en-dest")
    }
    if (name.length < 2) return fail("Informe como você quer ser chamado.", "en-name")

    setSubmitting(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.replace("/login?return=/onboarding/locality")
        return
      }

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "provision",
          ibge_code: city.ibgeCode,
          display_name: name,
          moment: draft.moment,
          arrival_date: draft.moment === "arriving" ? draft.arrivalDate : undefined,
          departure_date: leaving ? draft.departureDate : undefined,
          destination_ibge_code: leaving ? destination?.ibgeCode : undefined,
        }),
      })

      if (response.status === 409) {
        setError("Sua entrada já foi concluída em outra aba. Recarregue a página para continuar.")
        return
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setError(provisionErrorMessage(body.error))
        return
      }

      clearEntryDraft(window.sessionStorage)
      router.replace("/onboarding/welcome")
    } catch {
      setError("Não foi possível concluir sua entrada. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  if (boot === "loading") {
    return (
      <EntryShell>
        <div className="en-form">
          <p className="en-sub" role="status">
            Preparando sua entrada...
          </p>
        </div>
      </EntryShell>
    )
  }

  const leaving = draft.moment === "leaving"

  return (
    <EntryShell>
      <div className="en-form">
        <EntrySteps label="Cidade" step={3} />
        <h1 className="en-h1">Onde e em que momento?</h1>

        <CityPicker
          disabled={submitting}
          id="en-city"
          label="Cidade"
          listLabel="Cidades disponíveis"
          onChange={(city) => update({ city })}
          value={draft.city}
        />
        <p className="en-sub">Isso não publica seu endereço.</p>

        <p className="en-lbl" id="en-mode-l">
          Seu momento
        </p>
        <div aria-labelledby="en-mode-l" className="en-seg" role="radiogroup">
          {ENTRY_MOMENT_OPTIONS.map((option) => (
            <label key={option.value}>
              <input
                checked={draft.moment === option.value}
                disabled={submitting}
                name="en-mode"
                onChange={() => update({ moment: option.value })}
                type="radio"
                value={option.value}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <p className="en-sub">
          Muda o que aparece primeiro: plano de chegada, turma ou anúncios de quem sai.
        </p>

        {draft.moment === "resident" ? null : (
          <>
            <label className="en-date" htmlFor="en-date">
              <span>{leaving ? "Data da saída" : "Data de chegada"}</span>
              <input
                disabled={submitting}
                id="en-date"
                min={today.length > 0 ? today : undefined}
                onChange={(event) => {
                  const value = event.target.value
                  update(leaving ? { departureDate: value } : { arrivalDate: value })
                }}
                type="date"
                value={leaving ? draft.departureDate : draft.arrivalDate}
              />
            </label>

            {leaving ? (
              <CityPicker
                disabled={submitting}
                excludeIbgeCode={draft.city?.ibgeCode}
                id="en-dest"
                label="Destino da transferência"
                listLabel="Cidades de destino"
                onChange={(city) => update({ destination: city })}
                value={draft.destination}
              />
            ) : null}
          </>
        )}

        <MaterialOutlinedTextField
          autocomplete="name"
          disabled={submitting}
          id="en-name"
          label="Como você quer ser chamado"
          maxlength={80}
          minlength={2}
          onChange={(value) => update({ name: value })}
          required
          value={draft.name}
        />

        <EntryError id="en-err">{error}</EntryError>

        <MaterialFilledButton disabled={submitting} onClick={() => void finish()}>
          {submitting ? "Concluindo..." : "Concluir minha entrada"}
        </MaterialFilledButton>
      </div>
    </EntryShell>
  )
}
