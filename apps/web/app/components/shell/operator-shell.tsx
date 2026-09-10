"use client"

// Shell das telas de operação (pranchas 57 e 58), conforme medido na revisão
// independente de 10/09 e corrigido pelo RECON-036:
//  - a busca do cabeçalho, rotulada "Buscar no Bivaque", vai para a busca
//    global do produto (/explorar) — não para /explorar/servicos, que é a
//    busca de prestadores (outro domínio com o mesmo rótulo);
//  - as quatro rotas de operador existentes têm entrada: Admissões, Denúncias,
//    Guia de chegada e Chegadas. "Comunidades" aparece como na prancha, mas
//    aponta para o diretório do membro — pendência nomeada no card RECON-033/
//    RECON-036 até existir fila operacional de comunidades;
//  - o cabeçalho carrega a marca em todas as larguras (375/768/1440);
//  - link "Pular para o conteúdo" com alvo real (id + tabIndex no main);
//  - ícones vêm de lucide-react, como nos outros arquivos do app.
// O rodapé é o MESMO nas duas telas: "← Voltar ao Bivaque" devolve ao produto
// com a sessão preservada; "Sair da operação" encerra a sessão (signOut →
// /login). A semântica de "Sair da operação" é decisão pendente do dono
// (human_decision do RECON-036) — o comportamento atual foi preservado e é o
// que a prova de runtime afirma. Nenhum dos dois é href vazio.

import { brandTokens } from "@bivaque/tokens"
import {
  ArrowLeft,
  Bell,
  BookOpen,
  ChevronDown,
  Flag,
  LogOut,
  MapPin,
  PlaneLanding,
  Search,
  UserRound,
  Users,
} from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "../bivaque/avatar"

const OPERATION_ITEMS: { href: Route; label: string; Icon: typeof Flag }[] = [
  { href: "/admissions", label: "Admissões", Icon: UserRound },
  { href: "/reports", label: "Denúncias", Icon: Flag },
  { href: "/guide-queue", label: "Guia de chegada", Icon: BookOpen },
  { href: "/arrivals", label: "Chegadas", Icon: PlaneLanding },
  // Pranchas 57/58 desenham "Comunidades" como par de Admissões e Denúncias.
  // Não existe fila operacional de comunidades; a entrada aponta para o
  // diretório do membro (/communities) e essa divergência é pendência
  // nomeada no card, não um requisito da prancha fechado.
  { href: "/communities", label: "Comunidades", Icon: Users },
]

const CONTENT_TARGET = "operacao-conteudo"

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

  // Comportamento em vigor, preservado por decisão do contrato: encerra a
  // sessão. A alternativa ("voltar ao início sem deslogar") existe na branch
  // irmã e é human_decision pendente — não decidir aqui.
  async function sairDaOperacao() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  const isActive = (href: Route) => pathname === href || pathname.startsWith(`${href}/`)

  const footer = (
    <>
      <hr className="mx-3 shrink-0 border-border" />
      <div className="shrink-0 p-3">
        <Link
          href="/inicio"
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-[var(--semantic-selected)] hover:text-foreground"
        >
          <ArrowLeft size={20} aria-hidden="true" className="shrink-0" />
          <span>Voltar ao Bivaque</span>
        </Link>
        <button
          type="button"
          onClick={sairDaOperacao}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-[var(--semantic-selected)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-focus)]"
        >
          <LogOut size={20} aria-hidden="true" className="shrink-0" />
          <span>Sair da operação</span>
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--semantic-canvas)]">
      <a
        href={`#${CONTENT_TARGET}`}
        className="fixed left-4 top-4 z-[60] inline-flex min-h-11 -translate-y-32 items-center rounded-lg border border-border bg-[var(--semantic-surface)] px-4 text-sm font-medium shadow-md transition-transform focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-50 border-b border-border bg-[var(--semantic-surface)]">
        <div className="flex h-[var(--semantic-nav-height)] items-center gap-3 px-4">
          <Link
            href="/inicio"
            aria-label="Bivaque, início"
            className="flex min-h-11 shrink-0 items-center rounded-lg px-1 transition-colors hover:bg-[var(--semantic-selected)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-focus)]"
          >
            <span className="text-base font-semibold tracking-tight text-[var(--semantic-action-primary)]">
              {brandTokens.productName}
            </span>
          </Link>
          <div className="flex min-w-0 flex-1 items-center">
            <search className="hidden min-w-0 flex-1 justify-center md:flex">
              <form method="get" action="/explorar" className="flex w-full max-w-md items-center">
                <label htmlFor="operacao-busca" className="sr-only">
                  Buscar no Bivaque
                </label>
                <Search
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none ml-3 -mr-8 shrink-0 text-muted"
                />
                <input
                  id="operacao-busca"
                  type="search"
                  name="search"
                  placeholder="Buscar no Bivaque"
                  className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-[var(--semantic-surface)] py-2 pl-8 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--semantic-focus)]"
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
                <MapPin
                  size={16}
                  aria-hidden="true"
                  className="text-[var(--semantic-action-primary)]"
                />
                {cityLabel}
                <ChevronDown size={16} aria-hidden="true" className="text-muted" />
              </Link>
            )}
            <Link
              href="/notifications"
              aria-label="Notificações"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[var(--semantic-selected)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-focus)]"
            >
              <Bell size={20} aria-hidden="true" />
            </Link>
            <Link
              href="/profile"
              className="flex min-h-11 items-center gap-2 rounded-lg px-1.5 text-sm font-medium transition-colors hover:bg-[var(--semantic-selected)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-focus)]"
            >
              <MemberAvatar name={displayName} size="sm" />
              <span className="hidden max-w-36 truncate lg:inline">{displayName}</span>
              <ChevronDown size={16} aria-hidden="true" className="text-muted" />
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-[var(--semantic-surface)] md:flex">
          <nav aria-label="Operação" className="flex flex-col gap-1 p-3">
            <p className="px-3 pb-1 text-xs uppercase tracking-wide text-muted">Operação</p>
            {OPERATION_ITEMS.map((item) => {
              const active = isActive(item.href)
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
                  <item.Icon size={20} aria-hidden="true" className="shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
          <div className="flex-1" />
          {footer}
        </aside>

        <main id={CONTENT_TARGET} tabIndex={-1} className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      {/* Abaixo de md a coluna não cabe; as mesmas entradas e saídas continuam
          existindo — o operador nunca fica sem caminho de volta. */}
      <nav
        aria-label="Operação (mobile)"
        className="flex gap-1 overflow-x-auto border-t border-border bg-[var(--semantic-surface)] p-2 md:hidden"
      >
        {OPERATION_ITEMS.map((item) => {
          const active = isActive(item.href)
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
              <item.Icon size={20} aria-hidden="true" className="shrink-0" />
              {item.label}
            </Link>
          )
        })}
        <Link
          href="/inicio"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted"
        >
          <ArrowLeft size={20} aria-hidden="true" className="shrink-0" />
          Voltar ao Bivaque
        </Link>
        <button
          type="button"
          onClick={sairDaOperacao}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted"
        >
          <LogOut size={20} aria-hidden="true" className="shrink-0" />
          Sair da operação
        </button>
      </nav>
    </div>
  )
}
