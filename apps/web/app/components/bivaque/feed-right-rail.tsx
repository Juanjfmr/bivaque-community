"use client"

import { useEffect, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import { Skeleton } from "./skeleton"

interface EventItem {
  id: string
  title: string
  starts_at: string
}

interface GroupItem {
  id: string
  name: string
  member_count: number
}

function formatDayMonth(iso: string): string {
  const d = new Date(iso)
  const day = d.getDate()
  const months = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ]
  return `${day} ${months[d.getMonth()]}`
}

export function FeedRightRail() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const { current } = useLocalityContext()
  const supabase = createBrowserClient()

  useEffect(() => {
    let cancelled = false

    async function load() {
      const now = new Date().toISOString()
      const localityId = current.id

      const [{ data: eventsData }, { data: groupsData }] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, starts_at")
          .eq("locality_id", localityId)
          .gte("starts_at", now)
          .order("starts_at", { ascending: true })
          .limit(3),
        supabase.from("groups").select("id, name").eq("locality_id", localityId).limit(3),
      ])

      if (cancelled) return

      const evts = (eventsData ?? []) as unknown as EventItem[]

      const grps: GroupItem[] = []
      const rawGroups = (groupsData ?? []) as unknown as { id: string; name: string }[]
      for (const row of rawGroups) {
        const { count } = await supabase
          .from("group_memberships")
          .select("*", { count: "exact", head: true })
          .eq("group_id", row.id)
          .eq("status", "approved")

        grps.push({
          id: row.id,
          name: row.name,
          member_count: count ?? 0,
        })
      }

      if (cancelled) return
      setEvents(evts)
      setGroups(grps)
      setLoaded(true)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [supabase, current.id])

  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-24 space-y-4">
        {/* Proximos eventos */}
        <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
          <h3 className="text-sm font-semibold">Proximos eventos</h3>
          {!loaded ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
            </div>
          ) : events.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nenhum evento proximo</p>
          ) : null}
          {loaded && events.length > 0 && (
            <div className="mt-3 space-y-2">
              {events.map((evt) => (
                <div key={evt.id} className="flex items-center gap-3">
                  <span className="shrink-0 text-xs font-medium text-muted w-12 text-right">
                    {formatDayMonth(evt.starts_at)}
                  </span>
                  <span className="text-sm truncate">{evt.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grupos ativos */}
        <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
          <h3 className="text-sm font-semibold">Grupos ativos</h3>
          {!loaded ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
            </div>
          ) : groups.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nenhum grupo ainda</p>
          ) : null}
          {loaded && groups.length > 0 && (
            <div className="mt-3 space-y-2">
              {groups.map((grp) => (
                <div key={grp.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm truncate">{grp.name}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {grp.member_count} {grp.member_count === 1 ? "membro" : "membros"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Boas praticas */}
        <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
          <h3 className="text-sm font-semibold">Boas praticas</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>Respeite todos os membros da comunidade</li>
            <li>Nao publique conteudo comercial ou de venda</li>
            <li>Nao compartilhe dados pessoais militares</li>
          </ul>
        </div>
      </div>
    </aside>
  )
}
