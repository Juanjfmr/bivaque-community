"use client"

import { Button, Chip, SearchField, Tab, TabList, TabPanel, Tabs } from "@heroui/react"
import Link from "next/link"
import { type FormEvent, useMemo, useRef, useState } from "react"
import { Card } from "../../components/bivaque/card"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { requestCommunityMembershipAction } from "./actions"
import {
  type CommunityCard,
  filterCommunities,
  formatRequestedOn,
  type MyMembership,
  partitionCommunities,
} from "./communities-data"

const DISCOVER_PREVIEW_COUNT = 5

type CommunitiesScreenProps = {
  /** Comunidades da cidade em exibição (filtro aplicado na página-servidor). */
  localCommunities: CommunityCard[]
  /** Todas as minhas participações/pedidos, em qualquer cidade. */
  memberships: MyMembership[]
  /** Comunidades citadas pelas minhas participações, mesmo fora da cidade. */
  knownCommunities: CommunityCard[]
  viewingCityLabel: string | null
}

function CommunityGlyph({ className = "" }: { className?: string }) {
  // Glifo decorativo no lugar da foto: `communities` não tem coluna de imagem,
  // e chumbar uma foto seria inventar conteúdo (contrato RECON-004, forbidden).
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3 21h18" />
      <path d="M5 21V8l4-3v4l4-3v4l4-3v10" />
      <path d="M9 21v-3h2v3" />
    </svg>
  )
}

function PendingChip() {
  return (
    <Chip size="sm" color="warning" variant="soft">
      Em análise
    </Chip>
  )
}

