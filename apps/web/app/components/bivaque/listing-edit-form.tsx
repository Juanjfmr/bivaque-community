"use client"

import {
  LISTING_PROPERTY_TYPE_LABELS,
  LISTING_PROPERTY_TYPES,
  type ListingPropertyType,
} from "@bivaque/domain"
import { useState } from "react"
import { setListingStatus, updatePropertyListing } from "../../../lib/listings/actions"
import styles from "./listing-cards.module.css"
import { ListingPropertyOptions } from "./listing-property-options"

// FIGMA-002 — edição na prancha property-edit: tudo muda EXCETO o público
// (D3: campo travado com o motivo visível). As transições de situação são
// formas próprias chamando setListingStatus — idempotentes no banco (pausar
// duas vezes não grava duas histórias).

export interface ListingEditInitial {
  title: string
  description: string
  propertyType: ListingPropertyType
  neighborhood: string
  rentReais: string
  condoReais: string
  iptuReais: string
  bedrooms: string
  bathrooms: string
  parkingSpots: string
  areaM2: string
  availableFrom: string
  isFurnished: boolean
  acceptsPets: boolean
  condoIncluded: boolean
}

interface ListingEditFormProps {
  listingId: string
  status: string
  audienceLabel: string
  initial: ListingEditInitial
}

const STATUS_ACTIONS: Record<string, Array<{ status: string; label: string; danger?: boolean }>> = {
  draft: [{ status: "active", label: "Publicar" }],
  active: [
    { status: "paused", label: "Pausar" },
    { status: "closed", label: "Encerrar", danger: true },
  ],
  paused: [
    { status: "active", label: "Reativar" },
    { status: "closed", label: "Encerrar", danger: true },
  ],
  reserved: [
    { status: "active", label: "Reativar" },
    { status: "closed", label: "Encerrar", danger: true },
  ],
  sold: [
    { status: "active", label: "Reativar" },
    { status: "closed", label: "Encerrar", danger: true },
  ],
  closed: [],
}

