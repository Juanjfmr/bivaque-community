"use client"

import {
  PROVIDER_CATEGORIES,
  PROVIDER_CATEGORY_LABELS,
  type ProviderCategory,
} from "@bivaque/domain"
import { Button, Input, TextArea } from "@heroui/react"
import { ArrowLeft, Building2, ExternalLink, Eye, MapPin, Package } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { validateBio, validateCategory, validateDisplayName } from "../../../lib/providers/showcase"
import { createBrowserClient } from "../../../lib/supabase/client"
import { Card } from "../../components/bivaque/card"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"

export type BusinessProfile = {
  id: string
  display_name: string
  category: ProviderCategory
  bio: string | null
}

export function BusinessForm({ profile }: { profile: BusinessProfile | null }) {
  const router = useRouter()
  const { current } = useLocalityContext()
  const [name, setName] = useState(profile?.display_name ?? "")
  const [category, setCategory] = useState(profile?.category ?? "")
  const [bio, setBio] = useState(profile?.bio ?? "")
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSaved(false)

    const checks = [
      validateDisplayName(name),
      validateCategory(category),
      validateBio(bio.trim() || null),
    ]
    const failed = checks.find((check) => !check.ok)
    if (failed && !failed.ok) {
      setError(failed.message)
      return
    }

    setSaving(true)
    const supabase = createBrowserClient()
    const values = {
      display_name: name.trim(),
      category: category as ProviderCategory,
      bio: bio.trim() || null,
    }

    if (profile) {
      const { error: updateError } = await supabase.rpc("update_member_business_page", {
        p_provider_id: profile.id,
        p_display_name: values.display_name,
        p_category: values.category,
        p_bio: values.bio,
      })
      if (updateError) {
        setError(
          "Não foi possível salvar agora. Seus dados continuam preenchidos; tente novamente.",
        )
        setSaving(false)
        return
      }
      setSaved(true)
      setSaving(false)
      router.refresh()
      return
    }

    const { data: providerId, error: createError } = await supabase.rpc(
      "create_member_business_page",
      {
        p_display_name: values.display_name,
        p_category: values.category,
        p_bio: values.bio,
      },
    )
    if (createError || !providerId) {
      setError(
        "Não foi possível criar sua página agora. Seus dados continuam preenchidos; tente novamente.",
      )
      setSaving(false)
      return
    }

    setSaved(true)
    setSaving(false)
    router.replace("/negocio" as Route)
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 pb-10 sm:pt-6">
      <Link
        href="/profile"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ui-brand transition-colors hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Perfil
      </Link>

      <header>
        <h1 className="text-xl leading-tight font-semibold tracking-tight text-ui-ink sm:text-2xl">
          {profile ? "Seu negócio" : "Crie a página do seu negócio"}
        </h1>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-ui-ink-2 sm:text-base">
          Apresente seu trabalho para quem vive em {current.cityName}. Sua página reúne seus
          serviços e fotos em um só lugar.
        </p>
      </header>

      <div className="space-y-4">
        <Card className="rounded-ui-lg p-4 shadow-ui ring-1 ring-ui-line sm:p-5">
          <div className="border-b border-ui-line pb-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-ui bg-ui-brand-soft text-ui-brand">
                <Building2 size={19} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-ui-ink">Informações do negócio</h2>
                <p className="mt-1 text-sm leading-relaxed text-ui-ink-2">
                  Você pode atualizar esses dados quando quiser.
                </p>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-4">
              <FeedbackAlert variant="danger" description={error} />
            </div>
          ) : null}
          {saved ? (
            <div className="mt-4">
              <FeedbackAlert variant="success" description="Sua página foi salva." />
            </div>
          ) : null}

          <form onSubmit={(event) => void save(event)} className="mt-5 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="business-name" className="block text-sm font-medium text-ui-ink">
                  Nome do negócio
                </label>
                <Input
                  id="business-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  maxLength={80}
                  required
                  aria-label="Nome do negócio"
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="business-category"
                  className="block text-sm font-medium text-ui-ink"
                >
                  Categoria
                </label>
                <select
                  id="business-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  required
                  className="min-h-11 w-full rounded-ui border border-ui-line bg-ui-surface px-3 text-sm text-ui-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-brand"
                >
                  <option value="" disabled>
                    Escolha uma categoria
                  </option>
                  {PROVIDER_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {PROVIDER_CATEGORY_LABELS[item]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="business-bio" className="block text-sm font-medium text-ui-ink">
                O que você oferece <span className="font-normal text-ui-ink-2">(opcional)</span>
              </label>
              <TextArea
                id="business-bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                maxLength={800}
                rows={4}
                placeholder="Conte como você pode ajudar quem mora na cidade"
                className="w-full"
              />
              <p className="text-right text-sm text-ui-ink-2">{bio.length}/800</p>
            </div>

            <div className="flex flex-col gap-3 border-t border-ui-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-ui-ink-2">
                <MapPin size={17} aria-hidden="true" className="shrink-0 text-ui-brand" />
                <span>Alcance gratuito em {current.cityName}</span>
              </div>
              <Button
                type="submit"
                variant="primary"
                isDisabled={saving}
                className="min-h-11 w-full sm:w-auto sm:min-w-48"
              >
                {saving ? "Salvando…" : profile ? "Salvar alterações" : "Criar minha página"}
              </Button>
            </div>
          </form>

          {profile ? (
            <div className="mt-4 flex flex-col gap-1 border-t border-ui-line pt-3 sm:flex-row sm:gap-5">
              <Link
                href={"/negocio/catalogo" as Route}
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ui-brand transition-colors hover:underline"
              >
                <Package size={16} aria-hidden="true" />
                Gerenciar catálogo e fotos
              </Link>
              <Link
                href={`/prestadores/${profile.id}` as Route}
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ui-brand transition-colors hover:underline"
              >
                <Eye size={16} aria-hidden="true" />
                Ver página pública <ExternalLink size={14} aria-hidden="true" />
              </Link>
            </div>
          ) : null}
        </Card>

        <aside className="space-y-4">
          <Card className="overflow-hidden rounded-ui-lg p-0 shadow-ui ring-1 ring-ui-line">
            <div className="flex items-center justify-between gap-3 border-b border-ui-line bg-ui-brand-soft px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-ui-ink">
                <Eye size={17} aria-hidden="true" />
                Prévia da página
              </div>
              <span className="rounded-full bg-ui-surface px-2.5 py-1 text-xs font-medium text-ui-ink-2">
                Só membros da cidade
              </span>
            </div>
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--semantic-surface-sunken)] text-[var(--semantic-action-primary)]">
                  <Building2 size={22} aria-hidden="true" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="break-words font-semibold">
                    {name.trim() || "Nome do seu negócio"}
                  </p>
                  <p className="mt-0.5 text-sm text-ui-ink-2">
                    {category
                      ? PROVIDER_CATEGORY_LABELS[category as ProviderCategory]
                      : "Categoria"}
                  </p>
                </div>
              </div>
              <p className="mt-4 min-h-10 text-sm leading-relaxed text-ui-ink-2">
                {bio.trim() || "Sua apresentação aparece aqui para quem encontrar sua página."}
              </p>
              <div className="mt-4 flex items-center gap-2 border-t border-ui-line pt-3 text-sm text-ui-ink-2">
                <MapPin size={16} aria-hidden="true" />
                {current.cityName}, {current.stateCode}
              </div>
            </div>
          </Card>

          <Card className="flex items-start gap-3 rounded-ui-lg bg-ui-brand-soft p-4 shadow-ui ring-1 ring-ui-line">
            <MapPin size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-ui-brand" />
            <div>
              <h2 className="text-sm font-semibold text-ui-ink">Onde sua página aparece</h2>
              <p className="mt-1 text-sm leading-relaxed text-ui-ink-2">
                Membros de {current.cityName}, {current.stateCode} podem encontrar sua página em
                Serviços. Criar e manter sua página é gratuito.
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
