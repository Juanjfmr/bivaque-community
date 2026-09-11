"use client"

import { Button, Tab, TabList, TabPanel, Tabs } from "@heroui/react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { ErrorState } from "../../../components/bivaque/error-state"
import { Skeleton } from "../../../components/bivaque/skeleton"
import {
  type BlockedPerson,
  getTrustCenterDataAction,
  type MyReport,
  unblockPersonAction,
} from "../trust-actions"

// Prancha 56, painel 2: "Confiança e privacidade" com as abas Minhas denúncias e
// Pessoas bloqueadas. O cartão de denúncia expande para mostrar o motivo (lista
// fechada, gravada como prefixo do motivo) e a explicação. A lista de bloqueios
// mostra desde quando e permite desbloquear — o mecanismo é `public.dm_blocks`,
// que barra o envio nos dois sentidos, não ocultação local.

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function StatusChip({ status }: { status: "open" | "resolved" }) {
  const label = status === "open" ? "Em análise" : "Concluída"
  const className =
    status === "open" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>
  )
}

function ReportCard({ report }: { report: MyReport }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <li className="rounded-xl border border-border bg-[var(--surface)]">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`report-body-${report.id}`}
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-sunken)]"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium">
            {report.targetType} · {report.category}
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            Denúncia enviada em {formatDateTime(report.createdAt)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <StatusChip status={report.status} />
          {expanded ? (
            <ChevronDown aria-hidden="true" className="h-4 w-4 text-[var(--muted)]" />
          ) : (
            <ChevronRight aria-hidden="true" className="h-4 w-4 text-[var(--muted)]" />
          )}
        </span>
      </button>
      {expanded && (
        <div id={`report-body-${report.id}`} className="border-t border-border px-4 py-3">
          <div className="rounded-lg bg-[var(--semantic-selection)] p-3">
            <p className="text-xs font-medium text-muted">Motivo da denúncia</p>
            <p className="text-sm">{report.category}</p>
            <p className="mt-2 text-xs font-medium text-muted">Sua explicação</p>
            <p className="text-sm">
              {report.explanation.length > 0 ? report.explanation : "Sem explicação adicional."}
            </p>
          </div>
        </div>
      )}
    </li>
  )
}

function BlockRow({ person }: { person: BlockedPerson }) {
  const initials = person.displayName.trim().slice(0, 1).toUpperCase() || "?"
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-[var(--surface)] px-4 py-3">
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--semantic-selection)] text-sm font-medium"
        >
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{person.displayName}</span>
          <span className="block text-xs text-muted">
            Bloqueado em {formatDate(person.blockedAt)}
          </span>
        </span>
      </span>
      <form action={unblockPersonAction}>
        <input type="hidden" name="blockedUserId" value={person.userId} />
        <Button type="submit" variant="tertiary" className="min-h-11 shrink-0">
          Desbloquear
        </Button>
      </form>
    </li>
  )
}

// A prancha 56 desenha a lista de bloqueios ABAIXO do cartão de denúncia, na
// mesma tela, além da aba. O componente é o mesmo nos dois lugares para não
// divergirem.
function BlockedSection({ blocked }: { blocked: BlockedPerson[] }) {
  return (
    <section aria-labelledby="blocked-heading" className="mt-6">
      <h3 id="blocked-heading" className="text-base font-semibold tracking-tight">
        Pessoas bloqueadas
      </h3>
      <p className="mt-1 text-sm text-muted">Gerencie as pessoas que você bloqueou.</p>
      {blocked.length === 0 ? (
        <p className="mt-3 rounded-xl border border-border bg-[var(--surface)] px-4 py-6 text-center text-sm text-muted">
          Você não bloqueou ninguém.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {blocked.map((person) => (
            <BlockRow key={person.userId} person={person} />
          ))}
        </ul>
      )}
    </section>
  )
}

export default function ConfiguracoesBloqueadosPage() {
  const [tab, setTab] = useState<"reports" | "blocked">("reports")
  const [reports, setReports] = useState<MyReport[]>([])
  const [blocked, setBlocked] = useState<BlockedPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await getTrustCenterDataAction()
      if (!data) {
        setError("Sua sessão expirou. Entre novamente para continuar.")
        setLoading(false)
        return
      }
      setReports(data.reports)
      setBlocked(data.blocked)
    } catch {
      setError("Não foi possível carregar suas informações. Tente novamente.")
      setLoading(false)
      return
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div role="status" aria-label="Carregando confiança e privacidade" className="space-y-3">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }

  return (
    <section aria-labelledby="trust-heading">
      <h2 id="trust-heading" className="text-lg font-semibold tracking-tight">
        Confiança e privacidade
      </h2>

      <Tabs
        aria-label="Denúncias e pessoas bloqueadas"
        className="mt-4"
        selectedKey={tab}
        onSelectionChange={(key) => {
          if (key === "reports" || key === "blocked") setTab(key)
        }}
      >
        <TabList
          aria-label="Seções de confiança"
          className="flex w-full gap-1 border-b border-border"
        >
          <Tab id="reports" className="min-h-11 gap-2 px-3 text-sm font-medium">
            Minhas denúncias
          </Tab>
          <Tab id="blocked" className="min-h-11 gap-2 px-3 text-sm font-medium">
            Pessoas bloqueadas
          </Tab>
        </TabList>

        <TabPanel id="reports" className="pt-4">
          <p className="text-sm text-muted">Acompanhe o andamento das denúncias que você enviou.</p>
          {reports.length === 0 ? (
            <p className="mt-3 rounded-xl border border-border bg-[var(--surface)] px-4 py-6 text-center text-sm text-muted">
              Você ainda não enviou nenhuma denúncia.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </ul>
          )}

          <BlockedSection blocked={blocked} />
        </TabPanel>

        <TabPanel id="blocked" className="pt-4">
          <BlockedSection blocked={blocked} />
        </TabPanel>
      </Tabs>
    </section>
  )
}
