"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

const AVATAR_BUCKET = "avatars"
const MAX_BYTES = 5 * 1024 * 1024

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
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

export async function getAvatarSignedUrlAction(): Promise<string | null> {
  const userId = await readSessionUserId()
  if (!userId) return null

  const supabase = createServiceClient()
  const { data } = await supabase.storage.from(AVATAR_BUCKET).list(userId, { limit: 1 })
  const file = data?.[0]
  if (!file) return null

  const { data: signed } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(`${userId}/${file.name}`, 3600)
  return signed?.signedUrl ?? null
}

export async function uploadAvatarAction(formData: FormData) {
  const userId = await readSessionUserId()
  if (!userId) throw new Error("não autenticado")

  const file = formData.get("avatar")
  if (!(file instanceof File)) throw new Error("avatar required")
  if (file.size > MAX_BYTES) throw new Error("avatar deve ter no máximo 5MB")

  const ext = MIME_EXT[file.type]
  if (!ext) throw new Error("formato inválido — use PNG, JPEG ou WebP")

  const buffer = new Uint8Array(await file.arrayBuffer())
  const supabase = createServiceClient()
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(`${userId}/avatar.${ext}`, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (error) throw new Error(error.message)
}
