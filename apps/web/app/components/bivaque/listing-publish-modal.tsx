"use client"

import {
  LISTING_PROPERTY_MAX_PHOTOS,
  LISTING_PROPERTY_TYPE_LABELS,
  LISTING_PROPERTY_TYPES,
  type ListingPropertyType,
} from "@bivaque/domain"
import { Modal } from "@heroui/react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { publishPropertyListing, setListingStatus } from "../../../lib/listings/actions"
import { condoFooterLabel, formatBrl, specsLabelLike } from "../../../lib/listings/format"
import { uploadPropertyFiles } from "../../../lib/listings/media-client"
import { validatePropertyNumbers } from "../../../lib/listings/validation"
import styles from "./listing-cards.module.css"
import { ListingPropertyOptions } from "./listing-property-options"

// FIGMA-002 — publicação de imóvel nas pranchas property-publish e
// property-review. O passo de revisão é SOMENTE cliente: nada é gravado antes
// do confirmar ("O conteúdo só será salvo quando você confirmar"). A escrita
// real (draft -> active + fotos com EXIF removido) acontece na server action.

interface AudienceOption {
  value: string
  label: string
}

interface ListingPublishModalProps {
  audienceOptions: AudienceOption[]
  cityName: string
}

interface FormState {
  title: string
  propertyType: ListingPropertyType
  neighborhood: string
  rentReais: string
  condoReais: string
  bedrooms: string
  bathrooms: string
  parkingSpots: string
  areaM2: string
  availableFrom: string
  isFurnished: boolean
  acceptsPets: boolean
  condoIncluded: boolean
  description: string
  audience: string
}

const INITIAL: FormState = {
  title: "",
  propertyType: "apartamento",
  neighborhood: "",
  rentReais: "",
  condoReais: "",
  bedrooms: "",
  bathrooms: "",
  parkingSpots: "",
  areaM2: "",
  availableFrom: "",
  isFurnished: false,
  acceptsPets: false,
  condoIncluded: false,
  description: "",
  audience: "",
}

