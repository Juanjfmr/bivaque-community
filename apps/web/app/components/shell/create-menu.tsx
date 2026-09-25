"use client"

import type { LucideIcon } from "lucide-react"
import { CalendarPlus, House, MapPin, MessageCircle, Plus, ShoppingBag, X } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { ASK_INDICATION_HREF } from "../../../lib/recommendations/request-tab"

/** Disparado pelo shell quando uma pergunta é publicada pelo menu de criação,
 *  para a tela aberta (o Início, por exemplo) recarregar o que mostra. */
export const POST_CREATED_EVENT = "bivaque:post-created"

// Tudo que se pode criar no Bivaque, num lugar só, em toda tela do membro
// (referências: Jobber, Airwallex, Pangea). No telefone é um botão flutuante
// acima da barra inferior; do tablet para cima, o mesmo menu abre do botão
// "Criar" no cabeçalho. Quem decide em que rota ele aparece é
// create-visibility.ts; quem monta os dois é o AppShell.
//
// Comportamento de menu de verdade: Esc fecha, o foco entra no primeiro item ao
// abrir e volta ao botão ao fechar, clique no véu fecha, e cada item é um link
// ou botão real — nada de div clicável.

interface CreateAction {
  key: string
  label: string
  hint: string
  icon: LucideIcon
  href?: string
}

const ACTIONS: CreateAction[] = [
  { key: "pergunta", label: "Fazer uma pergunta", hint: "Para a comunidade", icon: MessageCircle },
  {
    key: "indicacao",
    label: "Pedir uma indicação",
    hint: "Serviço ou lugar de confiança",
    icon: MapPin,
    href: ASK_INDICATION_HREF,
  },
  {
    key: "mercado",
    label: "Anunciar no Mercado",
    hint: "Vender ou doar",
    icon: ShoppingBag,
    href: "/mercado/novo",
  },
  {
    key: "imovel",
    label: "Anunciar imóvel",
    hint: "Aluguel ou venda",
    icon: House,
    href: "/imoveis/novo",
  },
  {
    key: "encontro",
    label: "Criar encontro",
    hint: "Chame a cidade",
    icon: CalendarPlus,
    href: "/events/novo",
  },
]

// Entrada escalonada de baixo para cima: o item mais perto do botão chega primeiro.
const FAB_DELAYS = [
  "[animation-delay:120ms]",
  "[animation-delay:90ms]",
  "[animation-delay:60ms]",
  "[animation-delay:30ms]",
  "[animation-delay:0ms]",
]

function useMenu() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const close = useCallback((returnFocus = true) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>("a, button")?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, close])

  return { open, setOpen, close, triggerRef, listRef }
}

function ActionItems({
  onAsk,
  onDone,
  variant,
}: {
  onAsk: () => void
  onDone: () => void
  variant: "fab" | "popover"
}) {
  return (
    <>
      {ACTIONS.map((action, index) => {
        const content =
          variant === "fab" ? (
            <>
              <span className="rounded-full bg-ui-surface px-3 py-1.5 text-sm font-semibold text-ui-ink shadow-ui-hover">
                {action.label}
              </span>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ui-surface text-ui-brand shadow-ui-hover">
                <action.icon size={20} aria-hidden="true" />
              </span>
            </>
          ) : (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ui-brand-soft text-ui-brand">
                <action.icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-sm font-semibold text-ui-ink">{action.label}</span>
                <span className="block text-xs text-ui-ink-2">{action.hint}</span>
              </span>
            </>
          )
        const className =
          variant === "fab"
            ? `motion-fab-item ${FAB_DELAYS[index] ?? ""} flex min-h-12 items-center justify-end gap-3`
            : "flex min-h-11 w-full items-center gap-3 rounded-ui px-3 py-2 transition-colors hover:bg-ui-subtle"
        return (
          <li key={action.key}>
            {action.href ? (
              <Link href={action.href as Route} className={className} onClick={onDone}>
                {content}
              </Link>
            ) : (
              <button
                type="button"
                className={className}
                onClick={() => {
                  onDone()
                  onAsk()
                }}
              >
                {content}
              </button>
            )}
          </li>
        )
      })}
    </>
  )
}

