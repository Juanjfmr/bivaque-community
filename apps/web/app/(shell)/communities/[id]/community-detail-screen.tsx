"use client"

// RECON-009 (prancha 43) — island de renderização da comunidade. Só recebe o
// achatamento já particionado por público do loader: aqui nada decide acesso,
// apenas renderiza o que foi carregado para este público. Por isso pendente e
// visitante não têm aba nem rail de estatísticas — esses dados não chegam a
// existir na prop.

import { Button, Chip, ListBox, Select, Tab, TabList, TabPanel, Tabs } from "@heroui/react"
import type { Route } from "next"
import Image from "next/image"
import Link from "next/link"
import { type FormEvent, useRef, useState } from "react"
import type { Database } from "supabase/database.generated"
import { communityImageAltText } from "../../../../lib/communities/community-media"
import { Card } from "../../../components/bivaque/card"
import { EmptyState } from "../../../components/bivaque/empty-state"
import { ErrorState } from "../../../components/bivaque/error-state"
import { FeedPost } from "../../../components/bivaque/feed-post"
import { transferCommunityOwnershipAction } from "../actions"
import { requestJoinWithReasonAction } from "./actions"
import { formatCreatedOn, formatRequestedOn, type GroupCard } from "./community-detail-data"
import type { CommunityDetailView } from "./community-detail-loaders"

type FeedPostRow = Database["public"]["Functions"]["feed_posts"]["Returns"][number]

type ReadyView = Extract<CommunityDetailView, { status: "ready" }>

function CommunityGlyph({ className = "" }: { className?: string }) {
  // Glifo decorativo: `communities` não tem coluna de imagem e chumbar foto
  // seria inventar conteúdo (mesma regra da prancha 42, RECON-004).
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

function MetaGlyph({ path, className = "h-4 w-4" }: { path: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`${className} mt-0.5 shrink-0 text-muted`}
    >
      <path d={path} />
    </svg>
  )
}

const USERS_PATH =
  "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75"
const CALENDAR_PATH =
  "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
const PIN_PATH =
  "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"

function CommunityHero({ view }: { view: ReadyView }) {
  const { presentation } = view
  return (
    <header className="flex flex-col">
      {presentation.bannerUrl ? (
        <Image
          src={presentation.bannerUrl}
          alt={communityImageAltText("banner")}
          width={1200}
          height={384}
          unoptimized
          className="h-40 w-full rounded-2xl object-cover sm:h-48"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-40 w-full items-end justify-start rounded-2xl bg-[var(--semantic-surface-sunken)] p-4 text-muted sm:h-48"
        >
          <CommunityGlyph className="h-12 w-12 opacity-40" />
        </div>
      )}
      <div className="-mt-12 flex items-end gap-4 px-2">
        {presentation.thumbnailUrl ? (
          <Image
            src={presentation.thumbnailUrl}
            alt={communityImageAltText("thumbnail")}
            width={80}
            height={80}
            unoptimized
            className="h-20 w-20 shrink-0 rounded-xl border-4 border-[var(--semantic-canvas)] object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-4 border-[var(--semantic-canvas)] bg-[var(--semantic-surface-sunken)] text-muted"
          >
            <CommunityGlyph className="h-9 w-9" />
          </div>
        )}
        <div className="min-w-0 flex-1 pb-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{presentation.name}</h1>
          {presentation.cityLabel && (
            <p className="mt-0.5 text-sm text-muted">{presentation.cityLabel}</p>
          )}
        </div>
      </div>
    </header>
  )
}

function GroupCardItem({ group }: { group: GroupCard }) {
  return (
    <Card interactive className="flex flex-col gap-2.5 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight">{group.name}</h3>
        <Chip size="sm" variant="soft">
          {group.visibility === "public" ? "Público" : "Privado"}
        </Chip>
      </div>
      {group.description && (
        <p className="text-sm leading-relaxed text-muted">{group.description}</p>
      )}
      {group.memberCount !== null && (
        <p className="text-sm text-muted">
          {group.memberCount} {group.memberCount === 1 ? "membro" : "membros"}
        </p>
      )}
      {group.participating && (
        <span>
          <Chip size="sm" color="success" variant="soft">
            Você participa
          </Chip>
        </span>
      )}
      <Link
        href={`/groups/${group.id}` as Route}
        className="mt-1 inline-flex min-h-11 w-fit items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-surface-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
      >
        Ver grupo
      </Link>
    </Card>
  )
}

