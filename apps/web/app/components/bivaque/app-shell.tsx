"use client"

import { brandTokens } from "@bivaque/tokens"
import type { LucideIcon } from "lucide-react"
import { Bell, Bookmark, Lightbulb, MapPin, MessageCircle, Settings } from "lucide-react"
import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { type ReactNode, useCallback, useRef, useState } from "react"
import { communityImageAltText } from "../../../lib/communities/community-media"
import { useLocalityContext } from "../../../lib/locality-context"
import { useMemberContext } from "../../../lib/member-context"
import { GlobalSearchField } from "../search/global-search-field"
import { resolveActiveNav } from "../shell/active-nav"
import { CitySwitcher } from "../shell/city-switcher"
import { CreateButton, CreateFab, POST_CREATED_EVENT } from "../shell/create-menu"
import { showsCreateAction } from "../shell/create-visibility"
import { useHideOnScroll } from "../shell/use-hide-on-scroll"
import { MemberAvatar } from "./avatar"
import { BottomNav, NAV_ITEMS } from "./bottom-nav"

interface AppShellProperties {
  children: ReactNode
}

// Reconstrução de 25/09/2026, sistema visual mínimo (app/ui-theme.css).
//
// A lateral ocupa a altura inteira e carrega a marca, como na prancha 01; o
// cabeçalho vive na coluna do conteúdo. As três larguras são só CSS — nada de
// matchMedia no render: abaixo de md a navegação é a BottomNav; de md a lg a
// lateral é um trilho de ícones (64px); de lg para cima, 256px com rótulos.
// Os rótulos ficam na árvore de acessibilidade no trilho (sr-only), então o
// link continua nomeado em qualquer largura.
//
// Contratos preservados: exatamente um landmark "Navegação principal" visível
// por largura; o item ativo vem da ROTA (resolveActiveNav); a cidade atual
// aparece no cabeçalho e no rodapé da lateral (DS-010); Indicações é entrada
// nomeada em toda largura (RECON-038 #4); conversas e avatar no cabeçalho.

const NAV_LINK =
  "flex h-11 items-center gap-3 rounded-ui px-3 text-sm font-medium transition-colors md:max-lg:justify-center md:max-lg:px-0"
const NAV_IDLE = "text-ui-ink-2 hover:bg-ui-subtle hover:text-ui-ink"
const NAV_ACTIVE = "bg-ui-brand-soft font-semibold text-ui-brand"
const RAIL_LABEL = "md:max-lg:sr-only"
const ICON_BUTTON =
  "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-ui text-ui-ink-2 transition-colors hover:bg-ui-subtle hover:text-ui-ink"

// O modal de pergunta só é baixado quando alguém pede: o shell envolve toda rota,
// e o compositor não precisa pesar nas telas em que ninguém publica.
const CreatePostModal = dynamic(
  () => import("./feed-post-create").then((module) => module.CreatePostModal),
  { ssr: false },
)

