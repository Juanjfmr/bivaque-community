"use client"

import { Button, Checkbox, Switch } from "@heroui/react"
import { useCallback, useEffect, useState } from "react"
import { ErrorState } from "../../../components/bivaque/error-state"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { Skeleton } from "../../../components/bivaque/skeleton"
import {
  getNotificationChannelStateAction,
  updateNotificationChannelStateAction,
} from "../notification-channel-actions"

// Prancha 52, painel de Notificações: os tipos de notificação, a matriz de
// canais de entrega e as novidades do Bivaque. Os canais são os que o produto
// entrega de verdade — `in_app` e `email` (ADR-20260909-canais-de-notificacao).
// Não existe controle de push: não há serviço conectado, e um controle que não
// entrega é a tela que mente. "Novidades do Bivaque" tem coluna tracejada na
// matriz porque é escolha de tipo, não de canal, e nasce desligada.

type ChannelRow = {
  notificationType: "comments" | "events" | "product_news"
  channel: "in_app" | "email"
  enabled: boolean
}

function channelOf(
  rows: ChannelRow[],
  notificationType: ChannelRow["notificationType"],
  channel: ChannelRow["channel"],
): boolean {
  return (
    rows.find((row) => row.notificationType === notificationType && row.channel === channel)
      ?.enabled === true
  )
}

function setChannel(
  rows: ChannelRow[],
  notificationType: ChannelRow["notificationType"],
  channel: ChannelRow["channel"],
  enabled: boolean,
): ChannelRow[] {
  const next = rows.filter(
    (row) => !(row.notificationType === notificationType && row.channel === channel),
  )
  next.push({ notificationType, channel, enabled })
  return next
}

