import type { LucideIcon } from "lucide-react"
import { ChevronRight, Plus } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import type { ReactNode } from "react"
import { Skeleton } from "../../components/bivaque/skeleton"

// A moldura comum das seções do Início: título com ícone, "Ver tudo" à direita,
// e corpo. Cada seção tem id e scroll-margin para a barra de seções levar até
// ela sem ficar escondida atrás da própria barra. O selo ("3 novos") diz o que
// chegou desde a última visita; sem visita anterior ele não aparece.

export function HubSection({
  id,
  title,
  icon: Icon,
  href = null,
  linkLabel = "Ver tudo",
  children,
  flush = false,
  badge = null,
  shortTitle = null,
}: {
  id: string
  title: string
  /** Título do telefone, quando o completo não cabe ao lado do selo a 375. */
  shortTitle?: string | null
  icon: LucideIcon
  /** Sem destino (a consulta a outra cidade), o "Ver tudo" não aparece. */
  href?: string | null
  linkLabel?: string
  children: ReactNode
  /** Novidade desde a última visita, já escrita ("3 novos"). */
  badge?: string | null
  /** Corpo sem padding lateral (faixas horizontais cuidam do próprio respiro). */
  flush?: boolean
}) {
  const titleId = `${id}-titulo`
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="scroll-mt-16 rounded-ui-lg border border-ui-line bg-ui-surface py-4 shadow-ui"
    >
      <header className="flex items-center justify-between gap-3 px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ui-brand-soft text-ui-brand">
            <Icon size={16} aria-hidden="true" />
          </span>
          <h2 id={titleId} className="truncate text-base font-semibold text-ui-ink">
            {shortTitle ? (
              <>
                <span className="sm:hidden">{shortTitle}</span>
                <span className="hidden sm:inline">{title}</span>
              </>
            ) : (
              title
            )}
          </h2>
          {badge ? <NewBadge label={badge} /> : null}
        </div>
        {href ? (
          <Link
            href={href as Route}
            className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-ui px-2 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
          >
            {linkLabel}
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
      </header>
      <div className={flush ? "mt-2" : "mt-2 px-4 sm:px-5"}>{children}</div>
    </section>
  )
}

/** O selo de novidade, igual em seção, comunidade e atalho. */
export function NewBadge({ label }: { label: string }) {
  return (
    <span className="motion-card-enter shrink-0 rounded-full bg-ui-brand px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-ui-on-brand">
      {label}
    </span>
  )
}

// Estado de corpo igual em toda seção: erro recuperável. Seção pronta e vazia
// não existe na página (hub-view.ts) — no Início ela seria só altura sem nada.

export function HubError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-5">
      <p className="text-sm text-ui-ink-2">Não foi possível carregar {what}.</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-11 shrink-0 items-center rounded-ui px-3 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
      >
        Tentar de novo
      </button>
    </div>
  )
}

// ── Faixa horizontal de cards com foto (Mercado, Imóveis) ────────────────────

export const STRIP_CARD = "w-40 shrink-0 snap-start sm:w-44"

export function StripSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden px-4 sm:px-5" aria-busy="true">
      {[0, 1, 2, 3].map((key) => (
        <Skeleton key={key} className={`${STRIP_CARD} h-52 rounded-ui`} />
      ))}
    </div>
  )
}

// O respiro lateral mora no contêiner: o reset de `ul` do HeroUI fica fora de
// camada e anula o padding utilitário da própria lista. A última célula é um
// convite a publicar, para a faixa nunca terminar num beco.
//
// Sem foto: quando NENHUM anúncio da faixa tem foto, os cards viram cartões de
// texto (preço em destaque, sem moldura vazia ocupando 3/4 do card). Quando só
// alguns têm, o que falta ganha a capa da vertical, não um cinza com ícone.
export function PhotoStrip({
  items,
  createHref,
  createLabel,
  icon: Icon,
}: {
  items: {
    id: string
    href: string
    photoUrl: string | null
    price: string
    title: string
    meta: string | null
  }[]
  /** Sem convite (consulta a outra cidade: lá não se publica), a faixa termina no último anúncio. */
  createHref: string | null
  createLabel: string
  /** Ícone da vertical, usado na capa de quem não tem foto. */
  icon: LucideIcon
}) {
  const hasAnyPhoto = items.some((item) => item.photoUrl !== null)
  if (!hasAnyPhoto) {
    return <TextStrip items={items} createHref={createHref} createLabel={createLabel} icon={Icon} />
  }
  return (
    <div className="px-4 sm:px-5">
      <ul className="-mb-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {items.map((item) => (
          <li key={item.id} className={STRIP_CARD}>
            <Link
              href={item.href as Route}
              className="group block rounded-ui transition-opacity hover:opacity-95"
            >
              <div className="aspect-[4/3] overflow-hidden rounded-ui bg-ui-brand-soft">
                {item.photoUrl === null ? (
                  <div className="flex h-full items-center justify-center text-ui-brand/60">
                    <Icon size={28} strokeWidth={1.5} aria-hidden="true" />
                  </div>
                ) : (
                  // biome-ignore lint/performance/noImgElement: URL assinada de bucket privado; sem ganho com otimização
                  <img
                    src={item.photoUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                )}
              </div>
              <p className="mt-2 text-sm font-semibold text-ui-brand">{item.price}</p>
              <p className="line-clamp-2 text-sm text-ui-ink group-hover:underline">{item.title}</p>
              {item.meta ? (
                <p className="mt-0.5 truncate text-xs text-ui-ink-2">{item.meta}</p>
              ) : null}
            </Link>
          </li>
        ))}
        {createHref ? (
          <li className={STRIP_CARD}>
            <Link
              href={createHref as Route}
              className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-ui border border-dashed border-ui-line-strong text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
            >
              <Plus size={20} aria-hidden="true" />
              {createLabel}
            </Link>
          </li>
        ) : null}
      </ul>
    </div>
  )
}

type StripItem = Parameters<typeof PhotoStrip>[0]["items"][number]

// A faixa sem foto nenhuma: cartões baixos de texto, que cabem três a 375.
function TextStrip({
  items,
  createHref,
  createLabel,
  icon: Icon,
}: {
  items: StripItem[]
  createHref: string | null
  createLabel: string
  icon: LucideIcon
}) {
  return (
    <div className="px-4 sm:px-5">
      <ul className="-mb-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {items.map((item) => (
          <li key={item.id} className="w-52 shrink-0 snap-start">
            <Link
              href={item.href as Route}
              className="group flex h-full flex-col rounded-ui bg-ui-bg p-3 transition-colors hover:bg-ui-subtle"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ui-surface text-ui-brand">
                <Icon size={16} aria-hidden="true" />
              </span>
              <p className="mt-2 text-base font-semibold text-ui-brand">{item.price}</p>
              <p className="line-clamp-2 text-sm text-ui-ink group-hover:underline">{item.title}</p>
              {item.meta ? (
                <p className="mt-auto truncate pt-1 text-xs text-ui-ink-2">{item.meta}</p>
              ) : null}
            </Link>
          </li>
        ))}
        {createHref ? (
          <li className="w-40 shrink-0 snap-start">
            <Link
              href={createHref as Route}
              className="flex h-full min-h-28 flex-col items-center justify-center gap-1 rounded-ui border border-dashed border-ui-line-strong text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
            >
              <Plus size={20} aria-hidden="true" />
              {createLabel}
            </Link>
          </li>
        ) : null}
      </ul>
    </div>
  )
}
