"use client"

import { Button, Checkbox } from "@heroui/react"
import { useEffect, useState } from "react"
import {
  getNotificationPreferencesAction,
  updateNotificationPreferencesAction,
} from "./notification-preferences-actions"

type NotificationPrefs = {
  comments: boolean
  events: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  comments: true,
  events: true,
}

export default function NotificationPreferencesSection() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    getNotificationPreferencesAction()
      .then((result) => {
        if (cancelled) return
        if (result) setPrefs(result)
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded) {
    return null
  }

  return (
    <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
      <p className="text-sm font-medium">Preferências de notificação</p>
      <p className="mt-1 text-xs text-muted">Escolha que alertas você quer receber.</p>

      <form action={updateNotificationPreferencesAction} className="mt-3 flex flex-col gap-2">
        <Checkbox
          aria-label="Receber alertas de comentários"
          name="comments"
          isSelected={prefs.comments}
          onChange={(v) => setPrefs((prev) => ({ ...prev, comments: v }))}
          className="[&_input]:min-h-11 [&_input]:min-w-11 [&_input]:opacity-0 [&_input]:transition-opacity"
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Comentários
          </Checkbox.Content>
        </Checkbox>
        <Checkbox
          aria-label="Receber alertas de eventos"
          name="events"
          isSelected={prefs.events}
          onChange={(v) => setPrefs((prev) => ({ ...prev, events: v }))}
          className="[&_input]:min-h-11 [&_input]:min-w-11 [&_input]:opacity-0 [&_input]:transition-opacity"
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Eventos
          </Checkbox.Content>
        </Checkbox>
        <Button type="submit" size="sm" variant="primary" className="mt-1 self-start">
          Salvar
        </Button>
      </form>
    </div>
  )
}
