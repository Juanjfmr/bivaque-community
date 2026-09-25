"use client"

import { ArrowUp } from "lucide-react"
import { type RefObject, useCallback, useEffect, useRef, useState } from "react"

// Barra de seções retrátil (referências: Fixtured, Apple News, Hulu). Enquanto a
// grade de atalhos está na tela ela não existe para ninguém — nem visual, nem
// para leitor de tela, nem para o Tab. Quando a grade sai por cima, a barra
// desce fixa no topo da coluna e passa a ser o índice da página: um toque leva
// à seção, e a seção sob os olhos fica marcada enquanto se rola.
//
// Só abaixo de 1024px: no desktop a lateral e o trilho já dão o mapa inteiro.
// Mora num contêiner de altura zero, então aparecer e sumir não empurra nada.
//
// Atalho e chip nunca se confundem: os atalhos SAEM da página (vão à vertical);
// a barra só ROLA dentro dela. Por isso ela abre com "voltar aos atalhos" — a
// seta diz que aqui se anda pela página — e lista só as seções que existem,
// na ordem em que aparecem (que muda com a novidade).

export interface SectionLink {
  id: string
  label: string
}

export function SectionNav({
  sections,
  triggerRef,
}: {
  sections: readonly SectionLink[]
  triggerRef: RefObject<HTMLElement | null>
}) {
  const [shown, setShown] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const chipRefs = useRef(new Map<string, HTMLButtonElement>())
  const sectionKey = sections.map((section) => section.id).join("|")

  // Aparece quando a grade de atalhos sai da tela por cima.
  useEffect(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return
      setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0)
    })
    observer.observe(trigger)
    return () => observer.disconnect()
  }, [triggerRef])

  // Seção ativa: a que cruza a faixa logo abaixo da barra.
  // biome-ignore lint/correctness/useExhaustiveDependencies: sectionKey é a identidade estável da lista de seções
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    )
    for (const section of sections) {
      const element = document.getElementById(section.id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [sectionKey])

  // O chip ativo sempre visível na própria fileira.
  useEffect(() => {
    if (!active) return
    chipRefs.current.get(active)?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [active])

  const jump = useCallback((id: string) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" })
    setActive(id)
  }, [])

  // O contêiner que rola é o `main` do shell, não a janela.
  const toTop = useCallback(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    triggerRef.current?.closest("main")?.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
    setActive(null)
  }, [triggerRef])

  return (
    <div className="sticky top-0 z-20 -mx-4 h-0 lg:hidden">
      <div
        inert={!shown}
        aria-hidden={!shown}
        className={`border-b border-ui-line bg-ui-surface/95 px-4 py-2 shadow-ui backdrop-blur transition-[opacity,transform] duration-200 ${
          shown ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"
        }`}
      >
        <nav aria-label="Seções do Início" className="flex items-center gap-2">
          <button
            type="button"
            onClick={toTop}
            aria-label="Voltar aos atalhos"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ui-ink-2 transition-colors hover:bg-ui-subtle hover:text-ui-ink"
          >
            <ArrowUp size={18} aria-hidden="true" />
          </button>
          <span aria-hidden="true" className="h-6 w-px shrink-0 bg-ui-line" />
          <ul className="flex min-w-0 gap-2 overflow-x-auto">
            {sections.map((section) => {
              const isActive = active === section.id
              return (
                <li key={section.id} className="shrink-0">
                  <button
                    type="button"
                    ref={(node) => {
                      if (node) chipRefs.current.set(section.id, node)
                      else chipRefs.current.delete(section.id)
                    }}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => jump(section.id)}
                    className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-ui-brand text-ui-on-brand"
                        : "bg-ui-bg text-ui-ink-2 hover:bg-ui-subtle hover:text-ui-ink"
                    }`}
                  >
                    {section.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}
