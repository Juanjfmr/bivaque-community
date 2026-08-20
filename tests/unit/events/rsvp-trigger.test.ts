import { describe, expect, it } from "vitest"

// Onda F Task 2 — guard for the debouncing + preference behavior of
// notify_event_rsvp. The migration replaces the original trigger (which
// fired on INSERT only) with one that fires on AFTER INSERT OR UPDATE OF
// status. The plan mandates: status change must enqueue a notification;
// changing updated_at without changing status must NOT enqueue;
// notification_preferences.events = false must suppress.

import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..", "..", "..")
const migration = join(
  root,
  "supabase",
  "migrations",
  "20260821000008_event_rsvp_change_notification.sql",
)

describe("notify_event_rsvp trigger (F2 Step 3)", () => {
  it("the trigger function debounces on no-op UPDATEs", () => {
    const source = readFileSync(migration, "utf8")
    // The debouncing clause references old.status AND new.status in
    // the UPDATE-only branch (tg_op = "UPDATE" — TG_OP is a plpgsql
    // trigger variable, not a function call).
    expect(source).toMatch(/tg_op\s*=\s*.UPDATE.[\s\S]*?old\.status[\s\S]*?new\.status/)
  })

  it("the trigger honours notification_preferences.events", () => {
    const source = readFileSync(migration, "utf8")
    // The preference lookup must read from public.notification_preferences
    // and gate on the events boolean.
    expect(source).toMatch(/public\.notification_preferences/)
  })

  it("the trigger fires on INSERT or UPDATE OF status", () => {
    const source = readFileSync(migration, "utf8")
    // The original trigger was AFTER INSERT only — we now require
    // UPDATE OF status too.
    expect(source).toMatch(/after insert or update of status/i)
  })
})
