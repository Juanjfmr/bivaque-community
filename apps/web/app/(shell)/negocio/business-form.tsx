"use client"

import {
  PROVIDER_CATEGORIES,
  PROVIDER_CATEGORY_LABELS,
  type ProviderCategory,
} from "@bivaque/domain"
import { Button, Input, TextArea } from "@heroui/react"
import { ArrowLeft, Building2, Eye, MapPin, Package, Pencil } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, type ReactNode, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { validateBio, validateCategory, validateDisplayName } from "../../../lib/providers/showcase"
import { createBrowserClient } from "../../../lib/supabase/client"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { ButtonLink, Button as UiButton } from "../../components/ui/button"
import { Eyebrow, Panel } from "../../components/ui/panel"

export type BusinessProfile = {
  id: string
  display_name: string
  category: ProviderCategory
  bio: string | null
}

export function BusinessForm({
  profile,
  children,
}: {
  profile: BusinessProfile | null
  children?: ReactNode
}) {
  const router = useRouter()
  const { current } = useLocalityContext()
  const [editing, setEditing] = useState(!profile)
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
        ...(values.bio ? { p_bio: values.bio } : {}),
      })
      if (updateError) {
        setError(
          "Não foi possível salvar agora. Seus dados continuam preenchidos; tente novamente.",
        )
        setSaving(false)
        return
      }
      setSaved(true)
      setEditing(false)
      setSaving(false)
      router.refresh()
      return
    }

    const { data: providerId, error: createError } = await supabase.rpc(
      "create_member_business_page",
      {
        p_display_name: values.display_name,
        p_category: values.category,
        ...(values.bio ? { p_bio: values.bio } : {}),
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
    setEditing(false)
    setSaving(false)
    router.replace("/negocio" as Route)
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-[72rem] flex-1 px-4 pt-4 pb-8 sm:pt-6 sm:pb-10 lg:px-8">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <Link
            href="/profile"
            className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-ui px-2 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Perfil
          </Link>
          <Eyebrow>Seu espaço em Serviços</Eyebrow>
          <h1 className="mt-1 text-2xl leading-tight font-semibold tracking-tight text-ui-ink sm:text-[28px]">
            {profile ? "Seu negócio" : "Crie a página do seu negócio"}
          </h1>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-ui-ink-2 sm:text-base">
            {profile
              ? "Mantenha sua apresentação, seus serviços e suas fotos atualizados."
              : `Apresente seu trabalho e ajude quem procura serviços em ${current.cityName}.`}
          </p>
        </div>
        {profile ? (
          <ButtonLink
            href={`/prestadores/${profile.id}`}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            <Eye size={17} aria-hidden="true" />
            Ver página pública
          </ButtonLink>
        ) : null}
      </div>

      {profile && !editing ? (
        <div className="space-y-5">
          {saved ? <FeedbackAlert variant="success" description="Sua página foi salva." /> : null}
          <Panel bodyClassName="p-5 sm:p-8">
            <div className="flex flex-wrap items-start gap-4 sm:gap-6">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-ui-lg bg-ui-brand-soft text-ui-brand sm:h-20 sm:w-20">
                <Building2 size={32} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ui-brand">
                  {PROVIDER_CATEGORY_LABELS[profile.category]}
                </p>
                <h2 className="mt-1 break-words text-2xl font-semibold tracking-tight text-ui-ink sm:text-3xl">
                  {profile.display_name}
                </h2>
                {profile.bio ? (
                  <p className="mt-4 max-w-prose whitespace-pre-line [overflow-wrap:anywhere] text-base leading-relaxed text-ui-ink-2">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-ui-ink-2">
                    Conte o que você oferece para ajudar as pessoas a escolher seu negócio.
                  </p>
                )}
              </div>
              <UiButton
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => {
                  setSaved(false)
                  setEditing(true)
                }}
              >
                <Pencil size={16} aria-hidden="true" />
                Editar informações
              </UiButton>
            </div>
          </Panel>
          {children}
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)] lg:gap-6">
          <Panel
            title={profile ? "Editar informações" : "Comece pela apresentação"}
            titleId="business-form-title"
            action={
              profile ? (
                <Link
                  href={"/negocio/catalogo" as Route}
                  className="inline-flex min-h-11 items-center gap-2 rounded-ui px-2 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
                >
                  <Package size={16} aria-hidden="true" />
                  <span className="hidden sm:inline">Catálogo e fotos</span>
                  <span className="sm:hidden">Catálogo</span>
                </Link>
              ) : null
            }
            bodyClassName="space-y-5 p-4 sm:p-5"
          >
            <p className="text-sm leading-relaxed text-ui-ink-2">
              {profile
                ? "Você pode atualizar essas informações quando quiser."
                : "Conte às pessoas da sua cidade o que você faz e como pode ajudar."}
            </p>

            {error ? <FeedbackAlert variant="danger" description={error} /> : null}
            {saved ? <FeedbackAlert variant="success" description="Sua página foi salva." /> : null}

            <form onSubmit={(event) => void save(event)} className="space-y-5">
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
                  <span>
                    {profile
                      ? "Página gratuita do seu negócio"
                      : `Alcance gratuito em ${current.cityName}`}
                  </span>
                </div>
                {profile ? (
                  <UiButton
                    variant="ghost"
                    disabled={saving}
                    onClick={() => {
                      setName(profile.display_name)
                      setCategory(profile.category)
                      setBio(profile.bio ?? "")
                      setError("")
                      setEditing(false)
                    }}
                  >
                    Cancelar
                  </UiButton>
                ) : null}
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
          </Panel>

          <aside className="space-y-5">
            <Panel
              title="Prévia da página"
              titleId="business-preview-title"
              action={
                <span className="rounded-full bg-ui-brand-soft px-2.5 py-1 text-xs font-semibold text-ui-brand">
                  Visão dos membros
                </span>
              }
              bodyClassName="p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ui-brand-soft text-ui-brand">
                  <Building2 size={22} aria-hidden="true" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="break-words font-semibold text-ui-ink">
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
                <MapPin size={16} aria-hidden="true" className="text-ui-brand" />
                {profile ? "Página do negócio" : `${current.cityName}, ${current.stateCode}`}
              </div>
            </Panel>

            <Panel
              title="Onde sua página aparece"
              titleId="business-reach-title"
              bodyClassName="p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ui-brand-soft text-ui-brand">
                  <MapPin size={17} aria-hidden="true" />
                </span>
                <p className="text-sm leading-relaxed text-ui-ink-2">
                  {profile
                    ? "Sua página aparece em Serviços enquanto você participa da cidade em que criou o negócio."
                    : `Membros de ${current.cityName}, ${current.stateCode} podem encontrar sua página em Serviços.`}{" "}
                  Criar e manter sua página é gratuito.
                </p>
              </div>
            </Panel>
          </aside>
        </div>
      )}
    </div>
  )
}
