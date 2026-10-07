"use client"

import {
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronRight,
  Home,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Tent,
} from "lucide-react"
import { usePathname } from "next/navigation"
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { useMemberContext } from "../../../lib/member-context"
import styles from "./app-shell.module.css"
import { BottomNav } from "./bottom-nav"
import { CreatePostModal } from "./feed-post"

interface AppShellProperties {
  children: ReactNode
}

// FIGMA-001 — shell do membro na geometria do Figma atual (topbar 35:3123 e
// sidebar 35:2629). A navegação desta versão NÃO tem Comunidades/Grupos:
// decisão direta do dono em 05/10/2026, reconciliada em
// tests/scope/navigation.test.mjs. As rotas e os dados comunitários continuam
// existindo; apenas saíram dos landmarks de navegação.
//
// Entradas do Figma cujo módulo ainda não existe (Memória, Desapegos,
// Benefícios, Salvos) NÃO são renderizadas como link morto — estão registradas
// como pendências em .visual/opencode-figma-20261005/result.md e entram com os
// lotes que as entregarem.

type SidebarEntry = {
  id: string
  label: string
  href: string
  Icon: typeof Home
}

const PRIMARY_ENTRIES: SidebarEntry[] = [
  { id: "inicio", label: "Início", href: "/inicio", Icon: Home },
]

const LOCAL_ENTRIES: SidebarEntry[] = [
  { id: "negocios", label: "Negócios", href: "/explorar", Icon: Briefcase },
  { id: "imoveis", label: "Imóveis", href: "/imoveis", Icon: Building2 },
  { id: "encontros", label: "Encontros", href: "/events", Icon: CalendarDays },
  { id: "guias", label: "Guias", href: "/guide", Icon: BookOpen },
]

const PERSONAL_ENTRIES: SidebarEntry[] = [
  { id: "conversas", label: "Conversas", href: "/messages", Icon: MessageCircle },
  { id: "atividade", label: "Atividade", href: "/notifications", Icon: Bell },
]

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "—"
  const first = parts[0]?.charAt(0) ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : ""
  return `${first}${last}`.toUpperCase()
}