export function ListingEditForm({
  listingId,
  status,
  audienceLabel,
  initial,
}: ListingEditFormProps) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function set<K extends keyof ListingEditInitial>(key: K, value: ListingEditInitial[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const form = new FormData()
    form.set("listing_id", listingId)
    form.set("title", values.title)
    form.set("description", values.description)
    form.set("property_type", values.propertyType)
    form.set("neighborhood", values.neighborhood)
    form.set("rent_reais", values.rentReais)
    form.set("condo_reais", values.condoReais)
    // IPTU não aparece nas pranchas: o valor atual viaja escondido para o
    // update não apagar um custo informado anteriormente.
    form.set("iptu_reais", values.iptuReais)
    form.set("bedrooms", values.bedrooms)
    form.set("bathrooms", values.bathrooms)
    form.set("parking_spots", values.parkingSpots)
    form.set("area_m2", values.areaM2)
    form.set("available_from", values.availableFrom)
    if (values.isFurnished) form.set("is_furnished", "on")
    if (values.acceptsPets) form.set("accepts_pets", "on")
    if (values.condoIncluded) form.set("condo_included", "on")
    setSaved(false)
    try {
      const result = await updatePropertyListing(form)
      if (!result.ok) setError(result.error)
      else setSaved(true)
    } catch {
      setError("Não foi possível salvar. Seus campos foram mantidos; tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles["formGrid"]}>
      <label className={`${styles["fieldLabel"]} ${styles["formFull"]}`}>
        Título
        <input
          className={styles["fieldInput"]}
          value={values.title}
          aria-label="Título"
          onChange={(event) => set("title", event.target.value)}
        />
      </label>
      <label className={styles["fieldLabel"]}>
        Tipo de imóvel
        <select
          className={styles["fieldInput"]}
          value={values.propertyType}
          aria-label="Tipo de imóvel"
          onChange={(event) => set("propertyType", event.target.value as ListingPropertyType)}
        >
          {LISTING_PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {LISTING_PROPERTY_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>
      <label className={styles["fieldLabel"]}>
        Bairro
        <input
          className={styles["fieldInput"]}
          value={values.neighborhood}
          aria-label="Bairro"
          onChange={(event) => set("neighborhood", event.target.value)}
        />
      </label>
      <label className={styles["fieldLabel"]}>
        Aluguel mensal em reais
        <input
          className={styles["fieldInput"]}
          inputMode="decimal"
          value={values.rentReais}
          aria-label="Aluguel mensal em reais"
          onChange={(event) => set("rentReais", event.target.value)}
        />
      </label>
      <label className={styles["fieldLabel"]}>
        Condomínio em reais
        <input
          className={styles["fieldInput"]}
          inputMode="decimal"
          value={values.condoReais}
          aria-label="Condomínio em reais"
          onChange={(event) => set("condoReais", event.target.value)}
        />
      </label>
      <label className={styles["fieldLabel"]}>
        Quartos
        <input
          className={styles["fieldInput"]}
          inputMode="numeric"
          value={values.bedrooms}
          aria-label="Quartos"
          onChange={(event) => set("bedrooms", event.target.value)}
        />
      </label>
      <label className={styles["fieldLabel"]}>
        Banheiros
        <input
          className={styles["fieldInput"]}
          inputMode="numeric"
          value={values.bathrooms}
          aria-label="Banheiros"
          onChange={(event) => set("bathrooms", event.target.value)}
        />
      </label>
      <label className={styles["fieldLabel"]}>
        Vagas
        <input
          className={styles["fieldInput"]}
          inputMode="numeric"
          value={values.parkingSpots}
          aria-label="Vagas"
          onChange={(event) => set("parkingSpots", event.target.value)}
        />
      </label>
      <label className={styles["fieldLabel"]}>
        Área em m²
        <input
          className={styles["fieldInput"]}
          inputMode="decimal"
          value={values.areaM2}
          aria-label="Área em m²"
          onChange={(event) => set("areaM2", event.target.value)}
        />
      </label>
      <label className={`${styles["fieldLabel"]} ${styles["formFull"]}`}>
        Disponível a partir de
        <input
          className={styles["fieldInput"]}
          type="date"
          value={values.availableFrom}
          aria-label="Disponível a partir de"
          onChange={(event) => set("availableFrom", event.target.value)}
        />
      </label>
      <ListingPropertyOptions values={values} onChange={set} />
      <label className={`${styles["fieldLabel"]} ${styles["formFull"]}`}>
        Descrição
        <textarea
          className={styles["fieldTextarea"]}
          value={values.description}
          aria-label="Descrição"
          onChange={(event) => set("description", event.target.value)}
        />
      </label>
      <label className={`${styles["fieldLabel"]} ${styles["formFull"]}`}>
        Quem pode ver
        <select
          className={styles["fieldInput"]}
          value={audienceLabel}
          aria-label="Quem pode ver"
          disabled
        >
          <option>{audienceLabel}</option>
        </select>
        <span className={styles["fieldHint"]}>
          O público é escolhido na criação e não pode ser alterado (decisão D3).
        </span>
      </label>
      {error ? (
        <span role="alert" className={styles["fieldHint"]}>
          {error}
        </span>
      ) : null}
      {saved ? (
        <span role="status" className={styles["fieldHint"]}>
          Alterações salvas.
        </span>
      ) : null}
      <div className={`${styles["actionRow"]} ${styles["formFull"]}`}>
        <button
          type="button"
          className={styles["primaryButton"]}
          disabled={saving}
          onClick={() => {
            void handleSave()
          }}
        >
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
        {(STATUS_ACTIONS[status] ?? []).map((action) => (
          <form
            key={action.status}
            action={async (form) => {
              setSaving(true)
              setError(null)
              try {
                const result = await setListingStatus(form)
                if (!result.ok) setError(result.error)
              } catch {
                setError("Não foi possível mudar a situação. Tente novamente.")
              } finally {
                setSaving(false)
              }
            }}
          >
            <input type="hidden" name="listing_id" value={listingId} />
            <input type="hidden" name="status" value={action.status} />
            <button
              type="submit"
              disabled={saving}
              className={action.danger ? styles["dangerButton"] : styles["secondaryButton"]}
            >
              {action.label}
            </button>
          </form>
        ))}
      </div>
    </div>
  )
}
