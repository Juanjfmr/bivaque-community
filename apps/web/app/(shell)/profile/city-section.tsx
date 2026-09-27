"use client"

import { MapPin } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useId, useState, useTransition } from "react"
import { defaultTermDate, maxTermDate, validateMove } from "../../../lib/locality/move-city"
import { useLocalityContext } from "../../../lib/locality-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import type { CityOption } from "../../(preauth)/onboarding/locality/city-actions"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { showToast } from "../../components/bivaque/toast"
import { CityPicker } from "../../components/shell/city-picker"
import { Button } from "../../components/ui/button"
import { moveCityAction } from "./city-actions"

// "Sua cidade" no perfil (decisão do dono, 25/09/2026): a cidade deixa de ser
// fixa. Mudar usa a transferência que já existe no banco — a cidade atual fica
// "de saída" até a data escolhida (até lá você ainda lê e publica nela) e a
// nova passa a ser a sua. Só cidade: endereço nunca é pedido nem guardado.
//
// `?mudar=<id>` chega da consulta a outra cidade ("Vou me mudar para cá") e
// abre o formulário com o destino já escolhido.

function label(city: { cityName: string; stateCode: string }): string {
  return city.stateCode ? `${city.cityName}, ${city.stateCode}` : city.cityName
}

function formatDate(iso: string): string {
  if (!iso) return ""
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

type Destination = Pick<CityOption, "id" | "cityName" | "stateCode">

function usePresetDestination(currentId: string): Destination | null {
  const searchParams = useSearchParams()
  const presetId = searchParams.get("mudar")
  const [preset, setPreset] = useState<Destination | null>(null)

  useEffect(() => {
    if (!presetId || presetId === currentId) return
    let cancelled = false
    void createBrowserClient()
      .from("localities")
      .select("id, city_name, state_code")
      .eq("id", presetId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) {
          setPreset({ id: data.id, cityName: data.city_name, stateCode: data.state_code })
        }
      })
    return () => {
      cancelled = true
    }
  }, [presetId, currentId])

  return preset
}

export function CitySection() {
  const { current, outbound } = useLocalityContext()
  const router = useRouter()
  const preset = usePresetDestination(current.id)
  const [open, setOpen] = useState(false)
  const [destination, setDestination] = useState<Destination | null>(null)
  const [today] = useState(() => new Date())
  const [termDate, setTermDate] = useState(() => defaultTermDate(today))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const dateId = useId()

  useEffect(() => {
    if (preset) {
      setDestination(preset)
      setOpen(true)
    }
  }, [preset])

  const close = () => {
    setOpen(false)
    setDestination(null)
    setError(null)
  }

  const confirm = () => {
    if (!destination) return
    const invalid = validateMove(
      { destinationId: destination.id, currentId: current.id, termDate },
      new Date(),
    )
    if (invalid) {
      setError(invalid)
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await moveCityAction(destination.id, termDate)
      if (!result.ok) {
        setError(result.message)
        return
      }
      showToast({ title: `Sua cidade agora é ${result.cityName}`, variant: "success" })
      close()
      router.replace("/profile#cidade")
      router.refresh()
    })
  }

  return (
    <section
      id="cidade"
      aria-labelledby="cidade-titulo"
      className="scroll-mt-6 rounded-ui-lg border border-ui-line bg-ui-surface p-5 shadow-ui"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="cidade-titulo" className="text-base font-semibold text-ui-ink">
            Sua cidade
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ui-ink">
            <MapPin size={16} className="shrink-0 text-ui-brand" aria-hidden="true" />
            {label(current)}
          </p>
        </div>
        {open || outbound ? null : <Button onClick={() => setOpen(true)}>Mudar de cidade</Button>}
      </div>

      {outbound ? (
        <p className="mt-3 text-sm text-ui-ink-2">
          Você está saindo de {label(outbound)}
          {outbound.endsAt ? ` — participa de lá até ${formatDate(outbound.endsAt)}` : ""}. Uma nova
          mudança fica disponível depois desse prazo.
        </p>
      ) : null}

      {open ? (
        <div className="mt-4 space-y-4 border-t border-ui-line pt-4">
          {destination ? (
            <div className="flex items-center justify-between gap-3 rounded-ui bg-ui-bg px-3 py-2">
              <p className="text-sm text-ui-ink">
                Para <span className="font-semibold">{label(destination)}</span>
              </p>
              <button
                type="button"
                onClick={() => setDestination(null)}
                className="inline-flex min-h-11 items-center rounded-ui px-2 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
              >
                Trocar
              </button>
            </div>
          ) : (
            <CityPicker
              label="Para qual cidade você vai?"
              excludeIds={[current.id]}
              onPick={setDestination}
            />
          )}

          <div>
            <label htmlFor={dateId} className="block text-sm font-medium text-ui-ink">
              Até quando você participa de {current.cityName}?
            </label>
            <input
              id={dateId}
              type="date"
              value={termDate}
              min={today.toISOString().slice(0, 10)}
              max={maxTermDate(today)}
              onChange={(event) => setTermDate(event.target.value)}
              className="mt-1.5 min-h-11 rounded-ui border border-ui-line-strong bg-ui-surface px-3 text-sm text-ui-ink focus-visible:outline-2 focus-visible:outline-ui-brand"
            />
            <p className="mt-1 text-xs text-ui-ink-2">
              Até essa data você ainda lê e publica em {current.cityName}; depois, fica só leitura.
            </p>
          </div>

          <p className="text-xs text-ui-ink-2">
            Só a cidade. O Bivaque não pede nem guarda o seu endereço.
          </p>

          {error ? <FeedbackAlert variant="danger" description={error} /> : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="primary" onClick={confirm} disabled={!destination || pending}>
              {pending ? "Mudando…" : "Confirmar mudança"}
            </Button>
            <Button variant="ghost" onClick={close} disabled={pending}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
