"use client"

// Shell das telas de operação (pranchas 57 e 58). O handoff de 09/09 registrou
// a regressão: o operador ficou sem cabeçalho do produto e sem caminho de
// volta. As pranchas desenham as duas coisas — cabeçalho com busca, cidade,
// sino e identificação, e coluna lateral rotulada OPERAÇÃO com saída no
// rodapé. O rodapé é o MESMO nas duas telas: "← Voltar ao Bivaque" devolve ao
// produto; "Sair da operação" encerra a sessão. Nenhum dos dois é href vazio.

import { brandTokens } from "@bivaque/tokens"
import type { Route } from "next"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "../bivaque/avatar"

const OPERATION_ITEMS = [
  { href: "/admissions" as Route, label: "Admissões", Icon: AdmissionsIcon },
  { href: "/reports" as Route, label: "Denúncias", Icon: ReportsIcon },
  { href: "/communities" as Route, label: "Comunidades", Icon: CommunitiesIcon },
]

export function OperatorShell({
  displayName,
  cityLabel,
  children,
}: {
  displayName: string
  cityLabel: string | null
  children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function sairDaOperacao() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  const footer = (
    <>
      <hr className="mx-3 shrink-0 border-border" />
      <div className="shrink-0 p-3">
        <Link
          href="/inicio"
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-[var(--semantic-selected)] hover:text-foreground"
        >
          <ArrowLeftIcon />
          <span>Voltar ao Bivaque</span>
        </Link>
        <button
          type="button"
          onClick={sairDaOperacao}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-[var(--semantic-selected)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-focus)]"
        >
          <ExitIcon />
          <span>Sair da operação</span>
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--semantic-canvas)]">
      <header className="sticky top-0 z-50 border-b border-border bg-[var(--semantic-surface)]">
        <div className="flex h-[var(--semantic-nav-height)] items-center gap-3 px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <search className="hidden min-w-0 flex-1 justify-center md:flex">
              <form
                method="get"
                action="/explorar/servicos"
                className="flex w-full max-w-md items-center"
              >
                <label htmlFor="operacao-busca" className="sr-only">
                  Buscar no Bivaque
                </label>
                <SearchIcon />
                <input
                  id="operacao-busca"
                  type="search"
                  name="search"
                  placeholder="Buscar no Bivaque"
                  className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-[var(--semantic-surface)] py-2 pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--semantic-focus)]"
                />
              </form>
            </search>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {cityLabel && (
              <Link
                href="/localidade"
                className="hidden min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors hover:bg-[var(--semantic-selected)] sm:inline-flex"
              >
                <MapIcon />
                {cityLabel}
                <ChevronDownIcon />
              </Link>
            )}
            <Link
              href="/notifications"
              aria-label="Notificações"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[var(--semantic-selected)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-focus)]"
            >
              <BellIcon />
            </Link>
            <Link
              href="/profile"
              className="flex min-h-11 items-center gap-2 rounded-lg px-1.5 text-sm font-medium transition-colors hover:bg-[var(--semantic-selected)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-focus)]"
            >
              <MemberAvatar name={displayName} size="sm" />
              <span className="hidden max-w-36 truncate lg:inline">{displayName}</span>
              <ChevronDownIcon />
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-[var(--semantic-surface)] md:flex">
          <div className="flex h-[var(--semantic-nav-height)] items-center border-b border-border px-4">
            <span className="text-base font-semibold tracking-tight text-[var(--semantic-action-primary)]">
              {brandTokens.productName}
            </span>
          </div>
          <nav aria-label="Operação" className="flex flex-col gap-1 p-3">
            <p className="px-3 pb-1 text-xs uppercase tracking-wide text-muted">Operação</p>
            {OPERATION_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[var(--semantic-selected)] text-[var(--semantic-action-primary)]"
                      : "text-muted hover:bg-[var(--semantic-selected)] hover:text-foreground"
                  }`}
                >
                  <item.Icon />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
          <div className="flex-1" />
          {footer}
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Abaixo de md a coluna não cabe; as mesmas saídas e seções continuam
          existindo — o operador nunca fica sem caminho de volta. */}
      <nav
        aria-label="Operação (mobile)"
        className="flex gap-1 overflow-x-auto border-t border-border bg-[var(--semantic-surface)] p-2 md:hidden"
      >
        {OPERATION_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium ${
                active
                  ? "bg-[var(--semantic-selected)] text-[var(--semantic-action-primary)]"
                  : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          )
        })}
        <Link
          href="/inicio"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted"
        >
          <ArrowLeftIcon />
          Voltar ao Bivaque
        </Link>
        <button
          type="button"
          onClick={sairDaOperacao}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted"
        >
          <ExitIcon />
          Sair da operação
        </button>
      </nav>
    </div>
  )
}

function AdmissionsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </svg>
  )
}

function ReportsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  )
}

function CommunitiesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden="true"
      className="pointer-events-none ml-3 -mr-9 h-4 w-4 text-muted"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function MapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 text-[var(--semantic-action-primary)]"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 text-muted"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}

function ExitIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}
