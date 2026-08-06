"use client"

import { brandTokens } from "@bivaque/tokens"
import { Button, Kbd, Tooltip } from "@heroui/react"
import { Bell, ChevronDown, ChevronsLeft, MapPin, PanelLeft } from "lucide-react"
import { usePathname } from "next/navigation"
import { type ReactNode, useCallback, useEffect, useState } from "react"
import { PILOT_LOCALITY_ID } from "../../../lib/locality"
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
    <div className="h-dvh flex flex-col overflow-hidden bg-[var(--background)]">
      {/* ---- Navbar ---- */}
      <header className="sticky top-0 z-50 border-b border-border bg-[var(--surface)]">
        <div className="flex h-[var(--nav-height)] items-center justify-between px-4">
          {/* Left section */}
          <div className="flex items-center gap-3">
            {/* Sidebar toggle visible on desktop */}
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={isRail ? "Expandir menu lateral" : "Recolher menu lateral"}
              className="hidden lg:flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors duration-[var(--duration-instant)] hover:bg-[var(--surface-subtle)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
            >
              {isRail ? (
                <PanelLeft size={20} aria-hidden="true" />
              ) : (
                <ChevronsLeft size={20} aria-hidden="true" />
              )}
            </button>

            {/* Locality context */}
            <div className="flex items-center gap-1.5 min-h-11 px-2 rounded-lg">
              <MapPin size={16} className="text-[var(--accent)]" aria-hidden="true" />
              <span className="text-sm font-medium hidden sm:inline">Manaus, AM</span>
              <ChevronDown size={14} className="text-muted" aria-hidden="true" />
            </div>
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

            <button
              type="button"
              aria-label="Notificações"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors duration-[var(--duration-instant)] hover:bg-[var(--surface-subtle)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
            >
              <Bell size={20} aria-hidden="true" />
            </button>

            <button
              type="button"
              aria-label="Perfil"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold ring-2 ring-transparent transition-all duration-[var(--duration-instant)] hover:ring-[var(--accent-soft)]">
                C
              </div>
            </button>
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
          className="hidden md:flex flex-col shrink-0 border-r border-border bg-[var(--surface)] transition-[width] duration-[var(--duration-base)] ease-[var(--ease-out)] overflow-hidden"
          style={{ width: isRail ? "4rem" : "16rem" }}
        >
          {/* Sidebar header */}
          <div
            className={`flex items-center h-[var(--nav-height)] shrink-0 border-b border-border ${isRail ? "justify-center" : "px-3"}`}
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
              className="hidden lg:flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors duration-[var(--duration-instant)] hover:bg-[var(--surface-subtle)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
            >
              {isRail ? (
                <PanelLeft size={20} aria-hidden="true" />
              ) : (
                <ChevronsLeft size={20} aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Nav items */}
          <nav aria-label="Navegação principal" className="flex flex-col gap-1 p-3 flex-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              const anchor = (
                <a
                  key={item.id}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-[var(--duration-instant)] ${
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-muted hover:bg-[var(--surface-subtle)] hover:text-foreground"
                  } ${isRail ? "justify-center px-0" : ""}`}
                >
                  {/* Icon crossfade: outline ↔ solid */}
                  <span className="relative inline-flex h-5 w-5 shrink-0" aria-hidden="true">
                    <item.Icon
                      className={`absolute inset-0 h-5 w-5 transition-opacity duration-[var(--duration-fast)] ${active ? "opacity-0" : "opacity-100"}`}
                    />
                    <item.IconActive
                      className={`absolute inset-0 h-5 w-5 transition-opacity duration-[var(--duration-fast)] ${active ? "opacity-100" : "opacity-0"}`}
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

            {/* Spacer pushes footer down */}
            <div className="flex-1" />

            {/* Sidebar user footer (expanded only) */}
            {!isRail && (
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 mt-auto">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold">
                  C
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">Minha conta</p>
                  <p className="text-xs text-muted truncate">Manaus, AM</p>
                </div>
              </div>
            )}
          </nav>
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
          localityId={PILOT_LOCALITY_ID}
          onCreated={handlePostCreated}
          onClose={handlePostClose}
        />
      )}

      {/* Keyboard shortcut hint */}
      <div className="hidden lg:flex fixed bottom-4 right-4 z-30">
        <span className="flex items-center gap-1.5 text-[10px] text-muted bg-[var(--surface)] border border-border rounded-md px-2 py-1 shadow-[var(--elevation-1)]">
          <Kbd>Ctrl</Kbd>
          <span>+</span>
          <Kbd>B</Kbd>
          <span>para {isRail ? "expandir" : "recolher"}</span>
        </span>
      </div>
    </div>
  )
}