export function AppShell({ children }: AppShellProperties) {
  const pathname = usePathname()
  const activeNav = resolveActiveNav(pathname, NAV_ITEMS)
  const searchRowRef = useRef<HTMLDivElement>(null)
  const { hidden: searchHidden } = useHideOnScroll({ keepWhileFocused: searchRowRef })
  const { current } = useLocalityContext()
  const { communities, displayName, unreadCount, unreadConversations } = useMemberContext()
  const cityLabel = `${current.cityName}, ${current.stateCode}`
  // Criar está em toda rota do membro, menos onde atrapalha (conversa aberta,
  // formulário, configurações) — ver create-visibility.ts.
  const showCreate = showsCreateAction(pathname)
  const [askOpen, setAskOpen] = useState(false)
  const openAsk = useCallback(() => setAskOpen(true), [])

  return (
    <div className="flex h-dvh overflow-hidden bg-ui-bg text-ui-ink">
      <aside className="hidden shrink-0 flex-col border-r border-ui-line bg-ui-surface md:flex md:w-16 lg:w-64">
        <div className="flex h-16 shrink-0 items-center px-5 md:max-lg:justify-center md:max-lg:px-0">
          <Link
            href="/inicio"
            aria-label={`${brandTokens.productName}, início`}
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-ui px-1 text-lg font-bold tracking-[0.06em] text-ui-brand uppercase transition-colors hover:text-ui-brand-hover"
          >
            <span aria-hidden="true" className="lg:hidden">
              {brandTokens.productName.charAt(0).toUpperCase()}
            </span>
            <span aria-hidden="true" className="hidden lg:inline">
              {brandTokens.productName.toUpperCase()}
            </span>
          </Link>
        </div>

        <nav
          aria-label="Navegação principal"
          className="flex flex-col gap-1 px-3 pt-2 md:max-lg:px-2"
        >
          {NAV_ITEMS.map((item) => {
            const active = activeNav.kind === "primary" && activeNav.id === item.id
            const Icon = active ? item.IconActive : item.Icon
            return (
              <a
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${NAV_LINK} ${active ? NAV_ACTIVE : NAV_IDLE}`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className={RAIL_LABEL}>{item.label}</span>
              </a>
            )
          })}

          <hr className="my-2 border-ui-line" />

          {/* Salvos e Notificações são destinos secundários no MESMO landmark:
              a auditoria exige um único aria-current por <nav> visível. */}
          <SidebarSecondaryItem
            href="/salvos"
            label="Salvos"
            Icon={Bookmark}
            active={activeNav.kind === "secondary" && activeNav.href === "/salvos"}
          />
          <SidebarSecondaryItem
            href="/notifications"
            label="Notificações"
            Icon={Bell}
            badge={unreadCount}
          />
        </nav>

        {/* Sem comunidade aprovada, a seção inteira some — nunca um título vazio. */}
        {communities.length > 0 && (
          <section
            aria-label="Minhas comunidades"
            className="mt-4 flex min-h-0 flex-col gap-1 overflow-y-auto border-t border-ui-line px-3 pt-4 md:max-lg:px-2"
          >
            <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-ui-ink-2 uppercase md:max-lg:sr-only">
              Minhas comunidades
            </p>
            {communities.map((community) => (
              <SidebarCommunityItem
                key={community.id}
                id={community.id}
                name={community.name}
                thumbnailUrl={community.thumbnailUrl}
              />
            ))}
          </section>
        )}

        <div className="flex-1" />

        {/* Rodapé: cidade, pessoa e Configurações. A cidade vem do mesmo
            contexto do cabeçalho (DS-010), nunca de texto fixo. */}
        <div className="shrink-0 border-t border-ui-line p-3 md:max-lg:px-2">
          <div className="flex items-center gap-3 px-3 py-2 md:max-lg:justify-center md:max-lg:px-0">
            <MemberAvatar name={displayName} size="sm" />
            <div className="min-w-0 flex-1 md:max-lg:sr-only">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="flex items-center gap-1 truncate text-xs text-ui-ink-2">
                <MapPin size={12} className="shrink-0" aria-hidden="true" />
                {cityLabel}
              </p>
            </div>
          </div>
          <a href="/configuracoes" className={`${NAV_LINK} ${NAV_IDLE}`}>
            <Settings size={20} className="shrink-0" aria-hidden="true" />
            <span className={RAIL_LABEL}>Configurações</span>
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-ui-line bg-ui-surface">
          <div className="flex h-16 items-center gap-2 px-4 lg:px-6">
            <Link
              href="/inicio"
              aria-label={`${brandTokens.productName}, início`}
              className="inline-flex h-11 items-center rounded-ui px-1 text-lg font-bold tracking-[0.06em] text-ui-brand uppercase transition-colors hover:text-ui-brand-hover md:hidden"
            >
              <span aria-hidden="true">{brandTokens.productName.toUpperCase()}</span>
            </Link>

            <div className="hidden max-w-md flex-1 md:block">
              <GlobalSearchField />
            </div>

            <div className="flex-1" />

            {showCreate ? <CreateButton onAsk={openAsk} /> : null}

            <CitySwitcher />

            {/* Nome acessível pelo aria-label em toda largura; o texto visível
                entra a partir de lg, onde há espaço para ele. */}
            <a
              href="/community?vista=indicacoes"
              aria-label="Indicações"
              className={`${ICON_BUTTON} lg:w-auto lg:gap-1.5 lg:px-3 lg:text-sm lg:font-medium`}
            >
              <Lightbulb size={20} aria-hidden="true" />
              <span aria-hidden="true" className="hidden lg:inline">
                Indicações
              </span>
            </a>

            {/* Caixa de conversas (MSG-SEM-ENTRADA, decisão de 22/09/2026). */}
            <a
              href="/messages"
              aria-label={conversationsLabel(unreadConversations)}
              className={ICON_BUTTON}
            >
              <MessageCircle size={20} aria-hidden="true" />
              {unreadConversations > 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-1 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ui-brand px-1 text-xs leading-5 font-semibold text-ui-on-brand"
                >
                  {unreadConversations > 99 ? "99+" : unreadConversations}
                </span>
              ) : null}
            </a>

            <a href="/notifications" aria-label="Notificações" className={ICON_BUTTON}>
              <Bell size={20} aria-hidden="true" />
              {unreadCount > 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-ui-danger"
                />
              ) : null}
            </a>

            {/* No celular o avatar repetia a aba Perfil da barra inferior. */}
            <a
              href="/profile"
              aria-label="Perfil"
              className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-ui-subtle md:flex"
            >
              <MemberAvatar name={displayName} size="sm" />
            </a>
          </div>

          {/* No telefone a busca desce para uma segunda linha, larga, como o
              campo da prancha 00 — e recolhe ao rolar para baixo (ler) e volta
              ao rolar para cima (procurar), como o botão de criação. Aberta a
              tela, ela está lá; lendo, o cabeçalho cede 57px ao conteúdo.
              Enquanto alguém digita nela, não some. */}
          <div
            ref={searchRowRef}
            className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none md:hidden ${
              searchHidden ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
            }`}
          >
            <div className="overflow-hidden" inert={searchHidden}>
              <div className="px-4 pb-3">
                <GlobalSearchField />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
          {/* Folga para o conteúdo não ficar sob a BottomNav — e, quando existe,
              sob o botão flutuante de criação. */}
          <div className={showCreate ? "h-28 md:h-0" : "h-20 md:h-0"} />
        </main>
      </div>

      <BottomNav />

      {showCreate ? <CreateFab onAsk={openAsk} /> : null}

      {/* Pergunta aberta pelo menu de criação. A audiência começa na cidade (a
          pessoa escolhe outra no próprio compositor); ao publicar, a tela aberta
          é avisada para recarregar o que mostra. */}
      {askOpen ? (
        <CreatePostModal
          localityId={current.id}
          initialAttachment="text"
          onCreated={() => window.dispatchEvent(new Event(POST_CREATED_EVENT))}
          onClose={() => setAskOpen(false)}
        />
      ) : null}
    </div>
  )
}

// O badge só existe com contagem positiva: "0" é proibido pelo contrato visual.
function SidebarSecondaryItem({
  href,
  label,
  Icon,
  badge,
  active = false,
}: {
  href: string
  label: string
  Icon: LucideIcon
  badge?: number
  active?: boolean
}) {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${NAV_LINK} ${active ? NAV_ACTIVE : NAV_IDLE}`}
    >
      <Icon size={20} className="shrink-0" aria-hidden="true" />
      <span className={RAIL_LABEL}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto rounded-full bg-ui-brand px-1.5 text-xs font-semibold text-ui-on-brand md:max-lg:hidden">
          {badge}
        </span>
      )}
    </a>
  )
}

// Miniatura real quando a comunidade tem uma; a inicial é o recuo honesto.
function SidebarCommunityItem({
  id,
  name,
  thumbnailUrl,
}: {
  id: string
  name: string
  thumbnailUrl: string | null
}) {
  return (
    <a href={`/communities/${id}`} className={`${NAV_LINK} ${NAV_IDLE}`}>
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt={communityImageAltText("thumbnail")}
          width={28}
          height={28}
          unoptimized
          loading="lazy"
          className="h-7 w-7 shrink-0 rounded-ui object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-ui bg-ui-brand-soft text-xs font-semibold text-ui-brand"
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className={`min-w-0 truncate ${RAIL_LABEL}`}>{name}</span>
    </a>
  )
}

function conversationsLabel(unread: number): string {
  if (unread === 0) return "Conversas"
  return unread === 1 ? "Conversas, 1 com mensagem nova" : `Conversas, ${unread} com mensagem nova`
}
