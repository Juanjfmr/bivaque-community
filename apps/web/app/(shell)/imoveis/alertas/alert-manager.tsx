"use client"

import { Bell, Pencil, Trash2, X } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useEffect, useRef, useState, useTransition } from "react"
import {
  deleteListingAlertAction,
  setListingAlertActiveAction,
  updateListingAlertAction,
} from "../../../../lib/listings/actions"
import {
  alertCriteriaLabel,
  alertSearchHref,
  alertStatusLabel,
  alertValueLabel,
  type ListingAlert,
} from "../../../../lib/listings/alerts"
import { formatMoney } from "../../../../lib/listings/costs"
import { BEDROOM_OPTIONS, MAX_VALUE_OPTIONS } from "../../../../lib/listings/filters"
import { Card } from "../../../components/bivaque/card"
import { EmptyState } from "../../../components/bivaque/empty-state"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"

export interface AlertLocalityOption {
  id: string
  label: string
}

const controlClass =
  "min-h-11 w-full rounded-xl border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors duration-[var(--semantic-motion-duration-instant)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"

const actionClass =
  "flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] disabled:opacity-60"

// RECON-028 — prancha 65, painel 2. "Meus alertas" com o painel lateral de
// edição. Cada ação chama a Server Action real; a mensagem vem do resultado do
// servidor, nunca de um toast de fachada. A lista em si vem do servidor por RLS.
export function AlertManager({
  alerts,
  localities,
}: {
  alerts: ListingAlert[]
  localities: AlertLocalityOption[]
}) {
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const editing = alerts.find((alert) => alert.id === editingId) ?? null

  useEffect(() => {
    if (editingId === null) return
    const target = panelRef.current?.querySelector<HTMLElement>("select, input, button")
    target?.focus()
  }, [editingId])

  useEffect(() => {
    if (editingId === null) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setEditingId(null)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [editingId])

  function run(
    action: () => Promise<{ ok: boolean; message?: string }>,
    id: string,
    close = false,
  ) {
    setBusyId(id)
    startTransition(async () => {
      const result = await action()
      setBusyId(null)
      setMessage({
        ok: result.ok,
        text: result.message ?? (result.ok ? "Feito." : "Não foi possível agora."),
      })
      if (result.ok) {
        if (close) setEditingId(null)
        router.refresh()
      }
    })
  }

  function toggle(alert: ListingAlert) {
    const formData = new FormData()
    formData.set("alertId", alert.id)
    formData.set("active", String(!alert.isActive))
    run(() => setListingAlertActiveAction(formData), alert.id)
  }

  function remove(alert: ListingAlert) {
    const formData = new FormData()
    formData.set("alertId", alert.id)
    run(() => deleteListingAlertAction(formData), alert.id)
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const alertId = String(formData.get("alertId") ?? "")
    run(() => updateListingAlertAction(formData), alertId, true)
  }

  if (alerts.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          title="Você ainda não tem alertas"
          description="Salve uma busca em Explorar moradia para receber avisos quando surgir um imóvel novo."
          action={
            <Link
              href={"/imoveis" as Route}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors duration-[var(--semantic-motion-duration-instant)]"
            >
              Buscar imóveis
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-4">
      {message ? (
        <FeedbackAlert
          variant={message.ok ? "success" : "danger"}
          description={message.text}
          onClose={() => setMessage(null)}
        />
      ) : null}

      <ul className="space-y-3">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <Card className="p-4">
              <div className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--semantic-selected)] text-[var(--semantic-action-primary)]"
                >
                  <Bell size={20} />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <Link
                    href={alertSearchHref(alert) as Route}
                    className="inline-flex min-h-11 items-center text-base font-semibold underline-offset-2 transition-colors duration-[var(--semantic-motion-duration-instant)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                  >
                    {alert.name}
                  </Link>
                  <p className="text-sm text-muted">{alertCriteriaLabel(alert)}</p>
                  <p className="text-xs text-muted">{alertStatusLabel(alert)}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={alert.isActive}
                  aria-label={`${alert.isActive ? "Desligar" : "Ligar"} o alerta ${alert.name}`}
                  disabled={pending && busyId === alert.id}
                  onClick={() => toggle(alert)}
                  className={`relative inline-flex h-11 w-14 shrink-0 items-center rounded-full border border-border px-1 transition-colors duration-[var(--semantic-motion-duration-instant)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] disabled:opacity-60 ${
                    alert.isActive
                      ? "bg-[var(--semantic-action-primary)]"
                      : "bg-[var(--semantic-surface)]"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-7 w-7 rounded-full bg-[var(--semantic-surface)] shadow transition-transform duration-[var(--semantic-motion-duration-instant)] ${
                      alert.isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={pending && busyId === alert.id}
                  onClick={() => setEditingId(alert.id)}
                  className={actionClass}
                >
                  <Pencil size={16} aria-hidden="true" />
                  Editar
                </button>
                <button
                  type="button"
                  disabled={pending && busyId === alert.id}
                  onClick={() => remove(alert)}
                  className={`${actionClass} text-[var(--semantic-danger)]`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Excluir
                </button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {editing ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Fechar o painel de edição"
            className="absolute inset-0 bg-black/30 transition-colors duration-[var(--semantic-motion-duration-instant)]"
            onClick={() => setEditingId(null)}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="alerta-painel-titulo"
            className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-[var(--semantic-surface)] p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 id="alerta-painel-titulo" className="text-lg font-semibold">
                Editar alerta
              </h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setEditingId(null)}
                className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={submitEdit} className="mt-6 space-y-4">
              <input type="hidden" name="alertId" value={editing.id} />
              <input type="hidden" name="tipo_negocio" value={editing.deal ?? ""} />

              <div className="space-y-1">
                <label htmlFor="alerta-cidade" className="text-sm font-medium">
                  Cidade
                </label>
                <select
                  id="alerta-cidade"
                  name="localityId"
                  defaultValue={editing.localityId ?? ""}
                  className={controlClass}
                >
                  <option value="">Qualquer cidade</option>
                  {localities.map((locality) => (
                    <option key={locality.id} value={locality.id}>
                      {locality.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="alerta-bairro" className="text-sm font-medium">
                  Bairro
                </label>
                <input
                  id="alerta-bairro"
                  name="bairro"
                  defaultValue={editing.neighborhood ?? ""}
                  placeholder="Todos os bairros"
                  className={controlClass}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="alerta-valor" className="text-sm font-medium">
                  {alertValueLabel(editing.deal)}
                </label>
                <select
                  id="alerta-valor"
                  name="valor_max"
                  defaultValue={
                    editing.maxValueCents !== null ? String(editing.maxValueCents / 100) : ""
                  }
                  className={controlClass}
                >
                  <option value="">Sem teto</option>
                  {MAX_VALUE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      Até {formatMoney(value * 100)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="alerta-quartos" className="text-sm font-medium">
                  Quartos
                </label>
                <select
                  id="alerta-quartos"
                  name="quartos"
                  defaultValue={editing.minBedrooms !== null ? String(editing.minBedrooms) : ""}
                  className={controlClass}
                >
                  <option value="">Qualquer número</option>
                  {BEDROOM_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}+ quartos
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={pending}
                className="min-h-11 w-full rounded-xl bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors duration-[var(--semantic-motion-duration-instant)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] disabled:opacity-60"
              >
                Salvar alterações
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="min-h-11 w-full rounded-xl text-sm font-medium underline-offset-2 transition-colors duration-[var(--semantic-motion-duration-instant)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
