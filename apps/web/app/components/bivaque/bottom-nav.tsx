"use client"

import {
  ChatBubbleLeftRightIcon,
  HomeIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline"
import {
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightSolid,
  HomeIcon as HomeSolid,
  UserCircleIcon as UserCircleSolid,
  UserGroupIcon as UserGroupSolid,
} from "@heroicons/react/24/solid"
import { Tabs } from "@heroui/react"
import { usePathname } from "next/navigation"
import type { ElementType, SVGProps } from "react"
import { type PrimaryContainer, resolveActiveNav } from "../shell/active-nav"

export interface NavItem {
  id: PrimaryContainer
  label: string
  shortLabel?: string
  href: string
  Icon: ElementType<SVGProps<SVGSVGElement>>
  IconActive: ElementType<SVGProps<SVGSVGElement>>
}

// ── Os containers de navegação ──────────────────────────────────────────────
//
// A barra de baixo segue o protótipo (ADR-20261023-comunidade-do-prototipo,
// seção "Navegação e estrutura"), que substitui os quatro containers do
// PROCESSO-DE-CONSTRUCAO §7 (Início/Explorar/Comunidades/Perfil). São quatro,
// como em prototypes/bivaque-html/src/shell/navigation.js:65:
//
//   - "inicio"     → o Início: a descoberta da cidade (Guia, Mercado, Imóveis,
//                    encontros, serviços), como no activeTab() do protótipo.
//   - "comunidade" → a Comunidade da cidade (o `#comunidade` do protótipo):
//                    perguntas e respostas (Indicações) e os Grupos. A vila
//                    saiu desta versão; as rotas antigas redirecionam para cá.
//   - "conversas"  → as mensagens privadas, em /messages. O protótipo põe
//                    "Conversas" na barra e abre a caixa de conversas; o
//                    comentário que dizia "não há inbox" era da versão anterior
//                    e está corrigido.
//   - "voce"       → a pessoa: o que antes era Perfil, mais Salvos, Meus
//                    anúncios, Ocultados, Bloqueados, Privacidade, Conduta e
//                    Ajuda, como no activeTab() do protótipo.
//
// Explorar, /mercado, /negocio, Guia, Agenda e Salvos saem da barra e ganham
// porta dentro dessas quatro entradas (prova em
// scripts/visual/flows/reachability.mjs, card NAV-BECOS-SEM-SAIDA).
//
// REGRA FALSIFICÁVEL (ADR-20260816, regra 2, preservada): se um destino novo
// não couber em nenhum container, o destino está confuso — pare e reporte;
// NÃO adicione uma aba. Teto de cinco itens; quatro ≤ cinco.
export const NAV_ITEMS: NavItem[] = [
  {
    id: "inicio",
    label: "Início",
    shortLabel: "Início",
    href: "/inicio",
    Icon: HomeIcon,
    IconActive: HomeSolid,
  },
  {
    id: "comunidade",
    label: "Comunidade",
    shortLabel: "Comunidade",
    href: "/community",
    Icon: UserGroupIcon,
    IconActive: UserGroupSolid,
  },
  {
    id: "conversas",
    label: "Conversas",
    shortLabel: "Conversas",
    href: "/messages",
    Icon: ChatBubbleLeftRightIcon,
    IconActive: ChatBubbleLeftRightSolid,
  },
  {
    id: "voce",
    label: "Você",
    shortLabel: "Você",
    href: "/profile",
    Icon: UserCircleIcon,
    IconActive: UserCircleSolid,
  },
]

function NavIcon({
  Icon,
  IconActive,
  active,
}: {
  Icon: ElementType<SVGProps<SVGSVGElement>>
  IconActive: ElementType<SVGProps<SVGSVGElement>>
  active: boolean
}) {
  const fade = "transition-opacity duration-[var(--semantic-motion-duration-fast)]"
  return (
    <span className="relative inline-flex h-5 w-5" aria-hidden="true">
      <Icon
        className={`absolute inset-0 h-5 w-5 ${fade} ${active ? "opacity-0" : "opacity-100"}`}
      />
      <IconActive
        className={`absolute inset-0 h-5 w-5 ${fade} ${active ? "opacity-100" : "opacity-0"}`}
      />
    </span>
  )
}

export function BottomNav({
  origin,
  onNavigate,
}: {
  origin: PrimaryContainer
  onNavigate: (origin: PrimaryContainer) => void
}) {
  const pathname = usePathname()

  const items = NAV_ITEMS

  // A MESMA regra da lateral (active-nav.ts). Antes a barra tinha a própria:
  // casava só o prefixo do item e caía em "Início" para todo o resto — então
  // /community acendia Início no celular enquanto a lateral do desktop acendia
  // o lugar certo (25/09/2026). Destinos compartilhados agora herdam a raiz
  // recente, como `origin` em activeTab() do protótipo. Salvos,
  // que o protótipo põe em Você, fica em Você aqui também (é coisa da pessoa);
  // O componente de abas não tem "nenhuma selecionada"; "Início" fica só como
  // último recurso para rota sem área declarada — o que, dentro do shell, o
  // teste de escopo de active-nav já impede.
  const active = resolveActiveNav(pathname, items, origin)
  const selectedKey =
    active.kind === "primary" ? active.id : active.kind === "secondary" ? "voce" : "inicio"

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ui-line bg-ui-surface pb-[env(safe-area-inset-bottom,0px)] md:hidden"
    >
      <Tabs selectedKey={selectedKey} variant="primary" aria-label="Navegação principal">
        <Tabs.List aria-label="Seções do aplicativo" className="flex justify-around">
          {items.map((item) => (
            <Tabs.Tab
              key={item.id}
              id={item.id}
              href={item.href}
              onClick={() => onNavigate(item.id)}
              className="flex h-16 min-w-11 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium text-ui-ink-2 data-[selected=true]:text-ui-brand"
            >
              {/* Pílula atrás do ícone ativo, como na prancha 00. */}
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${selectedKey === item.id ? "bg-ui-brand-soft" : ""}`}
              >
                <NavIcon
                  Icon={item.Icon}
                  IconActive={item.IconActive}
                  active={selectedKey === item.id}
                />
              </span>
              <span>{item.shortLabel ?? item.label}</span>
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
    </nav>
  )
}
