"use client"

import { Check, MapPin, Pencil, Phone, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import {
  BUSINESS_DETAIL_LIMITS,
  type BusinessContactMode,
  type BusinessDetails,
  validateBusinessDetails,
} from "../../../lib/providers/business-details"
import { createBrowserClient } from "../../../lib/supabase/client"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { Button } from "../../components/ui/button"
import { Panel } from "../../components/ui/panel"

const CONTROL =
  "min-h-11 w-full rounded-ui border border-ui-line bg-ui-surface px-3 py-2 text-sm text-ui-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-brand"
const FIELDS = [
  {
    key: "neighborhood",
    label: "Bairro",
    hint: "Bairro onde seu negócio fica. O endereço completo não é necessário.",
    multiline: false,
  },
  {
    key: "service_area",
    label: "Área de atendimento",
    hint: "Ex.: toda Manaus, zona centro-sul ou atendimento on-line.",
    multiline: true,
  },
  {
    key: "opening_hours",
    label: "Horário de atendimento",
    hint: "Ex.: segunda a sexta, das 8h às 18h; sábado com agendamento.",
    multiline: true,
  },
] as const

export function BusinessDetailsEditor({
  providerId,
  initial,
}: {
  providerId: string
  initial: BusinessDetails
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initial)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(false)
    const invalid = validateBusinessDetails(value)
    if (invalid) {
      setError(invalid)
      return
    }
    setError("")
    setSaving(true)
    try {
      const { error: rpcError } = await createBrowserClient().rpc("save_business_page_details", {
        p_provider_id: providerId,
        p_neighborhood: value.neighborhood?.trim() || "",
        p_service_area: value.service_area?.trim() || "",
        p_opening_hours: value.opening_hours?.trim() || "",
        p_community_discount: value.community_discount?.trim() || "",
        p_contact_mode: value.contact_mode,
        p_contact_phone: value.contact_phone?.trim() || "",
        p_contact_is_public: value.contact_is_public,
      })
      if (rpcError) {
        setError(
          "Não foi possível salvar. Suas informações continuam preenchidas; tente novamente.",
        )
        return
      }
      setSaved(true)
      setEditing(false)
      router.refresh()
    } catch {
      setError("Não foi possível salvar. Suas informações continuam preenchidas; tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel
      title="Atendimento e contato"
      titleId="business-details-title"
      action={
        !editing ? (
          <Button
            variant="ghost"
            onClick={() => {
              setValue(initial)
              setSaved(false)
              setEditing(true)
            }}
          >
            <Pencil size={16} aria-hidden="true" />
            Editar detalhes
          </Button>
        ) : null
      }
      bodyClassName="p-5 sm:p-6"
    >
      {saved ? (
        <FeedbackAlert
          variant="success"
          description="Detalhes do negócio salvos."
          className="mb-4"
        />
      ) : null}
      {!editing ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <MapPin size={20} className="mt-0.5 shrink-0 text-ui-brand" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-ui-ink">Onde e quando você atende</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ui-ink-2 [overflow-wrap:anywhere]">
                {initial.neighborhood || "Bairro não informado"}
              </p>
              {initial.service_area ? (
                <p className="mt-1 whitespace-pre-line text-sm text-ui-ink-2 [overflow-wrap:anywhere]">
                  {initial.service_area}
                </p>
              ) : null}
              <p className="mt-2 whitespace-pre-line text-sm text-ui-ink-2 [overflow-wrap:anywhere]">
                {initial.opening_hours || "Horário não informado"}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Phone size={20} className="shrink-0 text-ui-brand" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-ui-ink">Contato escolhido</p>
                <p className="mt-1 text-sm text-ui-ink-2">
                  {initial.contact_mode === "app" || !initial.contact_is_public
                    ? "Conversa pelo Bivaque. Nenhum número é mostrado."
                    : initial.contact_mode === "whatsapp"
                      ? "WhatsApp visível aos membros que acessam sua página."
                      : "Telefone visível aos membros que acessam sua página."}
                </p>
                {initial.contact_phone ? (
                  <p className="mt-1 text-sm text-ui-ink-2">
                    {initial.contact_phone} {!initial.contact_is_public ? "(só você vê)" : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={(event) => void save(event)} className="space-y-5">
          {error ? <FeedbackAlert variant="danger" description={error} /> : null}
          <div className="grid gap-5 sm:grid-cols-2">
            {FIELDS.map(({ key, label, hint, multiline }) => (
              <div key={key} className="space-y-1.5">
                <label htmlFor={key} className="block text-sm font-semibold text-ui-ink">
                  {label} <span className="font-normal text-ui-ink-2">(opcional)</span>
                </label>
                {multiline ? (
                  <textarea
                    id={key}
                    value={value[key] ?? ""}
                    maxLength={BUSINESS_DETAIL_LIMITS[key]}
                    rows={3}
                    onChange={(event) => setValue((old) => ({ ...old, [key]: event.target.value }))}
                    className={CONTROL}
                    aria-describedby={`${key}-hint`}
                  />
                ) : (
                  <input
                    id={key}
                    value={value[key] ?? ""}
                    maxLength={BUSINESS_DETAIL_LIMITS[key]}
                    onChange={(event) => setValue((old) => ({ ...old, [key]: event.target.value }))}
                    className={CONTROL}
                    aria-describedby={`${key}-hint`}
                  />
                )}
                <p id={`${key}-hint`} className="text-xs leading-relaxed text-ui-ink-2">
                  {hint}
                </p>
              </div>
            ))}
          </div>
          <fieldset className="space-y-4 border-t border-ui-line pt-5">
            <legend className="px-1 text-sm font-semibold text-ui-ink">
              Como entrar em contato
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="contact-mode" className="block text-sm font-medium text-ui-ink">
                  Canal de contato
                </label>
                <select
                  id="contact-mode"
                  value={value.contact_mode}
                  className={CONTROL}
                  onChange={(event) =>
                    setValue((old) => ({
                      ...old,
                      contact_mode: event.target.value as BusinessContactMode,
                      contact_is_public:
                        event.target.value === "app" ? false : old.contact_is_public,
                    }))
                  }
                >
                  <option value="app">Conversa pelo Bivaque</option>
                  <option value="phone">Telefone</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="business-phone" className="block text-sm font-medium text-ui-ink">
                  Número de contato (opcional)
                </label>
                <input
                  id="business-phone"
                  type="tel"
                  autoComplete="tel"
                  value={value.contact_phone ?? ""}
                  maxLength={16}
                  className={CONTROL}
                  onChange={(event) =>
                    setValue((old) => ({ ...old, contact_phone: event.target.value }))
                  }
                  placeholder="+5592999999999"
                />
                <p className="text-xs text-ui-ink-2">
                  Inclua o DDD. Para WhatsApp, inclua também o código do país.
                </p>
              </div>
            </div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-ui bg-ui-subtle p-3">
              <input
                type="checkbox"
                checked={value.contact_is_public}
                disabled={value.contact_mode === "app"}
                onChange={(event) =>
                  setValue((old) => ({ ...old, contact_is_public: event.target.checked }))
                }
                className="mt-1 h-4 w-4 accent-ui-brand"
              />
              <span className="text-sm leading-relaxed text-ui-ink">
                Mostrar este número aos membros que podem ver minha página
                <span className="mt-1 block text-xs text-ui-ink-2">
                  Desmarcado, o número fica privado. Você pode mudar essa escolha depois.
                </span>
              </span>
            </label>
          </fieldset>
          <div className="flex flex-wrap justify-end gap-3 border-t border-ui-line pt-5">
            <Button
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setValue(initial)
                setError("")
                setEditing(false)
              }}
            >
              <X size={16} aria-hidden="true" />
              Cancelar detalhes
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              <Check size={16} aria-hidden="true" />
              {saving ? "Salvando…" : "Salvar detalhes"}
            </Button>
          </div>
        </form>
      )}
    </Panel>
  )
}