/** Quanto rolar numa direção antes de o botão reagir: tremida de dedo não conta. */
const SCROLL_SLACK = 12
/** Perto do topo o botão fica sempre à vista. */
const SCROLL_TOP_ZONE = 96

// Rolar para baixo é ler: o botão sai do caminho do conteúdo (ele cobria o fim
// das linhas e o "Ver tudo" das seções). Rolar para cima é procurar: ele volta.
// Referência: o botão estendido do Material e o compositor do Threads. O
// contêiner que rola é o `main` do shell, não a janela.
function useHideOnScrollDown(disabled: boolean) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (disabled) {
      setHidden(false)
      return
    }
    const scroller = document.querySelector("main")
    if (!scroller) return
    let anchor = scroller.scrollTop
    const onScroll = () => {
      const y = scroller.scrollTop
      if (y < SCROLL_TOP_ZONE) {
        setHidden(false)
        anchor = y
        return
      }
      if (y - anchor > SCROLL_SLACK) {
        setHidden(true)
        anchor = y
      } else if (anchor - y > SCROLL_SLACK) {
        setHidden(false)
        anchor = y
      }
    }
    scroller.addEventListener("scroll", onScroll, { passive: true })
    return () => scroller.removeEventListener("scroll", onScroll)
  }, [disabled])

  return { hidden, reveal: () => setHidden(false) }
}

/** Botão flutuante do telefone (abaixo de md, onde existe a barra inferior). */
export function CreateFab({ onAsk }: { onAsk: () => void }) {
  const { open, setOpen, close, triggerRef, listRef } = useMenu()
  const menuId = useId()
  const { hidden, reveal } = useHideOnScrollDown(open)

  return (
    <div className="md:hidden">
      {open ? (
        <button
          type="button"
          aria-label="Fechar menu de criação"
          tabIndex={-1}
          onClick={() => close()}
          className="motion-scrim-enter fixed inset-0 z-[45] bg-ui-ink/40 backdrop-blur-[2px]"
        />
      ) : null}
      {/* Escondido continua no DOM e na ordem de foco: quem chega por teclado
          ou leitor de tela o encontra, e o foco o traz de volta à vista. */}
      <div
        className={`fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-50 flex flex-col items-end gap-3 transition-[opacity,transform] duration-200 motion-reduce:transition-none ${
          hidden ? "pointer-events-none translate-y-24 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        {open ? (
          <ul
            id={menuId}
            ref={listRef}
            aria-label="Criar"
            className="flex flex-col items-end gap-3"
          >
            <ActionItems onAsk={onAsk} onDone={() => close(false)} variant="fab" />
          </ul>
        ) : null}
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-label={open ? "Fechar menu de criação" : "Criar"}
          onClick={() => setOpen(!open)}
          onFocus={reveal}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-ui-brand text-ui-on-brand shadow-ui-hover transition-colors hover:bg-ui-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-brand focus-visible:ring-offset-2"
        >
          <span className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
            {open ? <X size={24} aria-hidden="true" /> : <Plus size={26} aria-hidden="true" />}
          </span>
        </button>
      </div>
    </div>
  )
}

/** O mesmo menu no desktop, aberto de um botão ao lado da saudação. */
export function CreateButton({ onAsk }: { onAsk: () => void }) {
  const { open, setOpen, close, triggerRef, listRef } = useMenu()
  const menuId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) close(false)
    }
    window.addEventListener("pointerdown", onPointer)
    return () => window.removeEventListener("pointerdown", onPointer)
  }, [open, close])

  return (
    <div ref={wrapRef} className="relative hidden md:block">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-ui-brand px-5 text-sm font-semibold text-ui-on-brand shadow-ui transition-colors hover:bg-ui-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-brand focus-visible:ring-offset-2"
      >
        <Plus
          size={18}
          aria-hidden="true"
          className={`transition-transform duration-200 ${open ? "rotate-45" : ""}`}
        />
        Criar
      </button>
      {open ? (
        <div className="motion-card-enter absolute top-full right-0 z-30 mt-2 w-72 rounded-ui-lg border border-ui-line bg-ui-surface p-2 shadow-ui-hover">
          <ul id={menuId} ref={listRef} aria-label="Criar">
            <ActionItems onAsk={onAsk} onDone={() => close(false)} variant="popover" />
          </ul>
        </div>
      ) : null}
    </div>
  )
}
