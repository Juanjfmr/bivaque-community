"use client"

import { brandTokens } from "@bivaque/tokens"
import { Button, Kbd, Tooltip } from "@heroui/react"
import type { LucideIcon } from "lucide-react"
import { Bell, ChevronsLeft, Lightbulb, MapPin, PanelLeft, Settings } from "lucide-react"
import { usePathname } from "next/navigation"
import { type ReactNode, useCallback, useEffect, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { useMemberContext } from "../../../lib/member-context"
import { GlobalSearchField } from "../search/global-search-field"
import { MemberAvatar } from "./avatar"
import { BottomNav, NAV_ITEMS } from "./bottom-nav"
import { CreatePostModal } from "./feed-post"

interface AppShellProperties {
  children: ReactNode
}

// Below this width the sidebar is always an icon rail: there is room for the
// rail but not for labels, and collapsing to a mobile bottom nav on a tablet
// would be the wrong trade. The expand/collapse toggle only applies above it.
const EXPANDABLE_QUERY = "(min-width: 1024px)"

export function AppShell({ children }: AppShellProperties) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const { current } = useLocalityContext()
  const { communities, displayName, unreadCount } = useMemberContext()
  // Read synchronously on the first client render so a tablet never paints the
  // expanded sidebar before snapping to the rail.
  const [canExpand, setCanExpand] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia(EXPANDABLE_QUERY).matches,
  )

  // Between md and lg the rail is forced, so the user's collapse preference
  // only takes effect once the viewport is wide enough to show labels.
  const isRail = !canExpand || sidebarCollapsed

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((previous) => !previous)
  }, [])

  useEffect(() => {
    const query = window.matchMedia(EXPANDABLE_QUERY)
    const sync = () => setCanExpand(query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "b") {
        event.preventDefault()
        setSidebarCollapsed((previous) => !previous)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handlePostCreated = useCallback(() => {
    setCreatePostOpen(false)
  }, [])

  const handlePostClose = useCallback(() => {
    setCreatePostOpen(false)
  }, [])

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[var(--semantic-canvas)]">
      {/* ---- Navbar ---- */}
      <header className="sticky top-0 z-50 border-b border-border bg-[var(--semantic-surface)]">
        {/* RECON-021: o campo do cabeçalho das pranchas de membro. Em <sm ele
            ocupa a segunda linha (order-last) para manter o alvo de toque de
            44px sem espremer as ações; de sm para cima fica entre o pill da
            cidade e as ações, como na prancha 61. */}
        <div className="flex min-h-[var(--semantic-nav-height)] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2 sm:flex-nowrap sm:py-0">
          {/* Left section */}
          <div className="flex items-center gap-3">
            {/* Sidebar toggle visible on desktop */}
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={isRail ? "Expandir menu lateral" : "Recolher menu lateral"}
              className="hidden lg:flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
            >
              {isRail ? (
                <PanelLeft size={20} aria-hidden="true" />
              ) : (
                <ChevronsLeft size={20} aria-hidden="true" />
              )}
            </button>

            {/* Locality context */}
            <div
              data-testid="shell-locality-pill"
              className="flex items-center gap-1.5 min-h-11 px-2 rounded-lg"
            >
              <MapPin
                size={16}
                className="text-[var(--semantic-action-primary)]"
                aria-hidden="true"
              />
              <span className="text-sm font-medium hidden sm:inline">
                {current.cityName}, {current.stateCode}
              </span>
            </div>
          </div>

          {/* Search — order-last on mobile, centered on desktop */}
          <div className="order-last w-full sm:order-none sm:mx-2 sm:w-auto sm:max-w-xl sm:flex-1">
            <GlobalSearchField />
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              aria-label="Criar publicação"
              onPress={() => setCreatePostOpen(true)}
            >
              Publicar
            </Button>

            <a
              href="/recommendations"
              aria-label="Indicações"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
            >
              <Lightbulb size={20} aria-hidden="true" />
            </a>

            <a
              href="/notifications"
              aria-label="Notificações"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
            >
              <Bell size={20} aria-hidden="true" />
            </a>

            <a
              href="/profile"
              aria-label="Perfil"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
            >
              <MemberAvatar
                name={displayName}
                size="sm"
                className="ring-2 ring-transparent transition-all duration-[var(--semantic-motion-duration-instant)] hover:ring-[var(--semantic-selected)]"
              />
            </a>
          </div>
        </div>
      </header>

      {/* ---- Body: sidebar + main ---- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar from md up, BottomNav below it, so exactly one primary
            navigation landmark is on screen at any width — two navs sharing the
            accessible name "Navegação principal" would otherwise both be
            exposed. Between md and lg it renders as an icon rail. */}
        <aside
          className="hidden md:flex flex-col shrink-0 border-r border-border bg-[var(--semantic-surface)] transition-[width] duration-[var(--semantic-motion-duration-base)] ease-[var(--semantic-motion-ease-out)] overflow-hidden"
          style={{ width: isRail ? "4rem" : "16rem" }}
        >
          {/* Sidebar header */}
          <div
            className={`flex items-center h-[var(--semantic-nav-height)] shrink-0 border-b border-border ${isRail ? "justify-center" : "px-3"}`}
          >
            {!isRail && (
              <span className="text-base font-semibold tracking-tight truncate flex-1">
                {brandTokens.productName}
              </span>
            )}
            {/* Only offered where expanding is possible; below lg the rail is fixed. */}
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={isRail ? "Expandir menu lateral" : "Recolher menu lateral"}
              className="hidden lg:flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
            >
              {isRail ? (
                <PanelLeft size={20} aria-hidden="true" />
              ) : (
                <ChevronsLeft size={20} aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Nav items */}
          <nav aria-label="Navegação principal" className="flex flex-col gap-1 p-3">
            {NAV_ITEMS.map((item) => {
              // When a route is not one of the four containers (e.g. /messages,
              // /notifications, and the historical /localidade, /community,
              // /groups still reachable in W00), fall back so the sidebar never
              // shows no active item: /messages and /notifications resolve to
              // "perfil", everything else to "inicio". Mirrors bottom-nav's
              // selectedKey fallback so the two navs stay in sync.
              const inPrimaryNav = NAV_ITEMS.some(
                (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
              )
              const fallbackId =
                pathname.startsWith("/messages") || pathname.startsWith("/notifications")
                  ? "perfil"
                  : "inicio"
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`) ||
                (!inPrimaryNav && item.id === fallbackId)

              const anchor = (
                <a
                  key={item.id}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 min-w-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] ${
                    active
                      ? "bg-[var(--semantic-selected)] text-[var(--semantic-action-primary)]"
                      : "text-muted hover:bg-[var(--semantic-selected)] hover:text-foreground"
                  } ${isRail ? "justify-center px-0" : ""}`}
                >
                  {/* Icon crossfade: outline ↔ solid */}
                  <span className="relative inline-flex h-5 w-5 shrink-0" aria-hidden="true">
                    <item.Icon
                      className={`absolute inset-0 h-5 w-5 transition-opacity duration-[var(--semantic-motion-duration-fast)] ${active ? "opacity-0" : "opacity-100"}`}
                    />
                    <item.IconActive
                      className={`absolute inset-0 h-5 w-5 transition-opacity duration-[var(--semantic-motion-duration-fast)] ${active ? "opacity-100" : "opacity-0"}`}
                    />
                  </span>
                  {/* Kept in the accessibility tree even as a rail: the icon is
                      aria-hidden, so hiding the label outright would leave the
                      link with no accessible name. */}
                  <span className={isRail ? "sr-only" : undefined}>{item.label}</span>
                </a>
              )
              return isRail ? (
                <Tooltip key={item.id} delay={0}>
                  <Tooltip.Trigger>{anchor}</Tooltip.Trigger>
                  <Tooltip.Content>{item.label}</Tooltip.Content>
                </Tooltip>
              ) : (
                anchor
              )
            })}

            <hr className="my-2 border-border" />

            {/* Salvos e Notificações são destinos secundários, dentro do MESMO
                landmark de navegação — não um <nav> próprio. A regra nav-active
                da auditoria exige exatamente um aria-current por <nav> visível,
                e uma nav utilitária de dois itens não consegue satisfazer isso
                em todas as rotas. Eles também não recebem aria-current: no
                modelo do DESIGN_SYSTEM §7.1 conta e notificações vivem sob
                Perfil, que é quem o fallback primário marca nessas rotas. */}
            {/* "Salvos" aparece nas pranchas 01/61/60, mas a tela de conteúdos
                salvos é a prancha 54 e pertence à etapa W03. Um destino
                placeholder é proibido duas vezes aqui: pelo gate G1 do spec e
                por tests/unit/ui/empty-promises.test.ts, que reprova promessa
                vazia em apps/web/app/**. O item entra junto com a tela. */}
            <SidebarSecondaryItem
              href="/notifications"
              label="Notificações"
              Icon={Bell}
              badge={unreadCount}
              isRail={isRail}
            />
          </nav>

          {/* The whole section — separator included — disappears when the
              member has no approved communities (never an empty heading). */}
          {communities.length > 0 && (
            <>
              <hr className="mx-3 shrink-0 border-border" />
              <section
                aria-label="Minhas comunidades"
                className="flex min-h-0 flex-col gap-1 overflow-y-auto p-3"
              >
                {!isRail && (
                  <p className="px-3 text-xs uppercase tracking-wide text-muted">
                    Minhas comunidades
                  </p>
                )}
                {communities.map((community) => (
                  <SidebarCommunityItem
                    key={community.id}
                    id={community.id}
                    name={community.name}
                    isRail={isRail}
                  />
                ))}
              </section>
            </>
          )}

          {/* Spacer pushes footer down */}
          <div className="flex-1" />

          {/* Sidebar member footer (expanded only, as before): real name from
              useMemberContext, never a hardcoded initial.

              A cidade volta aqui junto do nome porque a sidebar é a segunda
              superfície onde o membro confere em que cidade está — o pill do
              cabeçalho é a primeira. DS-010 (tests/e2e/shell-locality-truth)
              trava as duas, e por bom motivo: a conta transferida para o Rio
              tem que ler "Rio de Janeiro" nas duas, nunca o literal do piloto.
              A fonte é a mesma do pill, useLocalityContext, nunca texto fixo. */}
          {!isRail && (
            <>
              <hr className="mx-3 shrink-0 border-border" />
              <div className="shrink-0 p-3">
                <div className="flex items-center gap-2 px-3 pb-1 text-muted">
                  <MapPin size={14} className="shrink-0" aria-hidden="true" />
                  <span className="min-w-0 truncate text-xs">
                    {current.cityName}, {current.stateCode}
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <MemberAvatar name={displayName} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{displayName}</span>
                </div>
                <a
                  href="/profile"
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] hover:text-foreground"
                >
                  <Settings size={20} className="shrink-0" aria-hidden="true" />
                  <span>Configurações</span>
                </a>
              </div>
            </>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
          {/* Extra bottom padding so content clears the bottom nav wherever it shows */}
          <div className="h-20 md:h-0" />
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <BottomNav />

      {/* CreatePostModal */}
      {createPostOpen && (
        <CreatePostModal
          localityId={current.id}
          onCreated={handlePostCreated}
          onClose={handlePostClose}
        />
      )}

      {/* Keyboard shortcut hint */}
      <div className="hidden lg:flex fixed bottom-4 right-4 z-30">
        <span className="flex items-center gap-1.5 text-xs text-muted bg-[var(--semantic-surface)] border border-border rounded-md px-2 py-1 shadow-[var(--semantic-elevation-raised)]">
          <Kbd>Ctrl</Kbd>
          <span>+</span>
          <Kbd>B</Kbd>
          <span>para {isRail ? "expandir" : "recolher"}</span>
        </span>
      </div>
    </div>
  )
}

// Rail shape mirrors the primary items exactly — icon + sr-only label +
// Tooltip — so collapsing behaves the same everywhere in the sidebar. The
// unread badge only renders expanded and only with a positive count: a "0"
// badge is forbidden by the visual contract.
function SidebarSecondaryItem({
  href,
  label,
  Icon,
  badge,
  isRail,
}: {
  href: string
  label: string
  Icon: LucideIcon
  badge?: number
  isRail: boolean
}) {
  const anchor = (
    <a
      href={href}
      className={`flex min-h-11 min-w-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] hover:text-foreground ${isRail ? "justify-center px-0" : ""}`}
    >
      <Icon size={20} className="shrink-0" aria-hidden="true" />
      <span className={isRail ? "sr-only" : undefined}>{label}</span>
      {!isRail && badge !== undefined && badge > 0 && (
        <span className="ml-auto rounded-full bg-[var(--semantic-action-primary)] px-1.5 text-xs text-[var(--semantic-text-on-strong)]">
          {badge}
        </span>
      )}
    </a>
  )
  return isRail ? (
    <Tooltip delay={0}>
      <Tooltip.Trigger>{anchor}</Tooltip.Trigger>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  ) : (
    anchor
  )
}

// Community rows carry no thumbnail — there is no such data. The placeholder
// is the uppercase initial of the name, on the same selected-surface token
// the active nav item uses.
function SidebarCommunityItem({ id, name, isRail }: { id: string; name: string; isRail: boolean }) {
  const anchor = (
    <a
      href={`/communities/${id}`}
      className={`flex min-h-11 min-w-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] hover:text-foreground ${isRail ? "justify-center px-0" : ""}`}
    >
      <span
        aria-hidden="true"
        className="grid h-6 w-6 shrink-0 place-items-center rounded bg-[var(--semantic-selected)] text-xs text-[var(--semantic-action-primary)]"
      >
        {name.charAt(0).toUpperCase()}
      </span>
      <span className={isRail ? "sr-only" : "min-w-0 truncate"}>{name}</span>
    </a>
  )
  return isRail ? (
    <Tooltip delay={0}>
      <Tooltip.Trigger>{anchor}</Tooltip.Trigger>
      <Tooltip.Content>{name}</Tooltip.Content>
    </Tooltip>
  ) : (
    anchor
  )
}
