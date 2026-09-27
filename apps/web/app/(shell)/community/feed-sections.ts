import { countInWindow, type NoveltyWindow } from "../inicio/novelty"

// O feed da Comunidade dividido no tempo (25/09/2026). Referências do Mobbin:
// "New / Seen" das atividades do Sora e "Today / Last 7 days" do Nextdoor.
//
// Com visita anterior, a divisão que importa é o que chegou desde então. Sem
// ela (primeira visita), a divisão é pelo calendário. Uma seção só não ganha
// rótulo — rótulo sozinho em cima de tudo não separa nada.

const DAY_MS = 24 * 60 * 60 * 1000

export interface FeedSection<T> {
  /** null quando a lista inteira é uma seção só. */
  label: string | null
  posts: T[]
  /** Só "Novas desde…" mostra quantas: "343 anteriores" é ruído, não notícia. */
  showCount?: boolean
}

function startOfDay(date: Date): number {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy.getTime()
}

export function sectionFeed<T extends { created_at: string }>(
  posts: readonly T[],
  now: Date,
  novelty: NoveltyWindow | null | undefined,
): FeedSection<T>[] {
  let sections: FeedSection<T>[]

  if (novelty) {
    const fresh = posts.filter((post) => countInWindow([post.created_at], novelty) === 1)
    const rest = posts.filter((post) => countInWindow([post.created_at], novelty) === 0)
    sections = [
      { label: "Novas desde a sua última visita", posts: fresh, showCount: true },
      { label: "Anteriores", posts: rest },
    ]
  } else {
    const today = startOfDay(now)
    const weekAgo = today - 6 * DAY_MS
    const at = (post: T) => Date.parse(post.created_at)
    sections = [
      { label: "Hoje", posts: posts.filter((post) => at(post) >= today) },
      {
        label: "Esta semana",
        posts: posts.filter((post) => at(post) < today && at(post) >= weekAgo),
      },
      { label: "Mais antigas", posts: posts.filter((post) => at(post) < weekAgo) },
    ]
  }

  const filled = sections.filter((section) => section.posts.length > 0)
  if (filled.length <= 1) return [{ label: null, posts: [...posts] }]
  return filled
}