function MemberBody({ view }: { view: Extract<ReadyView, { audience: "member" }> }) {
  const { presentation, canModerate, membership, transferCandidates } = view
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Tabs
        className="[&_[data-slot=tab]]:min-h-11 [&_[data-slot=tab]]:px-3"
        aria-label="Seções da comunidade"
      >
        <TabList aria-label="Seções da comunidade">
          <Tab key="conversas">Conversas</Tab>
          <Tab key="grupos">Grupos</Tab>
          <Tab key="sobre">Sobre</Tab>
        </TabList>

        <TabPanel key="conversas" className="pt-4">
          {view.feed.length > 0 ? (
            <div className="flex flex-col gap-2">
              {view.feed.map((post, index) => (
                <FeedPost key={post.id} post={post as unknown as FeedPostRow} index={index} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nenhuma conversa ainda"
              description="Quando alguém desta comunidade publicar, a publicação aparece aqui."
            />
          )}
        </TabPanel>

        <TabPanel key="grupos" className="pt-4">
          <h2 className="mb-3 text-base font-semibold tracking-tight">Grupos da comunidade</h2>
          {view.groups.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {view.groups.map((group) => (
                <li key={group.id}>
                  <GroupCardItem group={group} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Nenhum grupo nesta comunidade ainda"
              description="Grupos criados dentro desta comunidade aparecem aqui para quem participa."
            />
          )}
        </TabPanel>

        <TabPanel key="sobre" className="pt-4">
          <section aria-label="Sobre e administração" className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-muted">
              {presentation.description ?? "Esta comunidade ainda não escreveu uma apresentação."}
            </p>
            <ul className="flex flex-col gap-2">
              <li>
                <Link
                  href={`/communities/${presentation.id}/invite` as Route}
                  className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
                >
                  Convidar membros — o convite carrega o escopo desta comunidade
                </Link>
              </li>
              {canModerate && (
                <li>
                  <Link
                    href={`/communities/${presentation.id}/admin/pending` as Route}
                    className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
                  >
                    Analisar pedidos de entrada
                  </Link>
                </li>
              )}
            </ul>
            {membership.role === "owner" && transferCandidates.length > 0 && (
              <form
                action={transferCommunityOwnershipAction}
                className="flex flex-wrap items-end gap-2"
                aria-label="Transferir propriedade"
              >
                <input type="hidden" name="communityId" value={presentation.id} />
                <Select
                  name="newOwnerId"
                  aria-label="Novo dono da comunidade"
                  isRequired
                  placeholder="Escolher novo dono..."
                  className="min-w-56"
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {transferCandidates.map((candidate) => (
                        <ListBox.Item key={candidate.userId} id={candidate.userId}>
                          {candidate.displayName}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                <Button type="submit" size="sm" variant="tertiary" className="min-h-11">
                  Transferir
                </Button>
              </form>
            )}
          </section>
        </TabPanel>
      </Tabs>

      <aside aria-label="Sobre a comunidade" className="lg:sticky lg:top-20 lg:self-start">
        <Card className="flex flex-col gap-4 p-4">
          <h2 className="text-base font-semibold tracking-tight">Sobre a comunidade</h2>
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex items-start gap-2.5">
              <MetaGlyph path={USERS_PATH} />
              <span>
                <span className="block font-medium">Membros</span>
                <span className="block text-muted">{view.memberCount}</span>
              </span>
            </li>
            {formatCreatedOn(presentation.createdAt) && (
              <li className="flex items-start gap-2.5">
                <MetaGlyph path={CALENDAR_PATH} />
                <span>
                  <span className="block font-medium">Criada em</span>
                  <span className="block text-muted">
                    {formatCreatedOn(presentation.createdAt)}
                  </span>
                </span>
              </li>
            )}
            {presentation.cityLabel && (
              <li className="flex items-start gap-2.5">
                <MetaGlyph path={PIN_PATH} />
                <span>
                  <span className="block font-medium">Local</span>
                  <span className="block text-muted">{presentation.cityLabel}</span>
                </span>
              </li>
            )}
          </ul>
        </Card>
      </aside>
    </div>
  )
}

function PendingBody({ view }: { view: Extract<ReadyView, { audience: "pending" }> }) {
  const requestedOn = formatRequestedOn(view.requestedAt)
  return (
    <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--semantic-surface-sunken)] text-muted"
      >
        <MetaGlyph path="M22 2 11 13 M22 2 15 22 11 13 2 9 22 2Z" className="h-6 w-6" />
      </span>
      <h2 className="text-xl font-semibold tracking-tight">Pedido enviado</h2>
      <p className="text-sm text-muted">
        {requestedOn ? `Enviado em ${requestedOn}. ` : ""}Acompanhe a resposta por aqui.
      </p>
      <p className="text-xs text-muted">
        A participação depende de aprovação de um responsável da comunidade.
      </p>
      {view.joinReason !== null && (
        <div className="mt-3 w-full max-w-md rounded-xl border border-border bg-[var(--semantic-surface-sunken)] p-4 text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Seu motivo — visível só para você e para quem analisa
          </p>
          <p className="mt-1 text-sm leading-relaxed">{view.joinReason}</p>
        </div>
      )}
    </Card>
  )
}

function VisitorBody({ view }: { view: Extract<ReadyView, { audience: "visitor" }> }) {
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setSubmitError("")
    setSubmitting(true)
    try {
      await requestJoinWithReasonAction(new FormData(form))
      form.reset()
    } catch {
      setSubmitError("Não foi possível enviar o pedido agora. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <p className="text-sm leading-relaxed text-muted">
        {view.presentation.description ?? "Esta comunidade ainda não escreveu uma apresentação."}
      </p>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3"
        aria-label="Pedido de participação"
      >
        <input type="hidden" name="communityId" value={view.presentation.id} />
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
          <ErrorState message={submitError} onRetry={() => formRef.current?.requestSubmit()} />
        )}

        <Button type="submit" variant="primary" isDisabled={submitting} className="self-start">
          {submitting ? "Enviando pedido..." : "Solicitar participação"}
        </Button>
        <p className="text-center text-xs text-muted">A participação depende de aprovação.</p>
      </form>
    </Card>
  )
}

export function CommunityDetailScreen({ view }: { view: ReadyView }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <CommunityHero view={view} />
      {view.audience === "member" && <MemberBody view={view} />}
      {view.audience === "pending" && <PendingBody view={view} />}
      {view.audience === "visitor" && <VisitorBody view={view} />}
    </div>
  )
}
