"use client"

import { Button, Chip, Tabs } from "@heroui/react"
import { ChevronDown, ChevronRight, Flag, ShieldCheck } from "lucide-react"
import { useMemo, useState, useTransition } from "react"
import { type BlockedPerson, type OwnReport, splitReason } from "../../../lib/reports/reports"
import { MemberAvatar } from "../../components/bivaque/avatar"
import { Card } from "../../components/bivaque/card"
import { EmptyState } from "../../components/bivaque/empty-state"
import { showToast } from "../../components/bivaque/toast"
import { unblockPersonAction } from "./actions"

// Prancha 56, painel direito. Os cartoes mostram apenas o que o denunciante
// tem direito de ver: situacao, o alvo enquanto legivel, o motivo escolhido e
// a propria explicacao. "Resolvida" nao revela a acao do operador — o retorno
// detalhado continua a fila de decisao, nao esta tela.

const TABS = [
  { key: "denuncias", label: "Minhas denúncias" },
  { key: "bloqueados", label: "Pessoas bloqueadas" },
] as const

type TabKey = (typeof TABS)[number]["key"]

function formatSentDate(iso: string): string {
  const date = new Date(iso)
  return `Denúncia enviada em ${date.toLocaleDateString("pt-BR")} às ${date.toLocaleTimeString(
    "pt-BR",
    { hour: "2-digit", minute: "2-digit" },
  )}`
}

function formatBlockedDate(iso: string): string {
  return `Bloqueado em ${new Date(iso).toLocaleDateString("pt-BR")}`
}

function excerptOf(text: string, max = 90): string {
  const oneLine = text.replace(/\s+/g, " ").trim()
  return oneLine.length > max ? `${oneLine.slice(0, max - 1).trimEnd()}…` : oneLine
}

export function TrustPrivacyClient({
  reports,
  blocks,
}: {
  reports: OwnReport[]
  blocks: BlockedPerson[]
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("denuncias")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-lg font-semibold tracking-tight">Confiança e privacidade</h1>

      <Tabs
        aria-label="Gestão de confiança"
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as TabKey)}
        className="tabs--secondary mt-4"
      >
        <Tabs.ListContainer>
          <Tabs.List>
            {TABS.map((tab) => (
              <Tabs.Tab key={tab.key} id={tab.key}>
                {tab.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      {activeTab === "denuncias" && (
        <section aria-label="Minhas denúncias" className="mt-6">
          <p className="text-sm text-muted">Acompanhe o andamento das denúncias que você enviou.</p>
          {reports.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="Nenhuma denúncia enviada"
                description="Quando você denunciar um conteúdo, ele aparece aqui com o andamento."
                action={
                  <a
                    href="/inicio"
                    className="inline-flex min-h-11 items-center rounded-lg bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors duration-[var(--semantic-motion-duration-instant)]"
                  >
                    Voltar ao início
                  </a>
                }
              />
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {reports.map((report) => (
                <li key={report.id}>
                  <ReportCard
                    report={report}
                    expanded={expandedId === report.id}
                    onToggle={() =>
                      setExpandedId((current) => (current === report.id ? null : report.id))
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === "bloqueados" && <BlockedPeople blocks={blocks} />}
    </div>
  )
}

function ReportCard({
  report,
  expanded,
  onToggle,
}: {
  report: OwnReport
  expanded: boolean
  onToggle: () => void
}) {
  const reason = splitReason(report.reason)
  const title = report.targetPreview ? excerptOf(report.targetPreview) : "Conteúdo indisponível"
  return (
    <Card className="p-0">
      <div className="flex items-start gap-3 p-4">
        <div
          aria-hidden="true"
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md ${
            report.targetPreview
              ? "bg-[var(--semantic-selected)]"
              : "bg-[var(--semantic-surface-sunken)]"
          }`}
        >
          {report.targetPreview ? (
            <Flag size={20} className="text-[var(--semantic-action-primary)]" />
          ) : (
            <ShieldCheck size={20} className="text-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <a
            href={`/denuncias/${report.id}`}
            className="flex min-h-11 items-center truncate text-sm font-semibold text-foreground transition-colors duration-[var(--semantic-motion-duration-instant)] hover:text-[var(--semantic-action-primary)]"
          >
            {report.targetLabel}: {title}
          </a>
          <p className="mt-0.5 text-xs text-muted">{formatSentDate(report.createdAt)}</p>
        </div>
        <Chip size="sm" variant="soft" color={report.status === "open" ? "warning" : "success"}>
          {report.status === "open" ? "Em análise" : "Resolvida"}
        </Chip>
        <Button
          size="sm"
          variant="ghost"
          className="min-h-11 min-w-11"
          onPress={onToggle}
          aria-expanded={expanded}
          aria-controls={`denuncia-expansao-${report.id}`}
          aria-label={expanded ? "Ocultar detalhes da denúncia" : "Expandir detalhes da denúncia"}
        >
          {expanded ? (
            <ChevronDown size={18} aria-hidden="true" />
          ) : (
            <ChevronRight size={18} aria-hidden="true" />
          )}
        </Button>
      </div>
      {expanded && (
        <div
          id={`denuncia-expansao-${report.id}`}
          className="mx-4 mb-4 flex flex-col gap-3 rounded-lg bg-[var(--semantic-selected)] p-4"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Motivo da denúncia
            </p>
            <p className="mt-1 text-sm">{reason.label}</p>
          </div>
          {reason.explanation && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Sua explicação
              </p>
              <p className="mt-1 text-sm leading-relaxed">{reason.explanation}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function BlockedPeople({ blocks }: { blocks: BlockedPerson[] }) {
  const [pending, startTransition] = useTransition()
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const visible = useMemo(
    () => blocks.filter((block) => !removed.has(block.userId)),
    [blocks, removed],
  )

  const handleUnblock = (block: BlockedPerson) => {
    startTransition(async () => {
      const ok = await unblockPersonAction(block.userId)
      if (ok) {
        setRemoved((prev) => new Set(prev).add(block.userId))
        showToast({
          title: `Você pode voltar a conversar com ${block.displayName}.`,
          variant: "success",
        })
      } else {
        showToast({
          title: "Não foi possível desbloquear agora. Tente novamente.",
          variant: "danger",
        })
      }
    })
  }

  return (
    <section aria-label="Pessoas bloqueadas" className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight">Pessoas bloqueadas</h2>
      <p className="mt-1 text-sm text-muted">Gerencie as pessoas que você bloqueou.</p>
      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Você não bloqueou ninguém. O bloqueio acontece dentro de uma conversa.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {visible.map((block) => (
            <li key={block.userId}>
              <Card className="flex items-center gap-3 p-4">
                <MemberAvatar name={block.displayName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{block.displayName}</p>
                  <p className="text-xs text-muted">{formatBlockedDate(block.blockedAt)}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="min-h-11"
                  isDisabled={pending}
                  onPress={() => handleUnblock(block)}
                >
                  Desbloquear
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
