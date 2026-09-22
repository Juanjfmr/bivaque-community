"use client"

import { useEffect, useState } from "react"
import type { GuideTocItem } from "../../../../lib/guide/guide-article"

// Índice "Neste guia" da prancha 25. Os itens vêm DAS seções (buildGuideToc),
// então o índice nunca diverge do corpo. As âncoras são links reais
// (`href="#anchor"`), navegáveis por teclado; o item ativo acompanha a seção
// visível via IntersectionObserver e é marcado com data-active para o leitor
// de tela e para a auditoria de navegação (um único item ativo por nav).
export function GuideToc({ items }: { items: GuideTocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null)

  useEffect(() => {
    if (items.length === 0) return
    const sections = items
      .map((item) => document.getElementById(item.anchor))
      .filter((element): element is HTMLElement => element !== null)
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        const first = visible[0]
        if (!first) return
        const match = items.find((item) => item.anchor === first.target.id)
        if (match) setActiveId(match.id)
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    )

    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [items])

  if (items.length === 0) return null

  return (
    <nav aria-label="Seções deste guia" className="mt-2">
      <ul className="flex flex-col">
        {items.map((item) => {
          const active = item.id === activeId
          return (
            <li key={item.id}>
              <a
                href={`#${item.anchor}`}
                data-active={active ? "true" : undefined}
                aria-current={active ? "true" : undefined}
                className={`flex min-h-11 items-center rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] ${
                  active
                    ? "bg-[var(--semantic-selected)] font-medium text-[var(--semantic-text-primary)]"
                    : "text-[var(--semantic-text-secondary)] hover:bg-[var(--semantic-surface-hover)]"
                }`}
              >
                {item.title}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
