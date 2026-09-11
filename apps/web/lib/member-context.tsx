"use client"

import { createContext, type ReactNode, useContext } from "react"

// G0 (reconstrução visual 2026-09-06): a sidebar do shell (app-shell.tsx) passa
// a mostrar identidade do membro, a lista "Minhas comunidades" e o badge de
// notificações não-lidas. Como o padrão de `locality-context.tsx`: o layout do
// servidor resolve tudo uma vez e distribui via Context; nenhum componente
// cliente sabe que há Supabase envolvido.
//
// Nada aqui é chumbado. `displayName` vem de `profiles.display_name`,
// `communities` de `community_memberships` (status='approved') e `unreadCount`
// de `notifications` (read_at is null), todos RLS-scoped ao caller.

export type MemberCommunity = {
  id: string
  name: string
  /** URL assinada da miniatura atual, ou `null` quando a comunidade não tem. */
  thumbnailUrl: string | null
}

export type MemberContextValue = {
  displayName: string
  communities: MemberCommunity[]
  unreadCount: number
}

const MemberContext = createContext<MemberContextValue | null>(null)

export function MemberContextProvider({
  value,
  children,
}: {
  value: MemberContextValue
  children: ReactNode
}) {
  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>
}

// Lança fora do provider: um consumidor rodando fora do shell é bug, não estado
// recuperável — mesmo contrato de `useLocalityContext`.
export function useMemberContext(): MemberContextValue {
  const context = useContext(MemberContext)
  if (context === null) {
    throw new Error(
      "useMemberContext called outside <MemberContextProvider>. " +
        "Components that read member identity must be rendered under (shell)/.",
    )
  }
  return context
}
