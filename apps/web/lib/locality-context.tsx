"use client"

import { createContext, type ReactNode, useContext } from "react"

// P0 Task 7: the member's current locality, resolved once by the server shell
// and distributed to every client component under (shell)/ via React Context.
//
// The shape is an object, not a string:
//
//   - Object: the onda T (transfer) adds a sibling field (`outbound`) without
//     touching any consumer. Strings become ungovernable the moment a second
//     field is needed.
//   - `current` is non-nullable. The layout resolves and redirects if the
//     member has no membership, so consumers never see the missing case.
//     Eleven `(value ?? "")` fold into one provider, and the invariant lives
//     in the type.
//   - `cityName` is fetched here. The ondas E and F (community shell and
//     guide) need the locality name for nav labels and route titles, and a
//     second query per screen for the same field is the same coupling we
//     are removing.
//
// The provider is mounted once at (shell)/layout.tsx. It does not read the
// database — it only receives the resolved value. The server-side resolver
// lives next to that layout; the client side never knows Supabase is involved.

export type LocalityCurrent = {
  id: string
  cityName: string
  stateCode: string
}

// Onda T Task 4: the leaving link, surfaced to the client. `endsAt` is the
// declared term date (ISO); `readOnly` mirrors the DB's access='read_only'
// flip once degrade_locality_origins() has run past that date. `null` means
// the member never declared a transfer — the common case, and the reason
// every existing consumer of `current` keeps working unchanged.
export type LocalityOutbound = {
  id: string
  cityName: string
  stateCode: string
  endsAt: string
  readOnly: boolean
}

export type LocalityContextValue = {
  current: LocalityCurrent
  outbound: LocalityOutbound | null
}

const LocalityContext = createContext<LocalityContextValue | null>(null)

export function LocalityContextProvider({
  value,
  children,
}: {
  value: LocalityContextValue
  children: ReactNode
}) {
  return <LocalityContext.Provider value={value}>{children}</LocalityContext.Provider>
}

// Throws when called outside the provider. A consumer that runs outside the
// shell is a bug, not a recoverable state — a runtime error is louder than a
// typed-narrowing that everyone learns to ignore.
export function useLocalityContext(): LocalityContextValue {
  const context = useContext(LocalityContext)
  if (context === null) {
    throw new Error(
      "useLocalityContext called outside <LocalityContextProvider>. " +
        "Components that read the current locality must be rendered under (shell)/.",
    )
  }
  return context
}
