"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

type NotificationPrefs = {
  messages: boolean
  comments: boolean
  events: boolean
  mentions: boolean
}

async function readSessionUserId(): Promise<string | null> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }
  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
  const {
    data: { user },
  } = await authClient.auth.getUser()
  return user?.id ?? null
}

export async function getNotificationPreferencesAction(): Promise<NotificationPrefs | null> {
  const userId = await readSessionUserId()
  if (!userId) return null

  const supabase = createServiceClient()
  const { data } = await supabase
    .from("notification_preferences")
    .select("messages, comments, events, mentions")
    .eq("user_id", userId)
    .maybeSingle()

  return (data as NotificationPrefs | null) ?? null
}

export async function updateNotificationPreferencesAction(formData: FormData) {
  const userId = await readSessionUserId()
  if (!userId) throw new Error("não autenticado")

  const prefs: NotificationPrefs = {
    messages: formData.get("messages") === "on",
    comments: formData.get("comments") === "on",
    events: formData.get("events") === "on",
    mentions: formData.get("mentions") === "on",
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() })

  if (error) throw new Error(error.message)

  revalidatePath("/profile")
}