export function AppShell({ children }: AppShellProperties) {
  const pathname = usePathname()
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { current } = useLocalityContext()
  const { displayName, unreadCount } = useMemberContext()

  // Ctrl+K foca a busca global (a mesma do /explorar, precedente do RECON-036).
  // O hint "Ctrl K" do topbar é texto, não botão: elemento interativo vazio é
  // proibido pelo contrato.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchInputRef.current?.focus()
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

  // Um único aria-current por <nav> visível (regra nav-active da auditoria).
  // Rotas fora dos landmarks (perfil, localidade, publicações…) recaem no
  // container de chegada, como o shell anterior documentava: melhor marcar a
  // chegada do que deixar a navegação sem item atual.
  const activeIdFor = (entry: SidebarEntry): boolean => {
    if (pathname === entry.href || pathname.startsWith(`${entry.href}/`)) return true
    return false
  }
  const anyActive = [...PRIMARY_ENTRIES, ...LOCAL_ENTRIES, ...PERSONAL_ENTRIES].some(activeIdFor)
  const resolvedActive = (entry: SidebarEntry): boolean =>
    activeIdFor(entry) || (!anyActive && entry.id === "inicio")

  const onMessages = pathname === "/messages" || pathname.startsWith("/messages/")

  const renderEntry = (entry: SidebarEntry, badge?: number) => {
    const active = resolvedActive(entry)
    return (
      <a
        key={entry.id}
        href={entry.href}
        aria-current={active ? "page" : undefined}
        className={`${styles["navLink"]} ${active ? styles["navLinkActive"] : ""}`}
      >
        <entry.Icon size={19} aria-hidden="true" />
        <span>{entry.label}</span>
        {badge !== undefined && badge > 0 && <span className={styles["navCount"]}>{badge}</span>}
      </a>
    )
  }

  return (
    <div className={styles["shell"]}>
      {/* ---- Sidebar (md+) ---- */}
      <aside className={styles["sidebar"]}>
        <div className={styles["sidebarTop"]}>
          <span className={styles["brandMark"]} aria-hidden="true">
            <Tent size={23} />
          </span>
          <span>
            <span className={styles["brandWord"]}>Bivaque</span>
            <br />
            <span className={styles["brandSub"]}>A rede da vida militar</span>
          </span>
        </div>

        <button
          type="button"
          className={styles["createButton"]}
          onClick={() => setCreatePostOpen(true)}
        >
          <Plus size={21} aria-hidden="true" />
          Criar na rede
        </button>

        <nav aria-label="Navegação principal" className={styles["sideNav"]}>
          {PRIMARY_ENTRIES.map((entry) => renderEntry(entry))}
          <p className={styles["navSectionLabel"]}>Perto de você</p>
          {LOCAL_ENTRIES.map((entry) => renderEntry(entry))}
          {PERSONAL_ENTRIES.map((entry) =>
            renderEntry(entry, entry.id === "atividade" ? unreadCount : undefined),
          )}
        </nav>

        <div className={styles["sidebarFooter"]}>
          <a
            href="/localidade"
            className={styles["cityCard"]}
            data-testid="shell-locality-pill"
            aria-label={`Sua cidade: ${current.cityName}, ${current.stateCode}. Abrir a página da localidade`}
          >
            <MapPin size={21} aria-hidden="true" />
            <span>
              <span className={styles["cityName"]}>{current.cityName}</span>
              <br />
              <span className={styles["cityHint"]}>Onde você mora</span>
            </span>
          </a>
          <a
            href="/profile"
            className={styles["memberCard"]}
            aria-label={`Abrir o perfil de ${displayName}`}
          >
            <span className={styles["memberAvatar"]} aria-hidden="true">
              {initialsOf(displayName)}
            </span>
            <span className={styles["memberName"]}>{displayName}</span>
            <ChevronRight size={21} aria-hidden="true" />
          </a>
        </div>
      </aside>

      {/* ---- Coluna direita: topbar + conteúdo ---- */}
      <div className={styles["rightColumn"]}>
        <header className={styles["topbar"]}>
          <search className={styles["searchWrap"]}>
            <form action="/explorar" method="get" className={styles["searchForm"]}>
              <Search size={21} aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="search"
                name="search"
                className={styles["searchInput"]}
                placeholder="Buscar na sua rede"
                aria-label="Buscar na sua rede"
              />
              <span className={styles["keyHint"]} aria-hidden="true">
                Ctrl K
              </span>
            </form>
          </search>

          <div className={styles["topbarActions"]}>
            <a
              href="/messages"
              aria-current={onMessages ? "page" : undefined}
              className={`${styles["conversasButton"]} ${onMessages ? styles["conversasButtonActive"] : ""}`}
            >
              Conversas
            </a>
            <a href="/guide" className={styles["ajudaButton"]}>
              Ajuda
            </a>
            <a
              href="/localidade"
              className={styles["cityPill"]}
              aria-label={`Cidade atual: ${current.cityName}, ${current.stateCode}`}
            >
              <MapPin size={16} aria-hidden="true" />
              <span>{current.cityName}</span>
            </a>
            <a href="/notifications" className={styles["iconButton"]} aria-label="Notificações">
              <Bell size={21} aria-hidden="true" />
              {unreadCount > 0 && <span className={styles["badge"]}>{unreadCount}</span>}
            </a>
            <a
              href="/profile"
              className={styles["avatarButton"]}
              aria-label={`Perfil de ${displayName}`}
            >
              {initialsOf(displayName)}
            </a>
          </div>
        </header>

        <main className={styles["main"]} id="conteudo">
          {children}
          {/* Espaço para a bottom nav não cobrir o fim do conteúdo no mobile */}
          <div className="h-20 md:h-0" />
        </main>
      </div>

      {/* ---- Bottom nav (mobile) ---- */}
      <BottomNav />

      {createPostOpen && (
        <CreatePostModal
          localityId={current.id}
          onCreated={handlePostCreated}
          onClose={handlePostClose}
        />
      )}
    </div>
  )
}