export default function ConfiguracoesNotificacoesPage() {
  const [comments, setComments] = useState(true)
  const [events, setEvents] = useState(true)
  const [productNews, setProductNews] = useState(false)
  const [channels, setChannels] = useState<ChannelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const state = await getNotificationChannelStateAction()
      if (!state) {
        setError("Sua sessão expirou. Entre novamente para continuar.")
        setLoading(false)
        return
      }
      setComments(state.comments)
      setEvents(state.events)
      setProductNews(state.productNews)
      setChannels(state.channels as ChannelRow[])
    } catch {
      setError("Não foi possível carregar suas preferências. Tente novamente.")
      setLoading(false)
      return
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    setSaving(true)
    setFeedback(null)
    const form = new FormData()
    if (comments) form.append("comments", "on")
    if (events) form.append("events", "on")
    if (productNews) form.append("productNews", "on")
    if (comments && channelOf(channels, "comments", "in_app")) form.append("commentsInApp", "on")
    if (comments && channelOf(channels, "comments", "email")) form.append("commentsEmail", "on")
    if (events && channelOf(channels, "events", "in_app")) form.append("eventsInApp", "on")
    if (events && channelOf(channels, "events", "email")) form.append("eventsEmail", "on")

    try {
      await updateNotificationChannelStateAction(form)
      setFeedback({ type: "success", message: "Preferências salvas com sucesso." })
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error && err.message
            ? err.message
            : "Não foi possível salvar suas preferências. Tente novamente.",
      })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div role="status" aria-label="Carregando preferências" className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
        <div className="space-y-3 rounded-xl border border-border bg-[var(--surface)] p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
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

  const channelsDisabled = "pointer-events-none opacity-40"

  return (
    <section aria-labelledby="notif-heading" className="space-y-4">
      <div>
        <h2 id="notif-heading" className="text-lg font-semibold tracking-tight">
          Notificações
        </h2>
        <p className="mt-1 text-sm text-muted">
          Escolha sobre o que e como você deseja receber notificações.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-[var(--surface)]">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium">Tipos de notificação</h3>
        </div>
        <ul className="divide-y divide-border">
          <li className="flex min-h-11 items-center justify-between gap-4 px-4 py-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium">Respostas</span>
              <span className="block text-sm text-muted">
                Quando alguém responde às suas publicações ou comentários.
              </span>
            </span>
            <Switch
              aria-label="Notificações de respostas"
              isSelected={comments}
              onChange={(isSelected) => {
                setComments(isSelected)
                setFeedback(null)
              }}
            >
              <Switch.Content className="gap-0">
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Content>
            </Switch>
          </li>
          <li className="flex min-h-11 items-center justify-between gap-4 px-4 py-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium">Eventos</span>
              <span className="block text-sm text-muted">
                Lembretes e atualizações sobre eventos das comunidades.
              </span>
            </span>
            <Switch
              aria-label="Notificações de eventos"
              isSelected={events}
              onChange={(isSelected) => {
                setEvents(isSelected)
                setFeedback(null)
              }}
            >
              <Switch.Content className="gap-0">
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Content>
            </Switch>
          </li>
          <li className="flex min-h-11 items-center justify-between gap-4 px-4 py-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium">Novidades do Bivaque</span>
              <span className="block text-sm text-muted">
                Notícias, atualizações e dicas sobre o Bivaque.
              </span>
            </span>
            <Switch
              aria-label="Novidades do Bivaque"
              isSelected={productNews}
              onChange={(isSelected) => {
                setProductNews(isSelected)
                setFeedback(null)
              }}
            >
              <Switch.Content className="gap-0">
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Content>
            </Switch>
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
        <h3 className="text-sm font-medium">Canais de entrega</h3>
        <p className="mt-1 text-sm text-muted">Escolha onde você deseja receber as notificações.</p>

        <table className="mt-3 w-full border-collapse text-sm">
          <caption className="sr-only">Matriz de canais de entrega por tipo de notificação</caption>
          <thead>
            <tr className="text-left text-muted">
              <th scope="col" className="py-2 font-medium">
                Canal
              </th>
              <th scope="col" className="py-2 text-center font-medium">
                Respostas
              </th>
              <th scope="col" className="py-2 text-center font-medium">
                Eventos
              </th>
              <th scope="col" className="py-2 text-center font-medium">
                Novidades
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <th scope="row" className="py-3 text-left font-normal">
                No aplicativo
              </th>
              <td className="py-3 text-center">
                <Checkbox
                  aria-label="Respostas no aplicativo"
                  isSelected={channelOf(channels, "comments", "in_app")}
                  isDisabled={!comments}
                  onChange={(isSelected) =>
                    setChannels((prev) => setChannel(prev, "comments", "in_app", isSelected))
                  }
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox.Content>
                </Checkbox>
              </td>
              <td className="py-3 text-center">
                <Checkbox
                  aria-label="Eventos no aplicativo"
                  isSelected={channelOf(channels, "events", "in_app")}
                  isDisabled={!events}
                  onChange={(isSelected) =>
                    setChannels((prev) => setChannel(prev, "events", "in_app", isSelected))
                  }
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox.Content>
                </Checkbox>
              </td>
              <td className={`py-3 text-center text-muted ${channelsDisabled}`} aria-hidden="true">
                —
              </td>
            </tr>
            <tr className="border-t border-border">
              <th scope="row" className="py-3 text-left font-normal">
                E-mail
              </th>
              <td className="py-3 text-center">
                <Checkbox
                  aria-label="Respostas por e-mail"
                  isSelected={channelOf(channels, "comments", "email")}
                  isDisabled={!comments}
                  onChange={(isSelected) =>
                    setChannels((prev) => setChannel(prev, "comments", "email", isSelected))
                  }
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox.Content>
                </Checkbox>
              </td>
              <td className="py-3 text-center">
                <Checkbox
                  aria-label="Eventos por e-mail"
                  isSelected={channelOf(channels, "events", "email")}
                  isDisabled={!events}
                  onChange={(isSelected) =>
                    setChannels((prev) => setChannel(prev, "events", "email", isSelected))
                  }
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox.Content>
                </Checkbox>
              </td>
              <td className={`py-3 text-center text-muted ${channelsDisabled}`} aria-hidden="true">
                —
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted">
          O envio por push no navegador não aparece porque ainda não há serviço de push conectado.
        </p>
      </div>

      {feedback && (
        <FeedbackAlert
          variant={feedback.type === "success" ? "success" : "danger"}
          description={feedback.message}
        />
      )}

      <Button
        type="button"
        variant="primary"
        onPress={handleSave}
        isDisabled={saving}
        className="w-fit min-h-11"
      >
        {saving ? "Salvando…" : "Salvar preferências"}
      </Button>
    </section>
  )
}