function CommunityThumbnail({ large = false }: { large?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-lg bg-[var(--semantic-surface-sunken)] text-muted ${
        large ? "h-28 w-full rounded-xl" : "h-24 w-24"
      }`}
    >
      <CommunityGlyph className={large ? "h-10 w-10" : "h-8 w-8"} />
    </div>
  )
}

export function CommunitiesScreen({
  localCommunities,
  memberships,
  knownCommunities,
  viewingCityLabel,
}: CommunitiesScreenProps) {
  const [tab, setTab] = useState("minhas")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const { mine, pending, discover } = useMemo(() => {
    const knownById = new Map(knownCommunities.map((c) => [c.id, c]))
    for (const c of localCommunities) knownById.set(c.id, c)
    return partitionCommunities(localCommunities, memberships, knownById)
  }, [localCommunities, memberships, knownCommunities])

  const membershipByCommunity = useMemo(
    () => new Map(memberships.map((m) => [m.communityId, m])),
    [memberships],
  )

  const discoverFiltered = useMemo(() => filterCommunities(discover, query), [discover, query])
  const discoverVisible = expanded
    ? discoverFiltered
    : discoverFiltered.slice(0, DISCOVER_PREVIEW_COUNT)
  const selected = discover.find((c) => c.id === selectedId) ?? discoverVisible[0] ?? null
  const selectedStatus = selected ? membershipByCommunity.get(selected.id)?.status : undefined
  const selectedReason = selected ? (membershipByCommunity.get(selected.id)?.reason ?? null) : null
  const selectedRequestedOn = selected
    ? formatRequestedOn(membershipByCommunity.get(selected.id)?.joinedAt ?? "")
    : ""
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setSubmitError("")
    setSubmitting(true)
    try {
      await requestCommunityMembershipAction(new FormData(form))
      form.reset()
    } catch {
      setSubmitError("Não foi possível enviar o pedido agora. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Comunidades</h1>
      </header>

      <Tabs
        selectedKey={tab}
        onSelectionChange={(key) => {
          setTab(String(key))
          setSubmitError("")
        }}
        className="[&_[data-slot=tab]]:min-h-11 [&_[data-slot=tab]]:px-3"
      >
        <TabList aria-label="Seções de comunidades">
          <Tab key="minhas">Minhas comunidades</Tab>
          <Tab key="descobrir">Descobrir</Tab>
        </TabList>

        {tab === "minhas" && (
          <TabPanel key="minhas" className="pt-4">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <section aria-label="Minhas comunidades" className="flex flex-col gap-4">
                {mine.length === 0 ? (
                  <EmptyState
                    title="Você ainda não participa de nenhuma comunidade"
                    description="Descubra as comunidades da sua cidade e peça participação — ela depende de aprovação."
                    action={
                      <Button size="sm" variant="primary" onPress={() => setTab("descobrir")}>
                        Descobrir comunidades
                      </Button>
                    }
                  />
                ) : (
                  mine.map((community) => (
                    <Card key={community.id} className="p-4">
                      <div className="flex gap-4">
                        <CommunityThumbnail />
                        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                          <h2 className="text-base font-semibold tracking-tight">
                            {community.name}
                          </h2>
                          {community.cityLabel && (
                            <p className="text-sm text-muted">{community.cityLabel}</p>
                          )}
                          {community.description && (
                            <p className="text-sm leading-relaxed text-muted">
                              {community.description}
                            </p>
                          )}
                          <Link
                            href={`/communities/${community.id}`}
                            className="mt-1 inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-surface-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
                          >
                            Ver comunidade
                          </Link>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </section>

              {pending.length > 0 && (
                <aside aria-label="Seus pedidos" className="lg:sticky lg:top-20 lg:self-start">
                  <Card className="p-4">
                    <h2 className="text-base font-semibold tracking-tight">Seus pedidos</h2>
                    <ul className="mt-3 flex flex-col gap-4">
                      {pending.map((request) => (
                        <li key={request.communityId} className="flex flex-col gap-1">
                          <PendingChip />
                          <span className="text-sm font-medium">{request.name}</span>
                          {request.cityLabel && (
                            <span className="text-sm text-muted">{request.cityLabel}</span>
                          )}
                          {formatRequestedOn(request.requestedAt) && (
                            <span className="text-xs text-muted">
                              Solicitado em {formatRequestedOn(request.requestedAt)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs leading-relaxed text-muted">
                      Estes pedidos ainda estão em análise — você ainda não faz parte delas.
                    </p>
                  </Card>
                </aside>
              )}
            </div>
          </TabPanel>
        )}

        {tab === "descobrir" && (
          <TabPanel key="descobrir" className="pt-4">
            <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
              <section aria-label="Descobrir comunidades" className="flex flex-col gap-3">
                <SearchField
                  aria-label="Buscar comunidades"
                  value={query}
                  onChange={(value) => {
                    setQuery(value)
                    setExpanded(false)
                  }}
                  onClear={() => setQuery("")}
                >
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input
                      placeholder="Buscar comunidades"
                      className="transition-colors"
                    />
                    {query ? <SearchField.ClearButton /> : null}
                  </SearchField.Group>
                </SearchField>

                {viewingCityLabel && (
                  <p className="flex items-center gap-1.5 text-sm text-muted">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0"
                    >
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {viewingCityLabel}
                  </p>
                )}

                {discover.length === 0 ? (
                  <EmptyState
                    title={
                      viewingCityLabel
                        ? `Nenhuma comunidade para descobrir em ${viewingCityLabel} agora`
                        : "Nenhuma comunidade para descobrir na cidade selecionada agora"
                    }
                    description="Quando uma comunidade da sua cidade aceitar novos vizinhos, ela aparece aqui."
                  />
                ) : discoverFiltered.length === 0 ? (
                  <EmptyState
                    title="Nenhuma comunidade encontrada com esse termo"
                    description="Tente outro nome ou limpe a busca."
                    action={
                      <Button size="sm" variant="tertiary" onPress={() => setQuery("")}>
                        Limpar busca
                      </Button>
                    }
                  />
                ) : (
                  <>
                    <ul className="flex flex-col gap-2">
                      {discoverVisible.map((community) => {
                        const isSelected = selected?.id === community.id
                        return (
                          <li key={community.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedId(community.id)}
                              aria-pressed={isSelected}
                              className={`flex min-h-11 w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)] ${
                                isSelected
                                  ? "border-[var(--semantic-action-primary)] bg-[var(--semantic-surface-sunken)]"
                                  : "border-border bg-[var(--semantic-surface)] hover:bg-[var(--semantic-surface-sunken)]"
                              }`}
                            >
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--semantic-surface-sunken)] text-muted">
                                <CommunityGlyph className="h-6 w-6" />
                              </span>
                              <span className="flex min-w-0 flex-col">
                                <span
                                  className={`truncate text-sm font-medium ${
                                    isSelected ? "text-[var(--semantic-action-primary)]" : ""
                                  }`}
                                >
                                  {community.name}
                                </span>
                                {community.cityLabel && (
                                  <span className="truncate text-xs text-muted">
                                    {community.cityLabel}
                                  </span>
                                )}
                              </span>
                              {membershipByCommunity.get(community.id)?.status === "pending" && (
                                <span className="ml-auto shrink-0">
                                  <PendingChip />
                                </span>
                              )}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                    {!expanded && discoverFiltered.length > DISCOVER_PREVIEW_COUNT && (
                      <Button
                        variant="tertiary"
                        className="w-full"
                        onPress={() => setExpanded(true)}
                      >
                        Ver mais comunidades
                      </Button>
                    )}
                  </>
                )}
              </section>

              {selected && (
                <section aria-label={`Apresentação de ${selected.name}`}>
                  <Card className="flex flex-col gap-4 p-5">
                    <CommunityThumbnail large />
                    <div className="flex flex-col gap-1">
                      <h2 className="text-xl font-semibold tracking-tight">{selected.name}</h2>
                      {selected.cityLabel && (
                        <p className="text-sm text-muted">{selected.cityLabel}</p>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-muted">
                      {selected.description ??
                        "Esta comunidade ainda não escreveu uma apresentação."}
                    </p>

                    {selectedStatus === "pending" ? (
                      <div className="flex flex-col gap-2 rounded-xl border border-border bg-[var(--semantic-surface-sunken)] p-4">
                        <PendingChip />
                        <p className="text-sm text-muted">
                          {selectedRequestedOn
                            ? `Pedido enviado em ${selectedRequestedOn}.`
                            : "Pedido enviado, aguardando análise."}
                        </p>
                        <p className="text-xs text-muted">
                          A participação depende de aprovação. Você ainda não faz parte desta
                          comunidade.
                        </p>
                        {selectedReason && (
                          <div className="flex flex-col gap-1 border-border border-t pt-3">
                            <p className="font-medium text-xs">O que você escreveu</p>
                            <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                              {selectedReason}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <form
                        ref={formRef}
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-3"
                        aria-label="Pedido de participação"
                      >
                        <input type="hidden" name="communityId" value={selected.id} />
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="membership-motivo" className="text-sm font-medium">
                            Por que você quer participar? (opcional)
                          </label>
                          <textarea
                            id="membership-motivo"
                            name="motivo"
                            rows={3}
                            maxLength={500}
                            placeholder="Conte um pouco sobre seu interesse"
                            className="w-full rounded-lg border border-border bg-[var(--semantic-surface)] px-3 py-2 text-sm leading-relaxed transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--semantic-action-context)]"
                          />
                          <p className="text-xs leading-relaxed text-muted">
                            Visível apenas para você e os responsáveis pela análise.
                          </p>
                        </div>

                        {submitError && (
                          <ErrorState
                            message={submitError}
                            onRetry={() => formRef.current?.requestSubmit()}
                          />
                        )}

                        <Button type="submit" variant="primary" isDisabled={submitting}>
                          {submitting ? "Enviando pedido..." : "Solicitar participação"}
                        </Button>
                        <p className="text-center text-xs text-muted">
                          A participação depende de aprovação.
                        </p>
                      </form>
                    )}
                  </Card>
                </section>
              )}
            </div>
          </TabPanel>
        )}
      </Tabs>
    </div>
  )
}
