"use client"

import { ChevronRight, MapPin, UserPlus } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { MemberAvatar } from "../../components/bivaque/avatar"
import type { CommunityHeaderData } from "./use-community-header"

// Cabeçalho da comunidade (25/09/2026, segunda rodada). Referências do Mobbin:
// a capa com o quadrado da comunidade sobre a borda (X no iOS, Weverse), a
// fileira de rostos com "N membros" (Meetup, X) e a descrição curta logo
// abaixo do nome. Rola com a página; o que fica preso ao topo são as abas.

function CommunityTile({ name, thumbnailUrl }: { name: string; thumbnailUrl: string | null }) {
  const base = "h-16 w-16 shrink-0 rounded-ui-lg ring-4 ring-ui-surface sm:h-20 sm:w-20"
  if (thumbnailUrl) {
    // biome-ignore lint/performance/noImgElement: URL assinada de bucket privado
    return <img src={thumbnailUrl} alt="" className={`${base} bg-ui-surface object-cover`} />
  }
  return (
    <span
      aria-hidden="true"
      className={`${base} flex items-center justify-center bg-ui-brand-soft text-2xl font-semibold text-ui-brand`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  )
}

function MemberStack({
  members,
  count,
}: {
  members: CommunityHeaderData["members"]
  count: number | null
}) {
  if (count === null && members.length === 0) return null
  const label = count === null ? null : `${count} ${count === 1 ? "membro" : "membros"}`
  return (
    <div className="flex items-center gap-2">
      {members.length > 0 ? (
        <div className="flex -space-x-2" aria-hidden="true">
          {members.map((member) => (
            <MemberAvatar
              key={member.userId}
              name={member.name}
              src={`/api/avatar/${member.userId}`}
              size="sm"
              className="h-7 w-7 text-xs ring-2 ring-ui-surface"
            />
          ))}
        </div>
      ) : null}
      {label ? <span className="text-sm font-medium text-ui-ink">{label}</span> : null}
    </div>
  )
}

export function CommunityHeader({
  communityId,
  name,
  thumbnailUrl,
  cityLabel,
  data,
}: {
  communityId: string
  name: string
  thumbnailUrl: string | null
  cityLabel: string
  data: CommunityHeaderData
}) {
  return (
    <header className="overflow-hidden rounded-ui-lg bg-ui-surface shadow-ui ring-1 ring-ui-line">
      {/* Capa: a imagem da comunidade quando existe; senão, a faixa da marca. */}
      <div className="relative h-24 bg-linear-to-br from-ui-brand to-ui-brand-hover sm:h-32">
        {data.bannerUrl ? (
          // biome-ignore lint/performance/noImgElement: URL assinada de bucket privado
          <img src={data.bannerUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        {/* Só o quadrado sobe sobre a capa (e fica acima dela: `relative`);
            as ações ficam abaixo da borda, onde o toque não disputa a imagem. */}
        <div className="flex items-start justify-between gap-3">
          <div className="relative -mt-8 sm:-mt-10">
            <CommunityTile name={name} thumbnailUrl={thumbnailUrl} />
          </div>
          <div className="mt-3 flex items-center gap-1">
            <Link
              href={`/communities/${communityId}/invite` as Route}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ui-surface px-3 text-sm font-semibold text-ui-ink shadow-ui ring-1 ring-ui-line transition-colors hover:bg-ui-subtle"
            >
              <UserPlus size={16} aria-hidden="true" />
              Convidar
            </Link>
            <Link
              href={`/communities/${communityId}` as Route}
              className="inline-flex min-h-11 items-center gap-0.5 rounded-full px-3 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
            >
              Sobre
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <h1 className="mt-3 text-xl leading-tight font-semibold tracking-tight text-ui-ink sm:text-2xl">
          {name}
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ui-ink-2">
          <MapPin size={14} className="shrink-0 text-ui-brand" aria-hidden="true" />
          {cityLabel}
        </p>
        {data.description ? (
          <p className="mt-2 line-clamp-2 max-w-prose text-sm text-ui-ink-2">{data.description}</p>
        ) : null}
        <div className="mt-3">
          <MemberStack members={data.members} count={data.memberCount} />
        </div>
      </div>
    </header>
  )
}