export function ListingPublishModal({ audienceOptions, cityName }: ListingPublishModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"form" | "review">("form")
  const [values, setValues] = useState<FormState>({
    ...INITIAL,
    audience: audienceOptions[0]?.value ?? "",
  })
  const [photos, setPhotos] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  useEffect(() => {
    const first = photos[0]
    if (!first) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(first)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photos])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function validate(): string | null {
    const numericError = validatePropertyNumbers({
      rent_reais: values.rentReais,
      condo_reais: values.condoReais,
      bedrooms: values.bedrooms,
      bathrooms: values.bathrooms,
      parking_spots: values.parkingSpots,
      area_m2: values.areaM2,
      available_from: values.availableFrom,
    })
    if (numericError) return numericError
    if (
      values.description.trim() &&
      (values.description.trim().length < 10 || values.description.trim().length > 2000)
    )
      return "A descrição precisa ter entre 10 e 2000 caracteres."
    if (
      photos.some(
        (photo) =>
          !["image/jpeg", "image/png", "image/webp"].includes(photo.type) ||
          photo.size > 10 * 1024 * 1024,
      )
    )
      return "Use fotos JPEG, PNG ou WebP de até 10 MB."
    if (values.title.trim().length < 3 || values.title.trim().length > 80) {
      return "Informe um título entre 3 e 80 caracteres."
    }
    if (values.neighborhood.trim().length < 2) {
      return "Informe o bairro (sem endereço, número ou complemento)."
    }
    if (!values.audience) return "Escolha quem pode ver o anúncio."
    if (photos.length > LISTING_PROPERTY_MAX_PHOTOS) {
      return `Um anúncio de imóvel aceita no máximo ${LISTING_PROPERTY_MAX_PHOTOS} fotos.`
    }
    return null
  }

  async function handlePublish(saveDraft = false) {
    const invalid = validate()
    if (invalid) {
      setError(invalid)
      return
    }
    setSubmitting(true)
    setError(null)
    const form = new FormData()
    form.set("title", values.title.trim())
    form.set("property_type", values.propertyType)
    form.set("neighborhood", values.neighborhood.trim())
    form.set("rent_reais", values.rentReais)
    form.set("condo_reais", values.condoReais)
    form.set("bedrooms", values.bedrooms)
    form.set("bathrooms", values.bathrooms)
    form.set("parking_spots", values.parkingSpots)
    form.set("area_m2", values.areaM2)
    form.set("available_from", values.availableFrom)
    if (values.isFurnished) form.set("is_furnished", "on")
    if (values.acceptsPets) form.set("accepts_pets", "on")
    if (values.condoIncluded) form.set("condo_included", "on")
    form.set("description", values.description.trim())
    form.set("audience", values.audience)
    if (photos.length || saveDraft) form.set("defer_activation", "on")

    let result: Awaited<ReturnType<typeof publishPropertyListing>> = { ok: false, error: null }
    try {
      result = await publishPropertyListing(form)
      if (result.ok && result.listingId && photos.length) {
        const uploaded = await uploadPropertyFiles(result.listingId, photos)
        if (!uploaded.ok) result = { ...result, ok: false, error: uploaded.error }
        else if (!saveDraft) {
          const activation = new FormData()
          activation.set("listing_id", result.listingId)
          activation.set("status", "active")
          const published = await setListingStatus(activation)
          if (!published.ok) result = { ...result, ok: false, error: published.error }
        }
      }
    } catch {
      setSubmitting(false)
      if (result.listingId) {
        router.push(`/imoveis/${result.listingId}/editar?retomada=1`)
        return
      }
      setError(
        saveDraft
          ? "Não foi possível salvar o rascunho. Seus campos foram mantidos; tente novamente."
          : "Não foi possível confirmar a publicação. Seus campos foram mantidos; tente novamente.",
      )
      return
    }
    setSubmitting(false)
    if (result.listingId && result.ok) {
      router.push(
        saveDraft
          ? `/imoveis/${result.listingId}/editar?rascunho=1`
          : `/imoveis/${result.listingId}`,
      )
      return
    }
    if (result.listingId) {
      // Rascunho gravado, publicação ou fotos pendentes: retoma na edição.
      router.push(`/imoveis/${result.listingId}/editar?retomada=1`)
      return
    }
    setError(result.error ?? "Não foi possível publicar agora.")
  }

  const rentCents =
    values.rentReais.trim() === ""
      ? null
      : Math.round(Number(values.rentReais.replace(",", ".")) * 100)
  const condoCents =
    values.condoReais.trim() === ""
      ? null
      : Math.round(Number(values.condoReais.replace(",", ".")) * 100)

  return (
    <>
      <button type="button" className={styles["primaryButton"]} onClick={() => setOpen(true)}>
        {/* Prancha property-list: "Anunciar imóvel" abre com o sinal de mais.
            Decorativo — o nome acessível continua sendo o rótulo do botão. */}
        <svg
          className={styles["buttonIcon"]}
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Anunciar imóvel
      </button>
      {open ? (
        <Modal
          isOpen
          onOpenChange={(value) => {
            if (!submitting) setOpen(value)
          }}
        >
          <Modal.Backdrop>
            <Modal.Container
              size="lg"
              className={
                (step === "form" ? styles["publishContainer"] : styles["reviewContainer"]) ?? ""
              }
            >
              <Modal.Dialog
                aria-label={step === "form" ? "Publicar imóvel" : "Confira antes de publicar"}
              >
                <Modal.Header className={styles["modalHeader"] ?? ""}>
                  <Modal.Heading>
                    {step === "form" ? "Publicar imóvel" : "Confira antes de publicar"}
                  </Modal.Heading>
                  <Modal.CloseTrigger
                    isDisabled={submitting}
                    className={styles["editClose"] ?? ""}
                  />
                </Modal.Header>
                <Modal.Body className={styles["modalBody"] ?? ""}>
                  {step === "form" ? (
                    <>
                      <p className={styles["subtitle"]}>{cityName}</p>
                      <label className={styles["fieldLabel"]}>
                        Título
                        <input
                          className={styles["fieldInput"]}
                          value={values.title}
                          aria-label="Título"
                          onChange={(event) => set("title", event.target.value)}
                          placeholder="Ex.: apartamento com varanda"
                        />
                      </label>
                      <div className={styles["formGrid"]}>
                        <label className={styles["fieldLabel"]}>
                          Tipo de imóvel
                          <select
                            className={styles["fieldInput"]}
                            value={values.propertyType}
                            aria-label="Tipo de imóvel"
                            onChange={(event) =>
                              set("propertyType", event.target.value as ListingPropertyType)
                            }
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
                      </div>
                      <ListingPropertyOptions values={values} onChange={set} />
                      <label className={styles["fieldLabel"]}>
                        Descrição
                        <textarea
                          className={styles["fieldTextarea"]}
                          value={values.description}
                          aria-label="Descrição"
                          onChange={(event) => set("description", event.target.value)}
                          placeholder="Conte os detalhes que ajudam alguém a decidir."
                        />
                      </label>
                      <label className={styles["fieldLabel"]}>
                        Quem pode ver
                        <select
                          className={styles["fieldInput"]}
                          value={values.audience}
                          aria-label="Quem pode ver"
                          onChange={(event) => set("audience", event.target.value)}
                        >
                          {audienceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className={styles["fieldLabel"]}>
                        Fotos (opcional, até {LISTING_PROPERTY_MAX_PHOTOS})
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className={styles["fieldInput"]}
                          onChange={(event) => {
                            const files = Array.from(event.target.files ?? [])
                            setPhotos(files)
                          }}
                        />
                      </label>
                      <span className={styles["fieldHint"]}>
                        {photos.length} de {LISTING_PROPERTY_MAX_PHOTOS} fotos selecionadas.
                      </span>
                      {error ? <span className={styles["fieldHint"]}>{error}</span> : null}
                      <div className={styles["actionRow"]}>
                        <button
                          type="button"
                          className={styles["secondaryButton"]}
                          disabled={submitting}
                          onClick={() => {
                            setOpen(false)
                            setStep("form")
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className={styles["secondaryButton"]}
                          disabled={submitting}
                          onClick={() => {
                            void handlePublish(true)
                          }}
                        >
                          {submitting ? "Salvando…" : "Salvar rascunho"}
                        </button>
                        <button
                          type="button"
                          className={styles["primaryButton"]}
                          disabled={submitting}
                          onClick={() => {
                            const invalid = validate()
                            if (invalid) {
                              setError(invalid)
                              return
                            }
                            setError(null)
                            setStep("review")
                          }}
                        >
                          Revisar publicação
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className={styles["reviewNote"]}>
                        O conteúdo só será salvo quando você confirmar.
                      </p>
                      <div className={styles["reviewCard"]}>
                        <span className={styles["cardCover"]}>
                          {previewUrl ? (
                            <Image
                              unoptimized
                              width={1200}
                              height={750}
                              src={previewUrl}
                              alt="Prévia da foto de capa"
                            />
                          ) : (
                            <span className={styles["cardCoverPlaceholder"]}>
                              <span>
                                <span className={styles["reviewEmptyTitle"]}>Sem fotos ainda</span>
                                Adicione até {LISTING_PROPERTY_MAX_PHOTOS} fotos
                              </span>
                            </span>
                          )}
                          <span className={styles["cardTypeChip"]}>
                            {LISTING_PROPERTY_TYPE_LABELS[values.propertyType]}
                          </span>
                        </span>
                        <span className={styles["cardBody"]}>
                          <span className={styles["cardNeighborhood"]}>
                            {values.neighborhood.trim().toUpperCase()}
                          </span>
                          <span className={styles["cardTitle"]}>{values.title.trim()}</span>
                          {rentCents === null ? (
                            <span className={styles["cardSpecs"]}>Consultar anunciante</span>
                          ) : (
                            <span className={styles["cardPrice"]}>
                              {formatBrl(rentCents)}
                              <span className={styles["cardPriceSuffix"]}>/mês</span>
                            </span>
                          )}
                          <span className={styles["cardSpecs"]}>
                            {specsLabelLike(values.bedrooms, values.areaM2)}
                          </span>
                          <span className={styles["cardFooter"]}>
                            <span>{condoFooterLabel(condoCents)}</span>
                            <span className={styles["cardFooterAction"]}>Prévia</span>
                          </span>
                        </span>
                      </div>
                      {values.description.trim() ? (
                        <p className={styles["reviewDescription"]}>
                          <strong>{values.title.trim()}</strong>
                          {values.description.trim()}
                        </p>
                      ) : null}
                      {error ? <span className={styles["fieldHint"]}>{error}</span> : null}
                      <div className={styles["actionRow"]}>
                        <button
                          type="button"
                          className={styles["secondaryButton"]}
                          disabled={submitting}
                          onClick={() => setStep("form")}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className={styles["primaryButton"]}
                          disabled={submitting}
                          onClick={() => {
                            void handlePublish()
                          }}
                        >
                          {submitting ? "Publicando…" : "Publicar"}
                        </button>
                      </div>
                    </>
                  )}
                </Modal.Body>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}
    </>
  )
}
